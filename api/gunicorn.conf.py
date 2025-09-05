# Gunicorn configuration for ETL API v2 with diskcache architecture
import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = min(4, multiprocessing.cpu_count() * 2 + 1)  # Optimal for I/O bound tasks
worker_class = "uvicorn.workers.UvicornWorker"  # Use UvicornWorker for async support
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100

# Timeouts
timeout = 300  # 5 minutes for long-running ETL tasks
keepalive = 5
graceful_timeout = 30

# Restart workers
preload_app = True  # Preload app for better memory usage
reload = False  # Set to True for development

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "etl_api_v2"

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Performance tuning
worker_tmp_dir = "/dev/shm"  # Use shared memory for worker temp files (Linux)
# For Windows, comment out the above line

# Environment variables
raw_env = [
    "PYTHONPATH=/app",
    "TASK_STORAGE_DIR=/app/task_storage",
]

# SSL (uncomment if using HTTPS)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

# Stats (uncomment for monitoring)
# statsd_host = "localhost:8125"
# statsd_prefix = "etl_api"

def when_ready(server):
    """Called just after the server is started."""
    server.log.info("🚀 ETL API v2 server is ready with diskcache architecture")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    worker.log.info(f"🛑 Worker {worker.pid} received SIGINT/SIGQUIT")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    server.log.info(f"🔄 Worker {worker.pid} is about to be forked")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"✅ Worker {worker.pid} has been forked")

def worker_abort(worker):
    """Called when a worker received the SIGABRT signal."""
    worker.log.error(f"💥 Worker {worker.pid} received SIGABRT")

def on_exit(server):
    """Called just before exiting."""
    server.log.info("🛑 ETL API v2 server is shutting down")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("🔄 ETL API v2 server is reloading")
