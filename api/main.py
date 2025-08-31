from fastapi import FastAPI, HTTPException
import time
from pydantic import BaseModel
import asyncio
from typing import Dict, Optional, List, Any
import uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request
import logging
import random
from datetime import datetime
from enum import Enum
import string

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI server starting up...")
    logger.info("CORS middleware configured")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

class NodeType(str, Enum):
    CONFIG_COMP = "reading_config_comp"
    READ_SRC_COMP = "read_src_comp"
    READ_TGT_COMP = "read_tgt_comp"
    PRE_HARMONISATION_SRC_COMP = "pre_harmonisation_src_comp"
    PRE_HARMONISATION_TGT_COMP = "pre_harmonisation_tgt_comp"
    HARMONISATION_SRC_COMP = "harmonisation_src_comp"
    HARMONISATION_TGT_COMP = "harmonisation_tgt_comp"
    ENRICHMENT_FILE_SEARCH_SRC_COMP = "enrichment_file_search_src_comp"
    ENRICHMENT_FILE_SEARCH_TGT_COMP = "enrichment_file_search_tgt_comp"
    ENRICHMENT_SRC_COMP = "enrichment_src_comp"
    ENRICHMENT_TGT_COMP = "enrichment_tgt_comp"
    DATA_TRANSFORM_SRC_COMP = "data_transform_src_comp"
    DATA_TRANSFORM_TGT_COMP = "data_transform_tgt_comp"
    COMBINE_DATA_COMP = "combine_data_comp"
    APPLY_RULES_COMP = "apply_rules_comp"
    OUTPUT_RULES_COMP = "output_rules_comp"
    BREAK_ROLLING_COMP = "break_rolling_comp"

class RunParameters(BaseModel):
    expectedRunDate: str
    inputConfigFilePath: str
    inputConfigFilePattern: str
    rootFileDir: str
    runEnv: str
    tempFilePath: str

class CalculationInput(BaseModel):
    nodeId: str
    parameters: RunParameters
    previousOutputs: Optional[Dict[str, Any]] = None

class ProcessStatus(BaseModel):
    process_id: str
    status: str  # "pending", "running", "completed", "failed", "stopped"
    node_id: str
    output: Optional[Dict] = None
    error: Optional[str] = None
    start_time: float
    parameters: Optional[Dict] = None

class ProcessResponse(BaseModel):
    process_id: str
    status: str
    output: Optional[Dict] = None

# Store process information and tasks in memory
processes: Dict[str, ProcessStatus] = {}
tasks: Dict[str, asyncio.Task] = {}

# Store process states
process_states = {}

@app.get("/")
def read_root():
    return {"message": "Welcome to the Long-Running Calculator API"}

@app.post("/run/{node_id}")
async def run_node(node_id: str, input_data: CalculationInput):
    process_id = f"{node_id}_{int(time.time() * 1000)}"
    
    logger.info(f"📝 Received calculation request for node {node_id} - Process ID: {process_id}")
    logger.info("📋 Parameters received:")
    for key, value in input_data.parameters.dict().items():
        logger.info(f"  - {key}: {value}")
    
    if input_data.previousOutputs:
        logger.info("📋 Previous outputs received:")
        for node_id, output in input_data.previousOutputs.items():
            logger.info(f"  - From node {node_id}: {output}")
    
    # Store initial process state
    processes[process_id] = ProcessStatus(
        process_id=process_id,
        status="running",
        node_id=node_id,
        start_time=time.time(),
        parameters=input_data.parameters.dict()
    )
    
    # Start the node processing in the background
    task = asyncio.create_task(process_node_async(process_id, node_id, input_data.parameters, input_data.previousOutputs))
    tasks[process_id] = task
    
    return {
        "process_id": process_id,
        "status": "running",
        "message": f"Node {node_id} processing started"
    }

@app.get("/status/{process_id}")
async def get_status(process_id: str):
    if process_id not in processes:
        raise HTTPException(status_code=404, detail="Process not found")
    
    process = processes[process_id]
    elapsed_time = time.time() - process.start_time
    
    return {
        "process_id": process_id,
        "status": process.status,
        "node_id": process.node_id,
        "output": process.output,
        "error": process.error,
        "elapsed_time": f"{elapsed_time:.2f} seconds",
        "parameters": process.parameters
    }

@app.post("/stop/{process_id}")
async def stop_process(process_id: str):
    if process_id not in processes:
        raise HTTPException(status_code=404, detail="Process not found")
    
    if process_id in tasks and not tasks[process_id].done():
        tasks[process_id].cancel()
        try:
            await tasks[process_id]
        except asyncio.CancelledError:
            processes[process_id].status = "stopped"
            processes[process_id].error = "Process stopped by user"
        
        del tasks[process_id]
        
    return {
        "process_id": process_id,
        "status": processes[process_id].status,
        "message": "Process stopped"
    }

@app.post("/reset/{process_id}")
async def reset_process(process_id: str):
    if process_id in processes:
        if process_id in tasks and not tasks[process_id].done():
            tasks[process_id].cancel()
            try:
                await tasks[process_id]
            except asyncio.CancelledError:
                pass
            del tasks[process_id]
        
        del processes[process_id]
    
    return {
        "message": "Process reset successfully",
        "process_id": process_id
    }

async def process_node_async(process_id: str, node_id: str, params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None):
    try:
        logger.info(f"[START] Node {node_id} (Process {process_id}) started at {datetime.now().isoformat()}")
        # Simulate processing time (45 seconds)
        await asyncio.sleep(10)
        output = await process_node(node_id, params, previous_outputs)
        processes[process_id].status = "completed"
        processes[process_id].output = output
        logger.info(f"[END] Node {node_id} (Process {process_id}) completed at {datetime.now().isoformat()}")
        logger.info(f"📤 Output: {output}")
    except asyncio.CancelledError:
        logger.info(f"🛑 Node {node_id} (Process {process_id}) was cancelled")
        processes[process_id].status = "stopped"
        processes[process_id].error = "Process stopped by user"
        raise  # Re-raise the cancellation
    except Exception as e:
        logger.error(f"❌ Error processing node {node_id}: {str(e)}")
        processes[process_id].status = "failed"
        processes[process_id].error = str(e)
        # Create error output with fail_message
        error_output = {
            "status": "failed",
            "run_parameters": params.dict(),
            "execution_logs": [
                f"Starting processing at {datetime.now().isoformat()}",
                f"Processing with environment: {params.runEnv}",
                f"Processing failed at {datetime.now().isoformat()}"
            ],
            "calculation_results": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv,
                "error_occurred": True
            },
            'histogram_data': [],
            'count': '0',
            'fail_message': str(e)
        }
        processes[process_id].output = error_output

async def process_node(node_id: str, params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    """Main node processing function that routes to specific node handlers.
    
    Currently all nodes use the enhanced generic node processor for consistent
    data generation and analysis.
    """
    logger.info(f"🎯 Processing node: {node_id}")
    
    # Test case: Simulate failure for specific node or parameter
    if params.runEnv == "TEST_FAILURE" or node_id == "test_failure_node":
        raise Exception("Test failure: This is a simulated error for testing the failed node functionality. The node encountered a critical error during data processing.")
    
    # Always return a large random table for all nodes using enhanced processor
    return await process_generic_node(params)

def process_config_comp_node(params: RunParameters) -> Dict:
    """Process the combined config node that handles both SRC and TGT configurations."""
    is_valid = validate_config_file(params.inputConfigFilePath, params.inputConfigFilePattern)
    
    # Generate sample data for histogram analysis
    config_data = [
        {"parameter": "file_path", "value": params.inputConfigFilePath, "status": "valid" if is_valid else "invalid"},
        {"parameter": "pattern", "value": params.inputConfigFilePattern, "status": "valid" if is_valid else "invalid"},
        {"parameter": "environment", "value": params.runEnv, "status": "valid"},
        {"parameter": "run_date", "value": params.expectedRunDate, "status": "valid"},
        {"parameter": "root_dir", "value": params.rootFileDir, "status": "valid"}
    ]
    
    # Generate histogram data for config parameters
    histogram_data = []
    for item in config_data:
        histogram_data.append({
            'column_name': item['parameter'],
            'data_type': 'text',
            'total_values': 1,
            'unique_values': 1,
            'top_values': [{'value': str(item['value']), 'count': 1}],
            'summary': {
                'min_length': len(str(item['value'])),
                'max_length': len(str(item['value'])),
                'avg_length': len(str(item['value']))
            }
        })
    
    return {
        "status": "success" if is_valid else "failed",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting combined config validation at {datetime.now().isoformat()}",
            f"Checking file path: {params.inputConfigFilePath}",
            f"Validating against pattern: {params.inputConfigFilePattern}",
            f"Environment: {params.runEnv}",
            "Combined file format validation completed"
        ],
        "calculation_results": {
            "validation_details": {
                "file_path": params.inputConfigFilePath,
                "pattern_matched": params.inputConfigFilePattern,
                "path_format_valid": True,
                "pattern_format_valid": True,
                "combined_validation": True
            },
            "environment_info": {
                "run_date": params.expectedRunDate,
                "environment": params.runEnv,
                "root_directory": params.rootFileDir
            }
        },
        'histogram_data': histogram_data,
        'count': str(len(config_data)),
        'fail_message': None if is_valid else "Configuration validation failed"
    }

def process_file_search_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None, side: str = "src") -> Dict:
    """Process the file searching component for either SRC or TGT side."""
    has_valid_path = '/' in params.rootFileDir or '\\' in params.rootFileDir
    
    # Use config node output if available
    config_validation = None
    if previous_outputs and "reading_config_comp" in previous_outputs:
        config_validation = previous_outputs["reading_config_comp"].get("calculation_results", {}).get("validation_details")
    
    side_path = f"{params.rootFileDir}/{side}"
    
    # Generate sample file data for histogram analysis
    files_found = [f"example_{side}_1.dat", f"example_{side}_2.dat", f"example_{side}_3.dat"]
    file_sizes = [random.randint(1000, 100000) for _ in files_found]
    file_types = [f".{random.choice(['dat', 'csv', 'txt', 'json'])}" for _ in files_found]
    
    file_data = []
    for i, file_name in enumerate(files_found):
        file_data.append({
            "file_name": file_name,
            "file_size": file_sizes[i],
            "file_type": file_types[i],
            "status": "found" if has_valid_path else "not_found"
        })
    
    # Generate histogram data for file analysis
    histogram_data = []
    
    # File size histogram
    if file_sizes:
        histogram_data.append({
            'column_name': 'file_size',
            'data_type': 'numeric',
            'total_values': len(file_sizes),
            'unique_values': len(set(file_sizes)),
            'summary': {
                'min': min(file_sizes),
                'max': max(file_sizes),
                'mean': sum(file_sizes) / len(file_sizes),
                'median': sorted(file_sizes)[len(file_sizes)//2],
                'std_dev': (sum((x - sum(file_sizes)/len(file_sizes))**2 for x in file_sizes) / len(file_sizes))**0.5
            },
            'distribution': {
                'bins': 5,
                'bin_edges': [min(file_sizes) + i * (max(file_sizes) - min(file_sizes)) / 5 for i in range(6)],
                'bin_counts': [len([x for x in file_sizes if min(file_sizes) + i * (max(file_sizes) - min(file_sizes)) / 5 <= x < min(file_sizes) + (i+1) * (max(file_sizes) - min(file_sizes)) / 5]) for i in range(5)]
            }
        })
    
    # File type histogram
    type_counts = {}
    for file_type in file_types:
        type_counts[file_type] = type_counts.get(file_type, 0) + 1
    
    histogram_data.append({
        'column_name': 'file_type',
        'data_type': 'text',
        'total_values': len(file_types),
        'unique_values': len(type_counts),
        'top_values': [{'value': file_type, 'count': count} for file_type, count in type_counts.items()],
        'summary': {
            'min_length': min(len(file_type) for file_type in file_types),
            'max_length': max(len(file_type) for file_type in file_types),
            'avg_length': sum(len(file_type) for file_type in file_types) / len(file_types)
        }
    })
    
    return {
        "status": "success" if has_valid_path else "failed",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting {side.upper()} file search at {datetime.now().isoformat()}",
            f"Checking {side.upper()} directory: {side_path}",
            f"Environment: {params.runEnv}",
            f"File search completed for {side.upper()}",
            *(["Using config validation from previous node"] if config_validation else [])
        ],
        "calculation_results": {
            "file_search_details": {
                "path": side_path,
                "is_valid": has_valid_path,
                "files_found": files_found
            },
            "config_validation": config_validation
        },
        'histogram_data': histogram_data,
        'count': str(len(file_data)),
        'fail_message': None if has_valid_path else f"File search failed for {side.upper()} directory: {side_path}"
    }

def process_pre_harmonisation_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]], flow_type: str) -> Dict:
    """Process pre-harmonisation node for either SRC or TGT flow.
    
    This node performs initial data standardization before the main harmonisation:
    1. Basic data type validation
    2. Initial format standardization
    3. Preliminary data quality checks
    """
    logger.info(f"Processing pre-harmonisation for {flow_type.upper()} flow")
    
    try:
        # Get previous node output
        prev_node_id = f"read_{flow_type}_comp"
        if not previous_outputs or prev_node_id not in previous_outputs:
            raise ValueError(f"No input data from {prev_node_id}")
            
        input_data = previous_outputs[prev_node_id]
        
        # Generate sample quality metrics data
        quality_metrics = {
            "missing_values": random.randint(0, 50),
            "invalid_formats": random.randint(0, 20),
            "duplicate_records": random.randint(0, 30),
            "data_consistency_score": random.uniform(0.8, 1.0),
            "format_standardization_applied": True
        }
        
        # Generate histogram data for quality metrics
        histogram_data = []
        
        # Missing values distribution
        histogram_data.append({
            'column_name': 'missing_values',
            'data_type': 'numeric',
            'total_values': 1,
            'unique_values': 1,
            'summary': {
                'min': quality_metrics["missing_values"],
                'max': quality_metrics["missing_values"],
                'mean': quality_metrics["missing_values"],
                'median': quality_metrics["missing_values"],
                'std_dev': 0
            },
            'distribution': {
                'bins': 1,
                'bin_edges': [0, quality_metrics["missing_values"]],
                'bin_counts': [1]
            }
        })
        
        # Data consistency score
        histogram_data.append({
            'column_name': 'data_consistency_score',
            'data_type': 'numeric',
            'total_values': 1,
            'unique_values': 1,
            'summary': {
                'min': quality_metrics["data_consistency_score"],
                'max': quality_metrics["data_consistency_score"],
                'mean': quality_metrics["data_consistency_score"],
                'median': quality_metrics["data_consistency_score"],
                'std_dev': 0
            },
            'distribution': {
                'bins': 1,
                'bin_edges': [0, 1],
                'bin_counts': [1]
            }
        })
        
        # Simulate pre-harmonisation processing
        output = {
            "standardized_data": input_data,
            "data_quality_metrics": quality_metrics,
            "flow_type": flow_type,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Pre-harmonisation completed for {flow_type.upper()} flow")
        return {
            **output,
            'histogram_data': histogram_data,
            'count': '1',  # Single quality assessment
            'fail_message': None
        }
        
    except Exception as e:
        logger.error(f"❌ Error in pre-harmonisation node: {str(e)}")
        raise

def process_harmonisation_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    # Generate sample harmonisation metrics
    harmonisation_metrics = {
        "records_processed": random.randint(500, 2000),
        "records_harmonized": random.randint(400, 1800),
        "harmonisation_success_rate": random.uniform(0.85, 0.98),
        "processing_time_seconds": random.uniform(10.0, 60.0),
        "data_quality_improvement": random.uniform(0.1, 0.3)
    }
    
    # Generate histogram data for harmonisation metrics
    histogram_data = []
    
    # Success rate distribution
    histogram_data.append({
        'column_name': 'harmonisation_success_rate',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': harmonisation_metrics["harmonisation_success_rate"],
            'max': harmonisation_metrics["harmonisation_success_rate"],
            'mean': harmonisation_metrics["harmonisation_success_rate"],
            'median': harmonisation_metrics["harmonisation_success_rate"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 1],
            'bin_counts': [1]
        }
    })
    
    # Processing time distribution
    histogram_data.append({
        'column_name': 'processing_time_seconds',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': harmonisation_metrics["processing_time_seconds"],
            'max': harmonisation_metrics["processing_time_seconds"],
            'mean': harmonisation_metrics["processing_time_seconds"],
            'median': harmonisation_metrics["processing_time_seconds"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 100],
            'bin_counts': [1]
        }
    })
    
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting harmonisation at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Harmonisation completed"
        ],
        "calculation_results": {
            "harmonisation_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv,
                "metrics": harmonisation_metrics
            }
        },
        'histogram_data': histogram_data,
        'count': str(harmonisation_metrics["records_processed"]),
        'fail_message': None
    }

def process_enrichment_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    # Generate sample enrichment metrics
    enrichment_metrics = {
        "records_enriched": random.randint(300, 1500),
        "enrichment_sources_used": random.randint(2, 8),
        "enrichment_success_rate": random.uniform(0.75, 0.95),
        "new_fields_added": random.randint(5, 20),
        "enrichment_quality_score": random.uniform(0.7, 0.95)
    }
    
    # Generate histogram data for enrichment metrics
    histogram_data = []
    
    # Enrichment success rate distribution
    histogram_data.append({
        'column_name': 'enrichment_success_rate',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': enrichment_metrics["enrichment_success_rate"],
            'max': enrichment_metrics["enrichment_success_rate"],
            'mean': enrichment_metrics["enrichment_success_rate"],
            'median': enrichment_metrics["enrichment_success_rate"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 1],
            'bin_counts': [1]
        }
    })
    
    # New fields added distribution
    histogram_data.append({
        'column_name': 'new_fields_added',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': enrichment_metrics["new_fields_added"],
            'max': enrichment_metrics["new_fields_added"],
            'mean': enrichment_metrics["new_fields_added"],
            'median': enrichment_metrics["new_fields_added"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 25],
            'bin_counts': [1]
        }
    })
    
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting enrichment at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Enrichment completed"
        ],
        "calculation_results": {
            "enrichment_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv,
                "metrics": enrichment_metrics
            }
        },
        'histogram_data': histogram_data,
        'count': str(enrichment_metrics["records_enriched"]),
        'fail_message': None
    }

def process_transform_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    # Generate sample transformation metrics
    transform_metrics = {
        "records_transformed": random.randint(400, 1800),
        "transformation_rules_applied": random.randint(10, 50),
        "transformation_success_rate": random.uniform(0.9, 0.99),
        "columns_transformed": random.randint(15, 80),
        "transformation_complexity_score": random.uniform(0.3, 0.8)
    }
    
    # Generate histogram data for transformation metrics
    histogram_data = []
    
    # Transformation success rate distribution
    histogram_data.append({
        'column_name': 'transformation_success_rate',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': transform_metrics["transformation_success_rate"],
            'max': transform_metrics["transformation_success_rate"],
            'mean': transform_metrics["transformation_success_rate"],
            'median': transform_metrics["transformation_success_rate"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 1],
            'bin_counts': [1]
        }
    })
    
    # Columns transformed distribution
    histogram_data.append({
        'column_name': 'columns_transformed',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': transform_metrics["columns_transformed"],
            'max': transform_metrics["columns_transformed"],
            'mean': transform_metrics["columns_transformed"],
            'median': transform_metrics["columns_transformed"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 100],
            'bin_counts': [1]
        }
    })
    
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting data transformation at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Transformation completed"
        ],
        "calculation_results": {
            "transform_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv,
                "metrics": transform_metrics
            }
        },
        'histogram_data': histogram_data,
        'count': str(transform_metrics["records_transformed"]),
        'fail_message': None
    }

def process_combine_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    # Generate sample combination metrics
    combine_metrics = {
        "total_records_combined": random.randint(800, 3000),
        "src_records_contributed": random.randint(300, 1500),
        "tgt_records_contributed": random.randint(300, 1500),
        "combination_success_rate": random.uniform(0.85, 0.98),
        "duplicate_records_merged": random.randint(50, 200),
        "final_record_count": random.randint(700, 2800)
    }
    
    # Generate histogram data for combination metrics
    histogram_data = []
    
    # Combination success rate distribution
    histogram_data.append({
        'column_name': 'combination_success_rate',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': combine_metrics["combination_success_rate"],
            'max': combine_metrics["combination_success_rate"],
            'mean': combine_metrics["combination_success_rate"],
            'median': combine_metrics["combination_success_rate"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 1],
            'bin_counts': [1]
        }
    })
    
    # Records contribution distribution
    histogram_data.append({
        'column_name': 'records_contribution',
        'data_type': 'numeric',
        'total_values': 2,
        'unique_values': 2,
        'summary': {
            'min': min(combine_metrics["src_records_contributed"], combine_metrics["tgt_records_contributed"]),
            'max': max(combine_metrics["src_records_contributed"], combine_metrics["tgt_records_contributed"]),
            'mean': (combine_metrics["src_records_contributed"] + combine_metrics["tgt_records_contributed"]) / 2,
            'median': (combine_metrics["src_records_contributed"] + combine_metrics["tgt_records_contributed"]) / 2,
            'std_dev': abs(combine_metrics["src_records_contributed"] - combine_metrics["tgt_records_contributed"]) / 2
        },
        'distribution': {
            'bins': 2,
            'bin_edges': [0, combine_metrics["src_records_contributed"], combine_metrics["tgt_records_contributed"]],
            'bin_counts': [1, 1]
        }
    })
    
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting data combination at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Combination completed"
        ],
        "calculation_results": {
            "combine_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv,
                "metrics": combine_metrics
            }
        },
        'histogram_data': histogram_data,
        'count': str(combine_metrics["total_records_combined"]),
        'fail_message': None
    }

def process_rules_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    # Generate sample rules application metrics
    rules_metrics = {
        "rules_applied": random.randint(20, 100),
        "records_processed": random.randint(600, 2500),
        "rules_success_rate": random.uniform(0.92, 0.99),
        "rules_violations_found": random.randint(10, 100),
        "rules_complexity_score": random.uniform(0.4, 0.9),
        "processing_time_seconds": random.uniform(15.0, 75.0)
    }
    
    # Generate histogram data for rules metrics
    histogram_data = []
    
    # Rules success rate distribution
    histogram_data.append({
        'column_name': 'rules_success_rate',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': rules_metrics["rules_success_rate"],
            'max': rules_metrics["rules_success_rate"],
            'mean': rules_metrics["rules_success_rate"],
            'median': rules_metrics["rules_success_rate"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 1],
            'bin_counts': [1]
        }
    })
    
    # Rules violations distribution
    histogram_data.append({
        'column_name': 'rules_violations_found',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': rules_metrics["rules_violations_found"],
            'max': rules_metrics["rules_violations_found"],
            'mean': rules_metrics["rules_violations_found"],
            'median': rules_metrics["rules_violations_found"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 150],
            'bin_counts': [1]
        }
    })
    
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting rules application at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Rules applied"
        ],
        "calculation_results": {
            "rules_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv,
                "metrics": rules_metrics
            }
        },
        'histogram_data': histogram_data,
        'count': str(rules_metrics["records_processed"]),
        'fail_message': None
    }

def process_output_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    # Generate sample output generation metrics
    output_metrics = {
        "final_records_generated": random.randint(500, 2000),
        "output_files_created": random.randint(1, 5),
        "output_generation_success_rate": random.uniform(0.95, 1.0),
        "output_file_sizes_mb": [random.uniform(1.0, 50.0) for _ in range(random.randint(1, 5))],
        "output_quality_score": random.uniform(0.9, 1.0),
        "processing_time_seconds": random.uniform(5.0, 30.0)
    }
    
    # Generate histogram data for output metrics
    histogram_data = []
    
    # Output generation success rate distribution
    histogram_data.append({
        'column_name': 'output_generation_success_rate',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': output_metrics["output_generation_success_rate"],
            'max': output_metrics["output_generation_success_rate"],
            'mean': output_metrics["output_generation_success_rate"],
            'median': output_metrics["output_generation_success_rate"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 1],
            'bin_counts': [1]
        }
    })
    
    # Output file sizes distribution
    if output_metrics["output_file_sizes_mb"]:
        histogram_data.append({
            'column_name': 'output_file_sizes_mb',
            'data_type': 'numeric',
            'total_values': len(output_metrics["output_file_sizes_mb"]),
            'unique_values': len(set(output_metrics["output_file_sizes_mb"])),
            'summary': {
                'min': min(output_metrics["output_file_sizes_mb"]),
                'max': max(output_metrics["output_file_sizes_mb"]),
                'mean': sum(output_metrics["output_file_sizes_mb"]) / len(output_metrics["output_file_sizes_mb"]),
                'median': sorted(output_metrics["output_file_sizes_mb"])[len(output_metrics["output_file_sizes_mb"])//2],
                'std_dev': (sum((x - sum(output_metrics["output_file_sizes_mb"])/len(output_metrics["output_file_sizes_mb"]))**2 for x in output_metrics["output_file_sizes_mb"]) / len(output_metrics["output_file_sizes_mb"]))**0.5
            },
            'distribution': {
                'bins': min(5, len(output_metrics["output_file_sizes_mb"])),
                'bin_edges': [min(output_metrics["output_file_sizes_mb"]) + i * (max(output_metrics["output_file_sizes_mb"]) - min(output_metrics["output_file_sizes_mb"])) / min(5, len(output_metrics["output_file_sizes_mb"])) for i in range(min(5, len(output_metrics["output_file_sizes_mb"])) + 1)],
                'bin_counts': [len([x for x in output_metrics["output_file_sizes_mb"] if min(output_metrics["output_file_sizes_mb"]) + i * (max(output_metrics["output_file_sizes_mb"]) - min(output_metrics["output_file_sizes_mb"])) / min(5, len(output_metrics["output_file_sizes_mb"])) <= x < min(output_metrics["output_file_sizes_mb"]) + (i+1) * (max(output_metrics["output_file_sizes_mb"]) - min(output_metrics["output_file_sizes_mb"])) / min(5, len(output_metrics["output_file_sizes_mb"]))]) for i in range(min(5, len(output_metrics["output_file_sizes_mb"])))]
            }
        })
    
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting output generation at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Output generated"
        ],
        "calculation_results": {
            "output_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv,
                "metrics": output_metrics
            }
        },
        'histogram_data': histogram_data,
        'count': str(output_metrics["final_records_generated"]),
        'fail_message': None
    }

def process_break_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    # Generate sample break rolling metrics
    break_metrics = {
        "break_periods_processed": random.randint(10, 50),
        "records_per_break_period": [random.randint(50, 500) for _ in range(random.randint(10, 50))],
        "break_rolling_success_rate": random.uniform(0.88, 0.97),
        "total_break_records": random.randint(500, 2500),
        "break_period_accuracy": random.uniform(0.85, 0.95),
        "processing_time_seconds": random.uniform(20.0, 90.0)
    }
    
    # Generate histogram data for break rolling metrics
    histogram_data = []
    
    # Break rolling success rate distribution
    histogram_data.append({
        'column_name': 'break_rolling_success_rate',
        'data_type': 'numeric',
        'total_values': 1,
        'unique_values': 1,
        'summary': {
            'min': break_metrics["break_rolling_success_rate"],
            'max': break_metrics["break_rolling_success_rate"],
            'mean': break_metrics["break_rolling_success_rate"],
            'median': break_metrics["break_rolling_success_rate"],
            'std_dev': 0
        },
        'distribution': {
            'bins': 1,
            'bin_edges': [0, 1],
            'bin_counts': [1]
        }
    })
    
    # Records per break period distribution
    if break_metrics["records_per_break_period"]:
        histogram_data.append({
            'column_name': 'records_per_break_period',
            'data_type': 'numeric',
            'total_values': len(break_metrics["records_per_break_period"]),
            'unique_values': len(set(break_metrics["records_per_break_period"])),
            'summary': {
                'min': min(break_metrics["records_per_break_period"]),
                'max': max(break_metrics["records_per_break_period"]),
                'mean': sum(break_metrics["records_per_break_period"]) / len(break_metrics["records_per_break_period"]),
                'median': sorted(break_metrics["records_per_break_period"])[len(break_metrics["records_per_break_period"])//2],
                'std_dev': (sum((x - sum(break_metrics["records_per_break_period"])/len(break_metrics["records_per_break_period"]))**2 for x in break_metrics["records_per_break_period"]) / len(break_metrics["records_per_break_period"]))**0.5
            },
            'distribution': {
                'bins': min(8, len(break_metrics["records_per_break_period"])),
                'bin_edges': [min(break_metrics["records_per_break_period"]) + i * (max(break_metrics["records_per_break_period"]) - min(break_metrics["records_per_break_period"])) / min(8, len(break_metrics["records_per_break_period"])) for i in range(min(8, len(break_metrics["records_per_break_period"])) + 1)],
                'bin_counts': [len([x for x in break_metrics["records_per_break_period"] if min(break_metrics["records_per_break_period"]) + i * (max(break_metrics["records_per_break_period"]) - min(break_metrics["records_per_break_period"])) / min(8, len(break_metrics["records_per_break_period"])) <= x < min(break_metrics["records_per_break_period"]) + (i+1) * (max(break_metrics["records_per_break_period"]) - min(break_metrics["records_per_break_period"])) / min(8, len(break_metrics["records_per_break_period"]))]) for i in range(min(8, len(break_metrics["records_per_break_period"])))]
            }
        })
    
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting break rolling at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Break rolling completed"
        ],
        "calculation_results": {
            "break_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv,
                "metrics": break_metrics
            }
        },
        'histogram_data': histogram_data,
        'count': str(break_metrics["total_break_records"]),
        'fail_message': None
    }

async def process_generic_node(params: RunParameters) -> Dict:
    """Process generic node with enhanced data generation and analysis.
    
    Generates a large dataset with mixed data types and comprehensive
    statistical analysis for the frontend AG Grid display.
    
    Note: Generates 2,000 rows internally but only sends 1,000 rows
    to the frontend for performance optimization. Histogram statistics
    are calculated from the full dataset for accuracy.
    """
    start_time = time.time()
    logger.info(f"🔄 Starting generic node processing with enhanced data generation")
    
    # Generate random table data: 100 columns, 2,000 rows
    num_cols = 100
    num_rows = 2000
    headers = [f"col_{i+1}" for i in range(num_cols)]
    
    logger.info(f"📊 Generating table: {num_cols} columns x {num_rows} rows (will send {min(1000, num_rows)} to frontend)")

    # Randomly choose 30% of columns to be text columns
    text_col_indices = set(random.sample(range(num_cols), k=int(num_cols * 0.3)))
    # Of the text columns, 20% of their cells will be long text (150 chars)
    long_text_col_indices = set(random.sample(list(text_col_indices), k=max(1, int(len(text_col_indices) * 0.3))))

    def random_text(length):
        """Generate random text of specified length."""
        return ''.join(random.choices(string.ascii_letters + string.digits + ' ', k=length))

    table = []
    for row_idx in range(num_rows):
        # Check for cancellation every 100 rows
        if row_idx % 100 == 0:
            await asyncio.sleep(0)  # Yield control to event loop for cancellation
            logger.info(f"📊 Generated {row_idx}/{num_rows} rows...")
        
        row = []
        for col in range(num_cols):
            if col in text_col_indices:
                # 20% chance for long text in long_text_col_indices
                if col in long_text_col_indices and random.random() < 0.2:
                    row.append(random_text(150))
                else:
                    row.append(random_text(random.randint(5, 20)))
            else:
                row.append(random.randint(1, 10000))
        table.append(row)
    
    # Generate histogram data with summary statistics for each column
    # Use full dataset for accurate statistics, but limit display data
    histogram_data = []
    for col_idx, header in enumerate(headers):
        # Check for cancellation every 10 columns
        if col_idx % 10 == 0:
            await asyncio.sleep(0)  # Yield control to event loop for cancellation
            logger.info(f"📊 Processing histogram for column {col_idx}/{len(headers)}...")
        
        try:
            # Use full dataset for histogram analysis to get accurate statistics
            column_data = [row[col_idx] for row in table]
            
            if col_idx in text_col_indices:
                # For text columns, provide frequency analysis
                value_counts = {}
                for value in column_data:
                    value_counts[value] = value_counts.get(value, 0) + 1
                
                # Get top 10 most frequent values
                top_values = sorted(value_counts.items(), key=lambda x: x[1], reverse=True)[:10]
                
                histogram_data.append({
                    'column_name': header,
                    'data_type': 'text',
                    'total_values': len(column_data),
                    'unique_values': len(value_counts),
                    'top_values': [{'value': str(val), 'count': count} for val, count in top_values],
                    'summary': {
                        'min_length': min(len(str(val)) for val in column_data),
                        'max_length': max(len(str(val)) for val in column_data),
                        'avg_length': sum(len(str(val)) for val in column_data) / len(column_data)
                    }
                })
            else:
                # For numeric columns, provide statistical summary
                numeric_data = [float(val) for val in column_data]
                histogram_data.append({
                    'column_name': header,
                    'data_type': 'numeric',
                    'total_values': len(numeric_data),
                    'unique_values': len(set(numeric_data)),
                    'summary': {
                        'min': min(numeric_data),
                        'max': max(numeric_data),
                        'mean': sum(numeric_data) / len(numeric_data),
                        'median': sorted(numeric_data)[len(numeric_data)//2],
                        'std_dev': (sum((x - sum(numeric_data)/len(numeric_data))**2 for x in numeric_data) / len(numeric_data))**0.5
                    },
                    'distribution': {
                        'bins': 10,
                        'bin_edges': [min(numeric_data) + i * (max(numeric_data) - min(numeric_data)) / 10 for i in range(11)],
                        'bin_counts': [len([x for x in numeric_data if min(numeric_data) + i * (max(numeric_data) - min(numeric_data)) / 10 <= x < min(numeric_data) + (i+1) * (max(numeric_data) - min(numeric_data)) / 10]) for i in range(10)]
                    }
                })
        except Exception as e:
            logger.warning(f"Error processing histogram data for column {header}: {str(e)}")
            # Add fallback histogram data
            histogram_data.append({
                'column_name': header,
                'data_type': 'unknown',
                'total_values': len(table),
                'unique_values': 0,
                'summary': {'error': str(e)},
                'top_values': []
            })
    
    # Limit data sent to frontend to 1000 rows for performance
    # This reduces network transfer and improves frontend performance
    # while maintaining accurate histogram statistics from full dataset
    frontend_rows_limit = 1000
    frontend_table = table[:frontend_rows_limit] if len(table) > frontend_rows_limit else table
    
    processing_time = time.time() - start_time
    logger.info(f"✅ Generic node processing completed in {processing_time:.2f} seconds")
    logger.info(f"📈 Generated {len(histogram_data)} histogram entries")
    logger.info(f"📤 Sending {len(frontend_table)} rows to frontend (limited from {len(table)} total rows)")
    
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting general processing at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            f"Generated table with {num_cols} columns and {num_rows} rows",
            f"Text columns: {len(text_col_indices)}, Numeric columns: {num_cols - len(text_col_indices)}",
            f"Long text columns: {len(long_text_col_indices)}",
            f"Processing completed successfully in {processing_time:.2f} seconds",
            f"Frontend data limited to {len(frontend_table)} rows for performance optimization"
        ],
        "calculation_results": {
            "headers": headers,
            "table": frontend_table,
            "processed_at": datetime.now().isoformat(),
            "environment": params.runEnv,
            "table_size": f"{len(headers)}x{len(frontend_table)}",
            "total_rows_generated": len(table),
            "frontend_rows_limit": frontend_rows_limit,
            "processing_time_seconds": processing_time
        },
        'histogram_data': histogram_data,
        'count': str(len(table)),  # Send original table length (10,000)
        'fail_message': None  # No failure in successful execution
    }

def process_enrichment_file_search_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]], flow_type: str) -> Dict:
    """Process enrichment file search node for either SRC or TGT flow.
    
    This node searches for enrichment files based on the harmonized data:
    1. Identifies required enrichment files
    2. Validates file existence and format
    3. Prepares files for enrichment process
    """
    logger.info(f"Processing enrichment file search for {flow_type.upper()} flow")
    
    try:
        # Get previous node output (harmonisation)
        prev_node_id = f"harmonisation_{flow_type}_comp"
        if not previous_outputs or prev_node_id not in previous_outputs:
            raise ValueError(f"No input data from {prev_node_id}")
            
        harmonised_data = previous_outputs[prev_node_id]
        
        # Generate sample enrichment file data
        enrichment_files = [
            f"/path/to/{flow_type}/reference_data.csv",
            f"/path/to/{flow_type}/lookup1.csv",
            f"/path/to/{flow_type}/lookup2.csv",
            f"/path/to/{flow_type}/mapping_table.csv",
            f"/path/to/{flow_type}/validation_rules.json"
        ]
        
        file_sizes = [random.randint(5000, 100000) for _ in enrichment_files]
        file_types = [f".{random.choice(['csv', 'json', 'xml', 'txt'])}" for _ in enrichment_files]
        file_status = ["found" if random.random() > 0.1 else "missing" for _ in enrichment_files]
        
        # Generate histogram data for enrichment files
        histogram_data = []
        
        # File sizes distribution
        if file_sizes:
            histogram_data.append({
                'column_name': 'enrichment_file_sizes',
                'data_type': 'numeric',
                'total_values': len(file_sizes),
                'unique_values': len(set(file_sizes)),
                'summary': {
                    'min': min(file_sizes),
                    'max': max(file_sizes),
                    'mean': sum(file_sizes) / len(file_sizes),
                    'median': sorted(file_sizes)[len(file_sizes)//2],
                    'std_dev': (sum((x - sum(file_sizes)/len(file_sizes))**2 for x in file_sizes) / len(file_sizes))**0.5
                },
                'distribution': {
                    'bins': min(5, len(file_sizes)),
                    'bin_edges': [min(file_sizes) + i * (max(file_sizes) - min(file_sizes)) / min(5, len(file_sizes)) for i in range(min(5, len(file_sizes)) + 1)],
                    'bin_counts': [len([x for x in file_sizes if min(file_sizes) + i * (max(file_sizes) - min(file_sizes)) / min(5, len(file_sizes)) <= x < min(file_sizes) + (i+1) * (max(file_sizes) - min(file_sizes)) / min(5, len(file_sizes))]) for i in range(min(5, len(file_sizes)))]
                }
            })
        
        # File types distribution
        type_counts = {}
        for file_type in file_types:
            type_counts[file_type] = type_counts.get(file_type, 0) + 1
        
        histogram_data.append({
            'column_name': 'enrichment_file_types',
            'data_type': 'text',
            'total_values': len(file_types),
            'unique_values': len(type_counts),
            'top_values': [{'value': file_type, 'count': count} for file_type, count in type_counts.items()],
            'summary': {
                'min_length': min(len(file_type) for file_type in file_types),
                'max_length': max(len(file_type) for file_type in file_types),
                'avg_length': sum(len(file_type) for file_type in file_types) / len(file_types)
            }
        })
        
        # Simulate enrichment file search processing
        output = {
            "enrichment_files": {
                "reference_data": f"/path/to/{flow_type}/reference_data.csv",
                "lookup_tables": [
                    f"/path/to/{flow_type}/lookup1.csv",
                    f"/path/to/{flow_type}/lookup2.csv"
                ]
            },
            "file_validation": {
                "all_files_exist": True,
                "valid_formats": True
            },
            "flow_type": flow_type,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Enrichment file search completed for {flow_type.upper()} flow")
        return {
            **output,
            'histogram_data': histogram_data,
            'count': str(len(enrichment_files)),
            'fail_message': None
        }
        
    except Exception as e:
        logger.error(f"❌ Error in enrichment file search node: {str(e)}")
        raise

def validate_config_file(file_path: str, pattern: str) -> bool:
    # Add your config file validation logic here
    return True  # Placeholder return

@app.get("/health")
def health_check():
    logger.info("Health check endpoint called")
    return {"status": "healthy", "timestamp": time.time()} 