#!/usr/bin/env python3
"""
Test script for the new /admin/llm/test-connection endpoint
Focuses on testing the endpoint implementation and request/response flow
"""

import os
import json
import requests
from typing import Dict, Any

BACKEND_URL = "http://localhost:8080"
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

def test_connection_endpoint_with_valid_data():
    """Test the connection endpoint with valid Groq data"""
    print("🔍 Testing connection endpoint with valid Groq data...")
    
    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not found in environment")
        return False
    
    # Test with complete, correct data
    payload = {
        "provider": "groq",
        "api_key": GROQ_API_KEY,
        "api_base": "https://api.groq.com/openai/v1",
        "api_version": None,
        "custom_config": {
            "api_key": GROQ_API_KEY,
            "api_base": "https://api.groq.com/openai/v1"
        },
        "deployment_name": None,
        "model_endpoint": "https://api.groq.com/openai/v1/models",
        "litellm_provider_name": "groq"
    }
    
    print("Request payload (masked):")
    masked_payload = {**payload, "api_key": "***MASKED***"}
    if masked_payload.get("custom_config") and "api_key" in masked_payload["custom_config"]:
        masked_payload["custom_config"]["api_key"] = "***MASKED***"
    print(json.dumps(masked_payload, indent=2))
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/admin/llm/test-connection",
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30
        )
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response Body: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response Body (raw): {response.text}")
        
        if response.status_code == 200:
            print("✅ Connection test successful!")
            return True
        else:
            print("❌ Connection test failed!")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 30 seconds")
        return False
    except Exception as e:
        print(f"❌ Error making request: {e}")
        return False

def test_connection_endpoint_with_missing_endpoint():
    """Test what happens when model_endpoint is None/missing"""
    print("\n🔍 Testing connection endpoint with missing model_endpoint...")
    
    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not found, skipping")
        return
    
    payload = {
        "provider": "groq",
        "api_key": GROQ_API_KEY,
        "api_base": "https://api.groq.com/openai/v1",
        "model_endpoint": None,  # This should cause the error we're seeing
        "litellm_provider_name": "groq"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/admin/llm/test-connection",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 400:
            try:
                error_data = response.json()
                detail = error_data.get('detail', 'No detail')
                print(f"✅ Got expected 400 error: {detail}")
                
                if "No model endpoint configured" in detail:
                    print("✅ Error message matches what we expect")
                    return True
                else:
                    print("❌ Unexpected error message")
                    return False
            except:
                print(f"❌ Could not parse error response: {response.text}")
                return False
        else:
            print(f"❌ Expected 400 error but got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error making request: {e}")
        return False

def test_connection_endpoint_with_invalid_endpoint():
    """Test with an invalid but non-None endpoint"""
    print("\n🔍 Testing connection endpoint with invalid model_endpoint...")
    
    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not found, skipping")
        return
    
    payload = {
        "provider": "groq", 
        "api_key": GROQ_API_KEY,
        "api_base": "https://api.groq.com/openai/v1",
        "model_endpoint": "https://invalid-endpoint.example.com/models",
        "litellm_provider_name": "groq"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/admin/llm/test-connection",
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=15
        )
        
        print(f"Response Status: {response.status_code}")
        
        # Should get some kind of connection error
        if response.status_code != 200:
            try:
                error_data = response.json()
                print(f"✅ Got expected error: {error_data.get('detail', 'No detail')}")
                return True
            except:
                print(f"Got error response: {response.text}")
                return True
        else:
            print("❌ Unexpectedly succeeded with invalid endpoint")
            return False
            
    except requests.exceptions.Timeout:
        print("✅ Request timed out as expected with invalid endpoint")
        return True
    except Exception as e:
        print(f"✅ Got expected connection error: {e}")
        return True

def test_endpoint_existence():
    """Verify the endpoint exists and accepts requests"""
    print("\n🔍 Testing if connection endpoint exists...")
    
    # Send a minimal invalid request just to see if endpoint exists
    payload = {"provider": "test"}
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/admin/llm/test-connection",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 404:
            print("❌ Endpoint not found! The route is not registered.")
            return False
        elif response.status_code == 422:
            print("✅ Endpoint exists but got validation error (expected)")
            return True
        elif response.status_code in [400, 500]:
            print("✅ Endpoint exists but got processing error (expected)")
            return True
        else:
            print(f"✅ Endpoint exists, got status {response.status_code}")
            return True
            
    except Exception as e:
        print(f"❌ Error testing endpoint existence: {e}")
        return False

def main():
    """Run all connection endpoint tests"""
    print("🚀 Testing Connection Endpoint Implementation\n")
    
    # Test 1: Verify endpoint exists
    if not test_endpoint_existence():
        print("❌ Cannot continue - endpoint doesn't exist")
        return
    
    # Test 2: Test with missing model_endpoint (reproduces current issue)
    test_connection_endpoint_with_missing_endpoint()
    
    # Test 3: Test with valid data
    test_connection_endpoint_with_valid_data()
    
    # Test 4: Test with invalid endpoint
    test_connection_endpoint_with_invalid_endpoint()
    
    print("\n📊 Connection Endpoint Test Summary:")
    print("If test 2 shows the expected '400: No model endpoint configured' error,")
    print("then the issue is that the frontend is sending model_endpoint=None")
    print("rather than the correct endpoint URL from the provider template.")

if __name__ == "__main__":
    main()