#!/usr/bin/env python3
"""
Test script for the Workflow Tool backend functionality
"""

import requests
import json
import time
import uuid

# API base URL
BASE_URL = "http://localhost:8000"

def test_workflow_steps():
    """Test the workflow steps endpoint"""
    print("🧪 Testing workflow steps endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/steps")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Steps endpoint working: {data['total_steps']} total steps")
            
            # Check for workflow steps
            workflow_steps = [
                'read_csv', 'read_parquet', 'read_excel', 
                'convert_parquet', 'filter', 'join', 'aggregate', 'output'
            ]
            
            for step in workflow_steps:
                if step in data['steps']:
                    print(f"  ✅ {step}: {data['steps'][step]}")
                else:
                    print(f"  ❌ {step}: Not found")
        else:
            print(f"❌ Steps endpoint failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Error testing steps endpoint: {e}")

def test_workflow_node(node_type, parameters):
    """Test a specific workflow node"""
    print(f"\n🧪 Testing {node_type} node...")
    
    try:
        # Prepare request
        request_data = {
            "parameters": {
                "expectedRunDate": "2024-01-01",
                "inputConfigFilePath": "/path/to/config",
                "inputConfigFilePattern": "*.json",
                "rootFileDir": "/data",
                "runEnv": "production",
                "tempFilePath": "/tmp"
            },
            "custom_params": parameters,
            "previous_outputs": {}
        }
        
        # Start the task
        response = requests.post(f"{BASE_URL}/run/{node_type}", json=request_data)
        
        if response.status_code == 200:
            result = response.json()
            task_id = result['task_id']
            print(f"✅ {node_type} task started: {task_id}")
            
            # Poll for completion
            max_attempts = 30
            for attempt in range(max_attempts):
                time.sleep(2)
                
                status_response = requests.get(f"{BASE_URL}/status/{task_id}")
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    
                    if status_data['status'] == 'completed':
                        print(f"✅ {node_type} completed successfully!")
                        
                        # Get output
                        output_response = requests.get(f"{BASE_URL}/output/{task_id}")
                        if output_response.status_code == 200:
                            output_data = output_response.json()
                            print(f"📊 Output received: {len(str(output_data))} characters")
                            return True
                        else:
                            print(f"❌ Failed to get output: {output_response.status_code}")
                            return False
                            
                    elif status_data['status'] == 'failed':
                        print(f"❌ {node_type} failed: {status_data.get('output', 'Unknown error')}")
                        return False
                    else:
                        print(f"⏳ {node_type} still running... (attempt {attempt + 1}/{max_attempts})")
                else:
                    print(f"❌ Status check failed: {status_response.status_code}")
                    return False
            
            print(f"❌ {node_type} timed out after {max_attempts} attempts")
            return False
            
        else:
            print(f"❌ Failed to start {node_type}: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ Error testing {node_type}: {e}")
        return False

def test_workflow_chain():
    """Test a simple workflow chain"""
    print("\n🧪 Testing workflow chain...")
    
    # Test parameters for each node type
    test_cases = [
        {
            'node_type': 'read_csv',
            'parameters': {
                'file_path': '/data/sample.csv',
                'delimiter': ',',
                'encoding': 'utf-8',
                'header': True,
                'skip_rows': 0
            }
        },
        {
            'node_type': 'read_parquet',
            'parameters': {
                'file_path': '/data/sample.parquet',
                'columns': 'id,name,value',
                'filters': 'value > 100'
            }
        },
        {
            'node_type': 'read_excel',
            'parameters': {
                'file_path': '/data/sample.xlsx',
                'sheet_name': 'Sheet1',
                'header_row': 0,
                'skip_rows': 0
            }
        },
        {
            'node_type': 'filter',
            'parameters': {
                'condition': 'value > 50 AND status == "active"',
                'case_sensitive': False
            }
        },
        {
            'node_type': 'convert_parquet',
            'parameters': {
                'output_path': '/output/result.parquet',
                'compression': 'snappy',
                'partition_by': 'date,region'
            }
        },
        {
            'node_type': 'aggregate',
            'parameters': {
                'group_by': 'date,region',
                'aggregations': 'sum:amount,count:id,mean:value',
                'sort_by': 'date DESC'
            }
        },
        {
            'node_type': 'output',
            'parameters': {
                'output_type': 'preview',
                'max_rows': 1000
            }
        }
    ]
    
    success_count = 0
    total_count = len(test_cases)
    
    for test_case in test_cases:
        if test_workflow_node(test_case['node_type'], test_case['parameters']):
            success_count += 1
    
    print(f"\n📊 Workflow chain test results: {success_count}/{total_count} nodes successful")
    return success_count == total_count

def main():
    """Main test function"""
    print("🚀 Starting Workflow Tool Backend Tests")
    print("=" * 50)
    
    # Test 1: Check if server is running
    try:
        health_response = requests.get(f"{BASE_URL}/health")
        if health_response.status_code == 200:
            print("✅ Backend server is running")
        else:
            print("❌ Backend server is not responding properly")
            return
    except Exception as e:
        print(f"❌ Cannot connect to backend server: {e}")
        print("Make sure the backend server is running on http://localhost:8000")
        return
    
    # Test 2: Test workflow steps endpoint
    test_workflow_steps()
    
    # Test 3: Test individual workflow nodes
    test_workflow_chain()
    
    print("\n" + "=" * 50)
    print("🏁 Workflow Tool Backend Tests Completed")

if __name__ == "__main__":
    main()
