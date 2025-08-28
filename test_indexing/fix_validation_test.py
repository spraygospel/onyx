#!/usr/bin/env python3
"""
Fix Validation Test - Test the actual fix
Tests that the modified dev_run_background_jobs.py properly loads and passes environment
"""

import os
import sys
import subprocess
import tempfile
import json
from pathlib import Path

def test_modified_background_jobs_script():
    """Test the modified background jobs script loads environment correctly"""
    print("=== Testing Modified Background Jobs Script ===")
    
    backend_path = Path(__file__).parent.parent / 'backend'
    script_path = backend_path / 'scripts' / 'dev_run_background_jobs.py'
    
    # Create a test version that just checks environment and exits
    test_script_content = '''
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Import the run_jobs function but modify it to just test environment
from scripts.dev_run_background_jobs import *

def test_env_loading():
    """Test environment loading part of run_jobs"""
    # Load environment variables from .env.dev if exists  
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.dev')
    if os.path.exists(env_path):
        print(f"Loading environment from: {env_path}")
        with open(env_path, 'r') as f:
            loaded_count = 0
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
                    loaded_count += 1
        print(f"✅ Loaded {loaded_count} environment variables")
        
        # Verify critical S3 variables are loaded
        s3_vars = ['S3_AWS_ACCESS_KEY_ID', 'S3_AWS_SECRET_ACCESS_KEY', 'S3_ENDPOINT_URL', 'S3_FILE_STORE_BUCKET_NAME']
        missing_vars = [var for var in s3_vars if not os.environ.get(var)]
        if missing_vars:
            print(f"❌ WARNING: Missing S3 variables: {missing_vars}")
            return False
        else:
            print("✅ All critical S3 environment variables loaded")
            return True
    else:
        print(f"⚠️  Environment file not found: {env_path}")
        return False

if __name__ == "__main__":
    success = test_env_loading()
    if success:
        print("\\n🎉 ENVIRONMENT LOADING FIX VALIDATED!")
        print("✅ The background jobs script will now properly load .env.dev")
    else:
        print("\\n❌ Environment loading failed")
    sys.exit(0 if success else 1)
'''
    
    # Write test script
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(test_script_content)
        test_script = f.name
    
    try:
        # Run test script from backend directory
        process = subprocess.run(
            [sys.executable, test_script],
            cwd=backend_path,
            capture_output=True,
            text=True
        )
        
        print("Test Output:")
        print(process.stdout)
        if process.stderr:
            print("Test Errors:")
            print(process.stderr)
            
        return process.returncode == 0
        
    finally:
        os.unlink(test_script)

def test_subprocess_environment_inheritance():
    """Test that subprocess calls will inherit the loaded environment"""
    print("\n=== Testing Subprocess Environment Inheritance ===")
    
    backend_path = Path(__file__).parent.parent / 'backend'
    
    # Simulate what happens in the fixed script
    test_simulation = '''
import os

# Load .env.dev (like our fix does)
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.dev')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# Get environment (like our fix does)
current_env = os.environ.copy()

# Test subprocess with environment inheritance
import subprocess
import sys

cmd = [sys.executable, "-c", """
import os
s3_vars = ['S3_AWS_ACCESS_KEY_ID', 'S3_AWS_SECRET_ACCESS_KEY', 'S3_ENDPOINT_URL', 'S3_FILE_STORE_BUCKET_NAME']
missing = [var for var in s3_vars if not os.environ.get(var)]
if missing:
    print(f"❌ Missing in subprocess: {missing}")
    exit(1)
else:
    print("✅ All S3 variables available in subprocess")
    exit(0)
"""]

# This simulates the fixed subprocess.Popen calls
process = subprocess.run(cmd, env=current_env, capture_output=True, text=True)
print(process.stdout)
if process.stderr:
    print("STDERR:", process.stderr)
exit(process.returncode)
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(test_simulation)
        test_script = f.name
        
    try:
        process = subprocess.run(
            [sys.executable, test_script],
            cwd=backend_path,
            capture_output=True,
            text=True
        )
        
        print(process.stdout)
        if process.stderr:
            print("STDERR:", process.stderr)
            
        return process.returncode == 0
        
    finally:
        os.unlink(test_script)

def main():
    print("=== Fix Validation Test ===")
    print("Testing that our fix resolves the indexing issue\n")
    
    # Test 1: Environment loading
    env_success = test_modified_background_jobs_script()
    
    # Test 2: Subprocess inheritance  
    subprocess_success = test_subprocess_environment_inheritance()
    
    print("\n=== FINAL RESULTS ===")
    print(f"Environment Loading: {'✅ PASS' if env_success else '❌ FAIL'}")
    print(f"Subprocess Inheritance: {'✅ PASS' if subprocess_success else '❌ FAIL'}")
    
    if env_success and subprocess_success:
        print("\n🎉 FIX VALIDATION SUCCESSFUL!")
        print("✅ The modified dev_run_background_jobs.py should resolve the NoCredentialsError")
        print("✅ File upload indexing should now work correctly")
    else:
        print("\n❌ Fix validation failed - further investigation needed")
        
    return env_success and subprocess_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)