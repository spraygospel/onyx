#!/usr/bin/env python3
"""
Celery Background Task Environment Test
Tests if environment variables are properly loaded in background tasks
"""

import os
import sys
from datetime import datetime

# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

def load_env_file(env_path="../backend/.env.dev"):
    """Load environment variables from .env.dev file"""
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

def check_environment():
    """Check current environment variables"""
    print("=== Environment Variable Check ===\n")
    
    # Load from .env.dev
    env_vars = load_env_file()
    
    # Key variables for S3
    s3_vars = [
        'S3_AWS_ACCESS_KEY_ID',
        'S3_AWS_SECRET_ACCESS_KEY', 
        'S3_ENDPOINT_URL',
        'S3_FILE_STORE_BUCKET_NAME'
    ]
    
    print("S3 Configuration:")
    missing_vars = []
    for var in s3_vars:
        value = os.environ.get(var)
        if value:
            if 'SECRET' in var:
                display_value = f"{'*' * (len(value) - 4)}{value[-4:]}" if len(value) > 4 else "****"
            else:
                display_value = value
            print(f"  ✅ {var}: {display_value}")
        else:
            print(f"  ❌ {var}: NOT SET")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n❌ Missing variables: {missing_vars}")
        return False
    
    print("\n✅ All S3 environment variables are set")
    return True

def simulate_background_task_context():
    """Simulate how background tasks access environment"""
    print("\n=== Background Task Context Simulation ===\n")
    
    try:
        # Import Onyx modules like background tasks do
        from onyx.configs.app_configs import (
            S3_AWS_ACCESS_KEY_ID,
            S3_AWS_SECRET_ACCESS_KEY,
            S3_ENDPOINT_URL,
            S3_FILE_STORE_BUCKET_NAME
        )
        
        print("Config values from onyx.configs.app_configs:")
        configs = {
            'S3_AWS_ACCESS_KEY_ID': S3_AWS_ACCESS_KEY_ID,
            'S3_AWS_SECRET_ACCESS_KEY': S3_AWS_SECRET_ACCESS_KEY,
            'S3_ENDPOINT_URL': S3_ENDPOINT_URL,
            'S3_FILE_STORE_BUCKET_NAME': S3_FILE_STORE_BUCKET_NAME
        }
        
        missing_configs = []
        for key, value in configs.items():
            if value:
                if 'SECRET' in key:
                    display_value = f"{'*' * (len(value) - 4)}{value[-4:]}" if len(value) > 4 else "****"
                else:
                    display_value = value
                print(f"  ✅ {key}: {display_value}")
            else:
                print(f"  ❌ {key}: None/Empty")
                missing_configs.append(key)
        
        if missing_configs:
            print(f"\n❌ Config module missing: {missing_configs}")
            return False
        
        print("\n✅ All configs loaded in background task context")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error accessing configs: {e}")
        return False

def test_file_store_initialization():
    """Test FileStore initialization in background context"""
    print("\n=== FileStore Initialization Test ===\n")
    
    try:
        from onyx.file_store.file_store import get_default_file_store
        
        print("Getting default file store...")
        file_store = get_default_file_store()
        print(f"✅ File store type: {type(file_store).__name__}")
        
        # Check if it's S3FileStore and inspect its configuration
        if hasattr(file_store, '_aws_access_key_id'):
            access_key = getattr(file_store, '_aws_access_key_id', None)
            secret_key = getattr(file_store, '_aws_secret_access_key', None)
            endpoint_url = getattr(file_store, '_endpoint_url', None)
            bucket_name = getattr(file_store, '_bucket_name', None)
            
            print("FileStore configuration:")
            print(f"  Access Key: {'SET' if access_key else 'NOT SET'}")
            print(f"  Secret Key: {'SET' if secret_key else 'NOT SET'}")
            print(f"  Endpoint URL: {endpoint_url or 'NOT SET'}")
            print(f"  Bucket Name: {bucket_name or 'NOT SET'}")
            
            if not all([access_key, secret_key, endpoint_url, bucket_name]):
                print("❌ FileStore missing configuration")
                return False
        
        # Try to initialize
        print("\nInitializing FileStore...")
        file_store.initialize()
        print("✅ FileStore initialized successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ FileStore initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def create_diagnostic_report():
    """Create diagnostic report"""
    print("\n" + "=" * 60)
    print("CELERY ENVIRONMENT DIAGNOSTIC REPORT")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    # Run all tests
    env_ok = check_environment()
    config_ok = simulate_background_task_context()  
    filestore_ok = test_file_store_initialization()
    
    print("\n" + "-" * 60)
    print("SUMMARY:")
    print(f"Environment Variables: {'✅ PASS' if env_ok else '❌ FAIL'}")
    print(f"Config Module Access: {'✅ PASS' if config_ok else '❌ FAIL'}")
    print(f"FileStore Init: {'✅ PASS' if filestore_ok else '❌ FAIL'}")
    
    # Diagnosis
    print(f"\n📋 DIAGNOSIS:")
    if not env_ok:
        print("- Environment variables not properly loaded")
        print("- Check if .env.dev is being sourced correctly")
    elif not config_ok:
        print("- Config module not accessing environment variables")
        print("- Check onyx.configs.app_configs module")
    elif not filestore_ok:
        print("- FileStore initialization failing")
        print("- Check S3FileStore implementation and credentials")
    else:
        print("- Environment setup looks correct")
        print("- Issue might be in actual background task execution context")
        print("- Check if Celery worker has same environment as main process")
    
    return env_ok and config_ok and filestore_ok

if __name__ == "__main__":
    success = create_diagnostic_report()
    sys.exit(0 if success else 1)