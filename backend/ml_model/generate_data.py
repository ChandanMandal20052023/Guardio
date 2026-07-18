"""
Synthetic Indian fintech dataset generator for Guardio (fraud detection dashboard).

Generates a pool of users and card transactions (with a configurable fraud
rate) and exports them as JSON + CSV.

Usage:
    python generate_dataset.py
    python generate_dataset.py --users 500 --transactions 10000 --fraud-ratio 0.08 --seed 42
"""

from __future__ import annotations

import argparse
import json
import random
import string
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

from faker import Faker

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #

CARD_NETWORKS = ["RUPAY", "VISA", "MASTERCARD"]
ISSUING_BANKS = ["HDFC Bank", "ICICI Bank", "SBI Card", "Axis Bank"]
RUPAY_PREFIXES = ["60", "65", "81", "82"]

LEGIT_MERCHANTS = [
    "Amazon India", "Flipkart", "Zomato", "Swiggy", "Blinkit",
    "Reliance Smart", "Myntra", "Uber India", "Ola Cabs", "Jiomart",
]
FRAUD_MERCHANTS = [
    "Unknown Tech Store London", "Crypto Escrow Luxury",
    "Foreign Server Hosting", "Casino Online Global", "Online Billing Intl",
]
FRAUD_LOCATIONS = ["London", "California", "Unknown Location", "Moscow", "Amsterdam", "Bali"]

# CIBIL-tier -> plausible credit limits (INR)
CREDIT_LIMIT_TIERS = [
    (750, [200_000, 500_000, 800_000]),
    (600, [50_000, 100_000, 150_000]),
    (0, [15_000, 25_000, 40_000]),
]

LEGIT_AMOUNT_RANGE = (100, 15_000)          # normal retail spend
FRAUD_MIN_FLOOR = 10_000                    # fraud is never trivially small
FRAUD_LOW_FRACTION = 0.6                    # fraud low bound as % of credit limit
FRAUD_HIGH_FRACTION = 0.95                  # fraud high bound as % of credit limit
FRAUD_NIGHT_HOURS = (1, 5)                  # fraud clusters late night
LEGIT_DAY_HOURS = (8, 22)

fake = Faker("en_IN")


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def generate_indian_pan() -> str:
    """Generate a syntactically valid-looking Indian PAN (AAAAA9999A)."""
    letters1 = "".join(random.choices(string.ascii_uppercase, k=3))
    status_letter = "P"  # P = Individual
    owner_letter = random.choice(string.ascii_uppercase)
    digits = "".join(random.choices(string.digits, k=4))
    last_letter = random.choice(string.ascii_uppercase)
    return f"{letters1}{status_letter}{owner_letter}{digits}{last_letter}"


def generate_phone_number() -> str:
    return f"+91{random.choice('6789')}{''.join(random.choices(string.digits, k=9))}"


def generate_card_number(network: str) -> str:
    """RuPay numbers are hand-rolled (Faker has no RuPay profile); other
    networks use Faker's built-in generators."""
    if network == "RUPAY":
        prefix = random.choice(RUPAY_PREFIXES)
        remaining = "".join(random.choices(string.digits, k=14))
        return f"{prefix}{remaining}"
    return fake.credit_card_number(card_type=network.lower())


def credit_limit_for_score(cibil_score: int) -> int:
    for threshold, options in CREDIT_LIMIT_TIERS:
        if cibil_score > threshold:
            return random.choice(options)
    return random.choice(CREDIT_LIMIT_TIERS[-1][1])


def fraud_amount_for_limit(credit_limit: int) -> float:
    """Aggressive high-value draw, scaled to the card's own limit so the
    range never inverts (the original script could pass low > high for
    users with small credit limits)."""
    low = max(FRAUD_MIN_FLOOR, credit_limit * FRAUD_LOW_FRACTION)
    high = max(low + 1_000, credit_limit * FRAUD_HIGH_FRACTION)
    return round(random.uniform(low, high), 2)


# --------------------------------------------------------------------------- #
# Data models
# --------------------------------------------------------------------------- #

@dataclass
class User:
    user_id: str
    first_name: str
    last_name: str
    pan_card: str
    phone_number: str
    city: str
    state: str
    card_number: str
    card_network: str
    credit_limit: int
    issuing_bank: str


@dataclass
class Transaction:
    transaction_id: str
    user_id: str
    card_number: str
    timestamp: str
    merchant: str
    amount_inr: float
    location: str
    is_fraud: int


# --------------------------------------------------------------------------- #
# Generators
# --------------------------------------------------------------------------- #

def generate_users(num_users: int) -> list[User]:
    users = []
    for i in range(num_users):
        cibil_score = random.randint(300, 900)
        card_network = random.choice(CARD_NETWORKS)
        credit_limit = credit_limit_for_score(cibil_score)

        users.append(
            User(
                user_id=f"USR_{1000 + i}",
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                pan_card=generate_indian_pan(),
                phone_number=generate_phone_number(),
                city=fake.city(),
                state=fake.state(),
                card_number=generate_card_number(card_network),
                card_network=card_network,
                credit_limit=credit_limit,
                issuing_bank=random.choice(ISSUING_BANKS),
            )
        )
    return users


def generate_transactions(
    users: list[User], total_txns: int, fraud_ratio: float
) -> tuple[list[Transaction], int, int]:
    fraud_count = round(total_txns * fraud_ratio)
    legit_count = total_txns - fraud_count
    base_time = datetime.now()
    transactions: list[Transaction] = []

    for i in range(legit_count):
        user = random.choice(users)
        tx_time = base_time - timedelta(
            days=random.randint(0, 30),
            hours=random.randint(*LEGIT_DAY_HOURS),
            minutes=random.randint(0, 59),
        )
        transactions.append(
            Transaction(
                transaction_id=f"TXN_{20000 + i}",
                user_id=user.user_id,
                card_number=user.card_number,
                timestamp=tx_time.strftime("%Y-%m-%d %H:%M:%S"),
                merchant=random.choice(LEGIT_MERCHANTS),
                amount_inr=round(random.uniform(*LEGIT_AMOUNT_RANGE), 2),
                location=user.city,
                is_fraud=0,
            )
        )

    for i in range(fraud_count):
        user = random.choice(users)
        tx_time = base_time - timedelta(
            days=random.randint(0, 30),
            hours=random.randint(*FRAUD_NIGHT_HOURS),
            minutes=random.randint(0, 59),
        )
        transactions.append(
            Transaction(
                transaction_id=f"TXN_FRD_{30000 + i}",
                user_id=user.user_id,
                card_number=user.card_number,
                timestamp=tx_time.strftime("%Y-%m-%d %H:%M:%S"),
                merchant=random.choice(FRAUD_MERCHANTS),
                amount_inr=fraud_amount_for_limit(user.credit_limit),
                location=random.choice(FRAUD_LOCATIONS),
                is_fraud=1,
            )
        )

    random.shuffle(transactions)
    return transactions, legit_count, fraud_count


# --------------------------------------------------------------------------- #
# Export
# --------------------------------------------------------------------------- #

def export_dataset(
    users: list[User],
    transactions: list[Transaction],
    legit_count: int,
    fraud_count: int,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    total_txns = len(transactions)

    final_output = {
        "summary": {
            "total_users": len(users),
            "total_transactions": total_txns,
            "legitimate_transactions": legit_count,
            "fraudulent_transactions": fraud_count,
            "fraud_percentage": round((fraud_count / total_txns) * 100, 2) if total_txns else 0,
        },
        "users": [asdict(u) for u in users],
        "transactions": [asdict(t) for t in transactions],
    }

    json_path = output_dir / "indian_data.json"
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(final_output, f, indent=4, ensure_ascii=False)

    # CSV export (pandas is optional; fall back to stdlib csv if unavailable)
    try:
        import pandas as pd

        pd.DataFrame([asdict(u) for u in users]).to_csv(output_dir / "users.csv", index=False)
        pd.DataFrame([asdict(t) for t in transactions]).to_csv(
            output_dir / "transactions.csv", index=False
        )
    except ImportError:
        import csv

        for filename, rows in (
            ("users.csv", [asdict(u) for u in users]),
            ("transactions.csv", [asdict(t) for t in transactions]),
        ):
            if not rows:
                continue
            with (output_dir / filename).open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)

    print(f"Dataset compiled successfully! JSON saved to '{json_path}'.")
    print(f"Total Transactions: {total_txns} | Fraud Cases: {fraud_count} "
          f"({(fraud_count / total_txns) * 100:.1f}%)")
    print(f"CSV files written to '{output_dir}/'.")


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--users", type=int, default=200, help="Number of users to generate")
    parser.add_argument("--transactions", type=int, default=5000, help="Number of transactions to generate")
    parser.add_argument("--fraud-ratio", type=float, default=0.10, help="Fraction of transactions that are fraudulent (0-1)")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility")
    parser.add_argument("--output-dir", type=Path, default=Path("."), help="Directory to write output files to")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.seed is not None:
        random.seed(args.seed)
        Faker.seed(args.seed)

    if not 0 <= args.fraud_ratio <= 1:
        raise ValueError("--fraud-ratio must be between 0 and 1")

    users = generate_users(args.users)
    transactions, legit_count, fraud_count = generate_transactions(
        users, args.transactions, args.fraud_ratio
    )
    export_dataset(users, transactions, legit_count, fraud_count, args.output_dir)


if __name__ == "__main__":
    main()