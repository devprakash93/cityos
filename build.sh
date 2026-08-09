#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Collect static files (requires Whitenoise config)
python manage.py collectstatic --no-input

# Run database migrations
python manage.py migrate
python manage.py seed_data
