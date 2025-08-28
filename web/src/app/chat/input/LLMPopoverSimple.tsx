import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";
import { LlmManager, getDisplayNameForModel, LlmDescriptor } from "@/lib/hooks";
import { getProviderIcon } from "@/app/admin/configuration/llm/utils";
import { modelSupportsImageInput, structureValue } from "@/lib/llm/utils";
import { MinimalPersonaSnapshot } from "@/app/admin/assistants/interfaces";
import { ChevronDownIcon } from "@/components/icons/icons";
import { ClientTooltip } from "@/components/ui/ClientTooltip";
import { FiAlertTriangle } from "react-icons/fi";
import { Slider } from "@/components/ui/slider";
import { useUser } from "@/components/user/UserProvider";
import { TruncatedText } from "@/components/ui/truncatedText";
import { ChatInputOption } from "./ChatInputOption";

interface LLMPopoverSimpleProps {
  // Core props (existing) - preserved for backward compatibility
  llmProviders: LLMProviderDescriptor[];
  llmManager: LlmManager;
  
  // Extended props (new, all optional) - for RegenerateOption functionality
  trigger?: React.ReactElement;                    // Custom trigger component
  onSelect?: (value: string) => void;             // Custom selection handler
  currentModelName?: string;                      // Model override for display
  currentAssistant?: MinimalPersonaSnapshot;      // Assistant context
  requiresImageGeneration?: boolean;              // Image generation filtering
  showTemperature?: boolean;                      // Temperature slider toggle
  disabled?: boolean;                             // Disable popover
}

export default function LLMPopoverSimple({
  llmProviders,
  llmManager,
  trigger,
  onSelect,
  currentModelName,
  currentAssistant,
  requiresImageGeneration,
  showTemperature,
  disabled,
}: LLMPopoverSimpleProps) {
  const { user } = useUser();

  // Temperature state management (from LLMPopover)
  const [localTemperature, setLocalTemperature] = useState(
    llmManager.temperature ?? 0.5
  );

  useEffect(() => {
    setLocalTemperature(llmManager.temperature ?? 0.5);
  }, [llmManager.temperature]);

  // Temperature change handlers (from LLMPopover)
  const handleTemperatureChange = useCallback((value: number[]) => {
    const value_0 = value[0];
    if (value_0 !== undefined) {
      setLocalTemperature(value_0);
    }
  }, []);

  const handleTemperatureChangeComplete = useCallback(
    (value: number[]) => {
      const value_0 = value[0];
      if (value_0 !== undefined) {
        llmManager.updateTemperature(value_0);
      }
    },
    [llmManager]
  );

  // Trigger content logic (from LLMPopover)
  const triggerContent = useMemo(
    () =>
      trigger ? (
        trigger
      ) : (
        <button 
          className="
            relative 
            cursor-pointer 
            flex 
            items-center 
            space-x-1
            group
            rounded
            text-input-text
            hover:bg-background-chat-hover
            hover:text-neutral-900
            dark:hover:text-neutral-50
            py-1.5
            px-2
            flex-none 
            whitespace-nowrap 
            overflow-hidden
          "
          data-testid="llm-selector-button"
          disabled={disabled}
        >
          {getProviderIcon(
            llmManager.currentLlm.provider,
            llmManager.currentLlm.modelName
          )({
            size: 16,
            className: "h-4 w-4 my-auto flex-none",
          })}
          <div className="flex items-center">
            <span className="text-sm break-all line-clamp-1">
              {getDisplayNameForModel(llmManager.currentLlm.modelName)}
            </span>
            <ChevronDownIcon className="flex-none ml-1" size={12} />
          </div>
        </button>
      ),
    [llmManager.currentLlm, trigger, disabled]
  );

  // Enhanced model list with filtering (from LLMPopover)
  const llmOptionsToChooseFrom = useMemo(
    () => {
      const options = llmProviders.flatMap((llmProvider) => {
        // Show all configured models - users should be able to select any configured LLM
        const filteredConfigs = llmProvider.model_configurations;
        
        return filteredConfigs.map((modelConfiguration) => {
          // Get proper display name for known providers
          const getProviderDisplayName = (provider: string, name: string) => {
            // Use display_name if available (from extended interface)
            if ('display_name' in llmProvider && (llmProvider as any).display_name) {
              return (llmProvider as any).display_name;
            }
            
            // Known provider mappings
            const providerDisplayNames: Record<string, string> = {
              'groq': 'Groq Cloud',
              'openai': 'OpenAI',
              'anthropic': 'Anthropic', 
              'ollama': 'Ollama',
              'together_ai': 'Together AI',
              'fireworks_ai': 'Fireworks AI',
            };
            
            return providerDisplayNames[provider.toLowerCase()] || name || provider;
          };

          const displayName = getProviderDisplayName(llmProvider.provider, llmProvider.name);

          return {
            name: displayName,
            provider: llmProvider.provider,
            modelName: modelConfiguration.name,
            icon: getProviderIcon(
              llmProvider.provider,
              modelConfiguration.name
            ),
          };
        });
      });
      
      return options;
    },
    [llmProviders, currentModelName, llmManager.currentLlm.modelName]
  );

  return (
    <Popover>
      <PopoverTrigger asChild aria-label="Select LLM model">{triggerContent}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={5}
        avoidCollisions={true}
        className="w-64 p-1 bg-background border border-background-200 rounded-md shadow-lg flex flex-col z-50"
        data-testid="llm-popover-content"
      >
        <div className="flex-grow max-h-[300px] default-scrollbar overflow-y-auto">
          {llmOptionsToChooseFrom.map(
            ({ modelName, provider, name, icon }, index) => {
              if (
                !requiresImageGeneration ||
                modelSupportsImageInput(llmProviders, modelName, provider)
              ) {
                return (
                  <button
                    key={index}
                    className={`w-full flex items-center gap-x-2 px-3 py-2 text-sm text-left hover:bg-background-100 dark:hover:bg-neutral-800 transition-colors duration-150 ${
                      (currentModelName || llmManager.currentLlm.modelName) ===
                      modelName
                        ? "bg-background-100 dark:bg-neutral-900 text-text"
                        : "text-text-darker"
                    }`}
                    onClick={() => {
                      llmManager.updateCurrentLlm({
                        modelName,
                        provider,
                        name: provider, // Use technical provider name instead of display name
                      } as LlmDescriptor);
                      // Send structured value for regenerate functionality compatibility
                      onSelect?.(structureValue(name, provider, modelName));
                    }}
                    data-testid={`model-option-${index}`}
                  >
                    {icon({
                      size: 16,
                      className: "flex-none my-auto text-black",
                    })}
                    <TruncatedText text={`${getDisplayNameForModel(modelName)} (via ${name})`} />
                    {(() => {
                      if (
                        currentAssistant?.llm_model_version_override ===
                        modelName
                      ) {
                        return (
                          <span className="flex-none ml-auto text-xs">
                            (assistant)
                          </span>
                        );
                      }
                    })()}
                    {llmManager.imageFilesPresent &&
                      !modelSupportsImageInput(
                        llmProviders,
                        modelName,
                        provider
                      ) && (
                        <ClientTooltip
                          className="my-auto flex items-center ml-auto"
                          content={
                            <p className="text-xs">
                              This LLM is not vision-capable and cannot
                              process image files present in your chat
                              session.
                            </p>
                          }
                        >
                          <FiAlertTriangle
                            className="text-alert"
                            size={16}
                            data-testid="vision-warning"
                          />
                        </ClientTooltip>
                      )}
                  </button>
                );
              }
              return null;
            }
          )}
        </div>
        {showTemperature && user?.preferences?.temperature_override_enabled && (
          <div className="mt-2 pt-2 border-t border-background-200">
            <div className="w-full px-3 py-2">
              <Slider
                value={[localTemperature]}
                max={llmManager.maxTemperature}
                min={0}
                step={0.01}
                onValueChange={handleTemperatureChange}
                onValueCommit={handleTemperatureChangeComplete}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-text-500 mt-2">
                <span>Temperature (creativity)</span>
                <span>{localTemperature.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}