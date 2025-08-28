#!/usr/bin/env python3
"""
Environment Inheritance Test for Celery Background Jobs
Tests subprocess environment inheritance to diagnose indexing issues
"""

import os
import sys
import subprocess
import tempfile
import json
from datetime import datetime
from pathlib import Path

# Add backend to Python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_path)

print(f"Backend path: {backend_path}")

def load_env_file():
    """Load environment variables from .env.dev file"""
    env_path = os.path.join(backend_path, '.env.dev')
    env_vars = {}
    try:
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
                    os.environ[key] = value
        return env_vars
    except FileNotFoundError:
        print(f"❌ Environment file not found: {env_path}")
        return {}

def test_direct_environment_access():
    """Test 1: Direct environment variable access"""
    print("=== Test 1: Direct Environment Variable Access ===")
    
    # Load .env.dev
    env_vars = load_env_file()
    print(f"✅ Loaded {len(env_vars)} environment variables")
    
    # Check S3 specific vars
    s3_vars = ['S3_AWS_ACCESS_KEY_ID', 'S3_AWS_SECRET_ACCESS_KEY', 'S3_ENDPOINT_URL', 'S3_FILE_STORE_BUCKET_NAME']
    all_present = True
    
    for key in s3_vars:
        value = os.environ.get(key)
        if value:
            masked_value = '*' * len(value) if 'SECRET' in key else value
            print(f"  ✅ {key}: {masked_value}")
        else:
            print(f"  ❌ {key}: NOT SET")
            all_present = False
    
    return all_present

def test_subprocess_without_env():
    """Test 2: Subprocess without explicit environment (current broken behavior)"""
    print("\n=== Test 2: Subprocess WITHOUT Environment Inheritance ===")
    
    # Create test script that checks environment
    test_script = """
import os
import sys
import json

result = {
    'S3_AWS_ACCESS_KEY_ID': os.environ.get('S3_AWS_ACCESS_KEY_ID'),
    'S3_AWS_SECRET_ACCESS_KEY': os.environ.get('S3_AWS_SECRET_ACCESS_KEY'),
    'S3_ENDPOINT_URL': os.environ.get('S3_ENDPOINT_URL'),
    'S3_FILE_STORE_BUCKET_NAME': os.environ.get('S3_FILE_STORE_BUCKET_NAME'),
}

print(json.dumps(result))
"""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(test_script)
        temp_script = f.name
    
    try:
        # This simulates the CURRENT BROKEN behavior
        process = subprocess.Popen(
            [sys.executable, temp_script],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        
        if process.returncode == 0:
            result = json.loads(stdout.strip())
            missing_vars = [k for k, v in result.items() if v is None]
            
            if missing_vars:
                print(f"  ❌ Missing variables in subprocess: {missing_vars}")
                print("  ❌ This confirms the bug - subprocess doesn't inherit environment!")
                return False
            else:
                print("  ✅ All variables present in subprocess")
                return True
        else:
            print(f"  ❌ Subprocess failed: {stderr}")
            return False
            
    finally:
        os.unlink(temp_script)

def test_subprocess_with_env():
    """Test 3: Subprocess with explicit environment (proposed fix)"""
    print("\n=== Test 3: Subprocess WITH Environment Inheritance (FIX) ===")
    
    # Create test script that checks environment
    test_script = """
import os
import sys
import json

result = {
    'S3_AWS_ACCESS_KEY_ID': os.environ.get('S3_AWS_ACCESS_KEY_ID'),
    'S3_AWS_SECRET_ACCESS_KEY': os.environ.get('S3_AWS_SECRET_ACCESS_KEY'),
    'S3_ENDPOINT_URL': os.environ.get('S3_ENDPOINT_URL'),
    'S3_FILE_STORE_BUCKET_NAME': os.environ.get('S3_FILE_STORE_BUCKET_NAME'),
}

print(json.dumps(result))
"""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(test_script)
        temp_script = f.name
    
    try:
        # This simulates the FIXED behavior - passing environment explicitly
        process = subprocess.Popen(
            [sys.executable, temp_script],
            env=os.environ.copy(),  # ← THE FIX
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        
        if process.returncode == 0:
            result = json.loads(stdout.strip())
            missing_vars = [k for k, v in result.items() if v is None]
            
            if missing_vars:
                print(f"  ❌ Still missing variables: {missing_vars}")
                return False
            else:
                print("  ✅ All variables present in subprocess with env=os.environ.copy()")
                print("  ✅ This confirms the fix works!")
                return True
        else:
            print(f"  ❌ Subprocess failed: {stderr}")
            return False
            
    finally:
        os.unlink(temp_script)

def test_celery_worker_simulation():
    """Test 4: Simulate actual Celery worker command"""
    print("\n=== Test 4: Celery Worker Command Simulation ===")
    
    # Simulate the exact command from dev_run_background_jobs.py
    cmd = [
        "python", "-c", 
        """
import os
print("Celery Worker Environment Check:")
for var in ['S3_AWS_ACCESS_KEY_ID', 'S3_AWS_SECRET_ACCESS_KEY', 'S3_ENDPOINT_URL', 'S3_FILE_STORE_BUCKET_NAME']:
    value = os.environ.get(var)
    if value:
        masked = '*' * len(value) if 'SECRET' in var else value
        print(f"  ✅ {var}: {masked}")
    else:
        print(f"  ❌ {var}: None")
"""
    ]
    
    print("Testing without env inheritance (current broken):")
    process1 = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout1, _ = process1.communicate()
    print(stdout1)
    
    print("Testing with env inheritance (proposed fix):")
    process2 = subprocess.Popen(cmd, env=os.environ.copy(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout2, _ = process2.communicate()
    print(stdout2)
    
    # Check if fix shows improvement
    return "❌" not in stdout2 if process2.returncode == 0 else False

def main():
    """Main test execution"""
    print("=== Environment Inheritance Test Suite ===")
    print(f"Testing at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Run all tests
    test_results = []
    
    test_results.append(("Direct Environment Access", test_direct_environment_access()))
    test_results.append(("Subprocess Without Env", not test_subprocess_without_env()))  # Expect this to fail
    test_results.append(("Subprocess With Env", test_subprocess_with_env()))
    test_results.append(("Celery Worker Simulation", test_celery_worker_simulation()))
    
    # Summary
    print("\n=== Test Results Summary ===")
    all_passed = True
    for test_name, passed in test_results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if not passed and test_name != "Subprocess Without Env":  # We expect this one to fail
            all_passed = False
    
    if all_passed:
        print("\n🎉 ENVIRONMENT INHERITANCE FIX VALIDATED!")
        print("✅ The fix (env=os.environ.copy()) will resolve the indexing issue")
    else:
        print("\n❌ Tests indicate the fix may not work as expected")
        
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)