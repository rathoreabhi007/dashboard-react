@echo off
REM ETL API v2 Startup Script for Windows with Gunicorn
REM This script starts the ETL API server using the new diskcache architecture

echo 🚀 Starting ETL API v2 with Diskcache Architecture...

REM Set environment variables
set PYTHONPATH=%PYTHONPATH%;%CD%
set TASK_STORAGE_DIR=%CD%\task_storage

REM Create task storage directory if it doesn't exist
if not exist "%TASK_STORAGE_DIR%" mkdir "%TASK_STORAGE_DIR%"

REM Check if virtual environment exists
if exist "venv\Scripts\activate.bat" (
    echo 📦 Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM Install/update dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Check if gunicorn config exists
if exist "gunicorn.conf.py" (
    echo ⚙️ Starting server with Gunicorn configuration...
    gunicorn -c gunicorn.conf.py main_v2:app
) else (
    echo ⚙️ Starting server with default Gunicorn settings...
    gunicorn main_v2:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 300
)

echo ✅ ETL API v2 server started successfully!
pause
