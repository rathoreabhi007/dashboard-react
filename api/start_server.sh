#!/bin/bash

# ETL API v2 Startup Script with Gunicorn
# This script starts the ETL API server using the new diskcache architecture

echo "🚀 Starting ETL API v2 with Diskcache Architecture..."

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export TASK_STORAGE_DIR="$(pwd)/task_storage"

# Create task storage directory if it doesn't exist
mkdir -p "$TASK_STORAGE_DIR"

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
elif [ -d "venv/Scripts" ]; then
    echo "📦 Activating Windows virtual environment..."
    source venv/Scripts/activate
fi

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if gunicorn config exists
if [ -f "gunicorn.conf.py" ]; then
    echo "⚙️ Starting server with Gunicorn configuration..."
    gunicorn -c gunicorn.conf.py main_v2:app
else
    echo "⚙️ Starting server with default Gunicorn settings..."
    gunicorn main_v2:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 300
fi

echo "✅ ETL API v2 server started successfully!"
