#!/usr/bin/env python3
"""
Simple test script to verify the API request format fix
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_simple_request():
    """Test a simple request to verify the fix"""
    print("🧪 Testing simple API request...")
    
    # Test health check
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check status: {response.status_code}")
        if response.status_code == 200:
            print(f"Health check response: {response.json()}")
        else:
            print(f"Health check failed: {response.text}")
            return
    except Exception as e:
        print(f"Health check error: {str(e)}")
        return
    
    # Test available steps
    try:
        response = requests.get(f"{BASE_URL}/steps")
        print(f"Steps check status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Available steps: {result['total_steps']} steps")
        else:
            print(f"Steps check failed: {response.text}")
            return
    except Exception as e:
        print(f"Steps check error: {str(e)}")
        return
    
    # Test reading_config_comp request (the one that was failing)
    print("\n🧪 Testing reading_config_comp request...")
    
    # Correct request format (without step_name in body)
    correct_request = {
        "parameters": {
            "expectedRunDate": "2024-01-15",
            "inputConfigFilePath": "/data/config/config.json",
            "inputConfigFilePattern": "*.json",
            "rootFileDir": "/data/config",
            "runEnv": "production",
            "tempFilePath": "/tmp/etl"
        },
        "custom_params": {
            "config_type": "source_target",
            "validation_level": "strict"
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/run/reading_config_comp", 
            json=correct_request,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Request status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Task ID: {result.get('task_id')}")
            print(f"Response: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ Request failed: {response.status_code}")
            print(f"Error response: {response.text}")
            
            # Try to parse error details
            try:
                error_details = response.json()
                print(f"Error details: {json.dumps(error_details, indent=2)}")
            except:
                print(f"Raw error: {response.text}")
                
    except Exception as e:
        print(f"❌ Request error: {str(e)}")

if __name__ == "__main__":
    test_simple_request()
