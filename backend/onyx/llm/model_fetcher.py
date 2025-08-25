"""
Dynamic Model Fetcher System for Extensible LLM Integration
Handles dynamic API fetching, TTL caching, and fallback mechanisms
"""

import asyncio
import aiohttp
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from onyx.llm.provider_templates import ProviderTemplate


# Default cache TTL (1 hour)
CACHE_TTL_DEFAULT = 3600


@dataclass
class CacheEntry:
    """Cache entry for model lists with TTL"""
    models: List[str]
    timestamp: float
    ttl: int


class ModelFetchError(Exception):
    """Exception raised when model fetching fails"""
    pass


class ModelFetcher:
    """
    Handles dynamic model fetching from LLM provider APIs with TTL caching
    
    Features:
    - Dynamic API fetching from provider endpoints
    - TTL-based caching to reduce API calls
    - Fallback mechanisms (cached models -> popular models -> empty list)
    - Provider-specific response format handling
    - Error handling and timeout management
    """
    
    def __init__(self, timeout: int = 30):
        """
        Initialize ModelFetcher
        
        Args:
            timeout: HTTP request timeout in seconds (default: 30)
        """
        self.cache: Dict[str, CacheEntry] = {}
        self.timeout = timeout
    
    async def fetch_models(self, provider: ProviderTemplate) -> List[str]:
        """
        Fetch models for a provider with caching and fallback
        
        Args:
            provider: ProviderTemplate containing provider configuration
            
        Returns:
            List of available model names
            
        Strategy:
        1. For static providers: return popular_models
        2. For manual providers: return empty list
        3. For dynamic providers:
           a. Check valid cache first
           b. Try API fetch
           c. Fallback to expired cache
           d. Fallback to popular_models
           e. Fallback to empty list
        """
        # Handle static providers - return popular models directly
        if provider.model_fetching == "static":
            return provider.popular_models or []
        
        # Handle manual providers - return empty list
        if provider.model_fetching == "manual":
            return []
        
        # Handle dynamic providers
        if provider.model_fetching == "dynamic":
            # 1. Check for valid cached models first
            cached_models = self._get_cached_models(provider.id)
            if cached_models is not None:
                return cached_models
            
            # 2. Try to fetch from API
            try:
                models = await self._fetch_from_api(provider)
                
                # Handle empty API response
                if not models:
                    raise ModelFetchError("API returned empty model list")
                
                # Cache the successful response
                cache_ttl = provider.model_list_cache_ttl or CACHE_TTL_DEFAULT
                self._cache_models(provider.id, models, cache_ttl)
                
                return models
                
            except Exception as e:
                # 3. API failed - try fallback mechanisms
                
                # Fallback 1: Use expired cache if available
                if provider.id in self.cache:
                    expired_models = self.cache[provider.id].models
                    if expired_models:
                        return expired_models
                
                # Fallback 2: Use popular_models if defined
                if provider.popular_models:
                    return provider.popular_models
                
                # Fallback 3: Return empty list
                return []
        
        # Unknown model_fetching mode - return empty list
        return []
    
    async def _fetch_from_api(self, provider: ProviderTemplate) -> List[str]:
        """
        Fetch models from provider API
        
        Args:
            provider: ProviderTemplate with model_endpoint
            
        Returns:
            List of model names from API
            
        Raises:
            ModelFetchError: When API request fails or response is invalid
        """
        if not provider.model_endpoint:
            raise ModelFetchError(f"No model_endpoint defined for provider {provider.id}")
        
        try:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                # Handle relative endpoints (for local providers like Ollama)
                if provider.model_endpoint.startswith("/"):
                    # For local endpoints, we need a base URL
                    # This would typically come from provider config (api_base)
                    # For now, assume localhost:11434 for Ollama
                    if provider.id == "ollama":
                        url = f"http://localhost:11434{provider.model_endpoint}"
                    else:
                        raise ModelFetchError(f"Relative endpoint {provider.model_endpoint} needs base URL")
                else:
                    url = provider.model_endpoint
                
                async with session.get(url) as response:
                    if response.status != 200:
                        raise ModelFetchError(f"API returned status {response.status}")
                    
                    data = await response.json()
                    
                    # Parse response based on provider type
                    return self._parse_api_response(provider, data)
                    
        except asyncio.TimeoutError:
            raise ModelFetchError(f"API request timed out after {self.timeout}s")
        except aiohttp.ClientError as e:
            raise ModelFetchError(f"HTTP client error: {str(e)}")
        except Exception as e:
            raise ModelFetchError(f"Unexpected error fetching models: {str(e)}")
    
    def _parse_api_response(self, provider: ProviderTemplate, data: Dict[str, Any]) -> List[str]:
        """
        Parse API response based on provider format
        
        Args:
            provider: ProviderTemplate to determine parsing strategy
            data: JSON response data
            
        Returns:
            List of model names
            
        Raises:
            ModelFetchError: When response format is invalid
        """
        try:
            # Groq/OpenAI format: {"object": "list", "data": [{"id": "model-name", "object": "model"}, ...]}
            if "data" in data and isinstance(data["data"], list) and data.get("object") == "list":
                models = []
                for item in data["data"]:
                    if isinstance(item, dict) and "id" in item:
                        models.append(item["id"])
                return models
            
            # Ollama format: {"models": [{"name": "model-name", "model": "model-name", ...}, ...]}
            elif "models" in data and isinstance(data["models"], list):
                models = []
                for item in data["models"]:
                    if isinstance(item, dict) and "name" in item:
                        models.append(item["name"])
                return models
            
            # Together AI format: [{"id": "model-name", "object": "model", ...}, ...]
            elif isinstance(data, list):
                models = []
                for item in data:
                    if isinstance(item, dict) and "id" in item:
                        models.append(item["id"])
                return models
            
            # Fireworks AI format (similar to OpenAI): {"data": [{"id": "model-name", ...}], ...}
            elif "data" in data and isinstance(data["data"], list):
                models = []
                for item in data["data"]:
                    if isinstance(item, dict) and "id" in item:
                        models.append(item["id"])
                return models
            
            # Unknown format
            else:
                raise ModelFetchError(f"Unknown API response format for provider {provider.id}. Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                
        except (KeyError, TypeError, AttributeError) as e:
            raise ModelFetchError(f"Failed to parse API response for provider {provider.id}: {str(e)}")
    
    def _get_cached_models(self, provider_id: str) -> Optional[List[str]]:
        """
        Get cached models if cache is valid
        
        Args:
            provider_id: Provider identifier
            
        Returns:
            List of cached models if valid, None otherwise
        """
        if provider_id not in self.cache:
            return None
        
        entry = self.cache[provider_id]
        if self._is_cache_valid(entry):
            return entry.models
        
        return None
    
    def _cache_models(self, provider_id: str, models: List[str], ttl: int):
        """
        Cache models with TTL
        
        Args:
            provider_id: Provider identifier
            models: List of model names to cache
            ttl: Time to live in seconds
            
        Raises:
            ValueError: If TTL is invalid
            TypeError: If TTL is not numeric
        """
        if not isinstance(ttl, int) or ttl <= 0:
            raise ValueError(f"TTL must be a positive integer, got: {ttl}")
        
        entry = CacheEntry(
            models=models.copy(),  # Make a copy to prevent external modification
            timestamp=time.time(),
            ttl=ttl
        )
        
        self.cache[provider_id] = entry
    
    def _is_cache_valid(self, entry: CacheEntry) -> bool:
        """
        Check if cache entry is still valid based on TTL
        
        Args:
            entry: CacheEntry to validate
            
        Returns:
            True if cache is still valid, False if expired
        """
        current_time = time.time()
        return (current_time - entry.timestamp) < entry.ttl
    
    def clear_cache(self, provider_id: Optional[str] = None):
        """
        Clear cache for specific provider or all providers
        
        Args:
            provider_id: Provider to clear cache for, or None for all
        """
        if provider_id is None:
            self.cache.clear()
        else:
            self.cache.pop(provider_id, None)
    
    def get_cache_info(self, provider_id: str) -> Optional[Dict[str, Any]]:
        """
        Get cache information for debugging
        
        Args:
            provider_id: Provider identifier
            
        Returns:
            Cache info dict or None if not cached
        """
        if provider_id not in self.cache:
            return None
        
        entry = self.cache[provider_id]
        age = time.time() - entry.timestamp
        
        return {
            "provider_id": provider_id,
            "model_count": len(entry.models),
            "age_seconds": int(age),
            "ttl_seconds": entry.ttl,
            "is_valid": self._is_cache_valid(entry),
            "expires_in": max(0, entry.ttl - int(age))
        }


# Global instance for shared use
_model_fetcher_instance: Optional[ModelFetcher] = None


def get_model_fetcher() -> ModelFetcher:
    """
    Get global ModelFetcher instance (singleton pattern)
    
    Returns:
        Shared ModelFetcher instance
    """
    global _model_fetcher_instance
    if _model_fetcher_instance is None:
        _model_fetcher_instance = ModelFetcher()
    return _model_fetcher_instance


# Factory functions for common use cases
async def fetch_models_for_provider(provider_id: str, provider_templates: List[ProviderTemplate]) -> List[str]:
    """
    Convenience function to fetch models for a specific provider
    
    Args:
        provider_id: Provider identifier
        provider_templates: List of available provider templates
        
    Returns:
        List of model names
        
    Raises:
        ValueError: If provider not found
    """
    # Find the provider template
    provider = None
    for template in provider_templates:
        if template.id == provider_id:
            provider = template
            break
    
    if provider is None:
        raise ValueError(f"Provider '{provider_id}' not found in available templates")
    
    # Fetch models using global fetcher
    fetcher = get_model_fetcher()
    return await fetcher.fetch_models(provider)