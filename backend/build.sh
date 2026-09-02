#!/usr/bin/env bash
# Exit on error
set -o errexit

# Auto-detect if running from root directory vs backend directory
if [ -d "backend" ]; then
    echo "Changing directory to backend..."
    cd backend
fi

echo "Current working directory: $(pwd)"
echo "Installing backend dependencies..."
pip install -r requirements.txt

echo "Ensuring Guardio ML model is compiled and ready..."
python ml/training/train.py

echo "Collecting static files..."
python manage.py collectstatic --noinput

# NOTE: Migrations are NOT run during the build step.
# Render's managed Postgres is not reliably reachable during builds.
# Migrations run in the Pre-Deploy Command (or Start Command) instead.

echo "Build completed successfully!"
