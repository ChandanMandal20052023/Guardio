from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, permissions, filters

from .models import User
from .serializers import UserSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly



class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD for User.

    list:    GET  /users/
    create:  POST /users/
    detail:  GET  /users/{user_id}/
    update:  PUT/PATCH /users/{user_id}/
    delete:  DELETE /users/{user_id}/
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "user_id"
    lookup_value_regex = r"USR_\d+"

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["first_name", "last_name", "phone_number", "pan_card"]
    ordering_fields = ["created_at", "city", "state"]