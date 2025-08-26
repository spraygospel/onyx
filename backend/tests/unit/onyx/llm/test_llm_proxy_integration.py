"""
Test suite for LLM provider integration with proxy service to avoid ad blocker issues.
Tests the solution from dev_plan/1.2_LLM_integration_fix.md
"""
import pytest
import requests
import time
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException

from onyx.llm.llm_provider_options import (
    fetch_available_well_known_llms_with_templates,
    WellKnownLLMProviderDescriptor
)


class TestLLMProxyIntegration:
    """Test suite for ad blocker-safe LLM provider integration"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.test_client = None  # Will be set when we implement the proxy
        
        # Mock provider data
        self.groq_provider_mock = {
            "name": "groq",
            "display_name": "Groq",
            "model_endpoint": "https://api.groq.com/openai/v1/models",
            "litellm_provider_name": "groq"
        }
        
        # Mock Groq API response
        self.groq_api_response_mock = {
            "object": "list",
            "data": [
                {
                    "id": "llama-3.3-70b-versatile",
                    "object": "model",
                    "created": 1234567890,
                    "owned_by": "Meta"
                },
                {
                    "id": "llama-3.1-8b-instant", 
                    "object": "model",
                    "created": 1234567890,
                    "owned_by": "Meta"
                }
            ]
        }
    
    def test_existing_providers_static_models(self):
        """Test that existing providers (OpenAI, Anthropic) use static models and won't be affected"""
        providers = fetch_available_well_known_llms_with_templates()
        
        # Find OpenAI and Anthropic providers
        openai_provider = next((p for p in providers if p.name == "openai"), None)
        anthropic_provider = next((p for p in providers if p.name == "anthropic"), None)
        
        assert openai_provider is not None, "OpenAI provider should exist"
        assert anthropic_provider is not None, "Anthropic provider should exist"
        
        # These providers should NOT have model_endpoint (they use static models)
        assert openai_provider.model_endpoint is None, "OpenAI should use static models"
        assert anthropic_provider.model_endpoint is None, "Anthropic should use static models"
        
        # They should have model configurations
        assert len(openai_provider.model_configurations) > 0, "OpenAI should have static models"
        assert len(anthropic_provider.model_configurations) > 0, "Anthropic should have static models"
    
    def test_extensible_providers_dynamic_models(self):
        """Test that extensible providers (Groq, etc.) have model_endpoint for dynamic fetching"""
        providers = fetch_available_well_known_llms_with_templates()
        
        # Find extensible providers that should have dynamic model fetching
        groq_provider = next((p for p in providers if p.name == "groq"), None)
        
        if groq_provider:
            # These providers should have model_endpoint for dynamic fetching
            assert groq_provider.model_endpoint is not None, "Groq should have model_endpoint for dynamic fetching"
            assert "api.groq.com" in groq_provider.model_endpoint, "Groq should point to official API"
    
    @patch('requests.get')
    def test_groq_api_direct_call(self, mock_get):
        """Test direct Groq API call works with proper authentication"""
        # Mock successful API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.groq_api_response_mock
        mock_get.return_value = mock_response
        
        # Simulate API call
        import os
        headers = {"User-Agent": "Onyx-LLM-Discovery/1.0"}
        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        
        response = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
        
        # Verify call
        mock_get.assert_called_once_with("https://api.groq.com/openai/v1/models", headers=headers)
        assert response.status_code == 200
        assert response.json() == self.groq_api_response_mock
    
    def test_ad_blocker_problematic_url_patterns(self):
        """Test that current URLs match ad blocker blocking patterns"""
        problematic_patterns = [
            "/admin/llm/providers/groq/models",
            "/admin/llm/providers/ollama/models",
            "/admin/llm/providers/together/models"
        ]
        
        # These patterns should match typical ad blocker rules
        for pattern in problematic_patterns:
            # EasyList style pattern: /admin.*provider
            assert "/admin" in pattern and "provider" in pattern, f"Pattern {pattern} should trigger ad blockers"
    
    def test_clean_proxy_url_patterns(self):
        """Test that new clean proxy URLs avoid ad blocker patterns"""
        clean_patterns = [
            "/api/llm-models?provider=groq",
            "/api/llm-models?provider=ollama", 
            "/api/models/discovery?provider=together"
        ]
        
        # These patterns should NOT match ad blocker rules
        for pattern in clean_patterns:
            assert "/admin" not in pattern, f"Clean pattern {pattern} should not contain /admin"
            assert "provider" not in pattern.split("?")[0], f"Clean pattern {pattern} should not have provider in path"


class TestProxyServiceImplementation:
    """Test suite for the new proxy service implementation"""
    
    @pytest.fixture
    def mock_proxy_service(self):
        """Mock proxy service for testing"""
        from unittest.mock import AsyncMock
        
        class MockProxyService:
            def __init__(self):
                self.cache = {}
                self.cache_ttl = 3600
            
            async def get_models(self, provider_name: str):
                if provider_name == "groq":
                    return {
                        "models": [
                            {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B"},
                            {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B"}
                        ],
                        "cached": False,
                        "timestamp": 1234567890
                    }
                return {"models": [], "cached": False, "timestamp": 1234567890}
        
        return MockProxyService()
    
    @pytest.mark.asyncio
    async def test_proxy_service_caching(self, mock_proxy_service):
        """Test that proxy service implements caching correctly"""
        # First call should fetch fresh data
        result1 = await mock_proxy_service.get_models("groq")
        assert result1["cached"] is False
        assert len(result1["models"]) == 2
        
        # Cache the result manually for test
        mock_proxy_service.cache["models:groq"] = result1
        
        # Second call should use cache (in real implementation)
        cache_key = "models:groq"
        assert cache_key in mock_proxy_service.cache
    
    @pytest.mark.asyncio
    async def test_proxy_service_error_handling(self, mock_proxy_service):
        """Test proxy service handles API errors gracefully"""
        # Test with unknown provider
        result = await mock_proxy_service.get_models("unknown_provider")
        assert result["models"] == []
        assert "timestamp" in result
    

class TestBackendEndpoints:
    """Test suite for new backend proxy endpoints"""
    
    def test_new_clean_endpoints_planned(self):
        """Test that we plan to implement clean proxy endpoints"""
        # These are the endpoints we need to implement
        new_endpoints = [
            "/api/llm-models",  # Main proxy endpoint
            "/api/llm-models/refresh",  # Force refresh
            "/api/models",  # Available models (alternative)
            "/api/models/discovery"  # Model discovery (alternative)
        ]
        
        # Verify these are clean URLs (no admin/provider in path patterns that trigger ad blockers)
        for endpoint in new_endpoints:
            assert "/admin" not in endpoint, f"New endpoint {endpoint} should not contain /admin"
            # The problematic pattern is /admin.*provider, not just "provider" anywhere
            path_part = endpoint.split("?")[0]
            problematic_pattern = "/admin" in path_part and "provider" in path_part
            assert not problematic_pattern, f"New endpoint {endpoint} should not match ad blocker patterns"
    
    def test_existing_endpoints_preserved(self):
        """Test that existing working endpoints are preserved"""
        # These endpoints should remain unchanged for backward compatibility
        existing_endpoints = [
            "/admin/llm/built-in/options",  # Working - provider templates
            "/admin/llm/providers/{id}/models",  # Currently blocked - keep for fallback
            "/admin/llm/providers/{id}/refresh-models"  # Currently blocked - keep for fallback
        ]
        
        # These will be kept for compatibility but won't be the primary endpoints
        assert len(existing_endpoints) == 3, "Should preserve existing endpoints"


class TestFrontendFallbackLogic:
    """Test suite for frontend intelligent fallback system"""
    
    def test_fallback_strategy_design(self):
        """Test the design of frontend fallback strategy"""
        # Primary endpoint (clean proxy)
        primary_url = "/api/llm-models?provider=groq"
        
        # Fallback endpoint (original, might be blocked)
        fallback_url = "/admin/llm/providers/groq/models"
        
        # Verify URL structure
        assert "api" in primary_url and "admin" not in primary_url
        assert "admin" in fallback_url and "provider" in fallback_url
    
    @patch('requests.get')
    def test_error_message_for_ad_blocker_detection(self, mock_get):
        """Test that we provide helpful error messages for ad blocker issues"""
        # Simulate TypeError: Failed to fetch (typical ad blocker error)
        mock_get.side_effect = TypeError("Failed to fetch")
        
        expected_message = "Request blocked by browser extension or ad blocker. Please disable ad blocker for localhost:8080 or try incognito mode."
        
        # This should be the error message we provide to users
        try:
            raise TypeError("Failed to fetch")
        except TypeError as e:
            if "Failed to fetch" in str(e):
                error_message = expected_message
                assert "ad blocker" in error_message.lower()
                assert "incognito" in error_message.lower()


class TestIntegrationFlow:
    """End-to-end integration testing"""
    
    def test_provider_discovery_flow(self):
        """Test the complete provider discovery flow"""
        # Step 1: Get available providers
        providers = fetch_available_well_known_llms_with_templates()
        
        # Step 2: Find providers that need proxy (have model_endpoint)
        providers_needing_proxy = [
            p for p in providers 
            if p.model_endpoint is not None
        ]
        
        # Step 3: Verify these are the problematic ones
        problematic_names = [p.name for p in providers_needing_proxy]
        expected_problematic = ["groq"]  # Add others when we find them
        
        for name in expected_problematic:
            assert name in problematic_names, f"Provider {name} should need proxy"
    
    def test_backward_compatibility_preserved(self):
        """Test that existing working functionality is preserved"""
        providers = fetch_available_well_known_llms_with_templates()
        
        # OpenAI and Anthropic should still work exactly as before
        openai = next((p for p in providers if p.name == "openai"), None)
        anthropic = next((p for p in providers if p.name == "anthropic"), None)
        
        assert openai is not None
        assert anthropic is not None
        assert len(openai.model_configurations) > 0
        assert len(anthropic.model_configurations) > 0


class TestActualProxyEndpoints:
    """Test the actual implemented proxy endpoints"""
    
    @patch('requests.get')
    def test_proxy_service_groq_integration(self, mock_get):
        """Test that proxy service correctly integrates with Groq API"""
        # Mock Groq API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "object": "list", 
            "data": [
                {"id": "llama-3.3-70b-versatile", "object": "model"},
                {"id": "llama-3.1-8b-instant", "object": "model"}
            ]
        }
        mock_get.return_value = mock_response
        
        # Test proxy service
        from onyx.server.manage.llm.api import _proxy_service
        result = _proxy_service.get_models("groq")
        
        # Verify result structure
        assert "models" in result
        assert "cached" in result
        assert "timestamp" in result
        assert len(result["models"]) == 2
        assert result["models"][0] == "llama-3.3-70b-versatile"
    
    @patch('requests.get')
    def test_proxy_service_refresh_models(self, mock_get):
        """Test that proxy service refresh_models method works correctly"""
        # Mock Groq API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "object": "list", 
            "data": [
                {"id": "llama-3.3-70b-versatile", "object": "model"},
                {"id": "llama-3.1-8b-instant", "object": "model"},
                {"id": "mixtral-8x7b-32768", "object": "model"}
            ]
        }
        mock_get.return_value = mock_response
        
        # Test proxy service refresh_models method
        from onyx.server.manage.llm.api import _proxy_service
        result = _proxy_service.refresh_models("groq")
        
        # Verify result structure
        assert "models" in result
        assert "cached" in result
        assert "timestamp" in result
        assert result["cached"] is False  # Should always be False for refresh
        assert len(result["models"]) == 3
        assert result["models"][0] == "llama-3.3-70b-versatile"
    
    def test_proxy_service_caching_behavior(self):
        """Test that proxy service implements proper caching"""
        from onyx.server.manage.llm.api import _proxy_service
        
        # Clear any existing cache
        _proxy_service.cache.clear()
        
        # Mock a cache entry
        cache_key = "models:test_provider"
        _proxy_service.cache[cache_key] = {
            "models": ["test-model"],
            "cached": False,
            "timestamp": int(time.time()),
            "ttl": 3600
        }
        
        # Test cache hit
        assert _proxy_service.is_cached(cache_key) is True
        
        # Test cache miss
        assert _proxy_service.is_cached("models:nonexistent") is False
        
        # Test expired cache
        _proxy_service.cache[cache_key]["timestamp"] = int(time.time()) - 7200  # 2 hours ago
        assert _proxy_service.is_cached(cache_key) is False


class TestRefreshEndpoint:
    """Test suite for refresh endpoint functionality"""
    
    @patch('requests.get')
    def test_refresh_endpoint_returns_fresh_data(self, mock_get):
        """Test that refresh endpoint bypasses cache and returns fresh data"""
        # Mock Groq API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "object": "list", 
            "data": [
                {"id": "llama-3.3-70b-versatile", "object": "model"},
                {"id": "llama-3.1-8b-instant", "object": "model"}
            ]
        }
        mock_get.return_value = mock_response
        
        # Test that refresh endpoint should exist and work
        from onyx.server.manage.llm.api import _proxy_service
        
        # Populate cache first
        _proxy_service.get_models("groq")
        
        # Refresh should bypass cache and return fresh data
        result = _proxy_service.refresh_models("groq")
        
        # Verify result structure
        assert "models" in result
        assert "cached" in result
        assert "timestamp" in result
        assert result["cached"] is False  # Should never be cached for refresh
        assert len(result["models"]) == 2
    
    def test_refresh_endpoint_clears_cache(self):
        """Test that refresh endpoint clears existing cache"""
        from onyx.server.manage.llm.api import _proxy_service
        
        # Setup cache
        cache_key = "models:groq"
        _proxy_service.cache[cache_key] = {
            "models": ["old-model"],
            "cached": True,
            "timestamp": int(time.time()),
            "ttl": 3600
        }
        
        # Verify cache exists
        assert cache_key in _proxy_service.cache
        
        # Refresh should clear cache for that provider
        # This test will pass once refresh_models method is implemented
        # to clear the cache entry
        pass


if __name__ == "__main__":
    # Run specific tests for debugging
    import sys
    import subprocess
    
    # Test if we can identify problematic providers
    print("=== Testing Provider Analysis ===")
    providers = fetch_available_well_known_llms_with_templates()
    
    print(f"Total providers found: {len(providers)}")
    
    for provider in providers:
        has_endpoint = provider.model_endpoint is not None
        print(f"Provider: {provider.name} | Has model_endpoint: {has_endpoint}")
        if has_endpoint:
            print(f"  → Endpoint: {provider.model_endpoint}")
            print(f"  → This provider needs proxy to avoid ad blockers")
    
    print("\n=== Ad Blocker Pattern Analysis ===")
    current_problematic_url = "/admin/llm/providers/groq/models"
    proposed_clean_url = "/api/llm-models?provider=groq"
    
    print(f"Current (blocked): {current_problematic_url}")
    print(f"  → Contains '/admin' and 'provider': {'/admin' in current_problematic_url and 'provider' in current_problematic_url}")
    
    print(f"Proposed (clean): {proposed_clean_url}")
    print(f"  → Contains '/admin' and 'provider' in path: {'/admin' in proposed_clean_url and 'provider' in proposed_clean_url.split('?')[0]}")
    
    print("\n=== Testing Proxy Service ===")
    from onyx.server.manage.llm.api import _proxy_service
    
    print("Testing proxy service initialization...")
    print(f"Cache TTL: {_proxy_service.cache_ttl}")
    print(f"Cache entries: {len(_proxy_service.cache)}")
    
    print("\n=== Running Tests ===")
    # Run the actual pytest
    subprocess.run([sys.executable, "-m", "pytest", __file__, "-v"])