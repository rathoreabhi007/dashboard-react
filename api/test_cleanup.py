#!/usr/bin/env python3
"""
Test script for the ETL API cleanup functionality
"""

import requests
import time
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_cleanup_functionality():
    """Test the cleanup functionality"""
    print("🧪 Testing ETL API Cleanup Functionality")
    print("=" * 50)
    
    # 1. Check current cleanup schedule
    print("\n1. 📅 Checking current cleanup schedule...")
    try:
        response = requests.get(f"{BASE_URL}/cleanup/schedule")
        if response.status_code == 200:
            schedule = response.json()
            print(f"   ✅ Current schedule: {json.dumps(schedule, indent=2)}")
        else:
            print(f"   ❌ Failed to get schedule: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # 2. Update cleanup schedule to run in 1 minute
    print("\n2. ⏰ Setting cleanup to run in 1 minute...")
    try:
        # Get current time and add 1 minute
        now = datetime.now()
        future_time = now.replace(second=0, microsecond=0)
        future_time = future_time.replace(minute=future_time.minute + 1)
        
        schedule_data = {
            "hour": future_time.hour,
            "minute": future_time.minute,
            "timezone": "UTC"
        }
        
        response = requests.post(
            f"{BASE_URL}/cleanup/schedule",
            json=schedule_data
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Schedule updated: {result['message']}")
        else:
            print(f"   ❌ Failed to update schedule: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # 3. Run some test ETL tasks
    print("\n3. 🚀 Running test ETL tasks...")
    task_ids = []
    
    for step in ["extract", "transform", "load"]:
        try:
            response = requests.post(
                f"{BASE_URL}/run/{step}",
                json={"params": {"test": True}}
            )
            
            if response.status_code == 200:
                result = response.json()
                task_ids.append(result["task_id"])
                print(f"   ✅ Started {step} task: {result['task_id']}")
            else:
                print(f"   ❌ Failed to start {step} task: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error starting {step} task: {str(e)}")
    
    # 4. Check task statuses
    print("\n4. 📊 Checking task statuses...")
    for task_id in task_ids:
        try:
            response = requests.get(f"{BASE_URL}/status/{task_id}")
            if response.status_code == 200:
                status = response.json()
                print(f"   📋 Task {task_id[:8]}...: {status['status']}")
            else:
                print(f"   ❌ Failed to get status for {task_id}: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error checking status: {str(e)}")
    
    # 5. Wait for tasks to complete
    print("\n5. ⏳ Waiting for tasks to complete...")
    time.sleep(5)
    
    # 6. Manual cleanup test
    print("\n6. 🧹 Testing manual cleanup...")
    try:
        response = requests.post(f"{BASE_URL}/cleanup/now")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Manual cleanup: {result['message']}")
        else:
            print(f"   ❌ Manual cleanup failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error during manual cleanup: {str(e)}")
    
    # 7. Check cleanup schedule again
    print("\n7. 📅 Checking cleanup schedule after update...")
    try:
        response = requests.get(f"{BASE_URL}/cleanup/schedule")
        if response.status_code == 200:
            schedule = response.json()
            print(f"   ✅ Updated schedule: {json.dumps(schedule, indent=2)}")
        else:
            print(f"   ❌ Failed to get updated schedule: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("✅ Cleanup functionality test completed!")
    print("\n💡 Tips:")
    print("   - The scheduled cleanup will run automatically at the set time")
    print("   - You can manually trigger cleanup anytime with POST /cleanup/now")
    print("   - Check the API logs to see cleanup activity")
    print("   - Use GET /cleanup/schedule to see the current schedule")

if __name__ == "__main__":
    test_cleanup_functionality()
