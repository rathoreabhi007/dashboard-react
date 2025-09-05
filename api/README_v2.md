# ETL API v2 - Diskcache Architecture

## Overview

This is a completely redesigned version of the ETL API that solves Gunicorn worker communication issues by using **diskcache** and **JSON file persistence** instead of multiprocessing.Manager(). This architecture is perfect for deployments with less than 25 concurrent clients.

## Key Features

### ✅ **Solves Gunicorn Issues**
- **No more multiprocessing.Manager()** - eliminates worker conflicts
- **Persistent task state** - survives worker restarts and crashes
- **Thread-safe operations** - diskcache handles concurrency
- **No shared memory issues** - each task is stored independently

### ✅ **Simple & Reliable**
- **JSON file storage** - easy to debug and monitor
- **Automatic cleanup** - configurable TTL for old tasks
- **Thread-based execution** - no process management complexity
- **Zero changes** to existing ETL logic

### ✅ **Production Ready**
- **Optimized Gunicorn config** - proper timeouts and worker settings
- **Comprehensive logging** - detailed task tracking
- **Health checks** - system monitoring endpoints
- **Graceful shutdown** - proper cleanup on restart

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   FastAPI App   │───▶│  Task Manager v2 │───▶│  Diskcache +    │
│   (main_v2.py)  │    │  (task_manager_v2)│    │  JSON Files     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Existing ETL    │
                       │  (enhanced_etl.py)│
                       └──────────────────┘
```

## File Structure

```
api/
├── main_v2.py              # New FastAPI application
├── task_manager_v2.py      # New task management system
├── enhanced_etl.py         # Existing ETL logic (unchanged)
├── gunicorn.conf.py        # Optimized Gunicorn configuration
├── start_server.sh         # Linux startup script
├── start_server.bat        # Windows startup script
├── requirements.txt        # Updated dependencies
└── task_storage/           # Task storage directory (auto-created)
    ├── task_cache/         # Diskcache storage
    └── *.json              # Individual task files
```

## Installation & Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Server

**Linux/Mac:**
```bash
chmod +x start_server.sh
./start_server.sh
```

**Windows:**
```cmd
start_server.bat
```

**Manual Start:**
```bash
gunicorn -c gunicorn.conf.py main_v2:app
```

## Configuration

### Task Management Settings
```python
# In task_manager_v2.py
TASK_TTL_HOURS = 24          # Tasks expire after 24 hours
MAX_CONCURRENT_TASKS = 25    # Limit concurrent tasks
TASK_STORAGE_DIR = "task_storage"  # Storage directory
```

### Gunicorn Settings
```python
# In gunicorn.conf.py
workers = 4                  # Number of worker processes
timeout = 300               # 5 minutes for long ETL tasks
worker_class = "uvicorn.workers.UvicornWorker"  # Async support
```

## API Endpoints

### Core Endpoints
- `POST /run/{step_name}` - Start ETL task
- `GET /status/{task_id}` - Get task status
- `GET /output/{task_id}` - Get task output
- `POST /stop/{task_id}` - Stop running task

### Management Endpoints
- `GET /health` - Health check with system stats
- `GET /stats` - System statistics
- `GET /tasks` - List all tasks
- `POST /cleanup/now` - Manual cleanup
- `GET /cleanup/schedule` - Get cleanup schedule

## Task Lifecycle

1. **Task Creation**: Task ID generated, JSON file created
2. **Task Execution**: Thread started, status updated to "running"
3. **Task Completion**: Result saved, status updated to "completed"
4. **Task Cleanup**: Automatic cleanup after TTL expires

## Monitoring & Debugging

### Task Files
Each task is stored as a JSON file in `task_storage/`:
```json
{
  "task_id": "uuid-here",
  "step_name": "reading_config_comp",
  "status": "completed",
  "created_at": "2024-01-01T10:00:00",
  "started_at": "2024-01-01T10:00:01",
  "completed_at": "2024-01-01T10:00:30",
  "result": { ... },
  "error": null
}
```

### Logs
- **Task creation**: `🎯 Starting ETL task: {step_name} with ID: {task_id}`
- **Task execution**: `🚀 Starting ETL step: {step_name} for task: {task_id}`
- **Task completion**: `✅ ETL step {step_name} completed successfully`
- **Task cleanup**: `🧹 Cleanup completed: Removed {count} old tasks`

## Migration from v1

### What Changes
- **API endpoints**: Same interface, enhanced responses
- **Task management**: New diskcache-based system
- **Deployment**: New Gunicorn configuration

### What Stays the Same
- **ETL logic**: Zero changes to `enhanced_etl.py`
- **API interface**: Same request/response format
- **Step definitions**: Same step names and parameters

### Migration Steps
1. **Backup current system**
2. **Deploy new files** alongside existing ones
3. **Test with new endpoints** (`main_v2.py`)
4. **Switch traffic** to new system
5. **Remove old files** after verification

## Performance Characteristics

### Memory Usage
- **Lower memory footprint** - no shared memory overhead
- **Predictable memory usage** - each task is independent
- **Automatic cleanup** - prevents memory leaks

### Concurrency
- **Thread-based execution** - better for I/O bound tasks
- **Configurable limits** - prevent resource exhaustion
- **Worker isolation** - no cross-worker interference

### Reliability
- **Persistent state** - survives crashes and restarts
- **Atomic operations** - thread-safe file operations
- **Error recovery** - graceful handling of failures

## Troubleshooting

### Common Issues

**1. Task not found**
- Check if task file exists in `task_storage/`
- Verify task ID is correct
- Check if task has expired (TTL)

**2. Worker timeout**
- Increase `timeout` in `gunicorn.conf.py`
- Check ETL task complexity
- Monitor system resources

**3. Storage issues**
- Ensure `task_storage/` directory is writable
- Check disk space
- Verify diskcache permissions

### Debug Commands
```bash
# Check task files
ls -la task_storage/

# Monitor logs
tail -f /var/log/etl-api.log

# Check system stats
curl http://localhost:8000/stats
```

## Benefits Over v1

| Feature | v1 (Multiprocessing) | v2 (Diskcache) |
|---------|---------------------|----------------|
| **Worker Communication** | ❌ Shared memory conflicts | ✅ File-based persistence |
| **Crash Recovery** | ❌ Lost task state | ✅ Persistent task state |
| **Debugging** | ❌ Complex shared state | ✅ Simple JSON files |
| **Scalability** | ❌ Limited by shared memory | ✅ Limited by disk space |
| **Monitoring** | ❌ Hard to inspect | ✅ Easy file inspection |
| **Deployment** | ❌ Complex worker setup | ✅ Simple Gunicorn config |

## Support

For issues or questions:
1. Check the logs for error messages
2. Inspect task JSON files in `task_storage/`
3. Use the `/health` and `/stats` endpoints
4. Review Gunicorn configuration settings

---

**Note**: This architecture is specifically designed for deployments with less than 25 concurrent clients. For higher concurrency, consider implementing a message queue system (Redis/RabbitMQ) with Celery.
