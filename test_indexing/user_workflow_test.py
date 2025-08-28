#!/usr/bin/env python3
"""
User Workflow Test - Simulate exact user commands
Tests the exact sequence: source .env.dev && python ./scripts/dev_run_background_jobs.py
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path

def test_user_command_sequence():
    """Test the exact user command sequence"""
    print("=== Testing User Command Sequence ===")
    print("Simulating: cd backend && source .env.dev && python ./scripts/dev_run_background_jobs.py")
    
    # Change to backend directory
    backend_path = Path(__file__).parent.parent / 'backend'
    original_cwd = os.getcwd()
    
    try:
        os.chdir(backend_path)
        print(f"Changed to directory: {backend_path}")
        
        # Create a test script that simulates a celery worker checking environment
        test_celery_worker = """
import os
import sys

print("=== Celery Worker Environment Check ===")
vars_to_check = [
    'S3_AWS_ACCESS_KEY_ID', 
    'S3_AWS_SECRET_ACCESS_KEY', 
    'S3_ENDPOINT_URL', 
    'S3_FILE_STORE_BUCKET_NAME'
]

missing_vars = []
for var in vars_to_check:
    value = os.environ.get(var)
    if value:
        masked = '*' * len(value) if 'SECRET' in var else value
        print(f"  ✅ {var}: {masked}")
    else:
        print(f"  ❌ {var}: None")
        missing_vars.append(var)

if missing_vars:
    print(f"\\n❌ CRITICAL: Missing variables: {missing_vars}")
    print("This would cause NoCredentialsError in S3 operations!")
    sys.exit(1)
else:
    print("\\n✅ All S3 variables present - no NoCredentialsError expected")
"""
        
        # Test 1: Run with bash -c to simulate user command exactly
        print("\n1. Testing bash -c simulation of user command:")
        bash_command = 'source .env.dev && python -c "' + test_celery_worker.replace('"', '\\"') + '"'
        
        process = subprocess.run(
            ['bash', '-c', bash_command],
            cwd=backend_path,
            capture_output=True,
            text=True
        )
        
        print("STDOUT:")
        print(process.stdout)
        if process.stderr:
            print("STDERR:")
            print(process.stderr)
            
        success1 = process.returncode == 0
        
        # Test 2: Test the actual background jobs script structure
        print("\n2. Testing actual subprocess.Popen from background jobs script:")
        
        # This simulates what happens inside dev_run_background_jobs.py
        cmd = ['python', '-c', test_celery_worker]
        
        # First load environment manually (like our Python script should)
        env_vars = {}
        try:
            with open('.env.dev', 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key] = value
                        os.environ[key] = value
        except FileNotFoundError:
            print("❌ .env.dev not found!")
            return False, False
            
        print(f"Loaded {len(env_vars)} variables from .env.dev")
        
        # Test without env inheritance (current broken behavior)
        print("\n2a. Without env inheritance:")
        process2a = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
            # No env parameter
        )
        stdout2a, stderr2a = process2a.communicate()
        print(stdout2a)
        if stderr2a:
            print(f"STDERR: {stderr2a}")
        success2a = process2a.returncode == 0
        
        # Test with env inheritance (proposed fix)
        print("\n2b. With env inheritance (proposed fix):")
        process2b = subprocess.Popen(
            cmd,
            env=os.environ.copy(),  # THE FIX
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout2b, stderr2b = process2b.communicate()
        print(stdout2b)
        if stderr2b:
            print(f"STDERR: {stderr2b}")
        success2b = process2b.returncode == 0
        
        return success1, success2a, success2b
        
    finally:
        os.chdir(original_cwd)

def main():
    print("=== User Workflow Test ===")
    print("Testing the exact issue the user encountered")
    
    success1, success2a, success2b = test_user_command_sequence()
    
    print("\n=== RESULTS ===")
    print(f"Bash source .env.dev && python: {'✅ PASS' if success1 else '❌ FAIL'}")
    print(f"Python subprocess without env: {'✅ PASS' if success2a else '❌ FAIL'}")
    print(f"Python subprocess with env: {'✅ PASS' if success2b else '❌ FAIL'}")
    
    if success1 and success2a and success2b:
        print("\n🤔 All tests pass - the issue might be in the timing or specific Celery context")
        print("Recommendation: Implement the fix anyway to be safe")
    elif not success2a and success2b:
        print("\n🎯 CONFIRMED: Environment inheritance issue!")
        print("✅ The fix is needed and will work")
    else:
        print("\n❌ Complex issue - needs further investigation")
    
    return success2b

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)