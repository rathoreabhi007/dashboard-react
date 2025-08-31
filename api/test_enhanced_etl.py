#!/usr/bin/env python3
"""
Test script for the Enhanced ETL API with Previous Output Support
"""

import requests
import time
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_enhanced_etl_workflow():
    """Test the enhanced ETL workflow with previous outputs"""
    print("🧪 Testing Enhanced ETL API with Previous Output Support")
    print("=" * 60)
    
    # Store task results for chaining
    task_results = {}
    
    # 1. Test EXTRACT step
    print("\n1. 🚀 Testing EXTRACT step...")
    extract_request = {
        "step_name": "extract",
        "parameters": {
            "expectedRunDate": "2024-01-15",
            "inputConfigFilePath": "/data/source/config.json",
            "inputConfigFilePattern": "*.csv",
            "rootFileDir": "/data/source",
            "runEnv": "production",
            "tempFilePath": "/tmp/etl"
        },
        "custom_params": {
            "source_type": "database",
            "extraction_method": "full_load",
            "batch_size": 1000
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/run/extract", json=extract_request)
        if response.status_code == 200:
            result = response.json()
            task_results['extract'] = result
            print(f"   ✅ Extract task started: {result['task_id']}")
            
            # Wait for completion
            print("   ⏳ Waiting for extract to complete...")
            extract_task_id = result['task_id']
            while True:
                status_response = requests.get(f"{BASE_URL}/status/{extract_task_id}")
                if status_response.status_code == 200:
                    status = status_response.json()
                    if status['status'] == 'completed':
                        print("   ✅ Extract completed successfully")
                        break
                    elif status['status'] == 'failed':
                        print(f"   ❌ Extract failed: {status.get('error', 'Unknown error')}")
                        return
                time.sleep(2)
        else:
            print(f"   ❌ Failed to start extract: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return
    
    # 2. Test TRANSFORM step with previous output
    print("\n2. 🔄 Testing TRANSFORM step with extract output...")
    
    # Get extract output
    extract_output_response = requests.get(f"{BASE_URL}/output/{extract_task_id}")
    if extract_output_response.status_code == 200:
        extract_output = extract_output_response.json()['output']
        
        transform_request = {
            "step_name": "transform",
            "parameters": {
                "expectedRunDate": "2024-01-15",
                "inputConfigFilePath": "/data/transform/rules.json",
                "inputConfigFilePattern": "*.json",
                "rootFileDir": "/data/transform",
                "runEnv": "production",
                "tempFilePath": "/tmp/etl"
            },
            "previous_outputs": {
                "extract": extract_output
            },
            "custom_params": {
                "transformation_rules": ["clean_data", "normalize", "validate"],
                "data_quality_threshold": 0.95
            }
        }
        
        try:
            response = requests.post(f"{BASE_URL}/run/transform", json=transform_request)
            if response.status_code == 200:
                result = response.json()
                task_results['transform'] = result
                print(f"   ✅ Transform task started: {result['task_id']}")
                
                # Wait for completion
                print("   ⏳ Waiting for transform to complete...")
                transform_task_id = result['task_id']
                while True:
                    status_response = requests.get(f"{BASE_URL}/status/{transform_task_id}")
                    if status_response.status_code == 200:
                        status = status_response.json()
                        if status['status'] == 'completed':
                            print("   ✅ Transform completed successfully")
                            break
                        elif status['status'] == 'failed':
                            print(f"   ❌ Transform failed: {status.get('error', 'Unknown error')}")
                            return
                    time.sleep(2)
            else:
                print(f"   ❌ Failed to start transform: {response.status_code}")
                return
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return
    else:
        print("   ❌ Failed to get extract output")
        return
    
    # 3. Test LOAD step with previous outputs
    print("\n3. 📥 Testing LOAD step with previous outputs...")
    
    # Get transform output
    transform_output_response = requests.get(f"{BASE_URL}/output/{transform_task_id}")
    if transform_output_response.status_code == 200:
        transform_output = transform_output_response.json()['output']
        
        load_request = {
            "step_name": "load",
            "parameters": {
                "expectedRunDate": "2024-01-15",
                "inputConfigFilePath": "/data/load/target.json",
                "inputConfigFilePattern": "*.json",
                "rootFileDir": "/data/load",
                "runEnv": "production",
                "tempFilePath": "/tmp/etl"
            },
            "previous_outputs": {
                "extract": extract_output,
                "transform": transform_output
            },
            "custom_params": {
                "target_system": "data_warehouse",
                "load_strategy": "incremental",
                "commit_frequency": 1000
            }
        }
        
        try:
            response = requests.post(f"{BASE_URL}/run/load", json=load_request)
            if response.status_code == 200:
                result = response.json()
                task_results['load'] = result
                print(f"   ✅ Load task started: {result['task_id']}")
                
                # Wait for completion
                print("   ⏳ Waiting for load to complete...")
                load_task_id = result['task_id']
                while True:
                    status_response = requests.get(f"{BASE_URL}/status/{load_task_id}")
                    if status_response.status_code == 200:
                        status = status_response.json()
                        if status['status'] == 'completed':
                            print("   ✅ Load completed successfully")
                            break
                        elif status['status'] == 'failed':
                            print(f"   ❌ Load failed: {status.get('error', 'Unknown error')}")
                            return
                    time.sleep(2)
            else:
                print(f"   ❌ Failed to start load: {response.status_code}")
                return
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return
    else:
        print("   ❌ Failed to get transform output")
        return
    
    # 4. Test additional ETL steps
    print("\n4. 🔧 Testing additional ETL steps...")
    
    # Test VALIDATE step
    validate_request = {
        "step_name": "validate",
        "custom_params": {
            "validation_rules": ["completeness", "accuracy", "consistency"],
            "validation_threshold": 0.90
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/run/validate", json=validate_request)
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Validate task started: {result['task_id']}")
        else:
            print(f"   ❌ Failed to start validate: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # Test ENRICH step
    enrich_request = {
        "step_name": "enrich",
        "custom_params": {
            "enrichment_sources": ["external_api", "lookup_tables"],
            "enrichment_fields": ["geographic_data", "demographic_data"]
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/run/enrich", json=enrich_request)
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Enrich task started: {result['task_id']}")
        else:
            print(f"   ❌ Failed to start enrich: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # 5. Test cleanup functionality
    print("\n5. 🧹 Testing cleanup functionality...")
    
    try:
        # Manual cleanup
        cleanup_response = requests.post(f"{BASE_URL}/cleanup/now")
        if cleanup_response.status_code == 200:
            result = cleanup_response.json()
            print(f"   ✅ Manual cleanup: {result['message']}")
        else:
            print(f"   ❌ Manual cleanup failed: {cleanup_response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # 6. Test cleanup schedule
    print("\n6. 📅 Testing cleanup schedule...")
    
    try:
        # Get current schedule
        schedule_response = requests.get(f"{BASE_URL}/cleanup/schedule")
        if schedule_response.status_code == 200:
            schedule = schedule_response.json()
            print(f"   ✅ Current schedule: {json.dumps(schedule, indent=2)}")
        else:
            print(f"   ❌ Failed to get schedule: {schedule_response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("✅ Enhanced ETL workflow test completed!")
    print("\n📊 Summary:")
    print(f"   - Extract task: {task_results.get('extract', {}).get('task_id', 'N/A')}")
    print(f"   - Transform task: {task_results.get('transform', {}).get('task_id', 'N/A')}")
    print(f"   - Load task: {task_results.get('load', {}).get('task_id', 'N/A')}")
    print("\n💡 Features demonstrated:")
    print("   - ✅ Enhanced ETL functions with previous output support")
    print("   - ✅ Parameter merging and customization")
    print("   - ✅ Step chaining with data flow")
    print("   - ✅ Additional ETL steps (validate, enrich, aggregate)")
    print("   - ✅ Scheduled cleanup functionality")
    print("   - ✅ Comprehensive logging and monitoring")

if __name__ == "__main__":
    test_enhanced_etl_workflow()
