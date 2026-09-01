"""
Guardio Credit Card Fraud Detection - Model Training Pipeline

Trains multiple production-grade classifiers using Guardio-compatible features:
- Logistic Regression (Balanced)
- Random Forest Classifier (Balanced)
- XGBoost Classifier (with class balancing)

Uses scikit-learn Pipeline with ColumnTransformer ensuring consistent preprocessing.
Evaluates Precision, Recall, F1, ROC-AUC, PR-AUC and tunes classification thresholds.
Saves winning pipeline to `backend/ml/models/guardio_fraud_v1.joblib` with `metadata.json`.
"""

import os
import json
import sys
from datetime import datetime
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    classification_report,
    precision_recall_curve,
)
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

from ml.preprocessing.feature_engineering import (
    create_preprocessor,
    NUMERICAL_FEATURES,
    CATEGORICAL_FEATURES,
    ALL_FEATURE_COLUMNS,
)
from ml.training.generate_dataset import generate_guardio_dataset

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def train_models():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = DATA_DIR / "guardio_transactions_dataset.csv"
    
    if not csv_path.exists():
        print(f"Dataset not found at {csv_path}. Generating now...")
        df = generate_guardio_dataset(num_users=350, num_transactions=18000, fraud_ratio=0.08)
    else:
        df = pd.read_csv(csv_path)
        
    print(f"Loaded dataset: {len(df)} transactions. Features: {len(ALL_FEATURE_COLUMNS)}")
    print(f"Class distribution: Legit={sum(df['is_fraud']==0)}, Fraud={sum(df['is_fraud']==1)} ({df['is_fraud'].mean()*100:.2f}%)")
    
    # 1. Feature matrix & target
    X = df[ALL_FEATURE_COLUMNS]
    y = df["is_fraud"]
    
    # 2. Time-aware train/test split (80% train, 20% test chronologically)
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    print(f"\nTrain set: {len(X_train)} | Test set: {len(X_test)}")
    print(f"Train fraud: {y_train.sum()} ({y_train.mean()*100:.2f}%) | Test fraud: {y_test.sum()} ({y_test.mean()*100:.2f}%)")
    
    # Candidate models
    candidates = {}
    
    # 1. Logistic Regression Pipeline
    lr_pipe = Pipeline([
        ("preprocessor", create_preprocessor()),
        ("classifier", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42))
    ])
    candidates["LogisticRegression"] = lr_pipe
    
    # 2. Random Forest Pipeline
    rf_pipe = Pipeline([
        ("preprocessor", create_preprocessor()),
        ("classifier", RandomForestClassifier(
            n_estimators=150,
            max_depth=12,
            min_samples_split=4,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        ))
    ])
    candidates["RandomForest"] = rf_pipe
    
    # 3. XGBoost Pipeline (if installed)
    try:
        from xgboost import XGBClassifier
        pos_weight = (len(y_train) - y_train.sum()) / max(y_train.sum(), 1)
        xgb_pipe = Pipeline([
            ("preprocessor", create_preprocessor()),
            ("classifier", XGBClassifier(
                n_estimators=150,
                max_depth=5,
                learning_rate=0.08,
                scale_pos_weight=pos_weight,
                eval_metric="logloss",
                random_state=42,
                n_jobs=-1
            ))
        ])
        candidates["XGBoost"] = xgb_pipe
    except ImportError:
        print("XGBoost not available; proceeding with LogisticRegression & RandomForest")
        
    model_evaluations = {}
    best_model_name = None
    best_f1 = -1.0
    best_pipeline = None
    best_threshold = 0.50
    
    print("\n" + "="*70)
    print("MODEL TRAINING & EVALUATION REPORT")
    print("="*70)
    
    for name, pipeline in candidates.items():
        print(f"\nTraining {name}...")
        pipeline.fit(X_train, y_train)
        
        # Predicted probabilities
        y_probs = pipeline.predict_proba(X_test)[:, 1]
        
        # Calculate optimal threshold on precision-recall curve
        precisions, recalls, thresholds = precision_recall_curve(y_test, y_probs)
        # Avoid division by zero
        f1_scores = np.divide(
            2 * (precisions * recalls),
            (precisions + recalls),
            out=np.zeros_like(precisions),
            where=(precisions + recalls) != 0
        )
        opt_idx = np.argmax(f1_scores) if len(f1_scores) > 0 else 0
        opt_threshold = float(thresholds[opt_idx]) if opt_idx < len(thresholds) else 0.50
        # Clamp threshold to reasonable operating range
        opt_threshold = float(np.clip(opt_threshold, 0.35, 0.75))
        
        # Standard 0.5 threshold vs Optimal threshold
        y_pred_opt = (y_probs >= opt_threshold).astype(int)
        
        acc = float(accuracy_score(y_test, y_pred_opt))
        prec = float(precision_score(y_test, y_pred_opt, zero_division=0))
        rec = float(recall_score(y_test, y_pred_opt, zero_division=0))
        f1 = float(f1_score(y_test, y_pred_opt, zero_division=0))
        roc_auc = float(roc_auc_score(y_test, y_probs))
        pr_auc = float(average_precision_score(y_test, y_probs))
        cm = confusion_matrix(y_test, y_pred_opt).tolist()
        
        eval_metrics = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
            "optimal_threshold": round(opt_threshold, 4),
            "confusion_matrix": cm
        }
        model_evaluations[name] = eval_metrics
        
        print(f"Results for {name} (Threshold = {opt_threshold:.3f}):")
        print(f"  Accuracy:  {acc*100:.2f}%")
        print(f"  Precision: {prec*100:.2f}%")
        print(f"  Recall:    {rec*100:.2f}%")
        print(f"  F1 Score:  {f1*100:.2f}%")
        print(f"  ROC-AUC:   {roc_auc:.4f}")
        print(f"  PR-AUC:    {pr_auc:.4f}")
        print(f"  Confusion Matrix: [TN={cm[0][0]}, FP={cm[0][1]}, FN={cm[1][0]}, TP={cm[1][1]}]")
        
        # Priority on F1 & Recall
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_pipeline = pipeline
            best_threshold = opt_threshold
            
    print("\n" + "="*70)
    print(f"CHOSEN PRODUCTION MODEL: {best_model_name} (F1 = {best_f1*100:.2f}%, Threshold = {best_threshold:.3f})")
    print("="*70)
    
    # 3. Save winning Pipeline artifact
    model_artifact_path = MODELS_DIR / "guardio_fraud_v1.joblib"
    joblib.dump(best_pipeline, model_artifact_path, compress=3)
    print(f"Saved complete ML pipeline to: {model_artifact_path}")
    
    # 4. Save metadata.json
    metadata = {
        "model_name": best_model_name,
        "version": "guardio-fraud-v1",
        "saved_at": datetime.utcnow().isoformat() + "Z",
        "optimal_threshold": round(best_threshold, 4),
        "risk_thresholds": {
            "low_max": 0.30,
            "medium_max": round(best_threshold, 4),
            "high_min": round(best_threshold, 4)
        },
        "features": {
            "numerical": NUMERICAL_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
            "total_count": len(ALL_FEATURE_COLUMNS)
        },
        "training_dataset": {
            "name": "guardio_transactions_dataset.csv",
            "total_samples": len(df),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "fraud_ratio": round(float(df["is_fraud"].mean()), 4)
        },
        "metrics": model_evaluations[best_model_name],
        "all_models_evaluated": model_evaluations
    }
    
    metadata_path = MODELS_DIR / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)
    print(f"Saved model metadata to: {metadata_path}")
    
    return metadata


if __name__ == "__main__":
    train_models()
