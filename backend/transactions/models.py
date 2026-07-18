from django.db import models, transaction

from users.models import User
from cards.models import CardProfile

class TransactionStatus(models.TextChoices):
    SAFE = 'SAFE', 'Safe'
    SUSPICIOUS = 'SUSPICIOUS', 'Suspicious'
    FRAUD = 'FRAUD', 'Fraud'
    BLOCKED = 'BLOCKED', 'Blocked'
    PENDING_REVIEW = 'PENDING_REVIEW', 'Pending Review'



class Transaction(models.Model):
    transaction_id = models.CharField(
        max_length=10,
        primary_key=True,
        editable=False,
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="transactions",
    )

    # Optional but recommended: link to the specific card used, not just the
    # user, so you can trace fraud back to a single card rather than the
    # whole account.
    card = models.ForeignKey(
        CardProfile,
        on_delete=models.CASCADE,
        related_name="transactions",
        null=True,
        blank=True,
    )

    card_number = models.CharField(max_length=19)
    timestamp = models.DateTimeField()
    merchant = models.CharField(max_length=255)
    amount_inr = models.DecimalField(max_digits=12, decimal_places=2)
    location = models.CharField(max_length=255)
    
    status = models.CharField(
        max_length=20,
        choices=TransactionStatus.choices,
        default=TransactionStatus.PENDING_REVIEW
    )
    prediction_reason = models.CharField(max_length=255, blank=True, null=True)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=4, blank=True, null=True)
    prediction_timestamp = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.transaction_id

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            with transaction.atomic():
                last_transaction = (
                    Transaction.objects.select_for_update()
                    .order_by("-transaction_id")
                    .first()
                )
                if last_transaction:
                    last_number = int(last_transaction.transaction_id.split("_")[1])
                    new_number = last_number + 1
                else:
                    new_number = 1000

                self.transaction_id = f"TRX_{new_number:06d}"

        super().save(*args, **kwargs)


class Alert(models.Model):
    class Severity(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    alert_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='alerts')
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.HIGH)
    status = models.CharField(max_length=20, default='UNREAD') # UNREAD, READ, RESOLVED
    prediction = models.CharField(max_length=20) # e.g. 'FRAUD'
    reason = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=100)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']