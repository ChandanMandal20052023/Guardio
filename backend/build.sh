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

if [ -n "$DATABASE_URL" ]; then
    echo "Applying database migrations..."
    python manage.py migrate --noinput
else
    echo "DATABASE_URL not detected. If this is Render, please configure DATABASE_URL in Environment Variables."
fi

echo "Build completed successfully!"
