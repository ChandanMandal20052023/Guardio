import math
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

# Merchant category taxonomy
MERCHANT_CATEGORY_MAP = {
    "Amazon India": "Online Retail",
    "Flipkart": "Online Retail",
    "Jiomart": "Online Retail",
    "Myntra": "Fashion",
    "Zomato": "Food Delivery",
    "Swiggy": "Food Delivery",
    "Blinkit": "Groceries",
    "Reliance Smart": "Groceries",
    "Uber India": "Travel & Commute",
    "Ola Cabs": "Travel & Commute",
    "MakeMyTrip": "Travel & Commute",
    "Unknown Tech Store London": "High Risk Electronics",
    "Crypto Escrow Luxury": "High Risk Crypto/Gambling",
    "Foreign Server Hosting": "High Risk Foreign Services",
    "Casino Online Global": "High Risk Crypto/Gambling",
    "Online Billing Intl": "High Risk Foreign Services",
}

INDIAN_CITIES = {
    "mumbai", "delhi", "bengaluru", "bangalore", "hyderabad", "chennai",
    "kolkata", "pune", "ahmedabad", "jaipur", "surat", "lucknow", "kanpur",
    "nagpur", "indore", "thane", "bhopal", "visakhapatnam", "patna", "vadodara",
    "ghaziabad", "ludhiana", "agra", "nashik", "faridabad", "meerut", "rajkot",
    "varanasi", "srinagar", "aurangabad", "dhanbad", "amritsar", "navi mumbai",
    "allahabad", "ranchi", "howrah", "coimbatore", "jabalpur", "gwalior", "vijayawada",
    "jodhpur", "madurai", "raipur", "kota", "guwahati", "chandigarh", "solapur",
    "hubli", "bareilly", "moradabad", "mysore", "gurgaon", "noida", "aligarh",
    "jalandhar", "tiruchirappalli", "bhubaneswar", "salem", "warangal", "thiruvananthapuram"
}

NUMERICAL_FEATURES = [
    "amount_inr",
    "transaction_hour",
    "transaction_day_of_week",
    "is_weekend",
    "is_night",
    "is_international",
    "credit_limit_utilization",
    "avg_amount_30d",
    "amount_deviation",
    "transactions_last_1h",
    "transactions_last_24h",
    "unique_merchants_24h",
    "unique_locations_24h",
    "location_mismatch",
]

CATEGORICAL_FEATURES = [
    "merchant_category",
    "card_network",
    "issuing_bank",
]

ALL_FEATURE_COLUMNS = NUMERICAL_FEATURES + CATEGORICAL_FEATURES


def categorize_merchant(merchant_name: str) -> str:
    """Classify a merchant name into a standardized business category."""
    if not merchant_name:
        return "General Retail"
    if merchant_name in MERCHANT_CATEGORY_MAP:
        return MERCHANT_CATEGORY_MAP[merchant_name]
    
    lower = merchant_name.lower()
    if any(k in lower for k in ["crypto", "casino", "bet", "escrow", "luxury"]):
        return "High Risk Crypto/Gambling"
    if any(k in lower for k in ["foreign", "intl", "international", "offshore", "london", "dubai"]):
        return "High Risk Foreign Services"
    if any(k in lower for k in ["tech", "electronics", "gadget", "device"]):
        return "High Risk Electronics"
    if any(k in lower for k in ["food", "restaurant", "cafe", "swiggy", "zomato", "eat"]):
        return "Food Delivery"
    if any(k in lower for k in ["grocery", "mart", "bazaar", "blinkit", "zepto", "smart"]):
        return "Groceries"
    if any(k in lower for k in ["cab", "taxi", "uber", "ola", "travel", "flight", "trip"]):
        return "Travel & Commute"
    if any(k in lower for k in ["fashion", "apparel", "clothing", "myntra", "ajio"]):
        return "Fashion"
    if any(k in lower for k in ["amazon", "flipkart", "shop", "store"]):
        return "Online Retail"
    return "General Retail"


def is_international_location(location_str: str) -> int:
    """Check if the transaction location is foreign / international for an Indian cardholder."""
    if not location_str:
        return 0
    loc_clean = location_str.strip().lower()
    for city in INDIAN_CITIES:
        if city in loc_clean:
            return 0
    return 1


def build_feature_dict(
    amount_inr: float,
    timestamp: datetime,
    merchant: str,
    location: str,
    card_network: str = "VISA",
    issuing_bank: str = "HDFC Bank",
    credit_limit: float = 100000.0,
    user_city: str = "",
    history_records: list = None
) -> dict:
    """
    Extract a comprehensive feature vector from a transaction and historical context.
    Prevents data leakage: historical context only considers events BEFORE timestamp.
    """
    amount = float(amount_inr)
    dt = timestamp if isinstance(timestamp, datetime) else pd.to_datetime(timestamp)
    
    hour = dt.hour
    day_of_week = dt.weekday()
    is_weekend = 1 if day_of_week in (5, 6) else 0
    is_night = 1 if (hour >= 0 and hour <= 5) else 0
    
    merchant_cat = categorize_merchant(merchant)
    is_intl = is_international_location(location)
    
    # Check if transaction city differs from user registered city
    loc_clean = (location or "").strip().lower()
    usr_city_clean = (user_city or "").strip().lower()
    location_mismatch = 1 if (usr_city_clean and usr_city_clean not in loc_clean) else 0
    
    # Safe utilization ratio
    limit = max(float(credit_limit or 100000.0), 1000.0)
    utilization = round(amount / limit, 4)
    
    # Behavioral features from historical records prior to dt
    if history_records:
        t_1h = dt - timedelta(hours=1)
        t_24h = dt - timedelta(hours=24)
        t_30d = dt - timedelta(days=30)
        
        amounts_30d = []
        merchants_24h = set()
        locations_24h = set()
        count_1h = 0
        count_24h = 0
        
        for rec in history_records:
            rec_time = rec.get("timestamp")
            if isinstance(rec_time, str):
                rec_time = pd.to_datetime(rec_time)
            
            # Strict historical constraint: must be strictly before current transaction
            if rec_time and rec_time < dt:
                rec_amount = float(rec.get("amount_inr", 0.0))
                rec_merchant = rec.get("merchant", "")
                rec_loc = rec.get("location", "")
                
                if rec_time >= t_30d:
                    amounts_30d.append(rec_amount)
                if rec_time >= t_24h:
                    count_24h += 1
                    if rec_merchant:
                        merchants_24h.add(rec_merchant)
                    if rec_loc:
                        locations_24h.add(rec_loc)
                if rec_time >= t_1h:
                    count_1h += 1
                    
        avg_30d = float(np.mean(amounts_30d)) if amounts_30d else amount
        amt_dev = round(amount / max(avg_30d, 1.0), 4)
        tx_1h = count_1h
        tx_24h = count_24h
        uniq_merch_24h = max(len(merchants_24h), 1)
        uniq_loc_24h = max(len(locations_24h), 1)
    else:
        avg_30d = amount
        amt_dev = 1.0
        tx_1h = 0
        tx_24h = 0
        uniq_merch_24h = 1
        uniq_loc_24h = 1
        
    return {
        "amount_inr": amount,
        "transaction_hour": hour,
        "transaction_day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "is_night": is_night,
        "is_international": is_intl,
        "credit_limit_utilization": utilization,
        "avg_amount_30d": round(avg_30d, 2),
        "amount_deviation": amt_dev,
        "transactions_last_1h": tx_1h,
        "transactions_last_24h": tx_24h,
        "unique_merchants_24h": uniq_merch_24h,
        "unique_locations_24h": uniq_loc_24h,
        "location_mismatch": location_mismatch,
        "merchant_category": merchant_cat,
        "card_network": card_network or "VISA",
        "issuing_bank": issuing_bank or "HDFC Bank",
    }


def create_preprocessor() -> ColumnTransformer:
    """
    Standard ColumnTransformer for both training and real-time prediction.
    Numerical features -> StandardScaler
    Categorical features -> OneHotEncoder(handle_unknown='ignore')
    """
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )
