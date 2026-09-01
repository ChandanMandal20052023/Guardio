"""
Django settings for Guardio backend project.
Configured for production deployment on Render with PostgreSQL.
"""
import os
import urllib.parse
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
try:
    import dj_database_url
except ImportError:
    dj_database_url = None

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "django-insecure-3-v_hp*!^^d=*eu3m8t!((m-5us&$$q-ih(yy^9e&1bc+u_u4&"
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

# Allowed hosts
ALLOWED_HOSTS = ["127.0.0.1", "localhost", ".onrender.com"]

# Configure ALLOWED_HOSTS to accept RENDER_EXTERNAL_HOSTNAME in production on Render
render_external_hostname = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if render_external_hostname and render_external_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_external_hostname)

# Additional custom hosts from environment (comma-separated)
env_allowed_hosts = os.getenv("ALLOWED_HOSTS", "")
if env_allowed_hosts:
    ALLOWED_HOSTS.extend([h.strip() for h in env_allowed_hosts.split(",") if h.strip()])

if DEBUG:
    ALLOWED_HOSTS.append("*")

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "users",
    "cards",
    "transactions",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
]

# Add whitenoise middleware if installed
try:
    import whitenoise
    MIDDLEWARE.append("whitenoise.middleware.WhiteNoiseMiddleware")
except ImportError:
    pass

MIDDLEWARE.extend([
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
])

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# Database Configuration
# In production on Render: pulls from DATABASE_URL environment variable.
# In local development: uses local PostgreSQL settings (or sqlite fallback if on Render without DATABASE_URL).
database_url = os.getenv("DATABASE_URL")

if database_url:
    if dj_database_url:
        DATABASES = {
            "default": dj_database_url.config(
                default=database_url,
                conn_max_age=600,
            )
        }
    else:
        parsed_db = urllib.parse.urlparse(database_url)
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": parsed_db.path.lstrip("/"),
                "USER": parsed_db.username or "",
                "PASSWORD": urllib.parse.unquote(parsed_db.password or ""),
                "HOST": parsed_db.hostname or "127.0.0.1",
                "PORT": str(parsed_db.port or 5432),
            }
        }
elif os.getenv("RENDER"):
    # Render cloud build fallback if DATABASE_URL is not yet set
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "guardio_db"),
            "USER": os.getenv("POSTGRES_USER", "guardio"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "postgres#128"),
            "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
            "PORT": os.getenv("POSTGRES_PORT", "5431"),
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {
            "min_length": 4,
        },
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

try:
    import whitenoise
    if not DEBUG:
        STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
except ImportError:
    pass

# CORS & CSRF Configuration
CORS_ALLOW_ALL_ORIGINS = DEBUG

CORS_ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://10.104.216.135:8080",
]

env_cors = os.getenv("CORS_ALLOWED_ORIGINS", "")
if env_cors:
    for origin in env_cors.split(","):
        o = origin.strip()
        if o and o not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(o)

frontend_url = os.getenv("FRONTEND_URL", "")
if frontend_url and frontend_url not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(frontend_url)

CSRF_TRUSTED_ORIGINS = [
    orig if orig.startswith("http") else f"https://{orig}"
    for orig in CORS_ALLOWED_ORIGINS
]
if render_external_hostname:
    CSRF_TRUSTED_ORIGINS.append(f"https://{render_external_hostname}")

# Email & Reset Password URL
FRONTEND_RESET_PASSWORD_URL = os.getenv(
    "FRONTEND_RESET_PASSWORD_URL", "http://localhost:8080/reset-password"
)
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@guardio.app")

# REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "USER_ID_FIELD": "user_id",
}

AUTH_USER_MODEL = "users.User"

# Celery Configuration Options (optional in production, fallback to synchronous)
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6380/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6380/0")
CELERY_ACCEPT_CONTENT = ["application/json"]
CELERY_RESULT_SERIALIZER = "json"
CELERY_TASK_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE