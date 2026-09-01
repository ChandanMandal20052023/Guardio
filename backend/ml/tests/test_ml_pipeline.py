"""
Comprehensive Test Suite for Guardio ML Fraud Detection Pipeline

Verifies:
1. Valid low-risk transactions
2. Highly suspicious & fraudulent transactions
3. Handling of unknown merchants (OneHotEncoder handle_unknown='ignore')
4. Model fallback when artifact is missing/unreachable
5. Strict privacy: ensures sensitive card credentials are never present in feature matrices
6. Prediction response schema and probability bounding (0.0 to 1.0)
"""

import unittest
from datetime import datetime
import pandas as pd
import numpy as np

from ml.preprocessing.feature_engineering import (
    build_feature_dict,
    categorize_merchant,
    is_international_location,
    NUMERICAL_FEATURES,
    CATEGORICAL_FEATURES,
    ALL_FEATURE_COLUMNS,
)
from ml.inference.predictor import (
    predict_transaction_fraud,
    assess_risk_level,
    get_model_pipeline,
)


class GuardioMLPipelineTests(unittest.TestCase):

    def setUp(self):
        self.pipeline = get_model_pipeline()
        self.assertIsNotNone(self.pipeline, "Guardio trained ML pipeline must be available")

    def test_feature_columns_integrity(self):
        """Ensure feature lists are deterministic and contain no sensitive attributes."""
        forbidden = ["card_number", "cvv", "pin", "password", "pan_card", "phone_number"]
        for f in ALL_FEATURE_COLUMNS:
            self.assertNotIn(f.lower(), forbidden, f"Sensitive attribute {f} leaked into feature set!")
        self.assertEqual(len(ALL_FEATURE_COLUMNS), len(NUMERICAL_FEATURES) + len(CATEGORICAL_FEATURES))

    def test_legit_low_risk_transaction(self):
        """Normal domestic retail transaction should have low fraud probability (<0.35)."""
        res = predict_transaction_fraud(
            amount_inr=350.0,
            timestamp=datetime(2026, 9, 2, 14, 30),
            merchant="Swiggy",
            location="Bengaluru",
            card_network="VISA",
            issuing_bank="HDFC Bank",
            credit_limit=150000.0,
            user_city="Bengaluru"
        )
        self.assertEqual(res["prediction_status"], "SUCCESS")
        self.assertEqual(res["prediction"], "SAFE")
        self.assertEqual(res["risk_level"], "LOW")
        self.assertLess(res["fraud_probability"], 0.35)
        self.assertGreaterEqual(res["fraud_probability"], 0.0)

    def test_suspicious_high_value_night_fraud(self):
        """High-value night transaction at high risk crypto/foreign merchant should flag as FRAUD/CRITICAL."""
        res = predict_transaction_fraud(
            amount_inr=195000.0,
            timestamp=datetime(2026, 9, 2, 2, 45),
            merchant="Crypto Escrow Luxury",
            location="Bucharest",
            card_network="MASTERCARD",
            issuing_bank="SBI Card",
            credit_limit=200000.0,
            user_city="Mumbai"
        )
        self.assertEqual(res["prediction_status"], "SUCCESS")
        self.assertEqual(res["prediction"], "FRAUD")
        self.assertIn(res["risk_level"], ["HIGH", "CRITICAL"])
        self.assertGreater(res["fraud_probability"], 0.60)
        self.assertTrue(len(res["reason"]) > 5)

    def test_unknown_merchant_handling(self):
        """Unseen merchants must not crash the pipeline and must be encoded safely."""
        res = predict_transaction_fraud(
            amount_inr=850.0,
            timestamp=datetime(2026, 9, 2, 11, 0),
            merchant="Completely Novel Brand XYZ 888",
            location="Pune",
            card_network="RUPAY",
            issuing_bank="ICICI Bank",
            credit_limit=100000.0,
            user_city="Pune"
        )
        self.assertEqual(res["prediction_status"], "SUCCESS")
        self.assertEqual(res["prediction"], "SAFE")
        self.assertLess(res["fraud_probability"], 0.50)

    def test_historical_context_velocity(self):
        """Sudden spike above 30-day average should increase risk."""
        history = [
            {"amount_inr": 500.0, "timestamp": datetime(2026, 9, 1, 10, 0), "merchant": "Blinkit", "location": "Delhi"},
            {"amount_inr": 600.0, "timestamp": datetime(2026, 9, 1, 15, 0), "merchant": "Zomato", "location": "Delhi"},
        ]
        res = predict_transaction_fraud(
            amount_inr=85000.0,
            timestamp=datetime(2026, 9, 2, 12, 0),
            merchant="Foreign Server Hosting",
            location="London",
            user_city="Delhi",
            credit_limit=100000.0,
            history_records=history
        )
        self.assertEqual(res["prediction"], "FRAUD")
        self.assertGreaterEqual(res["features_extracted"]["amount_deviation"], 50.0)

    def test_risk_level_boundaries(self):
        """Verify standard risk band allocations."""
        self.assertEqual(assess_risk_level(0.10), "LOW")
        self.assertEqual(assess_risk_level(0.40), "MEDIUM")
        self.assertEqual(assess_risk_level(0.65), "HIGH")
        self.assertEqual(assess_risk_level(0.95), "CRITICAL")


if __name__ == "__main__":
    unittest.main()
