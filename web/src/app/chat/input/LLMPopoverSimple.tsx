import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";
import { LlmManager } from "@/lib/hooks";
import { getProviderIcon } from "@/app/admin/configuration/llm/utils";
import { getDisplayNameForModel } from "@/lib/hooks";
import { ChevronDownIcon } from "@/components/icons/icons";

interface LLMPopoverSimpleProps {
  llmProviders: LLMProviderDescriptor[];
  llmManager: LlmManager;
}

export default function LLMPopoverSimple({
  llmProviders,
  llmManager,
}: LLMPopoverSimpleProps) {
  // Simple model list without filtering
  const modelOptions = llmProviders.flatMap((provider) =>
    provider.model_configurations.map((model) => ({
      modelName: model.name,
      providerName: provider.name,
      provider: provider.provider,
    }))
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent 
        className="bg-background w-64 p-1 border border-background-200 rounded-md shadow-lg flex flex-col z-50"
        data-testid="llm-popover-content"
        side="bottom"
        align="start"
        sideOffset={5}
        avoidCollisions={true}
      >
        <div className="flex-grow max-h-[300px] default-scrollbar overflow-y-auto">
          {modelOptions.map((option, index) => (
            <button
              key={index}
              className={`w-full flex items-center gap-x-2 px-3 py-2 text-sm text-left hover:bg-background-100 dark:hover:bg-neutral-800 transition-colors duration-150 ${
                llmManager.currentLlm.modelName === option.modelName
                  ? "bg-background-100 dark:bg-neutral-900 text-text"
                  : "text-text-darker"
              }`}
              onClick={() => {
                llmManager.updateCurrentLlm({
                  modelName: option.modelName,
                  provider: option.provider,
                  name: option.providerName,
                });
              }}
              data-testid={`model-option-${index}`}
            >
              {getProviderIcon(option.provider, option.modelName)({
                size: 16,
                className: "flex-none my-auto text-black",
              })}
              <span className="truncate">
                {getDisplayNameForModel(option.modelName)} (via {option.providerName})
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}