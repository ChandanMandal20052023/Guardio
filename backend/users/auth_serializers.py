from rest_framework import serializers
from .models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    
    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "first_name",
            "last_name",
            "pan_card",
            "phone_number",
            "dob",
            "city",
            "state",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            pan_card=validated_data.get('pan_card', ''),
            phone_number=validated_data.get('phone_number', ''),
            dob=validated_data.get('dob', None),
            city=validated_data.get('city', ''),
            state=validated_data.get('state', '')
        )
        return user

class LoginSerializer(TokenObtainPairSerializer):
    pass

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "user_id", "email", "first_name", "last_name", 
            "pan_card", "phone_number", "dob", "city", "state"
        ]
        read_only_fields = ["user_id", "email", "pan_card"]

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    
    def save(self, **kwargs):
        user = self.context['request'].user
        if not user.check_password(self.validated_data['old_password']):
            raise serializers.ValidationError({'old_password': 'Wrong password.'})
        user.set_password(self.validated_data['new_password'])
        user.save()

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    def get_reset_payload(self):
        return None, None, None

class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
    def save(self):
        pass
