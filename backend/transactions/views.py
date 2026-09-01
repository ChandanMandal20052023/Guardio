from datetime import datetime, timedelta
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Transaction, TransactionStatus, Alert, Notification
from .serializers import (
    TransactionSerializer,
    TransactionCreateSerializer,
    TransactionPredictSerializer,
    FraudReviewSerializer,
    ExpenseSummarySerializer,
    AlertSerializer,
    NotificationSerializer,
)
from .tasks import process_fraud_prediction_now
from ml.inference.predictor import predict_transaction_fraud


class TransactionViewSet(viewsets.ModelViewSet):
    """
    CRUD + real-time ML fraud detection + expense tracking endpoints for Guardio.

    list:    GET  /api/transactions/
    create:  POST /api/transactions/ (automatically scores fraud risk via ML pipeline)
    detail:  GET  /api/transactions/{transaction_id}/

    custom actions:
    POST /api/transactions/{id}/score/          -> score/re-score transaction through Guardio ML model
    POST /api/transactions/predict/             -> standalone real-time risk assessment on payload
    POST /api/transactions/{id}/review/         -> manual confirmation/override (e.g. BLOCKED)
    GET  /api/transactions/flagged/             -> list all FRAUD / SUSPICIOUS transactions
    GET  /api/transactions/summary/by-merchant/ -> merchant expense breakdown
    GET  /api/transactions/summary/by-month/    -> monthly expense trend
    GET  /api/transactions/summary/overview/    -> overview metrics & fraud counts
    """

    queryset = Transaction.objects.select_related("user", "card")
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "transaction_id"
    lookup_value_regex = r"TRX_\d+"

    def get_serializer_class(self):
        if self.action == "create":
            return TransactionCreateSerializer
        return TransactionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_staff:
            qs = qs.filter(user__user_id=getattr(user, "user_id", None))

        params = self.request.query_params
        if user_id := params.get("user"):
            qs = qs.filter(user__user_id=user_id)
        if merchant := params.get("merchant"):
            qs = qs.filter(merchant__icontains=merchant)
        if status_param := params.get("status"):
            qs = qs.filter(status=status_param)
        if date_from := params.get("date_from"):
            qs = qs.filter(timestamp__date__gte=date_from)
        if date_to := params.get("date_to"):
            qs = qs.filter(timestamp__date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        transaction = serializer.save()
        # Run Guardio ML fraud prediction synchronously on creation
        process_fraud_prediction_now(transaction.transaction_id)

    # ---- Real-time ML Prediction & Scoring Endpoints ------------------

    @action(detail=True, methods=["post"])
    def score(self, request, transaction_id=None):
        """Run or re-run Guardio AI fraud scoring on a single transaction."""
        txn = self.get_object()
        result = process_fraud_prediction_now(txn.transaction_id)
        txn.refresh_from_db()
        return Response(
            {
                "transaction_id": txn.transaction_id,
                "status": txn.status,
                "confidence_score": txn.confidence_score,
                "prediction_reason": txn.prediction_reason,
                "prediction_timestamp": txn.prediction_timestamp,
                "risk_details": result,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="predict")
    def predict(self, request):
        """
        Standalone real-time fraud risk assessment without persisting to DB.
        Accepts transaction details, extracts historical context from current user,
        and returns fraud probability, risk score (0-100), and risk level.
        """
        serializer = TransactionPredictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        ts = data.get("timestamp") or timezone.now()

        # Fetch recent historical records for current authenticated user
        t_30d = ts - timedelta(days=30)
        history_records = list(
            Transaction.objects.filter(
                user=user,
                timestamp__gte=t_30d,
                timestamp__lt=ts
            ).values("amount_inr", "timestamp", "merchant", "location")
        )

        user_city = getattr(user, "city", "")
        card_network = data.get("card_network", "VISA")
        issuing_bank = data.get("issuing_bank", "HDFC Bank")
        credit_limit = data.get("credit_limit", 100000.0)

        result = predict_transaction_fraud(
            amount_inr=data["amount_inr"],
            timestamp=ts,
            merchant=data["merchant"],
            location=data["location"],
            card_network=card_network,
            issuing_bank=issuing_bank,
            credit_limit=credit_limit,
            user_city=user_city,
            history_records=history_records,
        )

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def review(self, request, transaction_id=None):
        """Manual override by reviewer (e.g. BLOCKED, SAFE)."""
        txn = self.get_object()
        serializer = FraudReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        txn.status = new_status
        txn.save(update_fields=["status"])

        if new_status == TransactionStatus.BLOCKED:
            Notification.objects.create(
                user=txn.user,
                title="Transaction Blocked",
                message=f"Transaction {txn.transaction_id} was manually blocked.",
            )

        return Response(
            {
                "transaction_id": txn.transaction_id,
                "status": txn.status,
                "reason": serializer.validated_data.get("reason", ""),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def flagged(self, request):
        qs = self.get_queryset().filter(status__in=[TransactionStatus.FRAUD, TransactionStatus.SUSPICIOUS])
        page = self.paginate_queryset(qs)
        serializer = TransactionSerializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    # ---- Expense Analytics Endpoints -----------------------------------

    @action(detail=False, methods=["get"], url_path="summary/by-merchant")
    def summary_by_merchant(self, request):
        qs = (
            self.get_queryset()
            .values("merchant")
            .annotate(total_amount=Sum("amount_inr"), transaction_count=Count("transaction_id"))
            .order_by("-total_amount")
        )
        data = [
            {
                "label": row["merchant"],
                "total_amount": row["total_amount"],
                "transaction_count": row["transaction_count"],
            }
            for row in qs
        ]
        return Response(ExpenseSummarySerializer(data, many=True).data)

    @action(detail=False, methods=["get"], url_path="summary/by-month")
    def summary_by_month(self, request):
        qs = (
            self.get_queryset()
            .annotate(month=TruncMonth("timestamp"))
            .values("month")
            .annotate(total_amount=Sum("amount_inr"), transaction_count=Count("transaction_id"))
            .order_by("month")
        )
        data = [
            {
                "label": row["month"].strftime("%Y-%m") if row["month"] else "unknown",
                "total_amount": row["total_amount"],
                "transaction_count": row["transaction_count"],
            }
            for row in qs
        ]
        return Response(ExpenseSummarySerializer(data, many=True).data)

    @action(detail=False, methods=["get"], url_path="summary/overview")
    def summary_overview(self, request):
        qs = self.get_queryset()
        totals = qs.aggregate(
            total_spend=Sum("amount_inr"),
            total_count=Count("transaction_id"),
        )
        fraud_totals = qs.filter(status=TransactionStatus.FRAUD).aggregate(
            fraud_spend=Sum("amount_inr"),
            fraud_count=Count("transaction_id"),
        )
        return Response(
            {
                "total_spend": totals["total_spend"] or 0,
                "total_transactions": totals["total_count"] or 0,
                "flagged_spend": fraud_totals["fraud_spend"] or 0,
                "flagged_transactions": fraud_totals["fraud_count"] or 0,
            }
        )


class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Alert.objects.all()
        return Alert.objects.filter(user=user)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Notification.objects.all()
        return Notification.objects.filter(user=user)