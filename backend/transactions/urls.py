from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransactionViewSet, AlertViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r"alerts", AlertViewSet, basename="alert")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"", TransactionViewSet, basename="transaction")

urlpatterns = router.urls
