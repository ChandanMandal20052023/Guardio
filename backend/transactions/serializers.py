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
        read_only_fields = ["transaction_id", "status", "prediction_reason", "confidence_score", "prediction_timestamp"]


class TransactionCreateSerializer(serializers.ModelSerializer):
    """
    Used when a transaction is ingested (e.g. from a bank feed or manual
    entry). Deliberately excludes is_fraud — that gets decided afterward,
    either by the AI model or a manual review action.
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


class FraudReviewSerializer(serializers.Serializer):
    """Input for manually confirming/overriding a fraud flag."""

    status = serializers.ChoiceField(choices=['SAFE', 'SUSPICIOUS', 'FRAUD', 'BLOCKED'])
    reason = serializers.CharField(required=False, allow_blank=True)


class ExpenseSummarySerializer(serializers.Serializer):
    """Shape of a single row in expense-summary style analytics endpoints."""

    label = serializers.CharField()  # e.g. merchant name, category, month
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    transaction_count = serializers.IntegerField()


class AlertSerializer(serializers.ModelSerializer):
    transaction = TransactionSerializer(read_only=True)
    
    class Meta:
        model = Alert
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'