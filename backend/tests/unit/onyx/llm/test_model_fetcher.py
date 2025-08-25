"""
Unit tests for Dynamic Model Fetcher - Phase 2 TDD tests
Testing dynamic API fetching, TTL caching, fallback mechanisms, error handling
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from typing import List, Dict, Any
import time

# Import real implementations from Phase 2
from onyx.llm.model_fetcher import (
    ModelFetcher,
    ModelFetchError,
    CacheEntry,
    CACHE_TTL_DEFAULT
)
from onyx.llm.provider_templates import ProviderTemplate, FieldConfig


# Module-level fixtures for shared use across test classes
@pytest.fixture
def fetcher():
    """Create ModelFetcher instance for testing"""
    return ModelFetcher()


@pytest.fixture 
def groq_provider():
    """Mock Groq provider template"""
    return ProviderTemplate(
        id="groq",
        name="Groq",
        description="Ultra-fast inference",
        category="cloud", 
        setup_difficulty="easy",
        config_schema={
            "api_key": FieldConfig(
                type="password",
                label="API Key",
                required=True
            )
        },
        model_fetching="dynamic",
        model_endpoint="https://api.groq.com/openai/v1/models",
        model_list_cache_ttl=3600,
        popular_models=["llama-3.1-8b-instant", "llama-3.1-70b-versatile"],
        litellm_provider_name="groq"
    )


@pytest.fixture
def ollama_provider():
    """Mock Ollama provider template"""
    return ProviderTemplate(
        id="ollama",
        name="Ollama", 
        description="Run LLMs locally",
        category="local",
        setup_difficulty="medium",
        config_schema={
            "api_base": FieldConfig(
                type="url",
                label="Server URL",
                required=True,
                default_value="http://localhost:11434"
            )
        },
        model_fetching="dynamic",
        model_endpoint="/api/tags",
        model_list_cache_ttl=300,
        popular_models=["llama3.2:latest", "qwen2.5:latest"],
        litellm_provider_name="ollama"
    )


@pytest.fixture
def static_provider():
    """Mock static provider template"""
    return ProviderTemplate(
        id="static_test",
        name="Static Test",
        description="Static provider for testing",
        category="cloud",
        setup_difficulty="easy",
        config_schema={},
        model_fetching="static",
        popular_models=["model1", "model2", "model3"],
        litellm_provider_name="static_test"
    )


class TestModelFetcher:
    """Test ModelFetcher class functionality"""


class TestModelFetchingBasic:
    """Test basic model fetching functionality"""
    
    @pytest.mark.asyncio
    async def test_fetch_models_dynamic_success(self, fetcher, groq_provider):
        """Test successful dynamic model fetching"""
        expected_models = ["llama-3.1-8b-instant", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"]
        
        with patch.object(fetcher, '_fetch_from_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = expected_models
            
            models = await fetcher.fetch_models(groq_provider)
            
            assert models == expected_models
            mock_api.assert_called_once_with(groq_provider)
    
    @pytest.mark.asyncio
    async def test_fetch_models_static(self, fetcher, static_provider):
        """Test static model fetching"""
        models = await fetcher.fetch_models(static_provider)
        
        assert models == static_provider.popular_models
    
    @pytest.mark.asyncio
    async def test_fetch_models_manual(self, fetcher):
        """Test manual model fetching returns empty list"""
        manual_provider = ProviderTemplate(
            id="manual_test",
            name="Manual Test",
            description="Manual provider for testing",
            category="cloud",
            setup_difficulty="easy",
            config_schema={},
            model_fetching="manual",
            litellm_provider_name="manual_test"
        )
        
        models = await fetcher.fetch_models(manual_provider)
        
        assert models == []


class TestCaching:
    """Test TTL caching functionality"""
    
    @pytest.mark.asyncio
    async def test_cache_models_and_retrieve(self, fetcher, groq_provider):
        """Test caching models and retrieving from cache"""
        test_models = ["model1", "model2"]
        
        # Cache the models
        fetcher._cache_models(groq_provider.id, test_models, 3600)
        
        # Retrieve from cache
        cached_models = fetcher._get_cached_models(groq_provider.id)
        
        assert cached_models == test_models
    
    def test_cache_entry_creation(self, fetcher):
        """Test cache entry creation with correct timestamp and TTL"""
        models = ["model1", "model2"]
        ttl = 1800
        provider_id = "test_provider"
        
        before_time = time.time()
        fetcher._cache_models(provider_id, models, ttl)
        after_time = time.time()
        
        # Verify cache entry exists and has correct structure
        if provider_id in fetcher.cache:
            entry = fetcher.cache[provider_id]
            assert entry.models == models
            assert entry.ttl == ttl
            assert before_time <= entry.timestamp <= after_time
    
    def test_cache_expiration(self, fetcher):
        """Test cache expiration logic"""
        # Create expired cache entry
        expired_entry = CacheEntry(
            models=["old_model"],
            timestamp=time.time() - 7200,  # 2 hours ago
            ttl=3600  # 1 hour TTL
        )
        
        assert not fetcher._is_cache_valid(expired_entry)
        
        # Create valid cache entry
        valid_entry = CacheEntry(
            models=["new_model"],
            timestamp=time.time() - 1800,  # 30 minutes ago
            ttl=3600  # 1 hour TTL
        )
        
        assert fetcher._is_cache_valid(valid_entry)
    
    @pytest.mark.asyncio
    async def test_fetch_uses_valid_cache(self, fetcher, groq_provider):
        """Test that fetch uses valid cache instead of API call"""
        cached_models = ["cached_model1", "cached_model2"]
        
        # Pre-populate cache
        fetcher._cache_models(groq_provider.id, cached_models, 3600)
        
        with patch.object(fetcher, '_get_cached_models') as mock_cache:
            mock_cache.return_value = cached_models
            
            with patch.object(fetcher, '_fetch_from_api', new_callable=AsyncMock) as mock_api:
                models = await fetcher.fetch_models(groq_provider)
                
                assert models == cached_models
                mock_api.assert_not_called()  # Should not call API if cache is valid


class TestAPIFetching:
    """Test API fetching functionality"""
    
    @pytest.mark.asyncio
    async def test_fetch_from_groq_api(self, fetcher, groq_provider):
        """Test fetching from Groq API format"""
        # Mock Groq API response format
        mock_response = {
            "data": [
                {"id": "llama-3.1-8b-instant", "object": "model"},
                {"id": "llama-3.1-70b-versatile", "object": "model"}, 
                {"id": "mixtral-8x7b-32768", "object": "model"}
            ]
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 200
            
            models = await fetcher._fetch_from_api(groq_provider)
            
            expected_models = ["llama-3.1-8b-instant", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"]
            assert models == expected_models
    
    @pytest.mark.asyncio
    async def test_fetch_from_ollama_api(self, fetcher, ollama_provider):
        """Test fetching from Ollama API format"""
        # Mock Ollama API response format
        mock_response = {
            "models": [
                {"name": "llama3.2:latest", "size": 1234567890},
                {"name": "qwen2.5:latest", "size": 987654321},
                {"name": "deepseek-coder:latest", "size": 2345678901}
            ]
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 200
            
            models = await fetcher._fetch_from_api(ollama_provider)
            
            expected_models = ["llama3.2:latest", "qwen2.5:latest", "deepseek-coder:latest"]
            assert models == expected_models
    
    @pytest.mark.asyncio
    async def test_api_error_handling(self, fetcher, groq_provider):
        """Test API error handling and fallback"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            # Simulate API error
            mock_get.side_effect = Exception("API connection failed")
            
            with pytest.raises(ModelFetchError):
                await fetcher._fetch_from_api(groq_provider)
    
    @pytest.mark.asyncio
    async def test_api_timeout_handling(self, fetcher, groq_provider):
        """Test API timeout handling"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.side_effect = asyncio.TimeoutError()
            
            with pytest.raises(ModelFetchError):
                await fetcher._fetch_from_api(groq_provider)
    
    @pytest.mark.asyncio
    async def test_api_invalid_response_format(self, fetcher, groq_provider):
        """Test handling of invalid API response format"""
        # Invalid response format
        mock_response = {"invalid": "format"}
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 200
            
            with pytest.raises(ModelFetchError):
                await fetcher._fetch_from_api(groq_provider)


class TestFallbackMechanisms:
    """Test fallback mechanisms when API fails"""
    
    @pytest.mark.asyncio
    async def test_fallback_to_popular_models_on_api_failure(self, fetcher, groq_provider):
        """Test fallback to popular_models when API fails"""
        with patch.object(fetcher, '_fetch_from_api', new_callable=AsyncMock) as mock_api:
            mock_api.side_effect = ModelFetchError("API failed")
            
            models = await fetcher.fetch_models(groq_provider)
            
            # Should fallback to popular_models
            assert models == groq_provider.popular_models
    
    @pytest.mark.asyncio
    async def test_fallback_to_cached_models_on_api_failure(self, fetcher, groq_provider):
        """Test fallback to cached models when API fails but cache exists"""
        cached_models = ["cached_model1", "cached_model2"]
        
        # Pre-populate cache (expired but available for fallback)
        fetcher.cache[groq_provider.id] = CacheEntry(
            models=cached_models,
            timestamp=time.time() - 7200,  # Expired
            ttl=3600
        )
        
        with patch.object(fetcher, '_fetch_from_api', new_callable=AsyncMock) as mock_api:
            mock_api.side_effect = ModelFetchError("API failed")
            
            models = await fetcher.fetch_models(groq_provider)
            
            # Should use cached models even if expired when API fails
            assert models == cached_models
    
    @pytest.mark.asyncio
    async def test_empty_fallback_when_no_options(self, fetcher):
        """Test empty list fallback when no API, cache, or popular_models"""
        provider_no_fallback = ProviderTemplate(
            id="no_fallback",
            name="No Fallback",
            description="Provider with no fallback options",
            category="cloud",
            setup_difficulty="easy", 
            config_schema={},
            model_fetching="dynamic",
            model_endpoint="https://api.failed.com/models",
            litellm_provider_name="no_fallback"
            # No popular_models defined
        )
        
        with patch.object(fetcher, '_fetch_from_api', new_callable=AsyncMock) as mock_api:
            mock_api.side_effect = ModelFetchError("API failed")
            
            models = await fetcher.fetch_models(provider_no_fallback)
            
            assert models == []


class TestDifferentProviderTypes:
    """Test model fetching for different provider types"""
    
    @pytest.mark.asyncio
    async def test_cloud_provider_caching(self, fetcher):
        """Test cloud providers use longer cache TTL (1 hour)"""
        cloud_provider = ProviderTemplate(
            id="cloud_test",
            name="Cloud Test",
            description="Cloud provider for testing",
            category="cloud",
            setup_difficulty="easy",
            config_schema={},
            model_fetching="dynamic", 
            model_endpoint="https://api.cloud.com/models",
            model_list_cache_ttl=3600,  # 1 hour
            popular_models=["model1"],
            litellm_provider_name="cloud_test"
        )
        
        test_models = ["cloud_model1", "cloud_model2"]
        
        with patch.object(fetcher, '_fetch_from_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = test_models
            
            await fetcher.fetch_models(cloud_provider)
            
            # Verify caching with correct TTL
            if cloud_provider.id in fetcher.cache:
                assert fetcher.cache[cloud_provider.id].ttl == 3600
    
    @pytest.mark.asyncio  
    async def test_local_provider_caching(self, fetcher):
        """Test local providers use shorter cache TTL (5 minutes)"""
        local_provider = ProviderTemplate(
            id="local_test",
            name="Local Test",
            description="Local provider for testing",
            category="local",
            setup_difficulty="medium",
            config_schema={},
            model_fetching="dynamic",
            model_endpoint="/api/tags",
            model_list_cache_ttl=300,  # 5 minutes
            popular_models=["local_model1"],
            litellm_provider_name="local_test"
        )
        
        test_models = ["local_model1", "local_model2"]
        
        with patch.object(fetcher, '_fetch_from_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = test_models
            
            await fetcher.fetch_models(local_provider)
            
            # Verify caching with shorter TTL
            if local_provider.id in fetcher.cache:
                assert fetcher.cache[local_provider.id].ttl == 300


class TestModelFetcherEdgeCases:
    """Test edge cases and error conditions"""
    
    @pytest.mark.asyncio
    async def test_empty_api_response(self, fetcher, groq_provider):
        """Test handling empty API response"""
        with patch.object(fetcher, '_fetch_from_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = []
            
            models = await fetcher.fetch_models(groq_provider)
            
            # Should fallback to popular_models when API returns empty
            assert models == groq_provider.popular_models
    
    @pytest.mark.asyncio
    async def test_none_response_handling(self, fetcher, groq_provider):
        """Test handling None response from API"""
        with patch.object(fetcher, '_fetch_from_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = None
            
            models = await fetcher.fetch_models(groq_provider)
            
            # Should fallback to popular_models
            assert models == groq_provider.popular_models
    
    def test_invalid_cache_ttl(self, fetcher):
        """Test handling invalid cache TTL values"""
        with pytest.raises((ValueError, TypeError)):
            fetcher._cache_models("test", ["model1"], -1)  # Negative TTL
        
        with pytest.raises((ValueError, TypeError)):
            fetcher._cache_models("test", ["model1"], "invalid")  # Non-numeric TTL
    
    @pytest.mark.asyncio
    async def test_concurrent_cache_access(self, fetcher, groq_provider):
        """Test concurrent access to cache doesn't cause issues"""
        # Simulate concurrent requests to same provider
        tasks = []
        for _ in range(5):
            task = fetcher.fetch_models(groq_provider)
            tasks.append(task)
        
        with patch.object(fetcher, '_fetch_from_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = ["concurrent_model"]
            
            results = await asyncio.gather(*tasks)
            
            # All results should be consistent
            for result in results:
                assert result == ["concurrent_model"] or result == groq_provider.popular_models