#!/usr/bin/env python3
"""S3 Connection Diagnostic Script"""

import os
import sys
import json
from datetime import datetime

# Add current backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def load_env_vars():
    """Load environment variables from .env.dev"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.dev')
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

def main():
    # Load environment
    load_env_vars()
    
    try:
        import boto3
        from botocore.exceptions import NoCredentialsError, ClientError
        
        print("=== S3 Diagnostic Test ===")
        
        # Get config
        access_key = os.environ.get('S3_AWS_ACCESS_KEY_ID')
        secret_key = os.environ.get('S3_AWS_SECRET_ACCESS_KEY')
        endpoint_url = os.environ.get('S3_ENDPOINT_URL')
        bucket_name = os.environ.get('S3_FILE_STORE_BUCKET_NAME')
        
        print(f"Endpoint: {endpoint_url}")
        print(f"Access Key: {access_key}")
        print(f"Bucket: {bucket_name}")
        
        # Create client
        s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name='us-east-1'
        )
        
        # Test operations
        print("\n--- Test 1: List Buckets ---")
        response = s3_client.list_buckets()
        buckets = [b['Name'] for b in response.get('Buckets', [])]
        print(f"✅ Buckets: {buckets}")
        
        print("\n--- Test 2: Put Object (Checkpoint Simulation) ---")
        test_key = f"test-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        test_data = {"test": "checkpoint", "timestamp": datetime.now().isoformat()}
        
        s3_client.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=json.dumps(test_data).encode('utf-8'),
            ContentType='application/json'
        )
        print(f"✅ Created: {test_key}")
        
        # Cleanup
        s3_client.delete_object(Bucket=bucket_name, Key=test_key)
        print(f"✅ Cleaned up: {test_key}")
        
        print("\n🎉 ALL TESTS PASSED!")
        return True
        
    except NoCredentialsError:
        print("❌ NoCredentialsError - This matches the indexing error!")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    print(f"\nResult: {'SUCCESS' if success else 'FAILED'}")