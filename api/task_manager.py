import uuid
import multiprocessing
import logging
from typing import Dict, Any, Optional
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

# Initialize multiprocessing for Windows
if __name__ == '__main__':
    multiprocessing.freeze_support()

task_registry = {}
manager = None
shared_output = None

# Complete ETL function mapping including all completeness control steps
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

def initialize_manager():
    """Initialize the multiprocessing manager"""
    global manager, shared_output
    if manager is None:
        manager = multiprocessing.Manager()
        shared_output = manager.dict()
    return manager, shared_output

def etl_worker(task_id: str, step_name: str, params: Dict[str, Any], shared_output: Dict):
    """Worker function that runs ETL operations in a separate process"""
    try:
        logger.info(f"Starting ETL step: {step_name} for task: {task_id}")
        
        # Get the appropriate ETL function
        if step_name not in etl_map:
            raise ValueError(f"Unknown ETL step: {step_name}")
        
        etl_function = etl_map[step_name]
        
        # Execute ETL function directly with params
        result = etl_function(params)
        
        logger.info(f"ETL step {step_name} completed successfully for task: {task_id}")
        shared_output[task_id] = {"status": "completed", "output": result}
        
    except Exception as e:
        logger.error(f"Error in ETL step {step_name} for task {task_id}: {str(e)}")
        shared_output[task_id] = {"status": "failed", "output": str(e)}

def run_etl_task(step_name: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Start an ETL task in a separate process"""
    if params is None:
        params = {}
    
    # Initialize manager if not already done
    _, shared_output = initialize_manager()
    
    task_id = str(uuid.uuid4())
    # check if task id in shared output if not abaialbe create a new task id untill it in cammand propmt instead of
    while task_id in shared_output:
        task_id = str(uuid.uuid4())
    logger.info(f"Starting ETL task: {step_name} with ID: {task_id}")
    
    # Initialize task status
    shared_output[task_id] = {"status": "running", "output": None}
    
    # Create and start process
    p = multiprocessing.Process(
        target=etl_worker, 
        args=(task_id, step_name, params, shared_output)
    )
    p.start()
    
    # Register task
    task_registry[task_id] = {"process": p, "pid": p.pid}
    
    logger.info(f"ETL task {task_id} started with PID: {p.pid}")
    return {"task_id": task_id, "status": "started", "pid": p.pid}

def get_task_status(task_id: str) -> Dict[str, Any]:
    """Get the current status of a task"""
    logger.info(f"🔍 Getting status for task: {task_id}")
    
    if task_id not in task_registry:
        logger.warning(f"⚠️ Task {task_id} not found in registry")
        return {"status": "not_found", "output": None}
    
    # Initialize manager if not already done
    _, shared_output = initialize_manager()
    
    # Check if process is still running
    if shared_output[task_id]["status"] == "running":
        p = task_registry[task_id]["process"]
        if not p.is_alive():
            logger.info(f"🔄 Process for task {task_id} is no longer alive, updating status")
            shared_output[task_id]["status"] = "unknown"
    
    result = shared_output.get(task_id, {"status": "unknown", "output": None})
    logger.info(f"📊 Task {task_id} status: {result['status']}")
    
    return result

def get_task_output(task_id: str) -> Any:
    """Get the output of a completed task"""
    logger.info(f"📥 Getting output for task: {task_id}")
    
    # Initialize manager if not already done
    _, shared_output = initialize_manager()
    
    if task_id not in shared_output:
        logger.warning(f"⚠️ Task {task_id} not found in shared output")
        return "Task not found"
    
    task_data = shared_output[task_id]
    logger.info(f"📥 Task {task_id} data: status={task_data.get('status')}, has_output={bool(task_data.get('output'))}")
    
    if task_data["status"] == "running":
        logger.info(f"⏳ Task {task_id} is still running, cannot get output yet")
        return "Task still running"
    elif task_data["status"] == "completed":
        logger.info(f"✅ Task {task_id} completed, returning output")
        return task_data["output"]
    elif task_data["status"] == "failed":
        logger.error(f"❌ Task {task_id} failed: {task_data.get('output', 'Unknown error')}")
        return f"Task failed: {task_data['output']}"
    else:
        logger.warning(f"❓ Task {task_id} has unknown status: {task_data.get('status')}")
        return f"Task status: {task_data['status']}"

def stop_task(task_id: str) -> Dict[str, Any]:
    """Stop a running task"""
    task_info = task_registry.get(task_id)
    if not task_info:
        return {"status": "not_found", "task_id": task_id}
    
    process = task_info["process"]
    if process.is_alive():
        logger.info(f"Stopping task {task_id} with PID {process.pid}")
        process.terminate()
        process.join(timeout=5)  # Wait up to 5 seconds
        
        if process.is_alive():
            process.kill()  # Force kill if still alive
        
        # Initialize manager if not already done
        _, shared_output = initialize_manager()
        shared_output[task_id] = {"status": "terminated", "output": None}
        logger.info(f"Task {task_id} terminated")
        return {"status": "terminated", "task_id": task_id}
    
    return {"status": "not_running", "task_id": task_id}

def cleanup_completed_tasks():
    """Clean up completed tasks from registry"""
    # Initialize manager if not already done
    _, shared_output = initialize_manager()
    
    initial_count = len(task_registry)
    initial_output_count = len(shared_output)
    
    completed_tasks = []
    for task_id, task_info in task_registry.items():
        if not task_info["process"].is_alive():
            completed_tasks.append(task_id)
    
    # Clean up completed tasks
    for task_id in completed_tasks:
        del task_registry[task_id]
        if task_id in shared_output:
            del shared_output[task_id]
    
    final_count = len(task_registry)
    final_output_count = len(shared_output)
    
    if completed_tasks:
        logger.info(f"🧹 Cleanup completed: Removed {len(completed_tasks)} completed tasks")
        logger.info(f"📊 Registry: {initial_count} → {final_count} tasks")
        logger.info(f"📊 Shared output: {initial_output_count} → {final_output_count} entries")
        
        # Log some details about cleaned tasks
        for task_id in completed_tasks[:5]:  # Log first 5 for debugging
            logger.debug(f"   - Cleaned task: {task_id}")
        if len(completed_tasks) > 5:
            logger.debug(f"   - ... and {len(completed_tasks) - 5} more tasks")
    else:
        logger.info("🧹 Cleanup completed: No completed tasks found to clean")
    
    return {
        "tasks_cleaned": len(completed_tasks),
        "registry_before": initial_count,
        "registry_after": final_count,
        "output_before": initial_output_count,
        "output_after": final_output_count
    }