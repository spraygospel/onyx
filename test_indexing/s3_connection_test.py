#!/usr/bin/env python3
"""
S3 Connection Diagnostic Script
Tests MinIO/S3 connection to isolate indexing issues
"""

import os
import sys
import json
from datetime import datetime
from io import BytesIO

# Add backend to Python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_path)

print(f"Backend path: {backend_path}")

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    print("✅ Boto3 imported successfully")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running from the correct environment")
    sys.exit(1)

def load_env_file():
    """Load environment variables from .env.dev file"""
    env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env.dev')
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

def main():
    """Main diagnostic function"""
    print("=== S3 Connection Diagnostic ===\n")
    
    # Load environment variables
    env_vars = load_env_file()
    print(f"✅ Loaded {len(env_vars)} environment variables")
    
    # Check S3 specific vars
    s3_vars = ['S3_AWS_ACCESS_KEY_ID', 'S3_AWS_SECRET_ACCESS_KEY', 'S3_ENDPOINT_URL', 'S3_FILE_STORE_BUCKET_NAME']
    print("\nS3 Configuration:")
    for key in s3_vars:
        value = env_vars.get(key, 'NOT SET')
        if 'SECRET' in key and value != 'NOT SET':
            value = '*' * len(value)
        print(f"   {key}: {value}")
    
    # Test basic connection
    access_key = env_vars.get('S3_AWS_ACCESS_KEY_ID')
    secret_key = env_vars.get('S3_AWS_SECRET_ACCESS_KEY')
    endpoint_url = env_vars.get('S3_ENDPOINT_URL')
    bucket_name = env_vars.get('S3_FILE_STORE_BUCKET_NAME')
    
    if not all([access_key, secret_key, endpoint_url, bucket_name]):
        print("❌ Missing required S3 configuration")
        return False
    
    print(f"\n=== Testing connection to {endpoint_url} ===")
    
    try:
        # Create S3 client
        s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name='us-east-1'
        )
        
        # Test list buckets
        response = s3_client.list_buckets()
        buckets = [b['Name'] for b in response.get('Buckets', [])]
        print(f"✅ Connection successful! Found buckets: {buckets}")
        
        # Test put object (this is what fails in indexing)
        test_key = f"diagnostic-test-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        test_data = {"test": "diagnostic", "timestamp": datetime.now().isoformat()}
        
        print(f"\n--- Testing put_object (checkpoint operation) ---")
        s3_client.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=json.dumps(test_data).encode('utf-8'),
            ContentType='application/json'
        )
        print(f"✅ Successfully created checkpoint-like object: {test_key}")
        
        # Cleanup
        s3_client.delete_object(Bucket=bucket_name, Key=test_key)
        print(f"✅ Cleaned up test object")
        
        return True
        
    except NoCredentialsError:
        print("❌ NoCredentialsError: This is the exact error from indexing!")
        return False
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    print(f"\n{'🎉 DIAGNOSTIC PASSED' if success else '❌ DIAGNOSTIC FAILED'}")
    sys.exit(0 if success else 1)