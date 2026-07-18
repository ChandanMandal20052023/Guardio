from django.db import models
from django.db import transaction
from django.contrib.auth.models import AbstractUser, BaseUserManager

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
            
        return self.create_user(email, password, **extra_fields)

from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """
    Single canonical User model. Do not redefine this in any other app —
    import it instead: `from users.models import User`.
    """
    username = None

    user_id = models.CharField(
        max_length=10,
        primary_key=True,
        editable=False,
    )

    pan_card = models.CharField(max_length=10, unique=True)
    phone_number = models.CharField(max_length=15, unique=True)

    email = models.EmailField(unique=True)
    dob = models.DateField(null=True, blank=True)

    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'pan_card', 'phone_number']

    objects = CustomUserManager()

    class Meta:
        db_table = "users"
        ordering = ["user_id"]

    def __str__(self):
        return f"{self.user_id} - {self.first_name} {self.last_name}"

    def save(self, *args, **kwargs):
        if not self.user_id:
            # zero-padded numeric part keeps lexicographic sort == numeric sort
            # e.g. USR_001000, USR_001001 ... sorts correctly even past 9999
            with transaction.atomic():
                last_user = (
                    User.objects.select_for_update()
                    .order_by("-user_id")
                    .first()
                )
                if last_user:
                    try:
                        last_number = int(last_user.user_id.split("_")[1])
                        new_number = last_number + 1
                    except (IndexError, ValueError):
                        new_number = 1000
                else:
                    new_number = 1000

                self.user_id = f"USR_{new_number:06d}"

        super().save(*args, **kwargs)