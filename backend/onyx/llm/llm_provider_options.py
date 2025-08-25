from enum import Enum

import litellm  # type: ignore
from pydantic import BaseModel

from onyx.llm.chat_llm import VERTEX_CREDENTIALS_FILE_KWARG
from onyx.llm.chat_llm import VERTEX_LOCATION_KWARG
from onyx.llm.utils import model_supports_image_input
from onyx.server.manage.llm.models import ModelConfigurationView


class CustomConfigKeyType(Enum):
    # used for configuration values that require manual input
    # i.e., textual API keys (e.g., "abcd1234")
    TEXT_INPUT = "text_input"

    # used for configuration values that require a file to be selected/drag-and-dropped
    # i.e., file based credentials (e.g., "/path/to/credentials/file.json")
    FILE_INPUT = "file_input"


class CustomConfigKey(BaseModel):
    name: str
    display_name: str
    description: str | None = None
    is_required: bool = True
    is_secret: bool = False
    key_type: CustomConfigKeyType = CustomConfigKeyType.TEXT_INPUT
    default_value: str | None = None


class WellKnownLLMProviderDescriptor(BaseModel):
    name: str
    display_name: str
    api_key_required: bool
    api_base_required: bool
    api_version_required: bool
    custom_config_keys: list[CustomConfigKey] | None = None
    model_configurations: list[ModelConfigurationView]
    default_model: str | None = None
    default_fast_model: str | None = None
    # set for providers like Azure, which require a deployment name.
    deployment_name_required: bool = False
    # set for providers like Azure, which support a single model per deployment.
    single_model_supported: bool = False
    # Added for new provider templates that need dynamic model fetching
    model_endpoint: str | None = None
    litellm_provider_name: str | None = None


OPENAI_PROVIDER_NAME = "openai"
OPEN_AI_MODEL_NAMES = [
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "o4-mini",
    "o3-mini",
    "o1-mini",
    "o3",
    "o1",
    "gpt-4",
    "gpt-4.1",
    "gpt-4o",
    "gpt-4o-mini",
    "o1-preview",
    "gpt-4-turbo",
    "gpt-4-turbo-preview",
    "gpt-4-1106-preview",
    "gpt-4-vision-preview",
    "gpt-4-0613",
    "gpt-4o-2024-08-06",
    "gpt-4-0314",
    "gpt-4-32k-0314",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-1106",
    "gpt-3.5-turbo-16k",
    "gpt-3.5-turbo-0613",
    "gpt-3.5-turbo-16k-0613",
    "gpt-3.5-turbo-0301",
]
OPEN_AI_VISIBLE_MODEL_NAMES = [
    "gpt-5",
    "gpt-5-mini",
    "o1",
    "o3-mini",
    "gpt-4o",
    "gpt-4o-mini",
]

BEDROCK_PROVIDER_NAME = "bedrock"
# need to remove all the weird "bedrock/eu-central-1/anthropic.claude-v1" named
# models
BEDROCK_MODEL_NAMES = [
    model
    # bedrock_converse_models are just extensions of the bedrock_models, not sure why
    # litellm has split them into two lists :(
    for model in litellm.bedrock_models + litellm.bedrock_converse_models
    if "/" not in model and "embed" not in model
][::-1]
BEDROCK_DEFAULT_MODEL = "anthropic.claude-3-5-sonnet-20241022-v2:0"

IGNORABLE_ANTHROPIC_MODELS = [
    "claude-2",
    "claude-instant-1",
    "anthropic/claude-3-5-sonnet-20241022",
]
ANTHROPIC_PROVIDER_NAME = "anthropic"
ANTHROPIC_MODEL_NAMES = [
    model
    for model in litellm.anthropic_models
    if model not in IGNORABLE_ANTHROPIC_MODELS
][::-1]
ANTHROPIC_VISIBLE_MODEL_NAMES = [
    "claude-3-5-sonnet-20241022",
    "claude-3-7-sonnet-20250219",
]

AZURE_PROVIDER_NAME = "azure"


VERTEXAI_PROVIDER_NAME = "vertex_ai"
VERTEXAI_DEFAULT_MODEL = "gemini-2.0-flash"
VERTEXAI_DEFAULT_FAST_MODEL = "gemini-2.0-flash-lite"
VERTEXAI_MODEL_NAMES = [
    # 2.5 pro models
    "gemini-2.5-pro-preview-06-05",
    "gemini-2.5-pro-preview-05-06",
    # 2.0 flash-lite models
    VERTEXAI_DEFAULT_FAST_MODEL,
    "gemini-2.0-flash-lite-001",
    # "gemini-2.0-flash-lite-preview-02-05",
    # 2.0 flash models
    VERTEXAI_DEFAULT_MODEL,
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-exp",
    # "gemini-2.0-flash-exp-image-generation",
    # "gemini-2.0-flash-thinking-exp-01-21",
    # 1.5 pro models
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-002",
    # 1.5 flash models
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    # Anthropic models
    "claude-sonnet-4",
    "claude-opus-4",
    "claude-3-7-sonnet@20250219",
]
VERTEXAI_VISIBLE_MODEL_NAMES = [
    VERTEXAI_DEFAULT_MODEL,
    VERTEXAI_DEFAULT_FAST_MODEL,
]


_PROVIDER_TO_MODELS_MAP = {
    OPENAI_PROVIDER_NAME: OPEN_AI_MODEL_NAMES,
    BEDROCK_PROVIDER_NAME: BEDROCK_MODEL_NAMES,
    ANTHROPIC_PROVIDER_NAME: ANTHROPIC_MODEL_NAMES,
    VERTEXAI_PROVIDER_NAME: VERTEXAI_MODEL_NAMES,
}

_PROVIDER_TO_VISIBLE_MODELS_MAP = {
    OPENAI_PROVIDER_NAME: OPEN_AI_VISIBLE_MODEL_NAMES,
    BEDROCK_PROVIDER_NAME: [BEDROCK_DEFAULT_MODEL],
    ANTHROPIC_PROVIDER_NAME: ANTHROPIC_VISIBLE_MODEL_NAMES,
    VERTEXAI_PROVIDER_NAME: VERTEXAI_VISIBLE_MODEL_NAMES,
}


def fetch_available_well_known_llms() -> list[WellKnownLLMProviderDescriptor]:
    return [
        WellKnownLLMProviderDescriptor(
            name=OPENAI_PROVIDER_NAME,
            display_name="OpenAI",
            api_key_required=True,
            api_base_required=False,
            api_version_required=False,
            custom_config_keys=[],
            model_configurations=fetch_model_configurations_for_provider(
                OPENAI_PROVIDER_NAME
            ),
            default_model="gpt-4o",
            default_fast_model="gpt-4o-mini",
        ),
        WellKnownLLMProviderDescriptor(
            name=ANTHROPIC_PROVIDER_NAME,
            display_name="Anthropic",
            api_key_required=True,
            api_base_required=False,
            api_version_required=False,
            custom_config_keys=[],
            model_configurations=fetch_model_configurations_for_provider(
                ANTHROPIC_PROVIDER_NAME
            ),
            default_model="claude-3-7-sonnet-20250219",
            default_fast_model="claude-3-5-sonnet-20241022",
        ),
        WellKnownLLMProviderDescriptor(
            name=AZURE_PROVIDER_NAME,
            display_name="Azure OpenAI",
            api_key_required=True,
            api_base_required=True,
            api_version_required=True,
            custom_config_keys=[],
            model_configurations=fetch_model_configurations_for_provider(
                AZURE_PROVIDER_NAME
            ),
            deployment_name_required=True,
            single_model_supported=True,
        ),
        WellKnownLLMProviderDescriptor(
            name=BEDROCK_PROVIDER_NAME,
            display_name="AWS Bedrock",
            api_key_required=False,
            api_base_required=False,
            api_version_required=False,
            custom_config_keys=[
                CustomConfigKey(
                    name="AWS_REGION_NAME",
                    display_name="AWS Region Name",
                ),
                CustomConfigKey(
                    name="AWS_ACCESS_KEY_ID",
                    display_name="AWS Access Key ID",
                    is_required=False,
                    description="If using AWS IAM roles, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY can be left blank.",
                ),
                CustomConfigKey(
                    name="AWS_SECRET_ACCESS_KEY",
                    display_name="AWS Secret Access Key",
                    is_required=False,
                    is_secret=True,
                    description="If using AWS IAM roles, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY can be left blank.",
                ),
            ],
            model_configurations=fetch_model_configurations_for_provider(
                BEDROCK_PROVIDER_NAME
            ),
            default_model=BEDROCK_DEFAULT_MODEL,
            default_fast_model=BEDROCK_DEFAULT_MODEL,
        ),
        WellKnownLLMProviderDescriptor(
            name=VERTEXAI_PROVIDER_NAME,
            display_name="GCP Vertex AI",
            api_key_required=False,
            api_base_required=False,
            api_version_required=False,
            model_configurations=fetch_model_configurations_for_provider(
                VERTEXAI_PROVIDER_NAME
            ),
            custom_config_keys=[
                CustomConfigKey(
                    name=VERTEX_CREDENTIALS_FILE_KWARG,
                    display_name="Credentials File",
                    description="This should be a JSON file containing some private credentials.",
                    is_required=True,
                    is_secret=False,
                    key_type=CustomConfigKeyType.FILE_INPUT,
                ),
                CustomConfigKey(
                    name=VERTEX_LOCATION_KWARG,
                    display_name="Location",
                    description="The location of the Vertex AI model. Please refer to the "
                    "[Vertex AI configuration docs](https://docs.onyx.app/gen_ai_configs/vertex_ai) for all possible values.",
                    is_required=False,
                    is_secret=False,
                    key_type=CustomConfigKeyType.TEXT_INPUT,
                    default_value="us-east1",
                ),
            ],
            default_model=VERTEXAI_DEFAULT_MODEL,
            default_fast_model=VERTEXAI_DEFAULT_MODEL,
        ),
    ]


def fetch_models_for_provider(provider_name: str) -> list[str]:
    return _PROVIDER_TO_MODELS_MAP.get(provider_name, [])


def fetch_model_names_for_provider_as_set(provider_name: str) -> set[str] | None:
    model_names = fetch_models_for_provider(provider_name)
    return set(model_names) if model_names else None


def fetch_visible_model_names_for_provider_as_set(
    provider_name: str,
) -> set[str] | None:
    visible_model_names: list[str] | None = _PROVIDER_TO_VISIBLE_MODELS_MAP.get(
        provider_name
    )
    return set(visible_model_names) if visible_model_names else None


def fetch_model_configurations_for_provider(
    provider_name: str,
) -> list[ModelConfigurationView]:
    # if there are no explicitly listed visible model names,
    # then we won't mark any of them as "visible". This will get taken
    # care of by the logic to make default models visible.
    visible_model_names = (
        fetch_visible_model_names_for_provider_as_set(provider_name) or set()
    )
    return [
        ModelConfigurationView(
            name=model_name,
            is_visible=model_name in visible_model_names,
            max_input_tokens=None,
            supports_image_input=model_supports_image_input(
                model_name=model_name,
                model_provider=provider_name,
            ),
        )
        for model_name in fetch_models_for_provider(provider_name)
    ]


# ===== PROVIDER TEMPLATE INTEGRATION =====
# Phase 5: Integration with Provider Template System

def convert_provider_template_to_descriptor(template) -> WellKnownLLMProviderDescriptor:
    """
    Convert a ProviderTemplate to WellKnownLLMProviderDescriptor for backward compatibility.
    This allows new provider templates to work with existing UI and API.
    """
    from onyx.llm.provider_templates import ProviderTemplate, FieldConfig
    
    # Convert FieldConfig to CustomConfigKey
    custom_config_keys = []
    for field_name, field_config in template.config_schema.items():
        custom_key = CustomConfigKey(
            name=field_name,
            display_name=field_config.label,
            description=field_config.description,
            is_required=field_config.required,
            is_secret=(field_config.type == "password"),
            key_type=CustomConfigKeyType.FILE_INPUT if field_config.type == "file" else CustomConfigKeyType.TEXT_INPUT,
            default_value=field_config.default_value
        )
        custom_config_keys.append(custom_key)
    
    # For provider templates, we should NOT set the generic required flags
    # since all configuration is handled through custom_config_keys
    # This prevents duplicate fields in the UI
    api_key_required = False
    api_base_required = False
    
    # Use popular models as default models
    default_model = template.popular_models[0] if template.popular_models else None
    default_fast_model = template.popular_models[1] if template.popular_models and len(template.popular_models) > 1 else default_model
    
    return WellKnownLLMProviderDescriptor(
        name=template.id,
        display_name=template.name,
        api_key_required=api_key_required,
        api_base_required=api_base_required,
        api_version_required=False,  # None of our templates require API version yet
        custom_config_keys=custom_config_keys,
        model_configurations=fetch_model_configurations_for_provider_template(template),
        default_model=default_model,
        default_fast_model=default_fast_model,
        deployment_name_required=False,
        single_model_supported=False,
        # Include the new fields needed for dynamic model fetching
        model_endpoint=template.model_endpoint,
        litellm_provider_name=template.litellm_provider_name,
    )


def fetch_model_configurations_for_provider_template(template) -> list[ModelConfigurationView]:
    """
    Create model configurations from a provider template's popular models.
    This bridges between our dynamic template system and the existing model config system.
    """
    from onyx.llm.model_fetcher import ModelFetcher
    
    if not template.popular_models:
        return []
    
    # For dynamic providers, try to fetch latest models
    if template.model_fetching == "dynamic":
        try:
            fetcher = ModelFetcher()
            # Note: This would be async in real usage, for now we use popular_models as fallback
            dynamic_models = template.popular_models  # Fallback to popular_models for now
        except Exception:
            dynamic_models = template.popular_models
    else:
        dynamic_models = template.popular_models
    
    return [
        ModelConfigurationView(
            name=model_name,
            is_visible=True,  # All template models are visible by default
            max_input_tokens=None,  # Could be enhanced per-model later
            supports_image_input=model_supports_image_input(
                model_name=model_name,
                model_provider=template.litellm_provider_name,
            ),
        )
        for model_name in dynamic_models
    ]


def fetch_provider_templates_as_descriptors() -> list[WellKnownLLMProviderDescriptor]:
    """
    Get all provider templates converted to WellKnownLLMProviderDescriptor format.
    This allows the existing UI to seamlessly work with new provider templates.
    """
    from onyx.llm.provider_templates import get_provider_templates
    
    # Get all our new provider templates
    templates = get_provider_templates()
    
    # Convert each to descriptor format
    return [
        convert_provider_template_to_descriptor(template)
        for template in templates
    ]


def fetch_available_well_known_llms_with_templates() -> list[WellKnownLLMProviderDescriptor]:
    """
    Enhanced version that includes both existing providers and new provider templates.
    This maintains backward compatibility while adding new extensible providers.
    """
    # Get existing 5 providers (OpenAI, Anthropic, Azure, Bedrock, Vertex AI)
    existing_providers = fetch_available_well_known_llms()
    
    # Get new provider templates (Groq, Ollama, Together AI, Fireworks AI)
    template_providers = fetch_provider_templates_as_descriptors()
    
    # Combine both lists
    return existing_providers + template_providers
