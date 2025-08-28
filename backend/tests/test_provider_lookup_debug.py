#!/usr/bin/env python3
"""
Debug test to verify LLM provider lookup after fix
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from onyx.db.llm import fetch_existing_llm_provider
from onyx.db.engine.sql_engine import SqlEngine, get_session_with_current_tenant

def test_provider_lookup():
    """Test provider lookup with both name types"""
    print("=" * 60)
    print("Testing LLM Provider Lookup After Fix")
    print("=" * 60)
    
    # Initialize engine
    SqlEngine.init_engine(pool_size=20, max_overflow=0)
    
    with get_session_with_current_tenant() as db_session:
        print("\n1. Testing lookup by display name (should work):")
        provider_by_name = fetch_existing_llm_provider("Groq Cloud", db_session)
        if provider_by_name:
            print(f"✅ Found by display name: {provider_by_name.name}")
            print(f"   Provider field: {provider_by_name.provider}")
            print(f"   ID: {provider_by_name.id}")
        else:
            print("❌ Not found by display name")
            
        print("\n2. Testing lookup by technical name (this should work after fix):")
        provider_by_technical = fetch_existing_llm_provider("groq", db_session)
        if provider_by_technical:
            print(f"✅ Found by technical name: {provider_by_technical.name}")
            print(f"   Provider field: {provider_by_technical.provider}")
            print(f"   ID: {provider_by_technical.id}")
        else:
            print("❌ Not found by technical name - FIX FAILED!")
            
        print("\n3. Testing all LLM providers in database:")
        from onyx.db.llm import fetch_existing_llm_providers
        all_providers = fetch_existing_llm_providers(db_session)
        print(f"Total providers in database: {len(all_providers)}")
        for provider in all_providers:
            print(f"   - Name: '{provider.name}', Provider: '{provider.provider}'")

if __name__ == "__main__":
    test_provider_lookup()