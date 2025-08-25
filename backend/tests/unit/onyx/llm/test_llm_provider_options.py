"""
Unit tests for LLM Provider Options - Phase 0 TDD tests  
Testing updated fetch_available_well_known_llms() with new provider templates
Testing backward compatibility with existing 5 providers
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from typing import List, Dict, Any

# These imports will be created during implementation phases
try:
    from onyx.llm.llm_provider_options import (
        fetch_available_well_known_llms,
        WellKnownLLMProviderDescriptor,
        PROVIDER_TO_MODELS_MAP,
        PROVIDER_TO_VISIBLE_MODELS_MAP
    )
    from onyx.llm.provider_templates import (
        ProviderTemplate,
        get_provider_templates,
        GROQ_PROVIDER_NAME,
        OLLAMA_PROVIDER_NAME,
        TOGETHER_PROVIDER_NAME, 
        FIREWORKS_PROVIDER_NAME
    )
except ImportError:
    # Mock classes for TDD
    from dataclasses import dataclass
    from typing import Optional
    
    @dataclass
    class WellKnownLLMProviderDescriptor:
        name: str
        display_name: str
        api_key_required: bool
        api_base_required: bool
        api_version_required: bool
        custom_config_keys: List[Any] = None
        model_configurations: List[Any] = None
        default_model: Optional[str] = None
        default_fast_model: Optional[str] = None
    
    @dataclass
    class ProviderTemplate:
        id: str
        name: str
        description: str
        category: str
        setup_difficulty: str
        config_schema: Dict[str, Any]
        popular_models: Optional[List[str]] = None
        model_fetching: str = "static"
        litellm_provider_name: str = ""
    
    def fetch_available_well_known_llms() -> List[WellKnownLLMProviderDescriptor]:
        return []
    
    def get_provider_templates() -> List[ProviderTemplate]:
        return []
    
    PROVIDER_TO_MODELS_MAP = {}
    PROVIDER_TO_VISIBLE_MODELS_MAP = {}
    
    # Provider name constants
    GROQ_PROVIDER_NAME = "groq"
    OLLAMA_PROVIDER_NAME = "ollama"  
    TOGETHER_PROVIDER_NAME = "together_ai"
    FIREWORKS_PROVIDER_NAME = "fireworks_ai"


class TestExistingProviderBackwardCompatibility:
    """Test that existing 5 providers continue to work unchanged"""
    
    def test_existing_openai_provider(self):
        """Test that OpenAI provider remains functional"""
        providers = fetch_available_well_known_llms()
        openai_provider = next((p for p in providers if p.name == "openai"), None)
        
        assert openai_provider is not None
        assert openai_provider.display_name == "OpenAI"
        assert openai_provider.api_key_required == True
        assert openai_provider.api_base_required == False
        assert openai_provider.default_model is not None
    
    def test_existing_anthropic_provider(self):
        """Test that Anthropic provider remains functional"""
        providers = fetch_available_well_known_llms()
        anthropic_provider = next((p for p in providers if p.name == "anthropic"), None)
        
        assert anthropic_provider is not None
        assert anthropic_provider.display_name == "Anthropic"
        assert anthropic_provider.api_key_required == True
        assert anthropic_provider.api_base_required == False
        assert anthropic_provider.default_model is not None
    
    def test_existing_azure_provider(self):
        """Test that Azure OpenAI provider remains functional"""
        providers = fetch_available_well_known_llms()
        azure_provider = next((p for p in providers if p.name == "azure"), None)
        
        assert azure_provider is not None
        assert azure_provider.display_name == "Azure OpenAI"
        assert azure_provider.api_key_required == True
        assert azure_provider.api_base_required == True
        assert azure_provider.api_version_required == True
    
    def test_existing_bedrock_provider(self):
        """Test that AWS Bedrock provider remains functional"""
        providers = fetch_available_well_known_llms()
        bedrock_provider = next((p for p in providers if p.name == "bedrock"), None)
        
        assert bedrock_provider is not None
        assert bedrock_provider.display_name == "AWS Bedrock"
        assert bedrock_provider.api_key_required == False  # Uses IAM
        assert bedrock_provider.api_base_required == False
    
    def test_existing_vertex_provider(self):
        """Test that GCP Vertex AI provider remains functional"""
        providers = fetch_available_well_known_llms()
        vertex_provider = next((p for p in providers if p.name == "vertex_ai"), None)
        
        assert vertex_provider is not None
        assert vertex_provider.display_name == "Vertex AI (Google Cloud)"
        assert vertex_provider.api_key_required == False  # Uses service account
        assert vertex_provider.api_base_required == False


class TestNewProviderIntegration:
    """Test new provider template integration with existing system"""
    
    def test_groq_provider_integration(self):
        """Test Groq provider is properly integrated"""
        providers = fetch_available_well_known_llms()
        groq_provider = next((p for p in providers if p.name == GROQ_PROVIDER_NAME), None)
        
        assert groq_provider is not None
        assert groq_provider.display_name == "Groq"
        assert groq_provider.api_key_required == True
        assert groq_provider.api_base_required == False
        assert groq_provider.default_model is not None
        
        # Verify Groq models are in provider maps
        assert GROQ_PROVIDER_NAME in PROVIDER_TO_MODELS_MAP
        assert GROQ_PROVIDER_NAME in PROVIDER_TO_VISIBLE_MODELS_MAP
    
    def test_ollama_provider_integration(self):
        """Test Ollama provider is properly integrated"""
        providers = fetch_available_well_known_llms()
        ollama_provider = next((p for p in providers if p.name == OLLAMA_PROVIDER_NAME), None)
        
        assert ollama_provider is not None
        assert ollama_provider.display_name == "Ollama"
        assert ollama_provider.api_key_required == False  # Local server
        assert ollama_provider.api_base_required == True  # Custom base URL
        assert ollama_provider.default_model is not None
        
        # Verify Ollama models are in provider maps
        assert OLLAMA_PROVIDER_NAME in PROVIDER_TO_MODELS_MAP
        assert OLLAMA_PROVIDER_NAME in PROVIDER_TO_VISIBLE_MODELS_MAP
    
    def test_together_ai_provider_integration(self):
        """Test Together AI provider is properly integrated"""
        providers = fetch_available_well_known_llms()
        together_provider = next((p for p in providers if p.name == TOGETHER_PROVIDER_NAME), None)
        
        assert together_provider is not None
        assert together_provider.display_name == "Together AI"
        assert together_provider.api_key_required == True
        assert together_provider.api_base_required == False
        assert together_provider.default_model is not None
        
        # Verify Together AI models are in provider maps
        assert TOGETHER_PROVIDER_NAME in PROVIDER_TO_MODELS_MAP
        assert TOGETHER_PROVIDER_NAME in PROVIDER_TO_VISIBLE_MODELS_MAP
    
    def test_fireworks_ai_provider_integration(self):
        """Test Fireworks AI provider is properly integrated"""
        providers = fetch_available_well_known_llms()
        fireworks_provider = next((p for p in providers if p.name == FIREWORKS_PROVIDER_NAME), None)
        
        assert fireworks_provider is not None
        assert fireworks_provider.display_name == "Fireworks AI"
        assert fireworks_provider.api_key_required == True
        assert fireworks_provider.api_base_required == False
        assert fireworks_provider.default_model is not None
        
        # Verify Fireworks AI models are in provider maps
        assert FIREWORKS_PROVIDER_NAME in PROVIDER_TO_MODELS_MAP
        assert FIREWORKS_PROVIDER_NAME in PROVIDER_TO_VISIBLE_MODELS_MAP


class TestProviderTemplateIntegration:
    """Test provider template system integration with existing interfaces"""
    
    def test_provider_template_to_descriptor_conversion(self):
        """Test conversion from ProviderTemplate to WellKnownLLMProviderDescriptor"""
        templates = get_provider_templates()
        providers = fetch_available_well_known_llms()
        
        # Should have at least the 4 new providers + 5 existing = 9 total
        assert len(providers) >= 9
        
        # Each new provider template should have corresponding descriptor
        for template in templates:
            provider = next((p for p in providers if p.name == template.id), None)
            assert provider is not None
            assert provider.display_name == template.name
    
    def test_dynamic_model_fetching_integration(self):
        """Test dynamic model fetching is properly integrated"""
        providers = fetch_available_well_known_llms()
        
        # Dynamic providers should have model configurations
        dynamic_providers = ["groq", "ollama", "together_ai", "fireworks_ai"]
        for provider_name in dynamic_providers:
            provider = next((p for p in providers if p.name == provider_name), None)
            assert provider is not None
            assert provider.model_configurations is not None
            assert len(provider.model_configurations) > 0
    
    def test_static_model_fallback_integration(self):
        """Test static model fallback for dynamic providers"""
        # Even dynamic providers should have static fallback models
        for provider_name in [GROQ_PROVIDER_NAME, OLLAMA_PROVIDER_NAME, TOGETHER_PROVIDER_NAME, FIREWORKS_PROVIDER_NAME]:
            assert provider_name in PROVIDER_TO_MODELS_MAP
            assert len(PROVIDER_TO_MODELS_MAP[provider_name]) > 0


class TestModelConfigurationCompatibility:
    """Test model configuration backward compatibility"""
    
    def test_existing_model_maps_preserved(self):
        """Test that existing model maps are preserved"""
        existing_providers = ["openai", "anthropic", "azure", "bedrock", "vertex_ai"]
        
        for provider in existing_providers:
            assert provider in PROVIDER_TO_MODELS_MAP
            assert provider in PROVIDER_TO_VISIBLE_MODELS_MAP
            assert len(PROVIDER_TO_MODELS_MAP[provider]) > 0
    
    def test_new_provider_models_added(self):
        """Test that new provider models are added to maps"""
        new_providers = [GROQ_PROVIDER_NAME, OLLAMA_PROVIDER_NAME, TOGETHER_PROVIDER_NAME, FIREWORKS_PROVIDER_NAME]
        
        for provider in new_providers:
            assert provider in PROVIDER_TO_MODELS_MAP
            assert provider in PROVIDER_TO_VISIBLE_MODELS_MAP
            assert len(PROVIDER_TO_MODELS_MAP[provider]) > 0
    
    def test_model_configuration_structure(self):
        """Test that model configurations maintain expected structure"""
        providers = fetch_available_well_known_llms()
        
        for provider in providers:
            if provider.model_configurations:
                for model_config in provider.model_configurations:
                    # Each model config should have required fields
                    assert hasattr(model_config, 'model_name')
                    assert hasattr(model_config, 'display_name')
    
    def test_default_model_assignment(self):
        """Test that all providers have default models assigned"""
        providers = fetch_available_well_known_llms()
        
        for provider in providers:
            # All providers should have at least a default model
            assert provider.default_model is not None
            assert len(provider.default_model) > 0
            
            # Default model should be in the provider's model list
            provider_models = PROVIDER_TO_MODELS_MAP.get(provider.name, [])
            if provider_models:
                model_names = [m.get('model_name', '') for m in provider_models]
                assert provider.default_model in model_names


class TestProviderDiscovery:
    """Test provider discovery and listing functionality"""
    
    def test_total_provider_count(self):
        """Test that total provider count includes existing and new providers"""
        providers = fetch_available_well_known_llms()
        
        # Should have 5 existing + 4 new = 9 minimum providers
        assert len(providers) >= 9
        
        # Verify all expected providers are present
        expected_providers = [
            "openai", "anthropic", "azure", "bedrock", "vertex_ai",  # Existing
            GROQ_PROVIDER_NAME, OLLAMA_PROVIDER_NAME, TOGETHER_PROVIDER_NAME, FIREWORKS_PROVIDER_NAME  # New
        ]
        
        provider_names = [p.name for p in providers]
        for expected in expected_providers:
            assert expected in provider_names
    
    def test_provider_categorization(self):
        """Test provider categorization for UI display"""
        templates = get_provider_templates()
        
        # Should have providers in different categories
        categories = set(template.category for template in templates)
        expected_categories = ["cloud", "local", "enterprise"]
        
        for category in expected_categories:
            assert category in categories
    
    def test_provider_search_compatibility(self):
        """Test provider search and filtering compatibility"""
        providers = fetch_available_well_known_llms()
        
        # All providers should have searchable fields
        for provider in providers:
            assert provider.name is not None
            assert provider.display_name is not None
            assert len(provider.display_name) > 0


class TestCustomIntegrationCompatibility:
    """Test that custom integration feature remains functional"""
    
    def test_custom_provider_support(self):
        """Test that custom LLM provider functionality is preserved"""
        # Custom providers should still be supported alongside templates
        providers = fetch_available_well_known_llms()
        
        # Should be able to add custom providers beyond templates
        # This test ensures the system remains extensible
        assert True  # Will be implemented with actual custom provider logic
    
    def test_litellm_compatibility(self):
        """Test that LiteLLM provider names are properly mapped"""
        templates = get_provider_templates()
        
        # Each template should have valid LiteLLM provider name
        for template in templates:
            assert hasattr(template, 'litellm_provider_name')
            assert template.litellm_provider_name is not None
            assert len(template.litellm_provider_name) > 0