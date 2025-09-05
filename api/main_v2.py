from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from task_manager_v2 import (
    run_etl_task, get_task_status, get_task_output, stop_task, 
    cleanup_completed_tasks, get_all_tasks, get_system_stats
)
import uvicorn
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = AsyncIOScheduler()

# Pydantic models for request/response validation
class RunParameters(BaseModel):
    expectedRunDate: str = "2024-01-01"
    inputConfigFilePath: str = "/path/to/config"
    inputConfigFilePattern: str = "*.json"
    rootFileDir: str = "/data"
    runEnv: str = "production"
    tempFilePath: str = "/tmp"

class ETLStepRequest(BaseModel):
    step_name: Optional[str] = None  # Optional since it's in the URL path
    parameters: Optional[RunParameters] = None
    previous_outputs: Optional[Dict[str, Any]] = None
    custom_params: Optional[Dict[str, Any]] = None

class TaskResponse(BaseModel):
    task_id: str
    status: str
    pid: int
    thread_id: int
    step_name: str

class StatusResponse(BaseModel):
    status: str
    output: Optional[Any] = None
    error: Optional[str] = None
    step_name: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

class OutputResponse(BaseModel):
    output: Any

class StopResponse(BaseModel):
    status: str
    task_id: Optional[str] = None

class CleanupScheduleRequest(BaseModel):
    hour: int = 23  # Default: 11 PM
    minute: int = 0  # Default: 0 minutes
    timezone: str = "UTC"  # Default timezone

class SystemStatsResponse(BaseModel):
    total_tasks: int
    running_tasks: int
    completed_tasks: int
    failed_tasks: int
    max_concurrent_tasks: int
    task_ttl_hours: int
    storage_directory: str

# Completeness Control Step Names (matching frontend)
COMPLETENESS_STEPS = {
    # Initial steps
    'reading_config_comp': 'Reading_Config_Comp',
    'read_src_comp': 'Read_SRC_Comp',
    'read_tgt_comp': 'Read_TGT_Comp',
    
    # SRC flow steps
    'pre_harmonisation_src_comp': 'Reading & Pre-Harmonisation_SRC',
    'harmonisation_src_comp': 'Harmonisation_SRC',
    'enrichment_file_search_src_comp': 'Enrichment File Search_SRC',
    'enrichment_src_comp': 'Enrichment_SRC',
    'data_transform_src_comp': 'Data Transform Post Enrichment_SRC',
    
    # TGT flow steps
    'pre_harmonisation_tgt_comp': 'Reading & Pre-Harmonisation_TGT',
    'harmonisation_tgt_comp': 'Harmonisation_TGT',
    'enrichment_file_search_tgt_comp': 'Enrichment File Search_TGT',
    'enrichment_tgt_comp': 'Enrichment_TGT',
    'data_transform_tgt_comp': 'Data Transform Post Enrichment_TGT',
    
    # Combined steps
    'combine_data_comp': 'Combine SRC and TGT Data',
    'apply_rules_comp': 'Apply Rec Rules & Break Explain',
    'output_rules_comp': 'Output Rules',
    'break_rolling_comp': 'BreakRolling Details'
}

# Workflow Tool Step Names
WORKFLOW_STEPS = {
    # Data Source Nodes
    'read_csv': 'Read CSV File',
    'read_parquet': 'Read Parquet File',
    'read_excel': 'Read Excel File',
    
    # Data Transform Nodes
    'convert_parquet': 'Convert to Parquet',
    'filter': 'Filter Data',
    'join': 'Join Data',
    'aggregate': 'Aggregate Data',
    'output': 'Data Output'
}

async def scheduled_cleanup():
    """Scheduled cleanup function that runs daily"""
    try:
        logger.info("🔄 Starting scheduled cleanup of completed tasks...")
        result = cleanup_completed_tasks()
        logger.info(f"✅ Scheduled cleanup completed: {result['tasks_cleaned']} tasks cleaned")
    except Exception as e:
        logger.error(f"❌ Error during scheduled cleanup: {str(e)}")

def setup_scheduled_cleanup(hour: int = 23, minute: int = 0, timezone: str = "UTC"):
    """Setup the scheduled cleanup job"""
    try:
        # Remove existing cleanup job if it exists
        try:
            scheduler.remove_job('daily_cleanup')
        except:
            pass  # Job doesn't exist, which is fine
        
        # Add new cleanup job
        scheduler.add_job(
            func=scheduled_cleanup,
            trigger=CronTrigger(hour=hour, minute=minute, timezone=timezone),
            id='daily_cleanup',
            name='Daily Task Cleanup',
            replace_existing=True
        )
        
        logger.info(f"📅 Scheduled cleanup set for {hour:02d}:{minute:02d} {timezone} daily")
        return True
    except Exception as e:
        logger.error(f"❌ Error setting up scheduled cleanup: {str(e)}")
        return False

def merge_previous_outputs_to_params(params: Dict[str, Any], previous_outputs: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Merge previous outputs into the parameters dictionary with enhanced ETL support"""
    if previous_outputs:
        logger.info(f"📋 Processing {len(previous_outputs)} previous outputs for enhanced ETL system")
        
        # Add previous outputs to params
        params['previous_outputs'] = previous_outputs
        
        # Extract specific data from previous outputs if available
        for step_name, output in previous_outputs.items():
            if isinstance(output, dict):
                # Validate that the previous output is successful
                if output.get('status') == 'failed' or output.get('fail_message'):
                    logger.error(f"❌ Previous output from {step_name} has failed status: {output.get('fail_message', 'Unknown error')}")
                    continue
                
                # Add step-specific data to params
                params[f'{step_name}_data'] = output.get('calculation_results', {})
                params[f'{step_name}_status'] = output.get('status', 'success')
                params[f'{step_name}_histogram'] = output.get('histogram_data', [])
                
                # Enhanced ETL: Add file information for CSV file flow
                if output.get('file_info'):
                    params[f'{step_name}_file_info'] = output['file_info']
                    logger.info(f"📁 Added file info from {step_name}: {output['file_info'].get('file_path', 'Unknown path')}")
                
                if output.get('input_file_info'):
                    params[f'{step_name}_input_file_info'] = output['input_file_info']
                    logger.info(f"📖 Added input file info from {step_name}: {output['input_file_info'].get('file_path', 'Unknown path')}")
                
                # If there's table data, add it
                if 'calculation_results' in output and 'table' in output['calculation_results']:
                    params[f'{step_name}_table'] = output['calculation_results']['table']
                
                # If there's headers data, add it
                if 'calculation_results' in output and 'headers' in output['calculation_results']:
                    params[f'{step_name}_headers'] = output['calculation_results']['headers']
                
                logger.info(f"✅ Successfully processed previous output from {step_name}")
            else:
                logger.warning(f"⚠️ Previous output from {step_name} is not a dictionary: {type(output)}")
    
    return params

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 ETL API server v2 starting up with diskcache architecture...")
    logger.info("🔧 CORS middleware configured")
    
    # Setup default scheduled cleanup (11 PM UTC daily)
    setup_scheduled_cleanup()
    
    # Start the scheduler
    scheduler.start()
    logger.info("⏰ Task scheduler started")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down ETL API server v2...")
    scheduler.shutdown()
    logger.info("⏰ Task scheduler stopped")

app = FastAPI(
    title="ETL API v2", 
    description="API for running ETL tasks with diskcache-based task management", 
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the ETL API v2 with Diskcache Task Management",
        "version": "2.0.0",
        "architecture": "diskcache + JSON persistence"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint with system stats"""
    try:
        stats = get_system_stats()
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "system_stats": stats
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/steps")
async def get_available_steps():
    """Get all available ETL steps"""
    all_steps = {**COMPLETENESS_STEPS, **WORKFLOW_STEPS}
    return {
        "steps": all_steps,
        "total_steps": len(all_steps)
    }

@app.post("/run/{step_name}", response_model=TaskResponse)
async def run_etl_step(step_name: str, request: ETLStepRequest):
    """Run an ETL step with parameters and previous outputs"""
    try:
        logger.info(f"📝 Received ETL request for step: {step_name}")
        
        # Validate step name against both completeness and workflow steps
        if step_name not in COMPLETENESS_STEPS and step_name not in WORKFLOW_STEPS:
            raise HTTPException(status_code=400, detail=f"Invalid step name: {step_name}")
        
        # Prepare parameters
        params = {}
        
        # Add default parameters if not provided
        if request.parameters:
            params.update(request.parameters.dict())
        else:
            # Use default parameters
            default_params = RunParameters()
            params.update(default_params.dict())
        
        # Add custom parameters if provided
        if request.custom_params:
            params.update(request.custom_params)
        
        # Add step information
        params['step_name'] = step_name
        if step_name in COMPLETENESS_STEPS:
            params['step_display_name'] = COMPLETENESS_STEPS[step_name]
        else:
            params['step_display_name'] = WORKFLOW_STEPS[step_name]
        
        # Log parameters
        logger.info("📋 Parameters received:")
        for key, value in params.items():
            logger.info(f"  - {key}: {value}")
        
        # Log previous outputs and validate them
        if request.previous_outputs:
            logger.info("📋 Previous outputs received:")
            for node_id, output in request.previous_outputs.items():
                logger.info(f"  - From step {node_id}: {type(output)}")
                
                # Validate that previous outputs are successful
                if isinstance(output, dict):
                    if output.get('status') == 'failed' or output.get('fail_message'):
                        error_msg = f"Cannot run {step_name}: dependency {node_id} has failed - {output.get('fail_message', 'Unknown error')}"
                        logger.error(f"❌ {error_msg}")
                        raise HTTPException(
                            status_code=400, 
                            detail=error_msg
                        )
                    else:
                        logger.info(f"✅ Previous output from {node_id} is valid (status: {output.get('status', 'unknown')})")
                else:
                    logger.warning(f"⚠️ Previous output from {node_id} is not a dictionary: {type(output)}")
        else:
            logger.info("📋 No previous outputs received")
        
        # Merge previous outputs into params
        params = merge_previous_outputs_to_params(params, request.previous_outputs)
        
        # Start the ETL task
        result = run_etl_task(step_name, params)
        logger.info(f"🚀 ETL task started: {result}")
        
        return TaskResponse(
            task_id=result["task_id"],
            status=result["status"],
            pid=result["pid"],
            thread_id=result["thread_id"],
            step_name=step_name
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"❌ Error starting ETL task: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{task_id}", response_model=StatusResponse)
async def get_status(task_id: str):
    """Get the status of a running task"""
    try:
        logger.info(f"📊 Status request received for task: {task_id}")
        
        result = get_task_status(task_id)
        logger.info(f"📊 Status response for task {task_id}: {result}")
        
        # Log detailed status information
        if result.get("status") == "completed":
            logger.info(f"✅ Task {task_id} is completed")
        elif result.get("status") == "failed":
            logger.error(f"❌ Task {task_id} failed: {result.get('error', 'Unknown error')}")
        elif result.get("status") == "running":
            logger.info(f"⏳ Task {task_id} is still running")
        elif result.get("status") == "not_found":
            logger.warning(f"⚠️ Task {task_id} not found in registry")
        else:
            logger.warning(f"❓ Task {task_id} has unknown status: {result.get('status')}")
        
        return StatusResponse(**result)
    except Exception as e:
        logger.error(f"❌ Error getting task status for {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/output/{task_id}")
async def get_output(task_id: str):
    """Get the output of a task"""
    try:
        logger.info(f"📥 Output request received for task: {task_id}")
        
        result = get_task_output(task_id)
        logger.info(f"📥 Output response for task {task_id}: Type={type(result)}, HasData={bool(result)}")
        
        # Log output details if available
        if isinstance(result, dict):
            logger.info(f"📥 Task {task_id} output keys: {list(result.keys()) if result else 'None'}")
        elif isinstance(result, str):
            logger.info(f"📥 Task {task_id} output length: {len(result)} characters")
        
        return {"output": result}
    except Exception as e:
        logger.error(f"❌ Error getting task output for {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stop/{task_id}", response_model=StopResponse)
async def stop_task_endpoint(task_id: str):
    """Stop a running task"""
    try:
        logger.info(f"🛑 Stopping task: {task_id}")
        result = stop_task(task_id)
        return StopResponse(**result)
    except Exception as e:
        logger.error(f"❌ Error stopping task: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cleanup/now")
async def manual_cleanup():
    """Manually trigger cleanup of completed tasks"""
    try:
        logger.info("🧹 Manual cleanup triggered")
        result = cleanup_completed_tasks()
        return {
            "status": "success", 
            "message": f"Manual cleanup completed: {result['tasks_cleaned']} tasks cleaned",
            "details": result
        }
    except Exception as e:
        logger.error(f"❌ Error during manual cleanup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cleanup/schedule")
async def update_cleanup_schedule(request: CleanupScheduleRequest):
    """Update the scheduled cleanup time"""
    try:
        success = setup_scheduled_cleanup(
            hour=request.hour,
            minute=request.minute,
            timezone=request.timezone
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Cleanup scheduled for {request.hour:02d}:{request.minute:02d} {request.timezone} daily"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update cleanup schedule")
    except Exception as e:
        logger.error(f"❌ Error updating cleanup schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cleanup/schedule")
async def get_cleanup_schedule():
    """Get the current cleanup schedule"""
    try:
        job = scheduler.get_job('daily_cleanup')
        if job:
            return {
                "status": "success",
                "schedule": {
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                    "trigger": str(job.trigger)
                }
            }
        else:
            return {
                "status": "not_found",
                "message": "No cleanup schedule found"
            }
    except Exception as e:
        logger.error(f"❌ Error getting cleanup schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks", response_model=List[Dict[str, Any]])
async def get_all_tasks_endpoint(limit: int = 100):
    """Get all tasks with optional limit"""
    try:
        tasks = get_all_tasks(limit)
        return tasks
    except Exception as e:
        logger.error(f"❌ Error getting all tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats_endpoint():
    """Get system statistics"""
    try:
        stats = get_system_stats()
        return SystemStatsResponse(**stats)
    except Exception as e:
        logger.error(f"❌ Error getting system stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
