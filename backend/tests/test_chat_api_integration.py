#!/usr/bin/env python3
"""
Direct test of chat API endpoint to reproduce the exact error
"""
import requests
import json

def test_chat_api_endpoint():
    """Test the chat API endpoint directly like frontend would call it"""
    print("=" * 60)
    print("Testing Chat API Endpoint")
    print("=" * 60)
    
    # API endpoint - check what the frontend actually calls
    base_url = "http://localhost:8080"
    
    # Simulate what frontend sends
    payload = {
        "message": "test message",
        "chat_session_id": None,  # New chat
        "parent_message_id": None,
        "persona_id": 0,
        "prompt_id": None,
        "search_doc_ids": None,
        "retrieval_options": {
            "run_search": "auto",
            "enable_reranking": True
        },
        "llm_override": {
            "model_provider": "groq",  # This is the problematic field
            "model_version": "llama-3.3-70b-versatile",
            "temperature": None
        }
    }
    
    print("\n1. Testing New Chat API Call:")
    print("-" * 40)
    print(f"POST {base_url}/chat/send-message")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        # Make the API call
        response = requests.post(
            f"{base_url}/chat/send-message",
            json=payload,
            stream=True,  # Frontend uses streaming
            timeout=10
        )
        
        print(f"\nResponse status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("\n2. Streaming Response Packets:")
            print("-" * 40)
            
            packet_count = 0
            for line in response.iter_lines():
                if line:
                    packet_count += 1
                    try:
                        packet = json.loads(line.decode('utf-8'))
                        print(f"Packet {packet_count}: {json.dumps(packet, indent=2)}")
                        
                        # Check first packet
                        if packet_count == 1:
                            if "error" in packet:
                                print(f"\n❌ FIRST PACKET ERROR: {packet['error']}")
                                print("This is exactly what browser sees!")
                                break
                            elif "user_message_id" in packet:
                                print(f"\n✅ First packet OK - has user_message_id")
                            else:
                                print(f"\n❓ First packet unusual: {list(packet.keys())}")
                        
                        if packet_count > 5:  # Limit output
                            print("... (truncated)")
                            break
                            
                    except json.JSONDecodeError as e:
                        print(f"Packet {packet_count}: Invalid JSON - {line}")
        else:
            print(f"HTTP Error {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - is backend server running on port 8080?")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_provider_availability():
    """Quick test to see if LLM providers are available via API"""
    print("\n" + "=" * 60)
    print("Testing LLM Provider API")
    print("=" * 60)
    
    base_url = "http://localhost:8080"
    
    try:
        # Test provider endpoint
        response = requests.get(f"{base_url}/llm/provider")
        print(f"GET /llm/provider - Status: {response.status_code}")
        
        if response.status_code == 200:
            providers = response.json()
            print(f"Available providers: {json.dumps(providers, indent=2)}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error testing provider API: {e}")

if __name__ == "__main__":
    test_chat_api_endpoint()
    test_provider_availability()