#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installing backend dependencies..."
pip install -r requirements.txt

echo "Ensuring Guardio ML model is compiled and ready..."
python ml/training/train.py

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Applying database migrations..."
python manage.py migrate

echo "Build completed successfully!"
