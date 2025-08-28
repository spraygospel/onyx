#!/usr/bin/env python3
"""
Subprocess Environment Test - Direct simulation of dev_run_background_jobs.py
This test simulates the exact problem scenario in the background jobs script
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path

# Add backend to Python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_path)

def test_current_background_jobs_behavior():
    """Test the current dev_run_background_jobs.py subprocess behavior"""
    print("=== Testing Current Background Jobs Script Behavior ===")
    
    # This is the exact command structure from dev_run_background_jobs.py
    cmd_test = [
        "python", "-c",
        """
import os
print("Environment check in subprocess:")
vars_to_check = [
    'S3_AWS_ACCESS_KEY_ID', 
    'S3_AWS_SECRET_ACCESS_KEY', 
    'S3_ENDPOINT_URL', 
    'S3_FILE_STORE_BUCKET_NAME'
]
missing = []
for var in vars_to_check:
    value = os.environ.get(var)
    if value:
        masked = '*' * len(value) if 'SECRET' in var else value
        print(f"  ✅ {var}: {masked}")
    else:
        print(f"  ❌ {var}: None")
        missing.append(var)

if missing:
    print(f"❌ MISSING VARIABLES: {missing}")
    import sys
    sys.exit(1)
else:
    print("✅ ALL VARIABLES PRESENT")
"""
    ]
    
    print("1. Testing WITHOUT env inheritance (current behavior):")
    process1 = subprocess.Popen(
        cmd_test, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True
        # Note: NO env parameter - this is the current behavior
    )
    stdout1, stderr1 = process1.communicate()
    print(stdout1)
    if stderr1:
        print(f"STDERR: {stderr1}")
    
    success1 = process1.returncode == 0
    
    print("\n2. Testing WITH env inheritance (proposed fix):")
    process2 = subprocess.Popen(
        cmd_test,
        env=os.environ.copy(),  # ← THE FIX
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout2, stderr2 = process2.communicate()
    print(stdout2)
    if stderr2:
        print(f"STDERR: {stderr2}")
        
    success2 = process2.returncode == 0
    
    return success1, success2

def test_with_loaded_env():
    """Test after manually loading .env.dev"""
    print("\n=== Testing After Loading .env.dev ===")
    
    # Load .env.dev manually
    env_path = os.path.join(backend_path, '.env.dev')
    loaded_vars = {}
    
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                loaded_vars[key] = value
                os.environ[key] = value
    
    print(f"Loaded {len(loaded_vars)} variables from .env.dev")
    
    # Now test subprocess behavior
    success1, success2 = test_current_background_jobs_behavior()
    return success1, success2

def main():
    print("=== Subprocess Environment Inheritance Test ===")
    print("This test simulates exactly what happens in dev_run_background_jobs.py\n")
    
    # Test 1: Check current environment
    print("Current process environment check:")
    for var in ['S3_AWS_ACCESS_KEY_ID', 'S3_AWS_SECRET_ACCESS_KEY', 'S3_ENDPOINT_URL', 'S3_FILE_STORE_BUCKET_NAME']:
        value = os.environ.get(var)
        if value:
            masked = '*' * len(value) if 'SECRET' in var else value
            print(f"  ✅ {var}: {masked}")
        else:
            print(f"  ❌ {var}: None")
    
    print()
    
    # Test 2: Test after loading env
    success1, success2 = test_with_loaded_env()
    
    print("\n=== RESULTS ===")
    print(f"Without env inheritance: {'✅ PASS' if success1 else '❌ FAIL'}")
    print(f"With env inheritance: {'✅ PASS' if success2 else '❌ FAIL'}")
    
    if not success1 and success2:
        print("\n🎯 CONFIRMED: Environment inheritance fix needed!")
        print("✅ The fix (env=os.environ.copy()) will solve the issue")
    elif success1 and success2:
        print("\n🤔 Both approaches work - the issue might be elsewhere")
    else:
        print("\n❌ Neither approach works - deeper investigation needed")
    
    return success2

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)