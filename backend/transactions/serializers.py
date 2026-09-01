from rest_framework import serializers
from .models import Transaction, Alert, Notification


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "transaction_id",
            "user",
            "card",
            "card_number",
            "timestamp",
            "merchant",
            "amount_inr",
            "location",
            "status",
            "prediction_reason",
            "confidence_score",
            "prediction_timestamp",
        ]
        read_only_fields = [
            "transaction_id",
            "status",
            "prediction_reason",
            "confidence_score",
            "prediction_timestamp",
        ]


class TransactionCreateSerializer(serializers.ModelSerializer):
    """
    Used when a transaction is ingested.
    """

    class Meta:
        model = Transaction
        fields = [
            "user",
            "card",
            "card_number",
            "timestamp",
            "merchant",
            "amount_inr",
            "location",
        ]


class TransactionPredictSerializer(serializers.Serializer):
    """
    Validation schema for real-time risk scoring API.
    """
    amount_inr = serializers.FloatField(min_value=0.01)
    merchant = serializers.CharField(max_length=255)
    location = serializers.CharField(max_length=255, default="Mumbai")
    timestamp = serializers.DateTimeField(required=False)
    card_network = serializers.CharField(max_length=50, default="VISA", required=False)
    issuing_bank = serializers.CharField(max_length=100, default="HDFC Bank", required=False)
    credit_limit = serializers.FloatField(min_value=1000.0, default=100000.0, required=False)


class FraudReviewSerializer(serializers.Serializer):
    """Input for manually confirming/overriding a fraud flag."""

    status = serializers.ChoiceField(choices=["SAFE", "SUSPICIOUS", "FRAUD", "BLOCKED"])
    reason = serializers.CharField(required=False, allow_blank=True)


class ExpenseSummarySerializer(serializers.Serializer):
    """Shape of a single row in expense-summary style analytics endpoints."""

    label = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    transaction_count = serializers.IntegerField()


class AlertSerializer(serializers.ModelSerializer):
    transaction = TransactionSerializer(read_only=True)

    class Meta:
        model = Alert
        fields = "__all__"


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"