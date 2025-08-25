#!/usr/bin/env python3
"""
Simple script to list all provider templates and their key attributes
"""

import json
import requests

BACKEND_URL = "http://localhost:8080"

def list_all_providers():
    """Fetch and list all provider templates"""
    print("🔍 Fetching all provider templates...\n")
    
    try:
        response = requests.get(f"{BACKEND_URL}/admin/llm/built-in/options")
        
        if response.status_code != 200:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return
            
        templates = response.json()
        print(f"✅ Found {len(templates)} provider templates:\n")
        
        for i, template in enumerate(templates, 1):
            print(f"{i}. Provider Template:")
            print(f"   ID: {template.get('id', 'N/A')}")
            print(f"   Name: {template.get('name', 'N/A')}")
            print(f"   LiteLLM Provider: {template.get('litellm_provider_name', 'N/A')}")
            print(f"   Model Endpoint: {template.get('model_endpoint', 'N/A')}")
            print(f"   Model Fetching: {template.get('model_fetching', 'N/A')}")
            
            # Show popular models if available
            popular_models = template.get('popular_models', [])
            if popular_models:
                print(f"   Popular Models: {popular_models[:3]}...")
            else:
                print(f"   Popular Models: None")
            print()
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    list_all_providers()