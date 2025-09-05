import uuid
import threading
import logging
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pathlib import Path
import diskcache as dc
from enhanced_etl import (
    # Completeness Control Steps
    reading_config_comp, read_src_comp, read_tgt_comp,
    pre_harmonisation_src_comp, harmonisation_src_comp, enrichment_file_search_src_comp,
    enrichment_src_comp, data_transform_src_comp,
    pre_harmonisation_tgt_comp, harmonisation_tgt_comp, enrichment_file_search_tgt_comp,
    enrichment_tgt_comp, data_transform_tgt_comp,
    combine_data_comp, apply_rules_comp, output_rules_comp, break_rolling_comp,
    # Legacy ETL functions
    extract, transform, load, validate, enrich, aggregate,
    # Workflow Tool ETL functions
    read_csv, read_parquet, read_excel, convert_parquet, filter_data, join_data, aggregate_data, data_output
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
TASK_STORAGE_DIR = Path("task_storage")
TASK_STORAGE_DIR.mkdir(exist_ok=True)
TASK_TTL_HOURS = 24  # Tasks expire after 24 hours
MAX_CONCURRENT_TASKS = 25  # Limit concurrent tasks

# Initialize diskcache
cache = dc.Cache(str(TASK_STORAGE_DIR / "task_cache"))

# Thread lock for task operations
task_lock = threading.Lock()

# Complete ETL function mapping (same as before)
etl_map = {
    # Completeness Control Steps
    'reading_config_comp': reading_config_comp,
    'read_src_comp': read_src_comp,
    'read_tgt_comp': read_tgt_comp,
    'pre_harmonisation_src_comp': pre_harmonisation_src_comp,
    'harmonisation_src_comp': harmonisation_src_comp,
    'enrichment_file_search_src_comp': enrichment_file_search_src_comp,
    'enrichment_src_comp': enrichment_src_comp,
    'data_transform_src_comp': data_transform_src_comp,
    'pre_harmonisation_tgt_comp': pre_harmonisation_tgt_comp,
    'harmonisation_tgt_comp': harmonisation_tgt_comp,
    'enrichment_file_search_tgt_comp': enrichment_file_search_tgt_comp,
    'enrichment_tgt_comp': enrichment_tgt_comp,
    'data_transform_tgt_comp': data_transform_tgt_comp,
    'combine_data_comp': combine_data_comp,
    'apply_rules_comp': apply_rules_comp,
    'output_rules_comp': output_rules_comp,
    'break_rolling_comp': break_rolling_comp,
    
    # Legacy ETL functions for backward compatibility
    'extract': extract,
    'transform': transform,
    'load': load,
    'validate': validate,
    'enrich': enrich,
    'aggregate': aggregate,
    
    # Workflow Tool ETL functions
    'read_csv': read_csv,
    'read_parquet': read_parquet,
    'read_excel': read_excel,
    'convert_parquet': convert_parquet,
    'filter': filter_data,
    'join': join_data,
    'aggregate': aggregate_data,
    'output': data_output
}

class TaskStatus:
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

def create_task_record(task_id: str, step_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new task record"""
    return {
        "task_id": task_id,
        "step_name": step_name,
        "status": TaskStatus.PENDING,
        "created_at": datetime.now().isoformat(),
        "started_at": None,
        "completed_at": None,
        "params": params,
        "result": None,
        "error": None,
        "pid": None,
        "thread_id": None
    }

def save_task_to_disk(task_id: str, task_data: Dict[str, Any]):
    """Save task data to disk as JSON file"""
    try:
        task_file = TASK_STORAGE_DIR / f"{task_id}.json"
        with open(task_file, 'w') as f:
            json.dump(task_data, f, indent=2, default=str)
        logger.debug(f"💾 Saved task {task_id} to disk")
    except Exception as e:
        logger.error(f"❌ Error saving task {task_id} to disk: {e}")

def load_task_from_disk(task_id: str) -> Optional[Dict[str, Any]]:
    """Load task data from disk JSON file"""
    try:
        task_file = TASK_STORAGE_DIR / f"{task_id}.json"
        if not task_file.exists():
            return None
        
        with open(task_file, 'r') as f:
            task_data = json.load(f)
        logger.debug(f"📖 Loaded task {task_id} from disk")
        return task_data
    except Exception as e:
        logger.error(f"❌ Error loading task {task_id} from disk: {e}")
        return None

def etl_worker_thread(task_id: str, step_name: str, params: Dict[str, Any]):
    """Worker thread that runs ETL operations"""
    thread_id = threading.current_thread().ident
    logger.info(f"🚀 Starting ETL step: {step_name} for task: {task_id} in thread: {thread_id}")
    
    try:
        # Update task status to running
        with task_lock:
            task_data = load_task_from_disk(task_id)
            if not task_data:
                logger.error(f"❌ Task {task_id} not found in disk storage")
                return
            
            task_data.update({
                "status": TaskStatus.RUNNING,
                "started_at": datetime.now().isoformat(),
                "thread_id": thread_id,
                "pid": os.getpid()
            })
            save_task_to_disk(task_id, task_data)
            cache.set(f"task:{task_id}", task_data, expire=TASK_TTL_HOURS * 3600)
        
        # Get the appropriate ETL function
        if step_name not in etl_map:
            raise ValueError(f"Unknown ETL step: {step_name}")
        
        etl_function = etl_map[step_name]
        
        # Execute ETL function
        logger.info(f"⚙️ Executing ETL function: {step_name}")
        result = etl_function(params)
        
        # Update task status to completed
        with task_lock:
            task_data = load_task_from_disk(task_id)
            if task_data:
                task_data.update({
                    "status": TaskStatus.COMPLETED,
                    "completed_at": datetime.now().isoformat(),
                    "result": result,
                    "error": None
                })
                save_task_to_disk(task_id, task_data)
                cache.set(f"task:{task_id}", task_data, expire=TASK_TTL_HOURS * 3600)
        
        logger.info(f"✅ ETL step {step_name} completed successfully for task: {task_id}")
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error in ETL step {step_name} for task {task_id}: {error_msg}")
        
        # Update task status to failed
        with task_lock:
            task_data = load_task_from_disk(task_id)
            if task_data:
                task_data.update({
                    "status": TaskStatus.FAILED,
                    "completed_at": datetime.now().isoformat(),
                    "result": None,
                    "error": error_msg
                })
                save_task_to_disk(task_id, task_data)
                cache.set(f"task:{task_id}", task_data, expire=TASK_TTL_HOURS * 3600)

def run_etl_task(step_name: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Start an ETL task in a separate thread"""
    if params is None:
        params = {}
    
    # Check concurrent task limit
    with task_lock:
        running_tasks = get_running_tasks_count()
        if running_tasks >= MAX_CONCURRENT_TASKS:
            raise Exception(f"Maximum concurrent tasks limit reached ({MAX_CONCURRENT_TASKS})")
    
    # Generate unique task ID
    task_id = str(uuid.uuid4())
    
    # Ensure task ID is unique
    while load_task_from_disk(task_id) is not None:
        task_id = str(uuid.uuid4())
    
    logger.info(f"🎯 Starting ETL task: {step_name} with ID: {task_id}")
    
    # Create task record
    task_data = create_task_record(task_id, step_name, params)
    
    # Save to disk and cache
    with task_lock:
        save_task_to_disk(task_id, task_data)
        cache.set(f"task:{task_id}", task_data, expire=TASK_TTL_HOURS * 3600)
    
    # Start worker thread
    thread = threading.Thread(
        target=etl_worker_thread,
        args=(task_id, step_name, params),
        daemon=True
    )
    thread.start()
    
    logger.info(f"🚀 ETL task {task_id} started in thread: {thread.ident}")
    
    return {
        "task_id": task_id,
        "status": "started",
        "pid": os.getpid(),
        "thread_id": thread.ident
    }

def get_task_status(task_id: str) -> Dict[str, Any]:
    """Get the current status of a task"""
    logger.info(f"🔍 Getting status for task: {task_id}")
    
    # Try cache first, then disk
    task_data = cache.get(f"task:{task_id}")
    if not task_data:
        task_data = load_task_from_disk(task_id)
    
    if not task_data:
        logger.warning(f"⚠️ Task {task_id} not found")
        return {"status": "not_found", "output": None}
    
    status = task_data.get("status", "unknown")
    result = task_data.get("result")
    error = task_data.get("error")
    
    logger.info(f"📊 Task {task_id} status: {status}")
    
    return {
        "status": status,
        "output": result if status == TaskStatus.COMPLETED else None,
        "error": error if status == TaskStatus.FAILED else None,
        "step_name": task_data.get("step_name"),
        "created_at": task_data.get("created_at"),
        "started_at": task_data.get("started_at"),
        "completed_at": task_data.get("completed_at")
    }

def get_task_output(task_id: str) -> Any:
    """Get the output of a completed task"""
    logger.info(f"📥 Getting output for task: {task_id}")
    
    # Try cache first, then disk
    task_data = cache.get(f"task:{task_id}")
    if not task_data:
        task_data = load_task_from_disk(task_id)
    
    if not task_data:
        logger.warning(f"⚠️ Task {task_id} not found")
        return "Task not found"
    
    status = task_data.get("status", "unknown")
    result = task_data.get("result")
    error = task_data.get("error")
    
    if status == TaskStatus.RUNNING:
        logger.info(f"⏳ Task {task_id} is still running")
        return "Task still running"
    elif status == TaskStatus.COMPLETED:
        logger.info(f"✅ Task {task_id} completed, returning output")
        return result
    elif status == TaskStatus.FAILED:
        logger.error(f"❌ Task {task_id} failed: {error}")
        return f"Task failed: {error}"
    else:
        logger.warning(f"❓ Task {task_id} has status: {status}")
        return f"Task status: {status}"

def stop_task(task_id: str) -> Dict[str, Any]:
    """Stop a running task (mark as cancelled)"""
    logger.info(f"🛑 Stopping task: {task_id}")
    
    with task_lock:
        task_data = load_task_from_disk(task_id)
        if not task_data:
            return {"status": "not_found", "task_id": task_id}
        
        if task_data.get("status") == TaskStatus.RUNNING:
            task_data.update({
                "status": TaskStatus.CANCELLED,
                "completed_at": datetime.now().isoformat(),
                "error": "Task cancelled by user"
            })
            save_task_to_disk(task_id, task_data)
            cache.set(f"task:{task_id}", task_data, expire=TASK_TTL_HOURS * 3600)
            logger.info(f"✅ Task {task_id} marked as cancelled")
            return {"status": "cancelled", "task_id": task_id}
        else:
            return {"status": "not_running", "task_id": task_id}

def get_running_tasks_count() -> int:
    """Get count of currently running tasks"""
    count = 0
    for task_file in TASK_STORAGE_DIR.glob("*.json"):
        try:
            with open(task_file, 'r') as f:
                task_data = json.load(f)
                if task_data.get("status") == TaskStatus.RUNNING:
                    count += 1
        except Exception as e:
            logger.warning(f"⚠️ Error reading task file {task_file}: {e}")
    return count

def cleanup_completed_tasks() -> Dict[str, Any]:
    """Clean up old completed tasks"""
    logger.info("🧹 Starting cleanup of old tasks...")
    
    cutoff_time = datetime.now() - timedelta(hours=TASK_TTL_HOURS)
    cleaned_tasks = []
    
    with task_lock:
        for task_file in TASK_STORAGE_DIR.glob("*.json"):
            try:
                with open(task_file, 'r') as f:
                    task_data = json.load(f)
                
                # Check if task is old and completed/failed/cancelled
                created_at = datetime.fromisoformat(task_data.get("created_at", "1970-01-01T00:00:00"))
                status = task_data.get("status")
                
                if (created_at < cutoff_time and 
                    status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]):
                    
                    task_id = task_data.get("task_id")
                    if task_id:
                        # Remove from cache
                        cache.delete(f"task:{task_id}")
                        # Remove file
                        task_file.unlink()
                        cleaned_tasks.append(task_id)
                        logger.debug(f"🗑️ Cleaned up old task: {task_id}")
            
            except Exception as e:
                logger.warning(f"⚠️ Error processing task file {task_file}: {e}")
    
    logger.info(f"✅ Cleanup completed: Removed {len(cleaned_tasks)} old tasks")
    return {
        "tasks_cleaned": len(cleaned_tasks),
        "cleaned_task_ids": cleaned_tasks
    }

def get_all_tasks(limit: int = 100) -> List[Dict[str, Any]]:
    """Get all tasks with optional limit"""
    tasks = []
    
    for task_file in sorted(TASK_STORAGE_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        if len(tasks) >= limit:
            break
            
        try:
            with open(task_file, 'r') as f:
                task_data = json.load(f)
                # Return only essential info
                tasks.append({
                    "task_id": task_data.get("task_id"),
                    "step_name": task_data.get("step_name"),
                    "status": task_data.get("status"),
                    "created_at": task_data.get("created_at"),
                    "completed_at": task_data.get("completed_at")
                })
        except Exception as e:
            logger.warning(f"⚠️ Error reading task file {task_file}: {e}")
    
    return tasks

def get_system_stats() -> Dict[str, Any]:
    """Get system statistics"""
    total_tasks = 0
    running_tasks = 0
    completed_tasks = 0
    failed_tasks = 0
    
    for task_file in TASK_STORAGE_DIR.glob("*.json"):
        try:
            with open(task_file, 'r') as f:
                task_data = json.load(f)
                total_tasks += 1
                status = task_data.get("status")
                
                if status == TaskStatus.RUNNING:
                    running_tasks += 1
                elif status == TaskStatus.COMPLETED:
                    completed_tasks += 1
                elif status == TaskStatus.FAILED:
                    failed_tasks += 1
        except Exception as e:
            logger.warning(f"⚠️ Error reading task file {task_file}: {e}")
    
    return {
        "total_tasks": total_tasks,
        "running_tasks": running_tasks,
        "completed_tasks": completed_tasks,
        "failed_tasks": failed_tasks,
        "max_concurrent_tasks": MAX_CONCURRENT_TASKS,
        "task_ttl_hours": TASK_TTL_HOURS,
        "storage_directory": str(TASK_STORAGE_DIR)
    }
