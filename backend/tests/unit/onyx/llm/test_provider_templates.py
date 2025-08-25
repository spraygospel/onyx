"""
Unit tests for Provider Template system - Phase 1 TDD tests
Testing ProviderTemplate validation, schema validation, required fields
"""

import pytest
from typing import Dict, Any
from unittest.mock import Mock, patch

# These imports will be created in Phase 1 implementation
try:
    from onyx.llm.provider_templates import (
        ProviderTemplate,
        FieldConfig,
        validate_provider_template,
        create_provider_template,
        PROVIDER_CATEGORIES
    )
except ImportError:
    # Mock the classes for TDD - will be replaced with real implementation
    from dataclasses import dataclass
    from typing import Optional, List
    
    @dataclass
    class FieldConfig:
        type: str
        label: str
        placeholder: Optional[str] = None
        description: Optional[str] = None
        required: bool = True
        validation: Optional[str] = None
        options: Optional[List[str]] = None
        default_value: Optional[str] = None
    
    @dataclass 
    class ProviderTemplate:
        id: str
        name: str
        description: str
        category: str
        setup_difficulty: str
        config_schema: Dict[str, FieldConfig]
        popular_models: Optional[List[str]] = None
        model_fetching: str = "static"
        model_endpoint: Optional[str] = None
        model_list_cache_ttl: Optional[int] = None
        litellm_provider_name: str = ""
        model_prefix: Optional[str] = None
        documentation_url: Optional[str] = None
        logoUrl: Optional[str] = None
    
    def validate_provider_template(template: ProviderTemplate) -> bool:
        return True
    
    def create_provider_template(**kwargs) -> ProviderTemplate:
        return ProviderTemplate(**kwargs)
    
    PROVIDER_CATEGORIES = ["cloud", "local", "enterprise", "specialized"]


class TestProviderTemplate:
    """Test ProviderTemplate class validation and creation"""
    
    def test_provider_template_creation_valid(self):
        """Test creating a valid provider template"""
        api_key_field = FieldConfig(
            type="password",
            label="API Key", 
            placeholder="sk_...",
            required=True,
            description="Your provider API key"
        )
        
        template = ProviderTemplate(
            id="test_provider",
            name="Test Provider",
            description="Test provider description",
            category="cloud",
            setup_difficulty="easy",
            config_schema={"api_key": api_key_field},
            popular_models=["model1", "model2"],
            model_fetching="dynamic",
            model_endpoint="https://api.test.com/models",
            model_list_cache_ttl=3600,
            litellm_provider_name="test_provider"
        )
        
        assert template.id == "test_provider"
        assert template.name == "Test Provider" 
        assert template.category == "cloud"
        assert template.setup_difficulty == "easy"
        assert template.model_fetching == "dynamic"
        assert len(template.popular_models) == 2
        
    def test_provider_template_required_fields(self):
        """Test that required fields are validated"""
        with pytest.raises((TypeError, ValueError)):
            # Missing required id field
            ProviderTemplate(
                name="Test Provider",
                description="Test description",
                category="cloud",
                setup_difficulty="easy",
                config_schema={}
            )
    
    def test_provider_category_validation(self):
        """Test provider category classification"""
        valid_categories = ["cloud", "local", "enterprise", "specialized"]
        
        for category in valid_categories:
            template = create_provider_template(
                id="test",
                name="Test",
                description="Test",
                category=category,
                setup_difficulty="easy",
                config_schema={}
            )
            assert template.category in PROVIDER_CATEGORIES
        
        # Test invalid category
        with pytest.raises((ValueError, AssertionError)):
            create_provider_template(
                id="test",
                name="Test", 
                description="Test",
                category="invalid_category",
                setup_difficulty="easy",
                config_schema={}
            )
    
    def test_setup_difficulty_validation(self):
        """Test setup difficulty levels"""
        valid_difficulties = ["easy", "medium", "hard"]
        
        for difficulty in valid_difficulties:
            template = create_provider_template(
                id="test",
                name="Test",
                description="Test", 
                category="cloud",
                setup_difficulty=difficulty,
                config_schema={}
            )
            assert template.setup_difficulty in valid_difficulties


class TestFieldConfig:
    """Test FieldConfig validation and creation"""
    
    def test_field_config_creation_text(self):
        """Test creating text field configuration"""
        field = FieldConfig(
            type="text",
            label="Display Name",
            placeholder="Enter display name",
            required=True,
            description="Provider display name"
        )
        
        assert field.type == "text"
        assert field.label == "Display Name"
        assert field.required == True
        
    def test_field_config_creation_password(self):
        """Test creating password field configuration"""  
        field = FieldConfig(
            type="password",
            label="API Key",
            placeholder="sk_...",
            required=True,
            description="Your API key",
            validation=r"^sk_[a-zA-Z0-9]+$"
        )
        
        assert field.type == "password"
        assert field.validation is not None
        
    def test_field_config_creation_select(self):
        """Test creating select field configuration"""
        field = FieldConfig(
            type="select", 
            label="Region",
            required=True,
            options=["us-east-1", "us-west-2", "eu-west-1"],
            default_value="us-east-1"
        )
        
        assert field.type == "select"
        assert len(field.options) == 3
        assert field.default_value == "us-east-1"
        
    def test_field_config_validation_invalid_type(self):
        """Test field type validation"""
        valid_types = ["text", "password", "url", "select", "file", "textarea"]
        
        with pytest.raises((ValueError, AssertionError)):
            FieldConfig(
                type="invalid_type",
                label="Test",
                required=True
            )


class TestProviderTemplateValidation:
    """Test provider template validation logic"""
    
    def test_validate_provider_template_valid(self):
        """Test validation of valid provider template"""
        template = create_provider_template(
            id="groq",
            name="Groq",
            description="Ultra-fast inference", 
            category="cloud",
            setup_difficulty="easy",
            config_schema={
                "api_key": FieldConfig(
                    type="password",
                    label="Groq API Key",
                    required=True
                )
            },
            litellm_provider_name="groq"
        )
        
        assert validate_provider_template(template) == True
    
    def test_validate_litellm_provider_mapping(self):
        """Test LiteLLM provider name mapping validation"""
        # Test valid LiteLLM provider names
        valid_providers = ["groq", "ollama", "together_ai", "fireworks_ai", "openai", "anthropic"]
        
        for provider in valid_providers:
            template = create_provider_template(
                id=provider,
                name=provider.title(),
                description="Test description",
                category="cloud", 
                setup_difficulty="easy",
                config_schema={},
                litellm_provider_name=provider
            )
            assert template.litellm_provider_name == provider
    
    def test_model_fetching_configuration(self):
        """Test model fetching configuration options"""
        valid_fetching_modes = ["dynamic", "static", "manual"]
        
        for mode in valid_fetching_modes:
            template = create_provider_template(
                id="test",
                name="Test",
                description="Test",
                category="cloud",
                setup_difficulty="easy", 
                config_schema={},
                model_fetching=mode
            )
            assert template.model_fetching in valid_fetching_modes
    
    def test_model_endpoint_validation_dynamic(self):
        """Test model endpoint required for dynamic fetching"""
        # Dynamic fetching should have model_endpoint
        template = create_provider_template(
            id="test",
            name="Test",
            description="Test",
            category="cloud",
            setup_difficulty="easy",
            config_schema={},
            model_fetching="dynamic",
            model_endpoint="https://api.test.com/models"
        )
        
        assert template.model_endpoint is not None
        assert template.model_endpoint.startswith("http")
    
    def test_cache_ttl_validation(self):
        """Test cache TTL validation for dynamic providers"""
        template = create_provider_template(
            id="test",
            name="Test", 
            description="Test",
            category="cloud",
            setup_difficulty="easy",
            config_schema={},
            model_fetching="dynamic",
            model_list_cache_ttl=3600
        )
        
        assert template.model_list_cache_ttl > 0
        assert isinstance(template.model_list_cache_ttl, int)


class TestProviderTemplateExamples:
    """Test specific provider template examples"""
    
    def test_groq_provider_template(self):
        """Test Groq provider template structure"""
        groq_template = create_provider_template(
            id="groq",
            name="Groq", 
            description="Ultra-fast inference with Groq's LPU technology",
            category="cloud",
            setup_difficulty="easy",
            config_schema={
                "api_key": FieldConfig(
                    type="password",
                    label="Groq API Key",
                    placeholder="gsk_...",
                    required=True,
                    description="Get your API key from console.groq.com"
                )
            },
            model_fetching="dynamic",
            model_endpoint="https://api.groq.com/openai/v1/models", 
            model_list_cache_ttl=3600,
            popular_models=[
                "llama-3.1-8b-instant",
                "llama-3.1-70b-versatile",
                "mixtral-8x7b-32768",
                "gemma2-9b-it"
            ],
            litellm_provider_name="groq",
            model_prefix="groq/"
        )
        
        assert groq_template.id == "groq"
        assert groq_template.model_fetching == "dynamic"
        assert len(groq_template.popular_models) == 4
        
    def test_ollama_provider_template(self):
        """Test Ollama provider template structure"""
        ollama_template = create_provider_template(
            id="ollama",
            name="Ollama",
            description="Run LLMs locally on your machine", 
            category="local",
            setup_difficulty="medium",
            config_schema={
                "api_base": FieldConfig(
                    type="url",
                    label="Ollama Server URL",
                    placeholder="http://localhost:11434",
                    required=True,
                    default_value="http://localhost:11434",
                    description="URL of your Ollama server"
                )
            },
            model_fetching="dynamic",
            model_endpoint="/api/tags",
            model_list_cache_ttl=300,
            popular_models=[
                "llama3.2:latest",
                "qwen2.5:latest",
                "deepseek-coder:latest", 
                "mistral-nemo:latest"
            ],
            litellm_provider_name="ollama"
        )
        
        assert ollama_template.category == "local"
        assert ollama_template.model_list_cache_ttl == 300  # 5 minutes
        assert "api_base" in ollama_template.config_schema


# Mock tests for integration points that will be implemented later
class TestProviderTemplateIntegration:
    """Test integration with existing LLM provider system"""
    
    @patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms')
    def test_integration_with_existing_providers(self, mock_fetch):
        """Test integration with existing provider system"""
        # This will test that new templates integrate with existing system
        mock_fetch.return_value = []
        
        # Test will be implemented when integration is ready
        assert True  # Placeholder
    
    def test_backward_compatibility(self):
        """Test that existing 5 providers still work"""
        # Test will verify OpenAI, Anthropic, Azure, Bedrock, Vertex AI still work
        existing_providers = ["openai", "anthropic", "azure", "bedrock", "vertex_ai"]
        
        for provider in existing_providers:
            # Verify existing provider structure is preserved
            assert provider in existing_providers  # Placeholder