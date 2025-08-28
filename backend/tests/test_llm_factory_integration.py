#!/usr/bin/env python3
"""
Test the actual call path that causes 'No LLM provider found' error
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from onyx.llm.factory import get_llms_for_persona
from onyx.llm.override_models import LLMOverride
from onyx.db.persona import get_persona_by_id
from onyx.db.engine.sql_engine import SqlEngine, get_session_with_current_tenant
import json

def test_llm_factory_with_groq_override():
    """Test the exact call path that fails in chat"""
    print("=" * 60)
    print("Testing LLM Factory with Groq Override")
    print("=" * 60)
    
    # Initialize engine
    SqlEngine.init_engine(pool_size=20, max_overflow=0)
    
    # Create LLM override exactly like frontend sends
    llm_override = LLMOverride(
        model_provider="groq",  # This is the problematic value
        model_version="llama-3.3-70b-versatile",
        temperature=None
    )
    
    print(f"Testing with LLM Override: {llm_override.model_dump()}")
    
    with get_session_with_current_tenant() as db_session:
        # Get default persona (same as frontend)
        try:
            persona = get_persona_by_id(0, db_session)
            print(f"✓ Got persona: {persona.name if persona else 'None'}")
        except Exception as e:
            print(f"✗ Error getting persona: {e}")
            persona = None
            
        # Test the actual call that fails
        try:
            print("\nCalling get_llms_for_persona with groq override...")
            llm, fast_llm = get_llms_for_persona(
                persona=persona,
                llm_override=llm_override,
                additional_headers=None,
                long_term_logger=None
            )
            print("✅ SUCCESS! LLMs created successfully:")
            print(f"  Main LLM: {type(llm).__name__}")
            print(f"  Fast LLM: {type(fast_llm).__name__}")
            print(f"\n🎉 Fix is working in production path!")
            
        except ValueError as e:
            if "No LLM provider found" in str(e):
                print("❌ FAILED: Still getting 'No LLM provider found' error")
                print(f"Error: {e}")
                print("\n🐛 Bug still exists despite fix!")
                
                # Debug what's happening
                print("\nDebugging the call chain...")
                from onyx.db.llm import fetch_llm_provider_view
                
                provider_result = fetch_llm_provider_view(db_session, "groq")
                if provider_result:
                    print(f"✓ fetch_llm_provider_view('groq') = {provider_result.name}")
                else:
                    print("✗ fetch_llm_provider_view('groq') = None - This is the problem!")
                    
                    # Test the actual fetch function
                    from onyx.db.llm import fetch_existing_llm_provider
                    direct_result = fetch_existing_llm_provider("groq", db_session)
                    if direct_result:
                        print(f"✓ But fetch_existing_llm_provider('groq') = {direct_result.name}")
                        print("  -> There's a bug in fetch_llm_provider_view!")
                    else:
                        print("✗ Even fetch_existing_llm_provider('groq') = None")
                        print("  -> The fix didn't work")
            else:
                print(f"❌ Different error: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_llm_factory_with_groq_override()