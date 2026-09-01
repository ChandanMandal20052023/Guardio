"""
Guardio Real-time Fraud Inference Engine

Provides high-performance, safe fraud scoring using the trained Guardio ML pipeline:
- Loads model pipeline and metadata once at startup / cached
- Generates Guardio features from transaction data and historical context
- Returns genuine fraud probabilities, risk score (0-100), risk level (LOW/MEDIUM/HIGH/CRITICAL)
- Handles graceful fallback if model unavailable without breaking transaction creation
- Strict privacy: Never touches or logs CVV, PIN, or raw sensitive credentials
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import pandas as pd
import numpy as np

from ml.preprocessing.feature_engineering import (
    build_feature_dict,
    ALL_FEATURE_COLUMNS,
    categorize_merchant,
    is_international_location,
)

logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_FILE = MODELS_DIR / "guardio_fraud_v1.joblib"
METADATA_FILE = MODELS_DIR / "metadata.json"

_CACHED_PIPELINE = None
_CACHED_METADATA = None


def get_model_pipeline():
    """Load or return cached joblib ML pipeline."""
    global _CACHED_PIPELINE
    if _CACHED_PIPELINE is None:
        if MODEL_FILE.exists():
            try:
                _CACHED_PIPELINE = joblib.load(MODEL_FILE)
                logger.info(f"Loaded Guardio fraud model from {MODEL_FILE}")
            except Exception as e:
                logger.error(f"Failed to load Guardio fraud model: {e}")
                _CACHED_PIPELINE = None
        else:
            logger.warning(f"Model file not found at {MODEL_FILE}")
    return _CACHED_PIPELINE


def get_model_metadata() -> Dict[str, Any]:
    """Load or return cached model metadata."""
    global _CACHED_METADATA
    if _CACHED_METADATA is None:
        if METADATA_FILE.exists():
            try:
                with open(METADATA_FILE, "r", encoding="utf-8") as f:
                    _CACHED_METADATA = json.load(f)
            except Exception as e:
                logger.error(f"Failed to read model metadata: {e}")
                _CACHED_METADATA = {}
        else:
            _CACHED_METADATA = {}
    return _CACHED_METADATA


def assess_risk_level(prob: float, threshold: float = 0.60) -> str:
    """Classify probability into user-facing risk level."""
    if prob >= 0.85:
        return "CRITICAL"
    elif prob >= threshold:
        return "HIGH"
    elif prob >= 0.35:
        return "MEDIUM"
    else:
        return "LOW"


def generate_explanation_reason(
    amount: float,
    merchant: str,
    location: str,
    hour: int,
    amt_dev: float,
    is_intl: int,
    is_night: int,
    is_fraud: bool
) -> str:
    """Generate clear human-understandable reason for fraud alerts."""
    reasons = []
    if is_intl:
        reasons.append(f"International transaction in {location}")
    if is_night:
        reasons.append(f"Unusual night hour activity ({hour:02d}:00)")
    if amt_dev > 3.0:
        reasons.append(f"Amount {amt_dev:.1f}x higher than 30-day average")
    if "High Risk" in categorize_merchant(merchant):
        reasons.append(f"High risk merchant category ({categorize_merchant(merchant)})")
    if amount > 100000.0:
        reasons.append(f"High value transaction exceeding ₹1,00,000")
        
    if is_fraud:
        return "; ".join(reasons) if reasons else f"Anomalous transaction patterns detected at {merchant}"
    else:
        return "Normal verified spending pattern"


def predict_transaction_fraud(
    amount_inr: float,
    timestamp: Any,
    merchant: str,
    location: str,
    card_network: str = "VISA",
    issuing_bank: str = "HDFC Bank",
    credit_limit: float = 100000.0,
    user_city: str = "",
    history_records: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Main prediction endpoint used by Django API views and transaction services.
    
    Accepts raw transaction parameters, performs feature engineering via ColumnTransformer,
    runs inference through the scikit-learn Pipeline, and returns structured risk response.
    """
    pipeline = get_model_pipeline()
    metadata = get_model_metadata()
    threshold = metadata.get("optimal_threshold", 0.60)
    version = metadata.get("version", "guardio-fraud-v1")
    
    # 1. Feature Engineering
    feature_dict = build_feature_dict(
        amount_inr=amount_inr,
        timestamp=timestamp,
        merchant=merchant,
        location=location,
        card_network=card_network,
        issuing_bank=issuing_bank,
        credit_limit=credit_limit,
        user_city=user_city,
        history_records=history_records or []
    )
    
    # 2. If model pipeline unavailable, provide graceful fallback without breaking app
    if pipeline is None:
        logger.warning("ML model pipeline unavailable, using safety heuristics")
        is_suspicious = (
            feature_dict["amount_inr"] > 100000.0 or
            feature_dict["is_international"] == 1 or
            "High Risk" in feature_dict["merchant_category"]
        )
        prob = 0.88 if is_suspicious else 0.05
        pred = "FRAUD" if prob >= threshold else "SAFE"
        risk = assess_risk_level(prob, threshold)
        reason = generate_explanation_reason(
            amount=feature_dict["amount_inr"],
            merchant=merchant,
            location=location,
            hour=feature_dict["transaction_hour"],
            amt_dev=feature_dict["amount_deviation"],
            is_intl=feature_dict["is_international"],
            is_night=feature_dict["is_night"],
            is_fraud=(pred == "FRAUD")
        )
        return {
            "fraud_probability": round(prob, 4),
            "risk_score": round(prob * 100, 1),
            "risk_level": risk,
            "prediction": pred,
            "reason": reason,
            "model_version": version,
            "prediction_status": "HEURISTIC_FALLBACK"
        }
        
    try:
        # Convert feature dictionary to 1-row DataFrame matching the training schema
        df_input = pd.DataFrame([feature_dict])[ALL_FEATURE_COLUMNS]
        
        # Inference via Pipeline
        probs = pipeline.predict_proba(df_input)[0]
        # Class 1 is fraud
        fraud_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
        is_fraud = fraud_prob >= threshold
        pred_label = "FRAUD" if is_fraud else "SAFE"
        risk_lvl = assess_risk_level(fraud_prob, threshold)
        
        reason_text = generate_explanation_reason(
            amount=feature_dict["amount_inr"],
            merchant=merchant,
            location=location,
            hour=feature_dict["transaction_hour"],
            amt_dev=feature_dict["amount_deviation"],
            is_intl=feature_dict["is_international"],
            is_night=feature_dict["is_night"],
            is_fraud=is_fraud
        )
        
        return {
            "fraud_probability": round(fraud_prob, 4),
            "risk_score": round(fraud_prob * 100, 1),
            "risk_level": risk_lvl,
            "prediction": pred_label,
            "reason": reason_text,
            "model_version": version,
            "features_extracted": {
                "merchant_category": feature_dict["merchant_category"],
                "is_international": bool(feature_dict["is_international"]),
                "amount_deviation": feature_dict["amount_deviation"],
                "credit_limit_utilization": feature_dict["credit_limit_utilization"]
            },
            "prediction_status": "SUCCESS"
        }
        
    except Exception as e:
        logger.error(f"Error during ML inference: {e}", exc_info=True)
        return {
            "fraud_probability": 0.0,
            "risk_score": 0.0,
            "risk_level": "LOW",
            "prediction": "SAFE",
            "reason": "Prediction unavailable",
            "model_version": version,
            "prediction_status": "UNAVAILABLE",
            "error": str(e)
        }
