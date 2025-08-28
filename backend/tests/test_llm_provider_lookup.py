#!/usr/bin/env python3
"""
Test script to debug LLM provider lookup issue
Run with: python tests/test_llm_provider_lookup.py
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy.orm import Session
from onyx.db.llm import fetch_existing_llm_provider
import json


def test_provider_lookup():
    """Test LLM provider lookup with different name formats"""
    print("=" * 60)
    print("Testing LLM Provider Lookup")
    print("=" * 60)
    
    # Import and initialize engine
    from onyx.db.engine.sql_engine import SqlEngine, get_session_with_current_tenant
    from onyx.db.models import LLMProvider
    import os
    
    # Initialize the database engine
    SqlEngine.init_engine(pool_size=20, max_overflow=0)
    
    os.environ.setdefault("POSTGRES_DEFAULT_SCHEMA", "public")
    
    with get_session_with_current_tenant() as db_session:
        # First, let's see what providers exist in DB
        print("\n1. Existing LLM Providers in Database:")
        print("-" * 40)
        providers = db_session.query(LLMProvider).all()
        if not providers:
            print("  No providers found in database!")
        else:
            for provider in providers:
                print(f"  ID: {provider.id}")
                print(f"  Name (display): {provider.name}")
                print(f"  Provider (technical): {provider.provider}")
                print(f"  Is Default: {provider.is_default_provider}")
                print("-" * 40)
        
        # Test lookups with different values
        test_cases = [
            ("groq", "Technical name used by frontend"),
            ("Default", "Display name in DB"),
            ("Groq Cloud", "Common display name"),
            ("openai", "Another technical name"),
            ("OpenAI", "Another display name")
        ]
        
        print("\n2. Testing Provider Lookups:")
        print("-" * 40)
        for test_name, description in test_cases:
            print(f"\nLooking up: '{test_name}' ({description})")
            
            # Test original lookup (by name only)
            result = db_session.query(LLMProvider).filter(
                LLMProvider.name == test_name
            ).first()
            print(f"  By name field only: {'✓ Found' if result else '✗ Not found'}")
            
            # Test by provider field
            result = db_session.query(LLMProvider).filter(
                LLMProvider.provider == test_name
            ).first()
            print(f"  By provider field: {'✓ Found' if result else '✗ Not found'}")
            
            # Test with our fetch function
            result = fetch_existing_llm_provider(test_name, db_session)
            print(f"  Using fetch_existing_llm_provider(): {'✓ Found' if result else '✗ Not found'}")
            if result:
                print(f"    -> Retrieved: {result.name} (provider={result.provider})")
        
        print("\n3. Simulating Frontend Request:")
        print("-" * 40)
        # Simulate what frontend sends
        frontend_data = {
            "model_provider": "groq",  # This is what frontend sends
            "model_version": "llama-3.3-70b-versatile",
            "temperature": None
        }
        print(f"Frontend sends: {json.dumps(frontend_data, indent=2)}")
        
        # Try to find provider
        provider_lookup_key = frontend_data["model_provider"]
        print(f"\nBackend looks up: '{provider_lookup_key}'")
        
        provider = fetch_existing_llm_provider(provider_lookup_key, db_session)
        if provider:
            print(f"✓ SUCCESS! Provider found: {provider.name}")
            print(f"  Provider field: {provider.provider}")
            print(f"  Models available: {len(provider.model_configurations) if provider.model_configurations else 0}")
            print("\n🎉 Fix is working!")
        else:
            print("✗ No provider found - Bug still exists!")
            print("\nTrying alternative lookups:")
            
            # Try case variations
            alternatives = [
                provider_lookup_key.lower(),
                provider_lookup_key.upper(), 
                provider_lookup_key.capitalize(),
                "Default"
            ]
            
            for alt in alternatives:
                result = fetch_existing_llm_provider(alt, db_session)
                print(f"  '{alt}': {'✓ Found' if result else '✗ Not found'}")
                if result:
                    print(f"    -> {result.name} (provider={result.provider})")


if __name__ == "__main__":
    test_provider_lookup()