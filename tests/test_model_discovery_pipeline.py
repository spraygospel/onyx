#!/usr/bin/env python3
"""
Test file for Model Discovery Pipeline - Groq Integration
Tests the complete data pipeline from backend API to frontend display
"""

import requests
import json
import sys
import time
from typing import Dict, List, Any, Optional

class ModelDiscoveryTester:
    """Test suite for Model Discovery data pipeline"""
    
    def __init__(self, backend_url: str = "http://localhost:8080"):
        self.backend_url = backend_url
        self.test_results: List[Dict[str, Any]] = []
        
    def log_test(self, test_name: str, passed: bool, details: str = "", data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "passed": passed,
            "details": details,
            "data": data,
            "timestamp": time.time()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not passed and data:
            print(f"   Data: {data}")
        print()
        
    def test_backend_health(self) -> bool:
        """Test 1: Backend server is running and responding"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            if response.status_code == 200:
                self.log_test("Backend Health Check", True, "Backend server is running")
                return True
            else:
                self.log_test("Backend Health Check", False, f"Backend returned {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Backend Health Check", False, f"Cannot connect to backend: {str(e)}")
            return False
            
    def test_provider_templates_endpoint(self) -> Optional[List[Dict]]:
        """Test 2: Provider templates endpoint returns data"""
        try:
            response = requests.get(f"{self.backend_url}/admin/llm/built-in/options", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_test("Provider Templates Endpoint", True, f"Found {len(data)} provider templates")
                    return data
                else:
                    self.log_test("Provider Templates Endpoint", False, "Empty or invalid response format")
                    return None
            else:
                self.log_test("Provider Templates Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("Provider Templates Endpoint", False, f"Request failed: {str(e)}")
            return None
            
    def test_groq_provider_exists(self, providers: List[Dict]) -> Optional[Dict]:
        """Test 3: Groq provider exists in templates"""
        groq_provider = None
        for provider in providers:
            if provider.get('name') == 'groq':
                groq_provider = provider
                break
                
        if groq_provider:
            required_fields = ['name', 'model_endpoint', 'litellm_provider_name']
            missing_fields = [field for field in required_fields if not groq_provider.get(field)]
            
            if not missing_fields:
                self.log_test("Groq Provider Exists", True, 
                    f"Groq provider found with endpoint: {groq_provider.get('model_endpoint')}")
                return groq_provider
            else:
                self.log_test("Groq Provider Exists", False, 
                    f"Groq provider missing required fields: {missing_fields}", groq_provider)
                return None
        else:
            self.log_test("Groq Provider Exists", False, 
                "Groq provider not found in templates")
            return None
            
    def test_groq_models_endpoint(self) -> Optional[Dict]:
        """Test 4: Groq models endpoint returns data"""
        try:
            response = requests.get(f"{self.backend_url}/admin/llm/providers/groq/models", timeout=15)
            if response.status_code == 200:
                data = response.json()
                if 'models' in data and isinstance(data['models'], list):
                    model_count = len(data['models'])
                    self.log_test("Groq Models Endpoint", True, 
                        f"Found {model_count} models", data['models'][:5])  # Show first 5
                    return data
                else:
                    self.log_test("Groq Models Endpoint", False, 
                        "Invalid response format - missing 'models' array", data)
                    return None
            else:
                self.log_test("Groq Models Endpoint", False, 
                    f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("Groq Models Endpoint", False, f"Request failed: {str(e)}")
            return None
            
    def test_groq_api_direct(self) -> bool:
        """Test 5: Direct call to Groq API works"""
        try:
            import os
            api_key = os.getenv('GROQ_API_KEY')
            if not api_key:
                self.log_test("Groq API Direct", False, "GROQ_API_KEY not found in environment")
                return False
                
            headers = {
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "Onyx-Test/1.0"
            }
            
            response = requests.get("https://api.groq.com/openai/v1/models", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'data' in data and isinstance(data['data'], list):
                    model_count = len(data['data'])
                    self.log_test("Groq API Direct", True, 
                        f"Direct Groq API returned {model_count} models")
                    return True
                else:
                    self.log_test("Groq API Direct", False, 
                        "Invalid Groq API response format", data)
                    return False
            else:
                self.log_test("Groq API Direct", False, 
                    f"Groq API returned HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Groq API Direct", False, f"Direct Groq API call failed: {str(e)}")
            return False
            
    def test_frontend_api_compatibility(self) -> bool:
        """Test 6: Frontend API path compatibility"""
        # Test both potential frontend paths
        paths_to_test = [
            "/admin/llm/providers/groq/models",  # Current backend path
            "/api/admin/llm/providers/groq/models"  # Potential frontend path
        ]
        
        for path in paths_to_test:
            try:
                response = requests.get(f"{self.backend_url}{path}", timeout=5)
                if response.status_code == 200:
                    self.log_test("Frontend API Compatibility", True, f"Path {path} works")
                    return True
                elif response.status_code == 404:
                    continue
                else:
                    self.log_test("Frontend API Compatibility", False, 
                        f"Path {path} returned HTTP {response.status_code}")
                    return False
            except Exception as e:
                continue
                
        self.log_test("Frontend API Compatibility", False, 
            "None of the expected frontend paths work")
        return False
        
    def run_all_tests(self) -> Dict[str, Any]:
        """Run complete test suite"""
        print("🔍 Starting Model Discovery Pipeline Tests\n")
        
        # Test 1: Backend Health
        if not self.test_backend_health():
            return self.generate_report()
            
        # Test 2: Provider Templates
        providers = self.test_provider_templates_endpoint()
        if not providers:
            return self.generate_report()
            
        # Test 3: Groq Provider
        groq_provider = self.test_groq_provider_exists(providers)
        if not groq_provider:
            return self.generate_report()
            
        # Test 4: Groq Models Endpoint
        models_data = self.test_groq_models_endpoint()
        
        # Test 5: Direct Groq API
        self.test_groq_api_direct()
        
        # Test 6: Frontend Compatibility
        self.test_frontend_api_compatibility()
        
        return self.generate_report()
        
    def generate_report(self) -> Dict[str, Any]:
        """Generate test report"""
        passed_tests = [t for t in self.test_results if t['passed']]
        failed_tests = [t for t in self.test_results if not t['passed']]
        
        report = {
            "total_tests": len(self.test_results),
            "passed": len(passed_tests),
            "failed": len(failed_tests),
            "success_rate": len(passed_tests) / len(self.test_results) * 100 if self.test_results else 0,
            "tests": self.test_results
        }
        
        print("📊 TEST REPORT")
        print("=" * 50)
        print(f"Total Tests: {report['total_tests']}")
        print(f"Passed: {report['passed']}")
        print(f"Failed: {report['failed']}")
        print(f"Success Rate: {report['success_rate']:.1f}%")
        
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
                
        return report

def main():
    """Main test execution"""
    tester = ModelDiscoveryTester()
    report = tester.run_all_tests()
    
    # Exit with non-zero code if tests failed
    if report['failed'] > 0:
        sys.exit(1)
    else:
        print("\n🎉 All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()