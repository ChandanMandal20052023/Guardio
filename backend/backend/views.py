from rest_framework.routers import DefaultRouter

from users.views import UserViewSet
from cards.views import CardProfileViewSet
from transactions.views import TransactionViewSet

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"cards", CardProfileViewSet, basename="card")
router.register(r"transactions", TransactionViewSet, basename="transaction")

urlpatterns = router.urls

# Resulting endpoints include (non-exhaustive):
#   GET/POST   /users/
#   GET/PUT/DELETE /users/{user_id}/
#
#   GET/POST   /cards/
#   GET/PUT/DELETE /cards/{id}/
#   POST       /cards/{id}/block/
#   POST       /cards/{id}/unblock/
#   GET        /cards/{id}/history/
#
#   GET/POST   /transactions/
#   GET        /transactions/{transaction_id}/
#   POST       /transactions/{id}/score/
#   POST       /transactions/{id}/review/
#   GET        /transactions/flagged/
#   GET        /transactions/summary/by-merchant/
#   GET        /transactions/summary/by-month/
#   GET        /transactions/summary/overview/