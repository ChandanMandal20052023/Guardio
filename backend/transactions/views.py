from django.shortcuts import render

# Create your views here.
from datetime import datetime

from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Transaction
from .serializers import (
    TransactionSerializer,
    TransactionCreateSerializer,
    FraudReviewSerializer,
    ExpenseSummarySerializer,
    AlertSerializer,
    NotificationSerializer,
)
from .tasks import run_fraud_prediction
from .models import TransactionStatus, Alert, Notification

# Deprecated: use celery task run_fraud_prediction
def score_transaction_for_fraud(transaction: Transaction) -> dict:
    pass


class TransactionViewSet(viewsets.ModelViewSet):
    """
    CRUD + fraud-detection + expense-tracking endpoints for Transaction.

    list:    GET  /transactions/
             supports ?user=<user_id>&merchant=<name>&is_fraud=true
                       &date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    create:  POST /transactions/
    detail:  GET  /transactions/{transaction_id}/

    extra actions:
    POST /transactions/{id}/score/          -> run AI fraud scoring on this txn
    POST /transactions/{id}/review/         -> manually confirm/override fraud flag
    GET  /transactions/flagged/             -> list all is_fraud=True transactions
    GET  /transactions/summary/by-merchant/ -> spend grouped by merchant
    GET  /transactions/summary/by-month/    -> spend grouped by month
    GET  /transactions/summary/overview/    -> totals: spend, count, fraud count
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
        transaction.status = TransactionStatus.PENDING_REVIEW
        transaction.save(update_fields=["status"])
        
        # Trigger Celery task
        run_fraud_prediction.delay(transaction.transaction_id)

    # ---- fraud actions -------------------------------------------------

    @action(detail=True, methods=["post"])
    def score(self, request, transaction_id=None):
        """Run (or re-run) AI fraud scoring on a single transaction."""
        txn = self.get_object()
        run_fraud_prediction.delay(txn.transaction_id)
        return Response({"detail": "Prediction task queued."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def review(self, request, transaction_id=None):
        """Manual override by a human reviewer (e.g. BLOCKED)."""
        txn = self.get_object()
        serializer = FraudReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        txn.status = new_status
        txn.save(update_fields=["status"])
        
        if new_status == TransactionStatus.BLOCKED:
            from .tasks import generate_notification
            generate_notification.delay(
                user_id=txn.user.user_id,
                title="Transaction Blocked",
                message=f"Transaction {txn.transaction_id} was manually blocked."
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

    # ---- expense analytics ----------------------------------------------

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