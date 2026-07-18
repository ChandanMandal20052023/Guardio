from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CardProfile
from .serializers import CardProfileSerializer, CardProfileWriteSerializer


class CardProfileViewSet(viewsets.ModelViewSet):
    """
    CRUD for CardProfile, plus card-level actions useful for a
    fraud-detection / expense-tracking product.

    list:    GET  /cards/
    create:  POST /cards/
    detail:  GET  /cards/{id}/
    update:  PUT/PATCH /cards/{id}/
    delete:  DELETE /cards/{id}/

    extra actions:
    POST /cards/{id}/block/     -> mark card as blocked (suspected fraud)
    POST /cards/{id}/unblock/   -> lift a block
    GET  /cards/{id}/history/   -> credit limit change history
    """

    queryset = CardProfile.objects.select_related("user").prefetch_related(
        "limit_history"
    )
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return CardProfileWriteSerializer
        return CardProfileSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Users should only see their own cards unless staff.
        user = self.request.user
        if not user.is_staff:
            qs = qs.filter(user__user_id=getattr(user, "user_id", None))
        return qs

    @action(detail=True, methods=["post"])
    def block(self, request, pk=None):
        card = self.get_object()
        reason = request.data.get("reason", "Blocked via API")
        card.is_blocked = True
        card.is_active = False
        card.save(update_fields=["is_blocked", "is_active", "updated_at"])
        return Response(
            {"detail": f"Card ending {card.card_number[-4:]} blocked.", "reason": reason},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def unblock(self, request, pk=None):
        card = self.get_object()
        card.is_blocked = False
        card.is_active = True
        card.save(update_fields=["is_blocked", "is_active", "updated_at"])
        return Response({"detail": "Card unblocked."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        card = self.get_object()
        history = card.limit_history.all()
        from .serializers import CardLimitHistorySerializer

        return Response(CardLimitHistorySerializer(history, many=True).data)