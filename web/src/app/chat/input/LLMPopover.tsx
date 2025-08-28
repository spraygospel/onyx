import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getDisplayNameForModel, LlmDescriptor } from "@/lib/hooks";
import { modelSupportsImageInput } from "@/lib/llm/utils";
import { LLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";
import { getProviderIcon } from "@/app/admin/configuration/llm/utils";
import { MinimalPersonaSnapshot } from "@/app/admin/assistants/interfaces";
import { LlmManager } from "@/lib/hooks";

import { ClientTooltip } from "@/components/ui/ClientTooltip";
import { FiAlertTriangle } from "react-icons/fi";

import { Slider } from "@/components/ui/slider";
import { useUser } from "@/components/user/UserProvider";
import { TruncatedText } from "@/components/ui/truncatedText";
import { ChatInputOption } from "./ChatInputOption";

interface LLMPopoverProps {
  llmProviders: LLMProviderDescriptor[];
  llmManager: LlmManager;
  requiresImageGeneration?: boolean;
  currentAssistant?: MinimalPersonaSnapshot;
  trigger?: React.ReactElement;
  onSelect?: (value: string) => void;
  currentModelName?: string;
}

export default function LLMPopover({
  llmProviders,
  llmManager,
  requiresImageGeneration,
  currentAssistant,
  trigger,
  onSelect,
  currentModelName,
}: LLMPopoverProps) {
  const { user } = useUser();

  const [localTemperature, setLocalTemperature] = useState(
    llmManager.temperature ?? 0.5
  );

  useEffect(() => {
    setLocalTemperature(llmManager.temperature ?? 0.5);
  }, [llmManager.temperature]);

  // Use useCallback to prevent function recreation
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

  // Memoize trigger content to prevent rerendering
  const triggerContent = useMemo(
    () =>
      trigger ? (
        trigger
      ) : (
        <ChatInputOption
          minimize
          toggle
          flexPriority="stiff"
          name={getDisplayNameForModel(llmManager.currentLlm.modelName)}
          Icon={getProviderIcon(
            llmManager.currentLlm.provider,
            llmManager.currentLlm.modelName
          )}
          tooltipContent="Switch models"
        />
      ),
    [llmManager.currentLlm, trigger]
  );

  const llmOptionsToChooseFrom = useMemo(
    () =>
      llmProviders.flatMap((llmProvider) =>
        llmProvider.model_configurations
          .filter(
            (modelConfiguration) =>
              modelConfiguration.is_visible ||
              modelConfiguration.name === currentModelName
          )
          .map((modelConfiguration) => ({
            name: llmProvider.name,
            provider: llmProvider.provider,
            modelName: modelConfiguration.name,
            icon: getProviderIcon(
              llmProvider.provider,
              modelConfiguration.name
            ),
          }))
      ),
    [llmProviders]
  );

  return (
    <Popover>
      <PopoverTrigger asChild aria-label="Select LLM model">{triggerContent}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={5}
        avoidCollisions={false}
        className="w-64 p-1 bg-background border border-background-200 rounded-md shadow-lg flex flex-col z-50"
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
                      onSelect?.(modelName);
                    }}
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
        {user?.preferences?.temperature_override_enabled && (
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
