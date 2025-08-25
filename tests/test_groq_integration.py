#!/usr/bin/env python3
"""
Test script for Groq integration API endpoints
Tests the complete flow from provider options to connection testing
"""

import os
import sys
import json
import requests
from typing import Dict, Any

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Configuration
BACKEND_URL = "http://localhost:8080"
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

def test_provider_options():
    """Test the /admin/llm/built-in/options endpoint"""
    print("🔍 Testing provider options endpoint...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/admin/llm/built-in/options")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data)} provider templates")
            
            # Find Groq provider
            groq_provider = None
            for provider in data:
                if provider.get('id') == 'groq' or provider.get('litellm_provider_name') == 'groq':
                    groq_provider = provider
                    break
            
            if groq_provider:
                print("✅ Groq provider found in templates")
                print(f"   ID: {groq_provider.get('id')}")
                print(f"   Name: {groq_provider.get('name')}")
                print(f"   LiteLLM Provider: {groq_provider.get('litellm_provider_name')}")
                print(f"   Model Endpoint: {groq_provider.get('model_endpoint')}")
                print(f"   Popular Models: {groq_provider.get('popular_models', [])}")
                return groq_provider
            else:
                print("❌ Groq provider not found in templates")
                return None
        else:
            print(f"❌ Request failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error testing provider options: {e}")
        return None

def test_groq_connection(groq_provider: Dict[str, Any]):
    """Test Groq connection using the new test-connection endpoint"""
    print("\n🔍 Testing Groq connection...")
    
    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not found in environment variables")
        return False
    
    # Prepare test request payload
    payload = {
        "provider": groq_provider.get('litellm_provider_name', 'groq'),
        "api_key": GROQ_API_KEY,
        "api_base": "https://api.groq.com/openai/v1",
        "api_version": None,
        "custom_config": {
            "api_key": GROQ_API_KEY,
            "api_base": "https://api.groq.com/openai/v1"
        },
        "deployment_name": None,
        "model_endpoint": groq_provider.get('model_endpoint'),
        "litellm_provider_name": groq_provider.get('litellm_provider_name')
    }
    
    print("Request payload:")
    print(json.dumps({**payload, "api_key": "***MASKED***"}, indent=2))
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/admin/llm/test-connection",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Connection test successful!")
            print(f"   Message: {data.get('message', 'No message')}")
            print(f"   Model Count: {data.get('model_count', 0)}")
            if 'models' in data:
                print(f"   Available Models: {data['models'][:5]}...")  # Show first 5
            return True
        else:
            print(f"❌ Connection test failed: {response.text}")
            try:
                error_data = response.json()
                print(f"   Error Detail: {error_data.get('detail', 'No detail')}")
            except:
                pass
            return False
            
    except Exception as e:
        print(f"❌ Error testing connection: {e}")
        return False

def test_groq_models_endpoint_directly():
    """Test Groq models endpoint directly to verify API key works"""
    print("\n🔍 Testing Groq models endpoint directly...")
    
    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not found")
        return False
    
    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            "https://api.groq.com/openai/v1/models",
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            models = data.get('data', [])
            print(f"✅ Direct API call successful! Found {len(models)} models")
            
            # Show first few models
            for i, model in enumerate(models[:5]):
                print(f"   {i+1}. {model.get('id', 'Unknown')}")
            
            return True
        else:
            print(f"❌ Direct API call failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error in direct API call: {e}")
        return False

def debug_model_endpoint_issue(groq_provider: Dict[str, Any]):
    """Debug why model_endpoint might be None in the frontend"""
    print("\n🔍 Debugging model_endpoint issue...")
    
    print("Provider template data:")
    print(f"   model_endpoint in template: {groq_provider.get('model_endpoint')}")
    print(f"   Type: {type(groq_provider.get('model_endpoint'))}")
    
    # Check if there's a mismatch between what we expect vs what's sent
    expected_endpoint = "https://api.groq.com/openai/v1/models"
    actual_endpoint = groq_provider.get('model_endpoint')
    
    if actual_endpoint == expected_endpoint:
        print("✅ model_endpoint matches expected value")
    else:
        print(f"❌ model_endpoint mismatch!")
        print(f"   Expected: {expected_endpoint}")
        print(f"   Actual: {actual_endpoint}")
    
    # Test if the endpoint URL is reachable
    if actual_endpoint:
        print(f"Testing if endpoint {actual_endpoint} is reachable...")
        try:
            response = requests.get(actual_endpoint, headers={
                "Authorization": f"Bearer {GROQ_API_KEY}"
            }, timeout=10)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                print("✅ Endpoint is reachable and working")
            else:
                print(f"❌ Endpoint returned error: {response.text}")
        except Exception as e:
            print(f"❌ Endpoint unreachable: {e}")

def main():
    """Run all tests"""
    print("🚀 Starting Groq Integration API Tests\n")
    
    # Test 1: Provider options
    groq_provider = test_provider_options()
    if not groq_provider:
        print("❌ Cannot continue without Groq provider template")
        return
    
    # Test 2: Debug model_endpoint issue
    debug_model_endpoint_issue(groq_provider)
    
    # Test 3: Direct Groq API test
    direct_success = test_groq_models_endpoint_directly()
    
    # Test 4: Backend connection test
    if direct_success:
        connection_success = test_groq_connection(groq_provider)
        
        if connection_success:
            print("\n🎉 All tests passed! Groq integration is working.")
        else:
            print("\n❌ Connection test failed despite direct API working.")
            print("   This suggests an issue with the backend test-connection endpoint.")
    else:
        print("\n❌ Direct API test failed. Check your GROQ_API_KEY.")

if __name__ == "__main__":
    main()