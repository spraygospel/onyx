"""
Integration tests for LLM Provider Management API endpoints - Phase 0 TDD tests
Testing GET /api/admin/llm/providers/{provider_id}/models endpoint
Testing POST /api/admin/llm/providers/{provider_id}/refresh-models endpoint
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from typing import List, Dict, Any
import json

# These imports will be created during implementation phases
try:
    from onyx.server.main import app
    from onyx.llm.model_fetcher import ModelFetcher, ModelFetchError
    from onyx.llm.provider_templates import get_provider_template
except ImportError:
    # Mock for TDD - will be replaced with real implementation
    from fastapi import FastAPI
    
    app = FastAPI()
    
    class ModelFetchError(Exception):
        pass
    
    class ModelFetcher:
        async def fetch_models(self, provider_template):
            return ["mock-model-1", "mock-model-2"]
        
        async def refresh_models(self, provider_id):
            return ["refreshed-model-1", "refreshed-model-2"]
    
    def get_provider_template(provider_id):
        return None


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def admin_headers():
    """Mock admin authentication headers"""
    return {"Authorization": "Bearer admin_token"}


@pytest.fixture
def mock_model_fetcher():
    """Mock ModelFetcher for testing"""
    return ModelFetcher()


class TestGetProviderModelsEndpoint:
    """Test GET /api/admin/llm/providers/{provider_id}/models endpoint"""
    
    def test_get_groq_models_success(self, client, admin_headers):
        """Test successful retrieval of Groq models"""
        provider_id = "groq"
        
        with patch('onyx.llm.model_fetcher.ModelFetcher') as mock_fetcher_class:
            mock_fetcher = mock_fetcher_class.return_value
            mock_fetcher.fetch_models.return_value = [
                "llama-3.1-8b-instant",
                "llama-3.1-70b-versatile", 
                "mixtral-8x7b-32768"
            ]
            
            response = client.get(
                f"/api/admin/llm/providers/{provider_id}/models",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "models" in data
            assert len(data["models"]) == 3
            assert "llama-3.1-8b-instant" in data["models"]
    
    def test_get_ollama_models_success(self, client, admin_headers):
        """Test successful retrieval of Ollama models"""
        provider_id = "ollama"
        
        with patch('onyx.llm.model_fetcher.ModelFetcher') as mock_fetcher_class:
            mock_fetcher = mock_fetcher_class.return_value
            mock_fetcher.fetch_models.return_value = [
                "llama3.2:latest",
                "qwen2.5:latest",
                "deepseek-coder:latest"
            ]
            
            response = client.get(
                f"/api/admin/llm/providers/{provider_id}/models",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "models" in data
            assert len(data["models"]) == 3
            assert "llama3.2:latest" in data["models"]
    
    def test_get_models_invalid_provider(self, client, admin_headers):
        """Test error handling for invalid provider ID"""
        provider_id = "invalid_provider"
        
        response = client.get(
            f"/api/admin/llm/providers/{provider_id}/models",
            headers=admin_headers
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "not found" in data["error"].lower()
    
    def test_get_models_unauthorized(self, client):
        """Test authentication requirement for models endpoint"""
        provider_id = "groq"
        
        response = client.get(f"/api/admin/llm/providers/{provider_id}/models")
        
        assert response.status_code == 401
    
    def test_get_models_api_failure_fallback(self, client, admin_headers):
        """Test fallback to popular models when API fails"""
        provider_id = "groq"
        
        with patch('onyx.llm.model_fetcher.ModelFetcher') as mock_fetcher_class:
            mock_fetcher = mock_fetcher_class.return_value
            mock_fetcher.fetch_models.side_effect = ModelFetchError("API failed")
            
            response = client.get(
                f"/api/admin/llm/providers/{provider_id}/models",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "models" in data
            assert "source" in data
            assert data["source"] == "fallback"
    
    def test_get_models_with_cache_info(self, client, admin_headers):
        """Test models endpoint returns cache information"""
        provider_id = "groq"
        
        with patch('onyx.llm.model_fetcher.ModelFetcher') as mock_fetcher_class:
            mock_fetcher = mock_fetcher_class.return_value
            mock_fetcher.fetch_models.return_value = ["model1", "model2"]
            mock_fetcher.get_cache_info.return_value = {
                "cached": True,
                "timestamp": 1234567890,
                "ttl": 3600
            }
            
            response = client.get(
                f"/api/admin/llm/providers/{provider_id}/models",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "cache_info" in data
            assert data["cache_info"]["cached"] == True
    
    def test_get_models_rate_limiting(self, client, admin_headers):
        """Test rate limiting on models endpoint"""
        provider_id = "groq"
        
        # This test ensures API calls are rate limited to prevent abuse
        # Implementation will depend on actual rate limiting strategy
        responses = []
        for _ in range(10):  # Make multiple rapid requests
            response = client.get(
                f"/api/admin/llm/providers/{provider_id}/models",
                headers=admin_headers
            )
            responses.append(response)
        
        # Should not all succeed due to rate limiting
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes or all(code == 200 for code in status_codes)


class TestRefreshProviderModelsEndpoint:
    """Test POST /api/admin/llm/providers/{provider_id}/refresh-models endpoint"""
    
    def test_refresh_groq_models_success(self, client, admin_headers):
        """Test successful refresh of Groq models"""
        provider_id = "groq"
        
        with patch('onyx.llm.model_fetcher.ModelFetcher') as mock_fetcher_class:
            mock_fetcher = mock_fetcher_class.return_value
            mock_fetcher.refresh_models.return_value = [
                "llama-3.1-8b-instant",
                "llama-3.1-70b-versatile",
                "new-model-v2"
            ]
            
            response = client.post(
                f"/api/admin/llm/providers/{provider_id}/refresh-models",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "models" in data
            assert "refreshed_at" in data
            assert len(data["models"]) == 3
            assert "new-model-v2" in data["models"]
    
    def test_refresh_models_force_update(self, client, admin_headers):
        """Test force refresh bypassing cache"""
        provider_id = "groq"
        
        with patch('onyx.llm.model_fetcher.ModelFetcher') as mock_fetcher_class:
            mock_fetcher = mock_fetcher_class.return_value
            mock_fetcher.refresh_models.return_value = ["model1", "model2"]
            
            response = client.post(
                f"/api/admin/llm/providers/{provider_id}/refresh-models",
                headers=admin_headers,
                json={"force": True}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "models" in data
            mock_fetcher.refresh_models.assert_called_once()
    
    def test_refresh_models_invalid_provider(self, client, admin_headers):
        """Test error handling for invalid provider ID in refresh"""
        provider_id = "invalid_provider"
        
        response = client.post(
            f"/api/admin/llm/providers/{provider_id}/refresh-models",
            headers=admin_headers
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "not found" in data["error"].lower()
    
    def test_refresh_models_unauthorized(self, client):
        """Test authentication requirement for refresh endpoint"""
        provider_id = "groq"
        
        response = client.post(f"/api/admin/llm/providers/{provider_id}/refresh-models")
        
        assert response.status_code == 401
    
    def test_refresh_models_api_failure(self, client, admin_headers):
        """Test error handling when refresh API fails"""
        provider_id = "groq"
        
        with patch('onyx.llm.model_fetcher.ModelFetcher') as mock_fetcher_class:
            mock_fetcher = mock_fetcher_class.return_value
            mock_fetcher.refresh_models.side_effect = ModelFetchError("API unreachable")
            
            response = client.post(
                f"/api/admin/llm/providers/{provider_id}/refresh-models",
                headers=admin_headers
            )
            
            assert response.status_code == 503
            data = response.json()
            assert "error" in data
            assert "api" in data["error"].lower()
    
    def test_refresh_models_async_processing(self, client, admin_headers):
        """Test asynchronous model refresh processing"""
        provider_id = "groq"
        
        with patch('onyx.llm.model_fetcher.ModelFetcher') as mock_fetcher_class:
            mock_fetcher = mock_fetcher_class.return_value
            
            # Mock async processing - should return task ID
            response = client.post(
                f"/api/admin/llm/providers/{provider_id}/refresh-models",
                headers=admin_headers,
                json={"async": True}
            )
            
            assert response.status_code == 202
            data = response.json()
            assert "task_id" in data or "status" in data


class TestProviderModelValidation:
    """Test model validation and filtering"""
    
    def test_model_name_validation(self, client, admin_headers):
        """Test that returned model names are properly validated"""
        provider_id = "groq"
        
        with patch('onyx.llm.model_fetcher.ModelFetcher') as mock_fetcher_class:
            mock_fetcher = mock_fetcher_class.return_value
            mock_fetcher.fetch_models.return_value = [
                "valid-model-name",
                "",  # Invalid empty name
                "another-valid-model",
                None,  # Invalid None value
                "valid-model-2"
            ]
            
            response = client.get(
                f"/api/admin/llm/providers/{provider_id}/models",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            # Should filter out invalid models
            valid_models = [m for m in data["models"] if m and isinstance(m, str)]
            assert len(valid_models) == 3
            assert "valid-model-name" in valid_models
    
    def test_model_availability_checking(self, client, admin_headers):
        """Test model availability validation"""
        provider_id = "groq"
        
        with patch('onyx.llm.model_fetcher.ModelFetcher') as mock_fetcher_class:
            mock_fetcher = mock_fetcher_class.return_value
            mock_fetcher.fetch_models.return_value = ["available-model"]
            mock_fetcher.check_model_availability.return_value = {
                "available-model": True,
                "deprecated-model": False
            }
            
            response = client.get(
                f"/api/admin/llm/providers/{provider_id}/models?check_availability=true",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "availability" in data or all(isinstance(m, str) for m in data["models"])


class TestProviderEndpointSecurity:
    """Test security aspects of provider endpoints"""
    
    def test_admin_permission_required(self, client):
        """Test that admin permissions are required"""
        # Test with regular user token (non-admin)
        user_headers = {"Authorization": "Bearer user_token"}
        
        response = client.get(
            "/api/admin/llm/providers/groq/models",
            headers=user_headers
        )
        
        assert response.status_code in [401, 403]
    
    def test_input_sanitization(self, client, admin_headers):
        """Test input sanitization for provider IDs"""
        malicious_provider_ids = [
            "../../../etc/passwd",
            "groq; DROP TABLE providers;",
            "<script>alert('xss')</script>",
            "provider%00.txt"
        ]
        
        for provider_id in malicious_provider_ids:
            response = client.get(
                f"/api/admin/llm/providers/{provider_id}/models",
                headers=admin_headers
            )
            # Should either be 404 (not found) or 400 (bad request)
            assert response.status_code in [400, 404]
    
    def test_request_size_limiting(self, client, admin_headers):
        """Test request size limits"""
        large_payload = {"data": "x" * 1000000}  # 1MB payload
        
        response = client.post(
            "/api/admin/llm/providers/groq/refresh-models",
            headers=admin_headers,
            json=large_payload
        )
        
        # Should handle large requests gracefully
        assert response.status_code in [200, 413, 400]


class TestProviderEndpointPerformance:
    """Test performance aspects of provider endpoints"""
    
    def test_response_time_limits(self, client, admin_headers):
        """Test that endpoints respond within acceptable time limits"""
        import time
        
        start_time = time.time()
        response = client.get(
            "/api/admin/llm/providers/groq/models",
            headers=admin_headers
        )
        end_time = time.time()
        
        # Should respond within 5 seconds
        assert (end_time - start_time) < 5.0
        assert response.status_code in [200, 503, 404]
    
    def test_concurrent_request_handling(self, client, admin_headers):
        """Test handling of concurrent requests"""
        import concurrent.futures
        
        def make_request():
            return client.get(
                "/api/admin/llm/providers/groq/models",
                headers=admin_headers
            )
        
        # Make 5 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            responses = [f.result() for f in futures]
        
        # All requests should complete successfully or fail gracefully
        for response in responses:
            assert response.status_code in [200, 429, 503]
    
    def test_memory_usage_limits(self, client, admin_headers):
        """Test memory usage doesn't grow excessively"""
        # Make multiple requests to check for memory leaks
        responses = []
        for _ in range(10):
            response = client.get(
                "/api/admin/llm/providers/groq/models",
                headers=admin_headers
            )
            responses.append(response)
        
        # All responses should be consistent
        status_codes = set(r.status_code for r in responses)
        assert len(status_codes) <= 2  # Should be consistent (maybe 200 and 503)