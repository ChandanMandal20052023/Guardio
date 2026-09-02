#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Current working directory: $(pwd)"
echo "Installing backend dependencies..."
pip install -r requirements.txt

echo "Ensuring Guardio ML model is compiled and ready..."
python ml/training/train.py

echo "Collecting static files..."
# Django requires DATABASES to be configured even for collectstatic.
# During Render's build phase, DATABASE_URL is not available, so we
# provide a dummy SQLite URL. collectstatic doesn't query the database.
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="sqlite:///tmp/build_db.sqlite3"
    echo "No DATABASE_URL found (expected during build). Using dummy SQLite for collectstatic."
fi
python manage.py collectstatic --noinput

# NOTE: Migrations are NOT run during the build step.
# Render's managed Postgres is not reliably reachable during builds.
# Migrations run in the Pre-Deploy Command (or Start Command) instead.

echo "Build completed successfully!"
