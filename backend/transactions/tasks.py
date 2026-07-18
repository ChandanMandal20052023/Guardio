import time
from celery import shared_task
from django.utils import timezone
from .models import Transaction, Alert, Notification, TransactionStatus

@shared_task
def run_fraud_prediction(transaction_id):
    """
    Celery task to run ML model for fraud prediction.
    """
    try:
        transaction = Transaction.objects.get(transaction_id=transaction_id)
    except Transaction.DoesNotExist:
        return

    # Simulate ML model prediction delay
    time.sleep(2)
    
    # Dummy ML logic
    is_suspicious = transaction.amount_inr > 100000
    
    if is_suspicious:
        status = TransactionStatus.FRAUD
        reason = "high_amount"
        confidence = 0.95
        severity = Alert.Severity.HIGH
    else:
        status = TransactionStatus.SAFE
        reason = ""
        confidence = 0.99
        severity = Alert.Severity.LOW

    transaction.status = status
    transaction.prediction_reason = reason
    transaction.confidence_score = confidence
    transaction.prediction_timestamp = timezone.now()
    transaction.save(update_fields=['status', 'prediction_reason', 'confidence_score', 'prediction_timestamp'])
    
    # Generate Alert and Notification if suspicious/fraud
    if status in [TransactionStatus.FRAUD, TransactionStatus.SUSPICIOUS]:
        generate_alert.delay(transaction_id, severity, status, reason)

@shared_task
def generate_alert(transaction_id, severity, status, reason):
    transaction = Transaction.objects.get(transaction_id=transaction_id)
    alert = Alert.objects.create(
        user=transaction.user,
        transaction=transaction,
        severity=severity,
        prediction=status,
        reason=reason
    )
    generate_notification.delay(
        user_id=transaction.user.user_id,
        title="Fraud Alert Generated",
        message=f"Transaction {transaction_id} was flagged as {status}. Reason: {reason}"
    )

@shared_task
def generate_notification(user_id, title, message):
    Notification.objects.create(
        user_id=user_id,
        title=title,
        message=message
    )
