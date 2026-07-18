from rest_framework import serializers

from .models import CardProfile, CardLimitHistory


class CardLimitHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CardLimitHistory
        fields = ["id", "old_limit", "new_limit", "changed_at", "reason"]
        read_only_fields = ["id", "changed_at"]


class CardProfileSerializer(serializers.ModelSerializer):
    # Never expose the full card number over the API — mask it.
    card_number = serializers.SerializerMethodField()
    limit_history = CardLimitHistorySerializer(many=True, read_only=True)

    class Meta:
        model = CardProfile
        fields = [
            "id",
            "user",
            "card_number",
            "card_network",
            "issuing_bank",
            "credit_limit",
            "available_credit",
            "expiry_month",
            "expiry_year",
            "is_active",
            "is_blocked",
            "created_at",
            "updated_at",
            "limit_history",
        ]
        read_only_fields = [
            "id",
            "available_credit",
            "created_at",
            "updated_at",
        ]

    def get_card_number(self, obj):
        return obj.card_number[-4:].rjust(len(obj.card_number), "*")


class CardProfileWriteSerializer(serializers.ModelSerializer):
    """
    Separate serializer for create/update so the full (unmasked) card_number
    can be written on input, while CardProfileSerializer masks it on output.
    """

    class Meta:
        model = CardProfile
        fields = [
            "id",
            "user",
            "card_number",
            "card_network",
            "issuing_bank",
            "credit_limit",
            "expiry_month",
            "expiry_year",
            "is_active",
        ]
        read_only_fields = ["id"]