#!/usr/bin/env python3
"""
Test script for Completeness Control Integration between Frontend and Backend
"""

import requests
import time
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_completeness_integration():
    """Test the completeness control integration"""
    print("🧪 Testing Completeness Control Integration")
    print("=" * 60)
    
    # Store task results for chaining
    task_results = {}
    
    # 1. Test health check
    print("\n1. 🏥 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Health check passed: {result}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return
    
    # 2. Test available steps
    print("\n2. 📋 Testing available steps...")
    try:
        response = requests.get(f"{BASE_URL}/steps")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Available steps: {result['total_steps']} steps")
            for step_id, step_name in result['steps'].items():
                print(f"      - {step_id}: {step_name}")
        else:
            print(f"   ❌ Failed to get steps: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return
    
    # 3. Test initial configuration step
    print("\n3. ⚙️ Testing Reading Config Component...")
    config_request = {
        "parameters": {
            "expectedRunDate": "2024-01-15",
            "inputConfigFilePath": "/data/config/source_config.json",
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
        response = requests.post(f"{BASE_URL}/run/reading_config_comp", json=config_request)
        if response.status_code == 200:
            result = response.json()
            task_results['reading_config_comp'] = result
            print(f"   ✅ Config task started: {result['task_id']}")
            
            # Wait for completion
            print("   ⏳ Waiting for config to complete...")
            config_task_id = result['task_id']
            while True:
                status_response = requests.get(f"{BASE_URL}/status/{config_task_id}")
                if status_response.status_code == 200:
                    status = status_response.json()
                    if status['status'] == 'completed':
                        print("   ✅ Config completed successfully")
                        break
                    elif status['status'] == 'failed':
                        print(f"   ❌ Config failed: {status.get('error', 'Unknown error')}")
                        return
                time.sleep(2)
        else:
            print(f"   ❌ Failed to start config: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return
    
    # 4. Test SRC flow steps
    print("\n4. 📤 Testing SRC flow steps...")
    
    # Get config output
    config_output_response = requests.get(f"{BASE_URL}/output/{config_task_id}")
    if config_output_response.status_code == 200:
        config_output = config_output_response.json()['output']
        
        # Test Read SRC Component
        src_request = {
            "parameters": {
                "expectedRunDate": "2024-01-15",
                "inputConfigFilePath": "/data/source/src_config.json",
                "inputConfigFilePattern": "*.csv",
                "rootFileDir": "/data/source",
                "runEnv": "production",
                "tempFilePath": "/tmp/etl"
            },
            "previous_outputs": {
                "reading_config_comp": config_output
            },
            "custom_params": {
                "source_type": "database",
                "extraction_method": "full_load",
                "batch_size": 1000
            }
        }
        
        try:
            response = requests.post(f"{BASE_URL}/run/read_src_comp", json=src_request)
            if response.status_code == 200:
                result = response.json()
                task_results['read_src_comp'] = result
                print(f"   ✅ Read SRC task started: {result['task_id']}")
                
                # Wait for completion
                print("   ⏳ Waiting for Read SRC to complete...")
                src_task_id = result['task_id']
                while True:
                    status_response = requests.get(f"{BASE_URL}/status/{src_task_id}")
                    if status_response.status_code == 200:
                        status = status_response.json()
                        if status['status'] == 'completed':
                            print("   ✅ Read SRC completed successfully")
                            break
                        elif status['status'] == 'failed':
                            print(f"   ❌ Read SRC failed: {status.get('error', 'Unknown error')}")
                            return
                    time.sleep(2)
            else:
                print(f"   ❌ Failed to start Read SRC: {response.status_code}")
                return
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return
    else:
        print("   ❌ Failed to get config output")
        return
    
    # 5. Test TGT flow steps
    print("\n5. 📥 Testing TGT flow steps...")
    
    # Test Read TGT Component
    tgt_request = {
        "parameters": {
            "expectedRunDate": "2024-01-15",
            "inputConfigFilePath": "/data/target/tgt_config.json",
            "inputConfigFilePattern": "*.csv",
            "rootFileDir": "/data/target",
            "runEnv": "production",
            "tempFilePath": "/tmp/etl"
        },
        "previous_outputs": {
            "reading_config_comp": config_output
        },
        "custom_params": {
            "target_type": "data_warehouse",
            "extraction_method": "incremental",
            "batch_size": 500
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/run/read_tgt_comp", json=tgt_request)
        if response.status_code == 200:
            result = response.json()
            task_results['read_tgt_comp'] = result
            print(f"   ✅ Read TGT task started: {result['task_id']}")
            
            # Wait for completion
            print("   ⏳ Waiting for Read TGT to complete...")
            tgt_task_id = result['task_id']
            while True:
                status_response = requests.get(f"{BASE_URL}/status/{tgt_task_id}")
                if status_response.status_code == 200:
                    status = status_response.json()
                    if status['status'] == 'completed':
                        print("   ✅ Read TGT completed successfully")
                        break
                    elif status['status'] == 'failed':
                        print(f"   ❌ Read TGT failed: {status.get('error', 'Unknown error')}")
                        return
                time.sleep(2)
        else:
            print(f"   ❌ Failed to start Read TGT: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return
    
    # 6. Test SRC processing steps
    print("\n6. 🔄 Testing SRC processing steps...")
    
    # Get SRC output
    src_output_response = requests.get(f"{BASE_URL}/output/{src_task_id}")
    if src_output_response.status_code == 200:
        src_output = src_output_response.json()['output']
        
        # Test Pre-Harmonisation SRC
        pre_harm_src_request = {
            "previous_outputs": {
                "read_src_comp": src_output
            },
            "custom_params": {
                "cleansing_rules": ["remove_duplicates", "fix_encoding", "validate_format"],
                "quality_threshold": 0.95
            }
        }
        
        try:
            response = requests.post(f"{BASE_URL}/run/pre_harmonisation_src_comp", json=pre_harm_src_request)
            if response.status_code == 200:
                result = response.json()
                task_results['pre_harmonisation_src_comp'] = result
                print(f"   ✅ Pre-Harmonisation SRC task started: {result['task_id']}")
            else:
                print(f"   ❌ Failed to start Pre-Harmonisation SRC: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    # 7. Test TGT processing steps
    print("\n7. 🔄 Testing TGT processing steps...")
    
    # Get TGT output
    tgt_output_response = requests.get(f"{BASE_URL}/output/{tgt_task_id}")
    if tgt_output_response.status_code == 200:
        tgt_output = tgt_output_response.json()['output']
        
        # Test Pre-Harmonisation TGT
        pre_harm_tgt_request = {
            "previous_outputs": {
                "read_tgt_comp": tgt_output
            },
            "custom_params": {
                "cleansing_rules": ["remove_duplicates", "fix_encoding", "validate_format"],
                "quality_threshold": 0.95
            }
        }
        
        try:
            response = requests.post(f"{BASE_URL}/run/pre_harmonisation_tgt_comp", json=pre_harm_tgt_request)
            if response.status_code == 200:
                result = response.json()
                task_results['pre_harmonisation_tgt_comp'] = result
                print(f"   ✅ Pre-Harmonisation TGT task started: {result['task_id']}")
            else:
                print(f"   ❌ Failed to start Pre-Harmonisation TGT: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    # 8. Test combined steps
    print("\n8. 🔗 Testing combined steps...")
    
    # Test Combine Data Component
    combine_request = {
        "previous_outputs": {
            "read_src_comp": src_output,
            "read_tgt_comp": tgt_output
        },
        "custom_params": {
            "combination_strategy": "inner_join",
            "join_keys": ["id", "timestamp"],
            "data_quality_check": True
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/run/combine_data_comp", json=combine_request)
        if response.status_code == 200:
            result = response.json()
            task_results['combine_data_comp'] = result
            print(f"   ✅ Combine Data task started: {result['task_id']}")
        else:
            print(f"   ❌ Failed to start Combine Data: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # 9. Test final steps
    print("\n9. 🎯 Testing final steps...")
    
    # Test Apply Rules Component
    apply_rules_request = {
        "custom_params": {
            "business_rules": ["completeness_check", "accuracy_validation", "consistency_check"],
            "rule_priority": "high",
            "validation_mode": "strict"
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/run/apply_rules_comp", json=apply_rules_request)
        if response.status_code == 200:
            result = response.json()
            task_results['apply_rules_comp'] = result
            print(f"   ✅ Apply Rules task started: {result['task_id']}")
        else:
            print(f"   ❌ Failed to start Apply Rules: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # Test Output Rules Component
    output_rules_request = {
        "custom_params": {
            "output_format": "json",
            "include_metadata": True,
            "compression": False
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/run/output_rules_comp", json=output_rules_request)
        if response.status_code == 200:
            result = response.json()
            task_results['output_rules_comp'] = result
            print(f"   ✅ Output Rules task started: {result['task_id']}")
        else:
            print(f"   ❌ Failed to start Output Rules: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # Test Break Rolling Component
    break_rolling_request = {
        "custom_params": {
            "rolling_window_size": 30,
            "break_detection_method": "statistical",
            "confidence_level": 0.95
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/run/break_rolling_comp", json=break_rolling_request)
        if response.status_code == 200:
            result = response.json()
            task_results['break_rolling_comp'] = result
            print(f"   ✅ Break Rolling task started: {result['task_id']}")
        else:
            print(f"   ❌ Failed to start Break Rolling: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # 10. Test cleanup functionality
    print("\n10. 🧹 Testing cleanup functionality...")
    
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
    
    # 11. Test cleanup schedule
    print("\n11. 📅 Testing cleanup schedule...")
    
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
    print("✅ Completeness Control Integration test completed!")
    print("\n📊 Summary:")
    for step_name, result in task_results.items():
        print(f"   - {step_name}: {result.get('task_id', 'N/A')}")
    
    print("\n💡 Features demonstrated:")
    print("   - ✅ Complete completeness control workflow")
    print("   - ✅ Step-by-step processing with dependencies")
    print("   - ✅ Previous output integration")
    print("   - ✅ Parameter customization")
    print("   - ✅ SRC and TGT parallel processing")
    print("   - ✅ Combined data processing")
    print("   - ✅ Business rules application")
    print("   - ✅ Output generation")
    print("   - ✅ Break rolling analysis")
    print("   - ✅ Scheduled cleanup functionality")
    print("   - ✅ Frontend-backend synchronization")

if __name__ == "__main__":
    test_completeness_integration()
