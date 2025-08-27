"""
Test cases for Model Add functionality - TDD Implementation
Tests for individual model connection testing endpoint
Following development plan in dev_plan/1.3_addLLM.md
"""

import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from onyx.main import app
from onyx.server.manage.llm.models import TestModelConnectionRequest


client = TestClient(app)


class TestModelConnectionEndpoint:
    """Test the /admin/llm/test-model-connection endpoint"""
    
    def test_test_model_connection_success(self):
        """Test successful model connection test"""
        request_data = {
            "provider_id": "groq",
            "model_name": "llama-3.3-70b-versatile",
            "configuration": {
                "api_key": "test-api-key"
            }
        }
        
        with patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms_with_templates') as mock_fetch:
            with patch('onyx.llm.factory.get_llm') as mock_get_llm:
                with patch('onyx.llm.utils.test_llm') as mock_test_llm:
                    with patch('onyx.llm.utils.model_supports_image_input') as mock_image_support:
                        # Mock provider descriptor
                        mock_provider = Mock()
                        mock_provider.name = "groq"
                        mock_provider.litellm_provider_name = "groq"
                        mock_fetch.return_value = [mock_provider]
                        
                        # Mock LLM creation and testing
                        mock_llm = Mock()
                        mock_get_llm.return_value = mock_llm
                        mock_test_llm.return_value = None  # Success
                        mock_image_support.return_value = False
                        
                        response = client.post("/admin/llm/test-model-connection", json=request_data)
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "llama-3.3-70b-versatile" in result["message"]
        assert result["model_info"]["model_name"] == "llama-3.3-70b-versatile"
        assert result["model_info"]["provider"] == "groq"
        assert "supports_image_input" in result["model_info"]
    
    def test_test_model_connection_provider_not_found(self):
        """Test error when provider is not found"""
        request_data = {
            "provider_id": "nonexistent",
            "model_name": "test-model",
            "configuration": {}
        }
        
        with patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms_with_templates') as mock_fetch:
            mock_fetch.return_value = []  # No providers
            
            response = client.post("/admin/llm/test-model-connection", json=request_data)
        
        assert response.status_code == 404
        result = response.json()
        assert "nonexistent" in result["detail"]
    
    def test_test_model_connection_llm_failure(self):
        """Test model connection failure"""
        request_data = {
            "provider_id": "groq",
            "model_name": "invalid-model",
            "configuration": {
                "api_key": "invalid-key"
            }
        }
        
        with patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms_with_templates') as mock_fetch:
            with patch('onyx.llm.factory.get_llm') as mock_get_llm:
                with patch('onyx.llm.utils.test_llm') as mock_test_llm:
                    with patch('onyx.llm.utils.litellm_exception_to_error_msg') as mock_error_msg:
                        # Mock provider descriptor
                        mock_provider = Mock()
                        mock_provider.name = "groq"
                        mock_provider.litellm_provider_name = "groq"
                        mock_fetch.return_value = [mock_provider]
                        
                        # Mock LLM creation
                        mock_llm = Mock()
                        mock_get_llm.return_value = mock_llm
                        
                        # Mock test failure
                        test_error = Exception("Invalid API key")
                        mock_test_llm.side_effect = test_error
                        mock_error_msg.return_value = "Invalid API key"
                        
                        response = client.post("/admin/llm/test-model-connection", json=request_data)
        
        assert response.status_code == 200  # Endpoint returns 200 but with success: false
        result = response.json()
        assert result["success"] is False
        assert "Invalid API key" in result["error"]
    
    def test_test_model_connection_custom_config(self):
        """Test model connection with custom configuration"""
        request_data = {
            "provider_id": "ollama",
            "model_name": "llama2:7b",
            "configuration": {
                "api_base": "http://localhost:11434",
                "custom_param": "custom_value"
            }
        }
        
        with patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms_with_templates') as mock_fetch:
            with patch('onyx.llm.factory.get_llm') as mock_get_llm:
                with patch('onyx.llm.utils.test_llm') as mock_test_llm:
                    with patch('onyx.llm.utils.model_supports_image_input') as mock_image_support:
                        # Mock provider descriptor
                        mock_provider = Mock()
                        mock_provider.name = "ollama"
                        mock_provider.litellm_provider_name = "ollama"
                        mock_fetch.return_value = [mock_provider]
                        
                        # Mock LLM creation and testing
                        mock_llm = Mock()
                        mock_get_llm.return_value = mock_llm
                        mock_test_llm.return_value = None  # Success
                        mock_image_support.return_value = False
                        
                        response = client.post("/admin/llm/test-model-connection", json=request_data)
                        
                        # Verify get_llm was called with correct parameters
                        mock_get_llm.assert_called_once_with(
                            provider="ollama",
                            model="llama2:7b",
                            api_key=None,
                            api_base="http://localhost:11434",
                            api_version=None,
                            custom_config={"custom_param": "custom_value"},
                            deployment_name=None,
                            max_input_tokens=-1
                        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
    
    def test_test_model_connection_with_deployment(self):
        """Test model connection with deployment name (Azure scenario)"""
        request_data = {
            "provider_id": "azure",
            "model_name": "gpt-4",
            "configuration": {
                "api_key": "azure-api-key",
                "api_base": "https://example.openai.azure.com/",
                "api_version": "2024-02-15-preview",
                "deployment_name": "gpt-4-deployment"
            }
        }
        
        with patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms_with_templates') as mock_fetch:
            with patch('onyx.llm.factory.get_llm') as mock_get_llm:
                with patch('onyx.llm.utils.test_llm') as mock_test_llm:
                    with patch('onyx.llm.utils.model_supports_image_input') as mock_image_support:
                        # Mock provider descriptor
                        mock_provider = Mock()
                        mock_provider.name = "azure"
                        mock_provider.litellm_provider_name = "azure"
                        mock_fetch.return_value = [mock_provider]
                        
                        # Mock LLM creation and testing
                        mock_llm = Mock()
                        mock_get_llm.return_value = mock_llm
                        mock_test_llm.return_value = None  # Success
                        mock_image_support.return_value = True  # GPT-4 supports images
                        
                        response = client.post("/admin/llm/test-model-connection", json=request_data)
                        
                        # Verify get_llm was called with correct parameters including deployment
                        mock_get_llm.assert_called_once_with(
                            provider="azure",
                            model="gpt-4",
                            api_key="azure-api-key",
                            api_base="https://example.openai.azure.com/",
                            api_version="2024-02-15-preview",
                            custom_config={},
                            deployment_name="gpt-4-deployment",
                            max_input_tokens=-1
                        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["model_info"]["supports_image_input"] is True
    
    def test_request_model_validation(self):
        """Test request model validation"""
        # Test missing required fields
        incomplete_data = {
            "provider_id": "groq",
            # Missing model_name and configuration
        }
        
        response = client.post("/admin/llm/test-model-connection", json=incomplete_data)
        assert response.status_code == 422  # Validation error
        
        # Test empty model name
        invalid_data = {
            "provider_id": "groq",
            "model_name": "",
            "configuration": {}
        }
        
        response = client.post("/admin/llm/test-model-connection", json=invalid_data)
        assert response.status_code == 422  # Validation error
    
    def test_configuration_parameter_extraction(self):
        """Test that configuration parameters are properly extracted"""
        request_data = {
            "provider_id": "openai",
            "model_name": "gpt-4",
            "configuration": {
                "api_key": "sk-test123",
                "api_base": "https://api.openai.com/v1",
                "api_version": "2024-02-15-preview",
                "deployment_name": "my-deployment",
                "custom_param1": "value1",
                "custom_param2": "value2"
            }
        }
        
        with patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms_with_templates') as mock_fetch:
            with patch('onyx.llm.factory.get_llm') as mock_get_llm:
                with patch('onyx.llm.utils.test_llm') as mock_test_llm:
                    with patch('onyx.llm.utils.model_supports_image_input') as mock_image_support:
                        # Mock provider descriptor
                        mock_provider = Mock()
                        mock_provider.name = "openai"
                        mock_provider.litellm_provider_name = "openai"
                        mock_fetch.return_value = [mock_provider]
                        
                        # Mock LLM creation and testing
                        mock_llm = Mock()
                        mock_get_llm.return_value = mock_llm
                        mock_test_llm.return_value = None
                        mock_image_support.return_value = True
                        
                        response = client.post("/admin/llm/test-model-connection", json=request_data)
                        
                        # Verify parameter extraction
                        mock_get_llm.assert_called_once_with(
                            provider="openai",
                            model="gpt-4",
                            api_key="sk-test123",
                            api_base="https://api.openai.com/v1",
                            api_version="2024-02-15-preview",
                            custom_config={
                                "custom_param1": "value1",
                                "custom_param2": "value2"
                            },
                            deployment_name="my-deployment",
                            max_input_tokens=-1
                        )
        
        assert response.status_code == 200


class TestModelAddBackendIntegration:
    """Integration tests for Model Add backend functionality"""
    
    def test_model_add_workflow_groq(self):
        """Test complete Model Add workflow with Groq provider"""
        # Simulate the workflow: configure provider → test model → add model
        
        # Step 1: Test individual model
        test_request = {
            "provider_id": "groq",
            "model_name": "llama-3.3-70b-versatile",
            "configuration": {
                "api_key": "gsk_test123"
            }
        }
        
        with patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms_with_templates') as mock_fetch:
            with patch('onyx.llm.factory.get_llm') as mock_get_llm:
                with patch('onyx.llm.utils.test_llm') as mock_test_llm:
                    with patch('onyx.llm.utils.model_supports_image_input') as mock_image_support:
                        # Mock provider descriptor
                        mock_provider = Mock()
                        mock_provider.name = "groq"
                        mock_provider.litellm_provider_name = "groq"
                        mock_fetch.return_value = [mock_provider]
                        
                        # Mock successful model test
                        mock_llm = Mock()
                        mock_get_llm.return_value = mock_llm
                        mock_test_llm.return_value = None
                        mock_image_support.return_value = False
                        
                        # Test the model
                        response = client.post("/admin/llm/test-model-connection", json=test_request)
        
        # Verify successful test
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["model_info"]["model_name"] == "llama-3.3-70b-versatile"
        
        # Step 2: At this point, frontend would add the model to selectedModels
        # This simulates the successful Model Add workflow
        
    def test_model_add_workflow_multiple_models(self):
        """Test adding multiple models sequentially"""
        models_to_test = [
            "llama-3.3-70b-versatile",
            "mixtral-8x7b-32768",
            "gemma-7b-it"
        ]
        
        base_config = {
            "api_key": "gsk_test123"
        }
        
        successful_models = []
        
        for model_name in models_to_test:
            test_request = {
                "provider_id": "groq",
                "model_name": model_name,
                "configuration": base_config
            }
            
            with patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms_with_templates') as mock_fetch:
                with patch('onyx.llm.factory.get_llm') as mock_get_llm:
                    with patch('onyx.llm.utils.test_llm') as mock_test_llm:
                        with patch('onyx.llm.utils.model_supports_image_input') as mock_image_support:
                            # Mock provider descriptor
                            mock_provider = Mock()
                            mock_provider.name = "groq"
                            mock_provider.litellm_provider_name = "groq"
                            mock_fetch.return_value = [mock_provider]
                            
                            # Mock successful model test
                            mock_llm = Mock()
                            mock_get_llm.return_value = mock_llm
                            mock_test_llm.return_value = None
                            mock_image_support.return_value = False
                            
                            response = client.post("/admin/llm/test-model-connection", json=test_request)
            
            # Verify each model test
            assert response.status_code == 200
            result = response.json()
            if result["success"]:
                successful_models.append(model_name)
        
        # All models should be successfully tested
        assert len(successful_models) == 3
        assert set(successful_models) == set(models_to_test)
    
    def test_error_handling_consistency(self):
        """Test that error handling is consistent with existing patterns"""
        # Test with invalid provider (should return 404)
        request_data = {
            "provider_id": "invalid_provider",
            "model_name": "test-model",
            "configuration": {}
        }
        
        with patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms_with_templates') as mock_fetch:
            mock_fetch.return_value = []
            
            response = client.post("/admin/llm/test-model-connection", json=request_data)
        
        assert response.status_code == 404
        
        # Test with LLM error (should return 200 with success: false)
        valid_request = {
            "provider_id": "groq",
            "model_name": "invalid-model",
            "configuration": {"api_key": "invalid"}
        }
        
        with patch('onyx.llm.llm_provider_options.fetch_available_well_known_llms_with_templates') as mock_fetch:
            with patch('onyx.llm.factory.get_llm') as mock_get_llm:
                with patch('onyx.llm.utils.test_llm') as mock_test_llm:
                    with patch('onyx.llm.utils.litellm_exception_to_error_msg') as mock_error_msg:
                        mock_provider = Mock()
                        mock_provider.name = "groq"
                        mock_provider.litellm_provider_name = "groq"
                        mock_fetch.return_value = [mock_provider]
                        
                        mock_llm = Mock()
                        mock_get_llm.return_value = mock_llm
                        mock_test_llm.side_effect = Exception("Model not found")
                        mock_error_msg.return_value = "Model not found"
                        
                        response = client.post("/admin/llm/test-model-connection", json=valid_request)
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is False
        assert "Model not found" in result["error"]