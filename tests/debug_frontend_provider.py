#!/usr/bin/env python3
"""
Debug script to understand the provider template data flow
from backend to frontend and identify why model_endpoint becomes None
"""

import json
import requests
import sys
import os

BACKEND_URL = "http://localhost:8080"

def fetch_provider_templates():
    """Fetch and analyze provider templates from backend"""
    print("🔍 Fetching provider templates from backend...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/admin/llm/built-in/options")
        
        if response.status_code != 200:
            print(f"❌ Failed to fetch templates: {response.status_code}")
            return None
            
        templates = response.json()
        print(f"✅ Fetched {len(templates)} provider templates")
        
        return templates
        
    except Exception as e:
        print(f"❌ Error fetching templates: {e}")
        return None

def analyze_groq_template(templates):
    """Find and analyze the Groq template specifically"""
    print("\n🔍 Analyzing Groq template...")
    
    groq_template = None
    for template in templates:
        if template.get('id') == 'groq' or template.get('litellm_provider_name') == 'groq':
            groq_template = template
            break
    
    if not groq_template:
        print("❌ Groq template not found!")
        return None
    
    print("✅ Groq template found")
    print("\n📋 Full Groq template data:")
    print(json.dumps(groq_template, indent=2))
    
    # Check specific fields that might be problematic
    critical_fields = [
        'id', 'name', 'litellm_provider_name', 'model_endpoint',
        'api_base', 'popular_models', 'config_schema'
    ]
    
    print("\n🔍 Critical field analysis:")
    for field in critical_fields:
        value = groq_template.get(field)
        print(f"   {field}: {value} (type: {type(value).__name__})")
        
        if field == 'model_endpoint':
            if value is None:
                print("   ❌ model_endpoint is None!")
            elif value == "":
                print("   ❌ model_endpoint is empty string!")
            elif not value.startswith('http'):
                print(f"   ⚠️ model_endpoint doesn't look like URL: {value}")
            else:
                print("   ✅ model_endpoint looks valid")
    
    return groq_template

def compare_with_provider_templates_py():
    """Check the source provider_templates.py to see if there's a mismatch"""
    print("\n🔍 Checking provider_templates.py source...")
    
    try:
        # Read the provider templates source file
        templates_path = os.path.join(
            os.path.dirname(__file__), 
            '..', 
            'backend', 
            'onyx', 
            'llm', 
            'provider_templates.py'
        )
        
        with open(templates_path, 'r') as f:
            content = f.read()
        
        # Look for Groq configuration
        if 'groq' in content.lower():
            print("✅ Found Groq configuration in source file")
            
            # Extract the relevant section (simple text search)
            lines = content.split('\n')
            groq_section = []
            in_groq_section = False
            
            for line in lines:
                if 'id="groq"' in line or 'litellm_provider_name="groq"' in line:
                    in_groq_section = True
                    groq_section.append(line)
                elif in_groq_section:
                    groq_section.append(line)
                    if line.strip() == '),' or line.strip() == ']':
                        # End of this provider definition
                        break
            
            if groq_section:
                print("\n📋 Groq section in provider_templates.py:")
                for line in groq_section[:20]:  # Show first 20 lines
                    print(f"   {line}")
                if len(groq_section) > 20:
                    print(f"   ... (showing first 20 of {len(groq_section)} lines)")
        else:
            print("❌ Groq configuration not found in source file")
            
    except FileNotFoundError:
        print(f"❌ Could not find provider_templates.py at {templates_path}")
    except Exception as e:
        print(f"❌ Error reading provider_templates.py: {e}")

def test_json_serialization(groq_template):
    """Test if there are any JSON serialization issues"""
    print("\n🔍 Testing JSON serialization...")
    
    try:
        # Simulate what happens when data goes through JSON
        json_str = json.dumps(groq_template)
        parsed_back = json.loads(json_str)
        
        original_endpoint = groq_template.get('model_endpoint')
        parsed_endpoint = parsed_back.get('model_endpoint')
        
        print(f"Original model_endpoint: {original_endpoint} ({type(original_endpoint).__name__})")
        print(f"After JSON round-trip: {parsed_endpoint} ({type(parsed_endpoint).__name__})")
        
        if original_endpoint == parsed_endpoint:
            print("✅ JSON serialization preserves model_endpoint correctly")
        else:
            print("❌ JSON serialization changes model_endpoint!")
            
    except Exception as e:
        print(f"❌ JSON serialization error: {e}")

def main():
    """Run the debug analysis"""
    print("🔍 Frontend Provider Debug Analysis\n")
    
    # Step 1: Fetch templates from backend
    templates = fetch_provider_templates()
    if not templates:
        return
    
    # Step 2: Analyze Groq template specifically
    groq_template = analyze_groq_template(templates)
    if not groq_template:
        return
    
    # Step 3: Compare with source file
    compare_with_provider_templates_py()
    
    # Step 4: Test JSON serialization
    test_json_serialization(groq_template)
    
    # Summary
    print("\n📊 Debug Summary:")
    model_endpoint = groq_template.get('model_endpoint')
    if model_endpoint:
        print(f"✅ Backend provides model_endpoint: {model_endpoint}")
        print("   The issue is likely in the frontend ConfigurationWizard component")
        print("   Check how the provider object is passed to the component")
    else:
        print("❌ Backend is not providing model_endpoint!")
        print("   The issue is in the backend provider template definition")

if __name__ == "__main__":
    main()