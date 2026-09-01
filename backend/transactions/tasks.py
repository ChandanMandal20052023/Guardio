import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from .models import Transaction, Alert, Notification, TransactionStatus
from ml.inference.predictor import predict_transaction_fraud

logger = logging.getLogger(__name__)


def process_fraud_prediction_now(transaction_id: str) -> dict:
    """
    Synchronous execution engine for ML fraud prediction on a transaction.
    Extracts historical context, calls Guardio ML pipeline, updates transaction,
    and creates alerts / notifications.
    """
    try:
        transaction = Transaction.objects.select_related("user", "card").get(transaction_id=transaction_id)
    except Transaction.DoesNotExist:
        logger.error(f"Transaction {transaction_id} not found for fraud prediction")
        return {"error": "Transaction not found"}

    user = transaction.user
    card = transaction.card

    # 1. Fetch user's historical transactions (prior 30 days) to construct behavioral features without leakage
    t_30d = transaction.timestamp - timedelta(days=30)
    history_qs = Transaction.objects.filter(
        user=user,
        timestamp__gte=t_30d,
        timestamp__lt=transaction.timestamp
    ).values("amount_inr", "timestamp", "merchant", "location")
    history_records = list(history_qs)

    # 2. Extract user and card metadata
    user_city = getattr(user, "city", "")
    card_network = getattr(card, "card_network", "VISA") if card else "VISA"
    issuing_bank = getattr(card, "issuing_bank", "HDFC Bank") if card else "HDFC Bank"
    credit_limit = float(getattr(card, "credit_limit", 100000.0)) if card else 100000.0

    # 3. Real-time inference through the trained Guardio Pipeline
    result = predict_transaction_fraud(
        amount_inr=float(transaction.amount_inr),
        timestamp=transaction.timestamp,
        merchant=transaction.merchant,
        location=transaction.location,
        card_network=card_network,
        issuing_bank=issuing_bank,
        credit_limit=credit_limit,
        user_city=user_city,
        history_records=history_records
    )

    fraud_prob = result.get("fraud_probability", 0.0)
    pred_label = result.get("prediction", "SAFE")
    reason = result.get("reason", "")
    risk_level = result.get("risk_level", "LOW")

    # Determine status & severity
    if pred_label == "FRAUD":
        if risk_level == "CRITICAL":
            status = TransactionStatus.FRAUD
            severity = Alert.Severity.CRITICAL
        else:
            status = TransactionStatus.FRAUD
            severity = Alert.Severity.HIGH
    elif risk_level == "MEDIUM":
        status = TransactionStatus.SUSPICIOUS
        severity = Alert.Severity.MEDIUM
    else:
        status = TransactionStatus.SAFE
        severity = Alert.Severity.LOW

    transaction.status = status
    transaction.prediction_reason = reason
    transaction.confidence_score = fraud_prob
    transaction.prediction_timestamp = timezone.now()
    transaction.save(update_fields=["status", "prediction_reason", "confidence_score", "prediction_timestamp"])

    # 4. Generate Alert & Notification for suspicious or fraudulent activity
    if status in [TransactionStatus.FRAUD, TransactionStatus.SUSPICIOUS]:
        Alert.objects.create(
            user=user,
            transaction=transaction,
            severity=severity,
            prediction=status,
            reason=reason
        )
        Notification.objects.create(
            user=user,
            title=f"Security Alert: {status.title()} Transaction Detected",
            message=f"Transaction {transaction.transaction_id} at {transaction.merchant} (₹{transaction.amount_inr}) was flagged as {status}. Reason: {reason}"
        )

    return result


@shared_task
def run_fraud_prediction(transaction_id: str):
    """Celery background task wrapper for asynchronous worker environments."""
    return process_fraud_prediction_now(transaction_id)


@shared_task
def generate_alert(transaction_id, severity, status, reason):
    try:
        transaction = Transaction.objects.get(transaction_id=transaction_id)
        Alert.objects.create(
            user=transaction.user,
            transaction=transaction,
            severity=severity,
            prediction=status,
            reason=reason
        )
    except Transaction.DoesNotExist:
        pass


@shared_task
def generate_notification(user_id, title, message):
    Notification.objects.create(
        user_id=user_id,
        title=title,
        message=message
    )
