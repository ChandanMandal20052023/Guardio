from django.core.validators import RegexValidator, MinValueValidator
from django.db import models, transaction

from users.models import User  # single canonical User model


class CardProfile(models.Model):
    """
    Single canonical CardProfile model. Do not redefine this in users/models.py
    or anywhere else — import it: `from cards.models import CardProfile`.
    """

    CARD_NETWORK_CHOICES = [
        ("VISA", "Visa"),
        ("MASTERCARD", "MasterCard"),
        ("RUPAY", "RuPay"),
    ]

    BANK_CHOICES = [
        ("HDFC Bank", "HDFC Bank"),
        ("ICICI Bank", "ICICI Bank"),
        ("SBI Card", "SBI Card"),
        ("Axis Bank", "Axis Bank"),
    ]

    card_number_validator = RegexValidator(
        regex=r"^\d{13,19}$",
        message="Card number must be 13-19 digits.",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="cards",
    )

    card_number = models.CharField(
        max_length=20,
        unique=True,
        validators=[card_number_validator],
    )

    card_network = models.CharField(max_length=20, choices=CARD_NETWORK_CHOICES)
    issuing_bank = models.CharField(max_length=100, choices=BANK_CHOICES)

    credit_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    available_credit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Remaining credit after outstanding transactions.",
    )

    expiry_month = models.PositiveSmallIntegerField()
    expiry_year = models.PositiveSmallIntegerField()

    is_active = models.BooleanField(default=True)
    is_blocked = models.BooleanField(
        default=False,
        help_text="Set true if card was blocked due to suspected fraud.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "card_profiles"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self):
        masked = self.card_number[-4:].rjust(len(self.card_number), "*")
        return f"{masked} ({self.card_network}) - {self.user.user_id}"

    def save(self, *args, **kwargs):
        if self._state.adding and self.available_credit is None:
            self.available_credit = self.credit_limit
        super().save(*args, **kwargs)


class CardLimitHistory(models.Model):
    """
    Tracks changes to a card's credit limit over time — useful for fraud
    detection (sudden limit changes) and for audit trails.
    """

    card = models.ForeignKey(
        CardProfile,
        on_delete=models.CASCADE,
        related_name="limit_history",
    )

    old_limit = models.DecimalField(max_digits=12, decimal_places=2)
    new_limit = models.DecimalField(max_digits=12, decimal_places=2)

    changed_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "card_limit_history"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.card.card_number[-4:]}: {self.old_limit} -> {self.new_limit}"