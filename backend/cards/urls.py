from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CardProfileViewSet

router = DefaultRouter()
router.register(r"", CardProfileViewSet, basename="card")

urlpatterns = router.urls
