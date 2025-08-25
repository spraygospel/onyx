"use client";

import { Modal } from "@/components/Modal";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { useState } from "react";
import useSWR from "swr";
import { Callout } from "@/components/ui/callout";
import Text from "@/components/ui/text";
import Title from "@/components/ui/title";
import { Button } from "@/components/ui/button";
import { ThreeDotsLoader } from "@/components/Loading";
import { LLMProviderView, WellKnownLLMProviderDescriptor } from "./interfaces";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { LLMProviderUpdateForm } from "./LLMProviderUpdateForm";
import { LLM_PROVIDERS_ADMIN_URL } from "./constants";
import { CustomLLMProviderUpdateForm } from "./CustomLLMProviderUpdateForm";
import { ConfiguredLLMProviderDisplay } from "./ConfiguredLLMProviderDisplay";
import { ConfigurationWizard } from "@/components/llm/ConfigurationWizard";
import { ProviderTemplate } from "@/lib/types/providerTemplates";

// Provider templates that should use ConfigurationWizard
const PROVIDER_TEMPLATE_NAMES = ["groq", "ollama", "together_ai", "fireworks_ai"];

// Convert WellKnownLLMProviderDescriptor to ProviderTemplate for ConfigurationWizard
function convertToProviderTemplate(descriptor: WellKnownLLMProviderDescriptor): ProviderTemplate {
  const config_schema: Record<string, any> = {};
  
  // Convert custom_config_keys to config_schema format
  if (descriptor.custom_config_keys) {
    descriptor.custom_config_keys.forEach(key => {
      config_schema[key.name] = {
        type: key.is_secret ? "password" : key.key_type === "file_input" ? "file" : "text",
        label: key.display_name,
        placeholder: key.default_value || "",
        description: key.description,
        required: key.is_required,
        default_value: key.default_value,
      };
    });
  }

  return {
    id: descriptor.name,
    name: descriptor.display_name,
    description: `Configuration for ${descriptor.display_name}`,
    category: "cloud",
    setup_difficulty: "easy",
    config_schema,
    popular_models: descriptor.model_configurations.map(model => model.name),
    model_fetching: "dynamic" as const,
    model_endpoint: descriptor.model_endpoint, // Essential: preserve model_endpoint for dynamic model fetching
    litellm_provider_name: descriptor.litellm_provider_name || descriptor.name,
    documentation_url: "",
  };
}

function LLMProviderUpdateModal({
  llmProviderDescriptor,
  onClose,
  existingLlmProvider,
  shouldMarkAsDefault,
  setPopup,
}: {
  llmProviderDescriptor: WellKnownLLMProviderDescriptor | null;
  onClose: () => void;
  existingLlmProvider?: LLMProviderView;
  shouldMarkAsDefault?: boolean;
  setPopup?: (popup: PopupSpec) => void;
}) {
  const providerName =
    llmProviderDescriptor?.display_name ||
    llmProviderDescriptor?.name ||
    existingLlmProvider?.name ||
    "Custom LLM Provider";

  // Check if this is a provider template that should use ConfigurationWizard
  const isProviderTemplate = llmProviderDescriptor && 
    PROVIDER_TEMPLATE_NAMES.includes(llmProviderDescriptor.name);

  if (isProviderTemplate && llmProviderDescriptor) {
    const template = convertToProviderTemplate(llmProviderDescriptor);
    
    return (
      <Modal
        title={`Setup ${providerName}`}
        onOutsideClick={() => onClose()}
        hideOverflow={true}
      >
        <div className="max-h-[70vh] overflow-y-auto px-4">
          <ConfigurationWizard
            provider={template}
            initialConfiguration={existingLlmProvider?.custom_config || {}}
            initialSelectedModels={
              existingLlmProvider?.model_configurations
                .filter(model => model.is_visible)
                .map(model => model.name) || []
            }
            onComplete={async (configuration, models) => {
              try {
                // Create the provider using the existing API
                const response = await fetch(
                  `${LLM_PROVIDERS_ADMIN_URL}${
                    existingLlmProvider ? "" : "?is_creation=true"
                  }`,
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      provider: llmProviderDescriptor.name,
                      name: existingLlmProvider?.name || "Default",
                      custom_config: configuration,
                      model_configurations: llmProviderDescriptor.model_configurations.map(model => ({
                        name: model.name,
                        is_visible: models.includes(model.name),
                        max_input_tokens: model.max_input_tokens,
                      })),
                      default_model_name: models[0] || llmProviderDescriptor.default_model,
                      fast_default_model_name: models[1] || models[0] || llmProviderDescriptor.default_fast_model,
                      is_public: true,
                      groups: [],
                    }),
                  }
                );

                if (!response.ok) {
                  const errorMsg = (await response.json()).detail;
                  throw new Error(errorMsg || "Failed to save provider");
                }

                if (shouldMarkAsDefault) {
                  const newProvider = await response.json();
                  await fetch(`${LLM_PROVIDERS_ADMIN_URL}/${newProvider.id}/default`, {
                    method: "POST",
                  });
                }

                if (setPopup) {
                  setPopup({
                    type: "success",
                    message: existingLlmProvider 
                      ? "Provider updated successfully!" 
                      : "Provider enabled successfully!",
                  });
                }

                onClose();
              } catch (error) {
                if (setPopup) {
                  setPopup({
                    type: "error",
                    message: error instanceof Error ? error.message : "Failed to save provider",
                  });
                }
              }
            }}
            onCancel={onClose}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Setup ${providerName}`}
      onOutsideClick={() => onClose()}
      hideOverflow={true}
    >
      <div className="max-h-[70vh] overflow-y-auto px-4">
        {llmProviderDescriptor ? (
          <LLMProviderUpdateForm
            llmProviderDescriptor={llmProviderDescriptor}
            onClose={onClose}
            existingLlmProvider={existingLlmProvider}
            shouldMarkAsDefault={shouldMarkAsDefault}
            setPopup={setPopup}
          />
        ) : (
          <CustomLLMProviderUpdateForm
            onClose={onClose}
            existingLlmProvider={existingLlmProvider}
            shouldMarkAsDefault={shouldMarkAsDefault}
            setPopup={setPopup}
          />
        )}
      </div>
    </Modal>
  );
}

function DefaultLLMProviderDisplay({
  llmProviderDescriptor,
  shouldMarkAsDefault,
}: {
  llmProviderDescriptor: WellKnownLLMProviderDescriptor | null;
  shouldMarkAsDefault?: boolean;
}) {
  const [formIsVisible, setFormIsVisible] = useState(false);
  const { popup, setPopup } = usePopup();

  const providerName =
    llmProviderDescriptor?.display_name || llmProviderDescriptor?.name;
  return (
    <div>
      {popup}
      <div className="border border-border p-3 dark:bg-neutral-800 dark:border-neutral-700 rounded w-96 flex shadow-md">
        <div className="my-auto">
          <div className="font-bold">{providerName}</div>
        </div>
        <div className="ml-auto">
          <Button variant="navigate" onClick={() => setFormIsVisible(true)}>
            Set up
          </Button>
        </div>
      </div>
      {formIsVisible && (
        <LLMProviderUpdateModal
          llmProviderDescriptor={llmProviderDescriptor}
          onClose={() => setFormIsVisible(false)}
          shouldMarkAsDefault={shouldMarkAsDefault}
          setPopup={setPopup}
        />
      )}
    </div>
  );
}

function AddCustomLLMProvider({
  existingLlmProviders,
}: {
  existingLlmProviders: LLMProviderView[];
}) {
  const [formIsVisible, setFormIsVisible] = useState(false);

  if (formIsVisible) {
    return (
      <Modal
        title={`Setup Custom LLM Provider`}
        onOutsideClick={() => setFormIsVisible(false)}
      >
        <div className="max-h-[70vh] overflow-y-auto px-4">
          <CustomLLMProviderUpdateForm
            onClose={() => setFormIsVisible(false)}
            shouldMarkAsDefault={existingLlmProviders.length === 0}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Button variant="navigate" onClick={() => setFormIsVisible(true)}>
      Add Custom LLM Provider
    </Button>
  );
}

export function LLMConfiguration() {
  const { data: llmProviderDescriptors } = useSWR<
    WellKnownLLMProviderDescriptor[]
  >("/api/admin/llm/built-in/options", errorHandlingFetcher);
  const { data: existingLlmProviders } = useSWR<LLMProviderView[]>(
    LLM_PROVIDERS_ADMIN_URL,
    errorHandlingFetcher
  );

  if (!llmProviderDescriptors || !existingLlmProviders) {
    return <ThreeDotsLoader />;
  }

  return (
    <>
      <Title className="mb-2">Enabled LLM Providers</Title>

      {existingLlmProviders.length > 0 ? (
        <>
          <Text className="mb-4">
            If multiple LLM providers are enabled, the default provider will be
            used for all &quot;Default&quot; Assistants. For user-created
            Assistants, you can select the LLM provider/model that best fits the
            use case!
          </Text>
          <ConfiguredLLMProviderDisplay
            existingLlmProviders={existingLlmProviders}
            llmProviderDescriptors={llmProviderDescriptors}
          />
        </>
      ) : (
        <Callout type="warning" title="No LLM providers configured yet">
          Please set one up below in order to start using Onyx!
        </Callout>
      )}

      <Title className="mb-2 mt-6">Add LLM Provider</Title>
      <Text className="mb-4">
        Add a new LLM provider by either selecting from one of the default
        providers or by specifying your own custom LLM provider.
      </Text>

      <div className="gap-y-4 flex flex-col">
        {llmProviderDescriptors.map((llmProviderDescriptor) => (
          <DefaultLLMProviderDisplay
            key={llmProviderDescriptor.name}
            llmProviderDescriptor={llmProviderDescriptor}
            shouldMarkAsDefault={existingLlmProviders.length === 0}
          />
        ))}
      </div>

      <div className="mt-4">
        <AddCustomLLMProvider existingLlmProviders={existingLlmProviders} />
      </div>
    </>
  );
}
