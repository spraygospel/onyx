#!/usr/bin/env python3
"""
Get the raw JSON response from provider templates endpoint
"""

import json
import requests

BACKEND_URL = "http://localhost:8080"

def get_raw_response():
    """Get the raw JSON response"""
    print("🔍 Getting raw provider templates response...\n")
    
    try:
        response = requests.get(f"{BACKEND_URL}/admin/llm/built-in/options")
        
        if response.status_code != 200:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return
            
        # Print the raw response text
        print("Raw Response Text:")
        print("=" * 50)
        print(response.text)
        print("=" * 50)
        
        # Try to parse as JSON
        try:
            data = response.json()
            print(f"\n✅ Successfully parsed JSON with {len(data)} items")
            
            # Show the structure of the first item
            if data and len(data) > 0:
                first_item = data[0]
                print(f"\nFirst item type: {type(first_item)}")
                print(f"First item keys: {list(first_item.keys()) if isinstance(first_item, dict) else 'Not a dict'}")
                
                # Find Groq specifically
                for i, item in enumerate(data):
                    if isinstance(item, dict) and item.get('name') == 'groq':
                        print(f"\n🎯 Found Groq at index {i}:")
                        print(json.dumps(item, indent=2))
                        break
                else:
                    print("\n❌ Groq not found in response")
                    
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON: {e}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    get_raw_response()