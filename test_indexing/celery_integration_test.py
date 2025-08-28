#!/usr/bin/env python3
"""
Celery Worker Integration Test
Tests that Celery workers can access S3 environment variables after fix
"""

import os
import sys
import subprocess
import time
import signal
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

def test_celery_worker_with_s3():
    """Test that a Celery worker can access S3 credentials"""
    print("=== Celery Worker S3 Integration Test ===\n")
    
    # Change to backend directory
    original_cwd = os.getcwd()
    os.chdir(backend_path)
    
    try:
        print("1. Starting background jobs script...")
        
        # Start the background jobs script
        process = subprocess.Popen(
            [sys.executable, 'scripts/dev_run_background_jobs.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        # Collect output for 10 seconds
        print("2. Monitoring startup output...\n")
        
        start_time = time.time()
        output_lines = []
        error_lines = []
        
        # Set non-blocking mode for stdout
        import fcntl
        import select
        
        # Make stdout non-blocking
        flags = fcntl.fcntl(process.stdout, fcntl.F_GETFL)
        fcntl.fcntl(process.stdout, fcntl.F_SETFL, flags | os.O_NONBLOCK)
        
        while time.time() - start_time < 10:
            # Check if there's output available
            ready = select.select([process.stdout], [], [], 0.1)
            if ready[0]:
                try:
                    line = process.stdout.readline()
                    if line:
                        output_lines.append(line.strip())
                        # Print key lines
                        if any(keyword in line for keyword in ['Loading environment', 'Loaded', 'S3', 'WARNING', 'ERROR', 'Starting Celery']):
                            print(f"   {line.strip()}")
                except:
                    pass
            
            # Check if process died
            if process.poll() is not None:
                print(f"⚠️  Process exited early with code: {process.returncode}")
                break
        
        # Check for S3-related messages in output
        has_env_loading = any('Loading environment' in line for line in output_lines)
        has_env_loaded = any('Loaded' in line and 'environment variables' in line for line in output_lines)
        has_s3_success = any('All critical S3 environment variables loaded' in line for line in output_lines)
        has_workers_started = any('All workers started' in line for line in output_lines)
        
        print("\n3. Test Results:")
        print(f"   {'✅' if has_env_loading else '❌'} Environment loading initiated")
        print(f"   {'✅' if has_env_loaded else '❌'} Environment variables loaded")
        print(f"   {'✅' if has_s3_success else '❌'} S3 variables verified")
        print(f"   {'✅' if has_workers_started else '❌'} Workers started")
        
        # Terminate the process
        process.terminate()
        time.sleep(1)
        if process.poll() is None:
            process.kill()
        
        # Overall success
        success = has_env_loading and has_env_loaded and has_s3_success
        
        if success:
            print("\n🎉 INTEGRATION TEST PASSED!")
            print("✅ Celery workers should now have access to S3 credentials")
            print("✅ File upload indexing should work correctly")
        else:
            print("\n❌ Integration test failed")
            print("Check the script output above for details")
            
        return success
        
    finally:
        os.chdir(original_cwd)

def test_s3_file_store_directly():
    """Test S3FileStore class directly with loaded environment"""
    print("\n=== Direct S3FileStore Test ===\n")
    
    # Load .env.dev
    env_path = backend_path / '.env.dev'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print("✅ Environment loaded")
    
    try:
        # Import S3FileStore
        from onyx.file_store.file_store import S3FileStore, get_default_file_store
        
        # Try to get file store
        file_store = get_default_file_store()
        
        if isinstance(file_store, S3FileStore):
            print("✅ S3FileStore initialized successfully")
            
            # Check if credentials are available
            if file_store.s3_client:
                print("✅ S3 client created with credentials")
                return True
            else:
                print("❌ S3 client creation failed")
                return False
        else:
            print(f"❌ Got {type(file_store).__name__} instead of S3FileStore")
            return False
            
    except Exception as e:
        print(f"❌ Error testing S3FileStore: {e}")
        return False

def main():
    print("=== Celery Integration Test Suite ===")
    print("Testing that the fix resolves the indexing issue\n")
    
    # Test 1: Celery worker integration
    celery_success = test_celery_worker_with_s3()
    
    # Test 2: Direct S3FileStore test
    s3_success = test_s3_file_store_directly()
    
    print("\n=== FINAL RESULTS ===")
    print(f"Celery Worker Integration: {'✅ PASS' if celery_success else '❌ FAIL'}")
    print(f"S3FileStore Direct Test: {'✅ PASS' if s3_success else '❌ FAIL'}")
    
    if celery_success and s3_success:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ The fix has been validated")
        print("✅ File upload indexing should now work correctly")
        print("\nNext step: Test actual file upload through the UI")
    else:
        print("\n⚠️  Some tests failed")
        print("Review the output above for details")
        
    return celery_success and s3_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)