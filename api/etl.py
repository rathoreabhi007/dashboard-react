import random
import string
import pandas as pd
import numpy as np
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def error_handler(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {e}")
            return {"status": "failed", "fail_message": str(e)}
    return wrapper

def process_generic_node(params):
    """Enhanced generic node processor similar to main.py"""
    start_time = datetime.now()
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
    for _ in range(num_rows):
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
    histogram_data = []
    for col_idx, header in enumerate(headers):
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
    frontend_rows_limit = 1000
    frontend_table = table[:frontend_rows_limit] if len(table) > frontend_rows_limit else table
    
    processing_time = (datetime.now() - start_time).total_seconds()
    logger.info(f"✅ Generic node processing completed in {processing_time:.2f} seconds")
    logger.info(f"📈 Generated {len(histogram_data)} histogram entries")
    logger.info(f"📤 Sending {len(frontend_table)} rows to frontend (limited from {len(table)} total rows)")
    
    return {
        "status": "success",
        "run_parameters": params,
        "execution_logs": [
            f"Starting general processing at {datetime.now().isoformat()}",
            f"Processing with environment: {params.get('runEnv', 'unknown')}",
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
            "environment": params.get('runEnv', 'unknown'),
            "table_size": f"{len(headers)}x{len(frontend_table)}",
            "total_rows_generated": len(table),
            "frontend_rows_limit": frontend_rows_limit,
            "processing_time_seconds": processing_time
        },
        'histogram_data': histogram_data,
        'count': str(len(table)),
        'fail_message': None
    }

# Completeness Control Step Functions

@error_handler
def reading_config_comp(params):
    """Reading Configuration Component"""
    logger.info(f"🔄 Starting Reading Config Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'reading_config_comp'
    result['config_details'] = {
        'config_files_processed': random.randint(1, 5),
        'config_validation_passed': True,
        'config_quality_score': random.uniform(0.95, 0.99),
        'config_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def read_src_comp(params):
    """Read Source Component"""
    logger.info(f"🔄 Starting Read Source Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'read_src_comp'
    result['src_details'] = {
        'source_files_read': random.randint(10, 50),
        'source_data_quality': random.uniform(0.85, 0.95),
        'source_records_processed': int(result['count']),
        'source_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def read_tgt_comp(params):
    """Read Target Component"""
    logger.info(f"🔄 Starting Read Target Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'read_tgt_comp'
    result['tgt_details'] = {
        'target_files_read': random.randint(5, 20),
        'target_data_quality': random.uniform(0.90, 0.98),
        'target_records_processed': int(result['count']),
        'target_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def pre_harmonisation_src_comp(params):
    """Pre-Harmonisation Source Component"""
    logger.info(f"🔄 Starting Pre-Harmonisation Source Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'pre_harmonisation_src_comp'
    result['pre_harmonisation_src_details'] = {
        'pre_harmonisation_rules_applied': random.randint(5, 15),
        'data_cleansing_performed': True,
        'harmonisation_quality_score': random.uniform(0.88, 0.96),
        'pre_harmonisation_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def harmonisation_src_comp(params):
    """Harmonisation Source Component"""
    logger.info(f"🔄 Starting Harmonisation Source Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'harmonisation_src_comp'
    result['harmonisation_src_details'] = {
        'harmonisation_rules_applied': random.randint(8, 20),
        'data_standardization_performed': True,
        'harmonisation_quality_score': random.uniform(0.90, 0.97),
        'harmonisation_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def enrichment_file_search_src_comp(params):
    """Enrichment File Search Source Component"""
    logger.info(f"🔄 Starting Enrichment File Search Source Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'enrichment_file_search_src_comp'
    result['enrichment_file_search_src_details'] = {
        'enrichment_files_found': random.randint(3, 12),
        'enrichment_file_quality': random.uniform(0.85, 0.95),
        'enrichment_search_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def enrichment_src_comp(params):
    """Enrichment Source Component"""
    logger.info(f"🔄 Starting Enrichment Source Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'enrichment_src_comp'
    result['enrichment_src_details'] = {
        'enrichment_sources_used': random.randint(2, 8),
        'enrichment_fields_added': random.randint(5, 15),
        'enrichment_quality_score': random.uniform(0.85, 0.95),
        'enrichment_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def data_transform_src_comp(params):
    """Data Transform Source Component"""
    logger.info(f"🔄 Starting Data Transform Source Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'data_transform_src_comp'
    result['data_transform_src_details'] = {
        'transformation_rules_applied': random.randint(10, 25),
        'data_transformation_quality': random.uniform(0.88, 0.96),
        'transformation_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def pre_harmonisation_tgt_comp(params):
    """Pre-Harmonisation Target Component"""
    logger.info(f"🔄 Starting Pre-Harmonisation Target Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'pre_harmonisation_tgt_comp'
    result['pre_harmonisation_tgt_details'] = {
        'pre_harmonisation_rules_applied': random.randint(5, 15),
        'data_cleansing_performed': True,
        'harmonisation_quality_score': random.uniform(0.88, 0.96),
        'pre_harmonisation_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def harmonisation_tgt_comp(params):
    """Harmonisation Target Component"""
    logger.info(f"🔄 Starting Harmonisation Target Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'harmonisation_tgt_comp'
    result['harmonisation_tgt_details'] = {
        'harmonisation_rules_applied': random.randint(8, 20),
        'data_standardization_performed': True,
        'harmonisation_quality_score': random.uniform(0.90, 0.97),
        'harmonisation_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def enrichment_file_search_tgt_comp(params):
    """Enrichment File Search Target Component"""
    logger.info(f"🔄 Starting Enrichment File Search Target Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'enrichment_file_search_tgt_comp'
    result['enrichment_file_search_tgt_details'] = {
        'enrichment_files_found': random.randint(3, 12),
        'enrichment_file_quality': random.uniform(0.85, 0.95),
        'enrichment_search_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def enrichment_tgt_comp(params):
    """Enrichment Target Component"""
    logger.info(f"🔄 Starting Enrichment Target Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'enrichment_tgt_comp'
    result['enrichment_tgt_details'] = {
        'enrichment_sources_used': random.randint(2, 8),
        'enrichment_fields_added': random.randint(5, 15),
        'enrichment_quality_score': random.uniform(0.85, 0.95),
        'enrichment_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def data_transform_tgt_comp(params):
    """Data Transform Target Component"""
    logger.info(f"🔄 Starting Data Transform Target Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'data_transform_tgt_comp'
    result['data_transform_tgt_details'] = {
        'transformation_rules_applied': random.randint(10, 25),
        'data_transformation_quality': random.uniform(0.88, 0.96),
        'transformation_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def combine_data_comp(params):
    """Combine Data Component"""
    logger.info(f"🔄 Starting Combine Data Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'combine_data_comp'
    result['combine_data_details'] = {
        'src_data_combined': True,
        'tgt_data_combined': True,
        'combination_strategy': 'inner_join',
        'combination_quality_score': random.uniform(0.90, 0.98),
        'combination_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def apply_rules_comp(params):
    """Apply Rules Component"""
    logger.info(f"🔄 Starting Apply Rules Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'apply_rules_comp'
    result['apply_rules_details'] = {
        'business_rules_applied': random.randint(15, 30),
        'rule_validation_passed': True,
        'rules_quality_score': random.uniform(0.92, 0.99),
        'rules_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def output_rules_comp(params):
    """Output Rules Component"""
    logger.info(f"🔄 Starting Output Rules Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'output_rules_comp'
    result['output_rules_details'] = {
        'output_rules_generated': random.randint(5, 15),
        'output_validation_passed': True,
        'output_quality_score': random.uniform(0.94, 0.99),
        'output_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def break_rolling_comp(params):
    """Break Rolling Component"""
    logger.info(f"🔄 Starting Break Rolling Component")
    
    result = process_generic_node(params)
    result['step_type'] = 'break_rolling_comp'
    result['break_rolling_details'] = {
        'rolling_windows_processed': random.randint(3, 10),
        'break_analysis_completed': True,
        'rolling_quality_score': random.uniform(0.89, 0.97),
        'rolling_timestamp': datetime.now().isoformat()
    }
    
    return result

# Legacy ETL functions for backward compatibility
@error_handler
def extract(params):
    """Enhanced extract function with previous output support"""
    logger.info(f"🔄 Starting EXTRACT step with enhanced processing")
    
    # Check if we have previous outputs to work with
    if 'previous_outputs' in params:
        logger.info(f"📋 Found {len(params['previous_outputs'])} previous outputs")
        for step_name, output in params['previous_outputs'].items():
            logger.info(f"  - Previous step: {step_name}, Status: {output.get('status', 'unknown')}")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    
    # Add extract-specific information
    result['step_type'] = 'extract'
    result['extract_details'] = {
        'source_type': params.get('source_type', 'database'),
        'extraction_method': params.get('extraction_method', 'full_load'),
        'data_quality_score': random.uniform(0.85, 0.99),
        'records_processed': int(result['count'])
    }
    
    return result

@error_handler
def transform(params):
    """Enhanced transform function with previous output support"""
    logger.info(f"🔄 Starting TRANSFORM step with enhanced processing")
    
    # Check if we have extract data to transform
    if 'extract_data' in params:
        logger.info(f"📋 Found extract data with {len(params.get('extract_histogram', []))} columns")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    
    # Add transform-specific information
    result['step_type'] = 'transform'
    result['transform_details'] = {
        'transformation_rules_applied': random.randint(5, 20),
        'data_cleansing_performed': True,
        'data_validation_passed': True,
        'transformation_quality_score': random.uniform(0.90, 0.99),
        'records_transformed': int(result['count'])
    }
    
    # If we have extract data, show transformation summary
    if 'extract_data' in params:
        result['transform_details']['input_records'] = params.get('extract_data', {}).get('total_rows_generated', 'unknown')
        result['transform_details']['transformation_efficiency'] = random.uniform(0.95, 1.05)
    
    return result

@error_handler
def load(params):
    """Enhanced load function with previous output support"""
    logger.info(f"🔄 Starting LOAD step with enhanced processing")
    
    # Check if we have transform data to load
    if 'transform_data' in params:
        logger.info(f"📋 Found transform data with {len(params.get('transform_histogram', []))} columns")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    
    # Add load-specific information
    result['step_type'] = 'load'
    result['load_details'] = {
        'target_system': params.get('target_system', 'data_warehouse'),
        'load_strategy': params.get('load_strategy', 'full_refresh'),
        'load_performance_score': random.uniform(0.85, 0.99),
        'records_loaded': int(result['count']),
        'load_timestamp': datetime.now().isoformat()
    }
    
    # If we have transform data, show load summary
    if 'transform_data' in params:
        result['load_details']['input_records'] = params.get('transform_data', {}).get('total_rows_generated', 'unknown')
        result['load_details']['load_efficiency'] = random.uniform(0.98, 1.02)
    
    return result

# Additional ETL functions for more complex workflows
@error_handler
def validate(params):
    """Data validation step"""
    logger.info(f"🔄 Starting VALIDATE step")
    
    result = process_generic_node(params)
    result['step_type'] = 'validate'
    result['validation_details'] = {
        'validation_rules_applied': random.randint(10, 30),
        'validation_passed': True,
        'data_quality_score': random.uniform(0.90, 0.99),
        'validation_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def enrich(params):
    """Data enrichment step"""
    logger.info(f"🔄 Starting ENRICH step")
    
    result = process_generic_node(params)
    result['step_type'] = 'enrich'
    result['enrichment_details'] = {
        'enrichment_sources_used': random.randint(2, 8),
        'enrichment_fields_added': random.randint(5, 15),
        'enrichment_quality_score': random.uniform(0.85, 0.95),
        'enrichment_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def aggregate(params):
    """Data aggregation step"""
    logger.info(f"🔄 Starting AGGREGATE step")
    
    result = process_generic_node(params)
    result['step_type'] = 'aggregate'
    result['aggregation_details'] = {
        'aggregation_functions_applied': random.randint(3, 10),
        'grouping_dimensions': random.randint(2, 6),
        'aggregation_quality_score': random.uniform(0.90, 0.99),
        'aggregation_timestamp': datetime.now().isoformat()
    }
    
    return result

# Workflow Tool ETL Functions
@error_handler
def read_csv(params):
    """Read CSV file operation"""
    logger.info(f"🔄 Starting READ_CSV operation")
    
    # Extract parameters
    file_path = params.get('file_path', '/path/to/file.csv')
    delimiter = params.get('delimiter', ',')
    encoding = params.get('encoding', 'utf-8')
    header = params.get('header', True)
    skip_rows = params.get('skip_rows', 0)
    
    logger.info(f"📁 Reading CSV: {file_path}, delimiter: {delimiter}, encoding: {encoding}")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    result['step_type'] = 'read_csv'
    result['file_details'] = {
        'file_path': file_path,
        'delimiter': delimiter,
        'encoding': encoding,
        'has_header': header,
        'skip_rows': skip_rows,
        'file_size_mb': random.uniform(1.5, 15.0),
        'read_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def read_parquet(params):
    """Read Parquet file operation"""
    logger.info(f"🔄 Starting READ_PARQUET operation")
    
    # Extract parameters
    file_path = params.get('file_path', '/path/to/file.parquet')
    columns = params.get('columns', '')
    filters = params.get('filters', '')
    
    logger.info(f"📁 Reading Parquet: {file_path}")
    if columns:
        logger.info(f"📋 Selected columns: {columns}")
    if filters:
        logger.info(f"🔍 Applied filters: {filters}")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    result['step_type'] = 'read_parquet'
    result['file_details'] = {
        'file_path': file_path,
        'columns': columns.split(',') if columns else [],
        'filters': filters,
        'file_size_mb': random.uniform(0.5, 8.0),
        'compression': 'snappy',
        'read_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def read_excel(params):
    """Read Excel file operation"""
    logger.info(f"🔄 Starting READ_EXCEL operation")
    
    # Extract parameters
    file_path = params.get('file_path', '/path/to/file.xlsx')
    sheet_name = params.get('sheet_name', 'Sheet1')
    header_row = params.get('header_row', 0)
    skip_rows = params.get('skip_rows', 0)
    
    logger.info(f"📁 Reading Excel: {file_path}, sheet: {sheet_name}")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    result['step_type'] = 'read_excel'
    result['file_details'] = {
        'file_path': file_path,
        'sheet_name': sheet_name,
        'header_row': header_row,
        'skip_rows': skip_rows,
        'file_size_mb': random.uniform(2.0, 20.0),
        'read_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def convert_parquet(params):
    """Convert data to Parquet format"""
    logger.info(f"🔄 Starting CONVERT_PARQUET operation")
    
    # Extract parameters
    output_path = params.get('output_path', '/path/to/output.parquet')
    compression = params.get('compression', 'snappy')
    partition_by = params.get('partition_by', '')
    
    logger.info(f"💾 Converting to Parquet: {output_path}, compression: {compression}")
    if partition_by:
        logger.info(f"📂 Partition by: {partition_by}")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    result['step_type'] = 'convert_parquet'
    result['conversion_details'] = {
        'output_path': output_path,
        'compression': compression,
        'partition_by': partition_by.split(',') if partition_by else [],
        'compression_ratio': random.uniform(0.3, 0.7),
        'conversion_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def filter_data(params):
    """Filter data operation"""
    logger.info(f"🔄 Starting FILTER operation")
    
    # Extract parameters
    condition = params.get('condition', 'column > 100')
    case_sensitive = params.get('case_sensitive', False)
    
    logger.info(f"🔍 Filtering data with condition: {condition}")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    result['step_type'] = 'filter'
    result['filter_details'] = {
        'condition': condition,
        'case_sensitive': case_sensitive,
        'records_before_filter': int(result['count'] * random.uniform(1.2, 2.0)),
        'records_after_filter': int(result['count']),
        'filter_efficiency': random.uniform(0.4, 0.8),
        'filter_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def join_data(params):
    """Join data operation"""
    logger.info(f"🔄 Starting JOIN operation")
    
    # Extract parameters
    join_type = params.get('join_type', 'inner')
    left_key = params.get('left_key', 'id')
    right_key = params.get('right_key', 'id')
    suffixes = params.get('suffixes', '_x,_y')
    
    logger.info(f"🔗 Joining data: {join_type} join on {left_key} = {right_key}")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    result['step_type'] = 'join'
    result['join_details'] = {
        'join_type': join_type,
        'left_key': left_key,
        'right_key': right_key,
        'suffixes': suffixes.split(',') if suffixes else ['_x', '_y'],
        'left_records': int(result['count'] * random.uniform(0.8, 1.2)),
        'right_records': int(result['count'] * random.uniform(0.8, 1.2)),
        'joined_records': int(result['count']),
        'join_efficiency': random.uniform(0.7, 0.95),
        'join_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def aggregate_data(params):
    """Aggregate data operation"""
    logger.info(f"🔄 Starting AGGREGATE operation")
    
    # Extract parameters
    group_by = params.get('group_by', 'date,region')
    aggregations = params.get('aggregations', 'sum:amount,count:id,mean:value')
    sort_by = params.get('sort_by', 'date DESC')
    
    logger.info(f"📊 Aggregating data: group by {group_by}")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    result['step_type'] = 'aggregate'
    result['aggregation_details'] = {
        'group_by': group_by.split(',') if group_by else [],
        'aggregations': aggregations.split(',') if aggregations else [],
        'sort_by': sort_by,
        'input_records': int(result['count'] * random.uniform(3.0, 10.0)),
        'output_records': int(result['count']),
        'aggregation_efficiency': random.uniform(0.8, 0.98),
        'aggregation_timestamp': datetime.now().isoformat()
    }
    
    return result

@error_handler
def data_output(params):
    """Data output operation"""
    logger.info(f"🔄 Starting DATA_OUTPUT operation")
    
    # Extract parameters
    output_type = params.get('output_type', 'preview')
    max_rows = params.get('max_rows', 1000)
    
    logger.info(f"📤 Outputting data: type={output_type}, max_rows={max_rows}")
    
    # Use the enhanced generic processor
    result = process_generic_node(params)
    result['step_type'] = 'data_output'
    result['output_details'] = {
        'output_type': output_type,
        'max_rows': max_rows,
        'total_records': int(result['count']),
        'output_records': min(max_rows, int(result['count'])),
        'output_format': 'table',
        'output_timestamp': datetime.now().isoformat()
    }
    
    return result
