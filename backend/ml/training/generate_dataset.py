"""
Synthetic Guardio Dataset Generator for Model Training.

Generates realistic Indian credit card transactions containing:
- Application-level fields: amount, merchant, category, location, timestamp
- User & Card metadata: credit limit, registered city, card network, issuing bank
- Contextual & behavioral features: time-of-day, night activity, international flag,
  30-day average spending, deviation ratio, 1-hour and 24-hour transaction velocity,
  location mismatch.

All features strictly adhere to historical causality (no future information leakage).
"""

import os
import random
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd
import numpy as np

# Seed for reproducible baseline training
random.seed(42)
np.random.seed(42)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

CARD_NETWORKS = ["RUPAY", "VISA", "MASTERCARD"]
ISSUING_BANKS = ["HDFC Bank", "ICICI Bank", "SBI Card", "Axis Bank"]

LEGIT_MERCHANTS = [
    ("Amazon India", "Online Retail"),
    ("Flipkart", "Online Retail"),
    ("Jiomart", "Online Retail"),
    ("Myntra", "Fashion"),
    ("Zomato", "Food Delivery"),
    ("Swiggy", "Food Delivery"),
    ("Blinkit", "Groceries"),
    ("Reliance Smart", "Groceries"),
    ("Uber India", "Travel & Commute"),
    ("Ola Cabs", "Travel & Commute"),
    ("MakeMyTrip", "Travel & Commute"),
]

FRAUD_MERCHANTS = [
    ("Unknown Tech Store London", "High Risk Electronics"),
    ("Crypto Escrow Luxury", "High Risk Crypto/Gambling"),
    ("Foreign Server Hosting", "High Risk Foreign Services"),
    ("Casino Online Global", "High Risk Crypto/Gambling"),
    ("Online Billing Intl", "High Risk Foreign Services"),
    ("Bucharest Electronics Depot", "High Risk Electronics"),
    ("Tokyo Global Cash", "High Risk Foreign Services"),
]

INDIAN_CITIES = [
    "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune",
    "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Nagpur", "Indore", "Bhopal", "Chandigarh"
]

FRAUD_LOCATIONS = ["London", "California", "Moscow", "Amsterdam", "Bucharest", "Tokyo", "Bali"]

CREDIT_LIMITS = [50000, 100000, 200000, 350000, 500000, 800000]


def generate_guardio_dataset(num_users: int = 300, num_transactions: int = 15000, fraud_ratio: float = 0.08) -> pd.DataFrame:
    """Generate comprehensive Guardio transactions with behavioral rolling features."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Generate User & Card Profiles
    users = []
    for i in range(num_users):
        u_id = f"USR_{1000 + i}"
        city = random.choice(INDIAN_CITIES)
        limit = random.choice(CREDIT_LIMITS)
        network = random.choice(CARD_NETWORKS)
        bank = random.choice(ISSUING_BANKS)
        avg_spend = round(random.uniform(1500, min(limit * 0.15, 25000)), 2)
        users.append({
            "user_id": u_id,
            "user_city": city,
            "credit_limit": limit,
            "card_network": network,
            "issuing_bank": bank,
            "baseline_avg_amount": avg_spend
        })
        
    base_time = datetime(2026, 1, 1, 0, 0, 0)
    tx_list = []
    
    # Generate timestamp pool across 60 days
    total_txns = num_transactions
    num_fraud = int(total_txns * fraud_ratio)
    num_legit = total_txns - num_fraud
    
    # Build per-user transaction history
    user_tx_map = {u["user_id"]: [] for u in users}
    
    # Legit transactions
    for i in range(num_legit):
        u = random.choice(users)
        day_offset = random.uniform(0, 60)
        # Legit transactions mostly during day hours (8 AM - 11 PM)
        hour = random.choices(
            list(range(24)),
            weights=[1, 1, 1, 1, 1, 2, 4, 8, 12, 14, 15, 16, 16, 15, 14, 15, 16, 18, 20, 22, 20, 15, 8, 3]
        )[0]
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        tx_time = base_time + timedelta(days=day_offset, hours=hour, minutes=minute, seconds=second)
        
        merchant_name, category = random.choice(LEGIT_MERCHANTS)
        
        # Occasional travel to other domestic city (95% same city, 5% domestic other)
        loc = u["user_city"] if random.random() < 0.95 else random.choice(INDIAN_CITIES)
        
        # Spend follows lognormal distribution around baseline
        amount = round(max(50.0, np.random.lognormal(mean=np.log(u["baseline_avg_amount"]), sigma=0.6)), 2)
        amount = min(amount, u["credit_limit"] * 0.8) # Legit rarely hits full limit in 1 shot
        
        user_tx_map[u["user_id"]].append({
            "timestamp": tx_time,
            "amount_inr": amount,
            "merchant": merchant_name,
            "merchant_category": category,
            "location": loc,
            "is_fraud": 0,
            "user_meta": u
        })
        
    # Fraud transactions
    for i in range(num_fraud):
        u = random.choice(users)
        day_offset = random.uniform(1, 59)
        # Fraud often clusters at night (12 AM - 5 AM) or sudden spike
        hour = random.choices(
            list(range(24)),
            weights=[15, 18, 20, 18, 14, 10, 5, 4, 4, 4, 4, 4, 5, 5, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16]
        )[0]
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        tx_time = base_time + timedelta(days=day_offset, hours=hour, minutes=minute, seconds=second)
        
        # 85% high risk/fraud merchants, 15% compromised legit merchant with massive amount
        if random.random() < 0.85:
            merchant_name, category = random.choice(FRAUD_MERCHANTS)
            loc = random.choice(FRAUD_LOCATIONS)
        else:
            merchant_name, category = random.choice(LEGIT_MERCHANTS)
            loc = random.choice(FRAUD_LOCATIONS)
            
        # High value fraud, large fraction of credit limit
        low_bound = max(15000.0, u["credit_limit"] * 0.5)
        high_bound = max(low_bound + 5000.0, u["credit_limit"] * 0.98)
        amount = round(random.uniform(low_bound, high_bound), 2)
        
        user_tx_map[u["user_id"]].append({
            "timestamp": tx_time,
            "amount_inr": amount,
            "merchant": merchant_name,
            "merchant_category": category,
            "location": loc,
            "is_fraud": 1,
            "user_meta": u
        })
        
    # Flatten and sort strictly by timestamp to compute behavioral historical features without leakage
    all_raw_txns = []
    for u_id, tx_list in user_tx_map.items():
        # Sort each user's history chronologically
        tx_list.sort(key=lambda x: x["timestamp"])
        for idx, tx in enumerate(tx_list):
            prior_txns = tx_list[:idx] # Strict historical context
            u_meta = tx["user_meta"]
            
            t = tx["timestamp"]
            hour = t.hour
            dow = t.weekday()
            is_weekend = 1 if dow in (5, 6) else 0
            is_night = 1 if (hour >= 0 and hour <= 5) else 0
            
            # Location & International
            is_intl = 1 if tx["location"] in FRAUD_LOCATIONS else 0
            loc_mismatch = 1 if tx["location"] != u_meta["user_city"] else 0
            
            # Credit limit utilization
            util = round(tx["amount_inr"] / u_meta["credit_limit"], 4)
            
            # Historical window metrics
            t_30d = t - timedelta(days=30)
            t_24h = t - timedelta(hours=24)
            t_1h = t - timedelta(hours=1)
            
            recent_30d = [p["amount_inr"] for p in prior_txns if p["timestamp"] >= t_30d]
            recent_24h = [p for p in prior_txns if p["timestamp"] >= t_24h]
            recent_1h = [p for p in prior_txns if p["timestamp"] >= t_1h]
            
            avg_30d = float(np.mean(recent_30d)) if recent_30d else u_meta["baseline_avg_amount"]
            amt_dev = round(tx["amount_inr"] / max(avg_30d, 1.0), 4)
            tx_1h = len(recent_1h)
            tx_24h = len(recent_24h)
            uniq_merch = len(set(p["merchant"] for p in recent_24h)) + 1
            uniq_loc = len(set(p["location"] for p in recent_24h)) + (1 if loc_mismatch else 0)
            
            all_raw_txns.append({
                "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
                "amount_inr": tx["amount_inr"],
                "merchant": tx["merchant"],
                "merchant_category": tx["merchant_category"],
                "location": tx["location"],
                "card_network": u_meta["card_network"],
                "issuing_bank": u_meta["issuing_bank"],
                "transaction_hour": hour,
                "transaction_day_of_week": dow,
                "is_weekend": is_weekend,
                "is_night": is_night,
                "is_international": is_intl,
                "credit_limit_utilization": util,
                "avg_amount_30d": round(avg_30d, 2),
                "amount_deviation": amt_dev,
                "transactions_last_1h": tx_1h,
                "transactions_last_24h": tx_24h,
                "unique_merchants_24h": uniq_merch,
                "unique_locations_24h": uniq_loc,
                "location_mismatch": loc_mismatch,
                "is_fraud": tx["is_fraud"],
            })
            
    df = pd.DataFrame(all_raw_txns)
    df.sort_values(by="timestamp", inplace=True)
    df.reset_index(drop=True, inplace=True)
    
    out_csv = DATA_DIR / "guardio_transactions_dataset.csv"
    df.to_csv(out_csv, index=False)
    print(f"Generated Guardio training dataset: {len(df)} records saved to {out_csv}")
    print(f"Fraud distribution:\n{df['is_fraud'].value_counts(normalize=True)}")
    return df


if __name__ == "__main__":
    generate_guardio_dataset()
