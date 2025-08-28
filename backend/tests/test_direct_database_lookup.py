#!/usr/bin/env python3
"""
Test direct database connection to debug provider lookup
"""
import sqlite3
import os

def test_direct_database_lookup():
    """Test database lookup directly with SQLite"""
    
    print("=" * 60)
    print("Testing Direct Database LLM Provider Lookup")  
    print("=" * 60)
    
    # Find the SQLite database file
    possible_db_paths = [
        "/tmp/test_onyx.db",
        "/tmp/onyx_test.db", 
        "/home/devel/portofolio/onyx-fork/backend/test_onyx.db",
        "/var/lib/postgresql/data",  # PostgreSQL case
        "/home/devel/portofolio/onyx-fork/backend/onyx.db"
    ]
    
    # Try to find any SQLite database files
    print("Looking for database files:")
    for path in possible_db_paths:
        if os.path.exists(path):
            print(f"✓ Found: {path}")
        else:
            print(f"✗ Not found: {path}")
    
    # Try a generic approach - look for any .db files in the backend directory
    backend_dir = "/home/devel/portofolio/onyx-fork/backend"
    print(f"\nLooking for .db files in {backend_dir}:")
    
    for root, dirs, files in os.walk(backend_dir):
        for file in files:
            if file.endswith('.db'):
                db_path = os.path.join(root, file)
                print(f"✓ Found database: {db_path}")
                
                try:
                    # Connect to the database
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    
                    # Check if llmprovider table exists
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='llmprovider';")
                    table_exists = cursor.fetchone()
                    
                    if table_exists:
                        print(f"  ✓ Table 'llmprovider' exists")
                        
                        # Get all LLM providers
                        cursor.execute("SELECT id, name, provider FROM llmprovider;")
                        providers = cursor.fetchall()
                        
                        print(f"  Found {len(providers)} LLM providers:")
                        for provider_id, name, provider in providers:
                            print(f"    ID: {provider_id}, Name: '{name}', Provider: '{provider}'")
                        
                        # Test lookup by name "groq" (what frontend sends)
                        cursor.execute("SELECT id, name, provider FROM llmprovider WHERE name = 'groq';")
                        by_name = cursor.fetchone()
                        if by_name:
                            print(f"  ✓ Found by name 'groq': {by_name}")
                        else:
                            print(f"  ✗ Not found by name 'groq'")
                        
                        # Test lookup by provider "groq" (technical name)
                        cursor.execute("SELECT id, name, provider FROM llmprovider WHERE provider = 'groq';")
                        by_provider = cursor.fetchone()
                        if by_provider:
                            print(f"  ✓ Found by provider field 'groq': {by_provider}")
                        else:
                            print(f"  ✗ Not found by provider field 'groq'")
                        
                    else:
                        print(f"  ✗ Table 'llmprovider' does not exist")
                        # List all tables
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                        tables = cursor.fetchall()
                        print(f"  Available tables: {[table[0] for table in tables]}")
                    
                    conn.close()
                    
                except sqlite3.Error as e:
                    print(f"  ✗ SQLite error: {e}")

if __name__ == "__main__":
    test_direct_database_lookup()