import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LLMPopoverSimple from '@/app/chat/input/LLMPopoverSimple';
import { LLMProviderDescriptor } from '@/app/admin/configuration/llm/interfaces';
import { LlmManager } from '@/lib/hooks';
import { MinimalPersonaSnapshot } from '@/app/admin/assistants/interfaces';

// Mock dependencies
jest.mock('@/lib/hooks', () => ({
  getDisplayNameForModel: jest.fn((modelName) => modelName),
}));

jest.mock('@/app/admin/configuration/llm/utils', () => ({
  getProviderIcon: jest.fn(() => ({ size }: { size: number }) => (
    <div data-testid="provider-icon" style={{ width: size, height: size }}>Icon</div>
  )),
}));

jest.mock('@/lib/llm/utils', () => ({
  modelSupportsImageInput: jest.fn((providers, modelName, provider) => {
    // Mock that gpt-4o supports images, others don't
    return modelName === 'gpt-4o';
  }),
}));

jest.mock('@/components/user/UserProvider', () => ({
  useUser: jest.fn(() => ({
    user: {
      preferences: {
        temperature_override_enabled: true,
      },
    },
  })),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, onValueCommit }: any) => (
    <input
      data-testid="temperature-slider"
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
      onBlur={(e) => onValueCommit([parseFloat(e.target.value)])}
    />
  ),
}));

// Mock Radix UI components
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="popover-trigger">{children}</div>,
}));

describe('LLMPopoverSimple Extended Features Tests - TDD Phase 1', () => {
  const mockLlmProviders: LLMProviderDescriptor[] = [
    {
      name: 'OpenAI GPT-4',
      provider: 'openai',
      model_configurations: [
        {
          name: 'gpt-4o',
          is_visible: true,
          supports_image_input: true,
          max_input_tokens: 4096,
        },
        {
          name: 'gpt-4o-mini',
          is_visible: true,
          supports_image_input: false,
          max_input_tokens: 4096,
        },
      ],
    },
    {
      name: 'Anthropic Claude',
      provider: 'anthropic',
      model_configurations: [
        {
          name: 'claude-3-5-sonnet-20241022',
          is_visible: true,
          supports_image_input: false,
          max_input_tokens: 8192,
        },
      ],
    },
  ];

  const mockLlmManager: LlmManager = {
    currentLlm: {
      modelName: 'gpt-4o',
      provider: 'openai',
      name: 'OpenAI GPT-4',
    },
    updateCurrentLlm: jest.fn(),
    temperature: 0.7,
    updateTemperature: jest.fn(),
    maxTemperature: 2.0,
    imageFilesPresent: false,
    updateModelOverrideBasedOnChatSession: jest.fn(),
    updateImageFilesPresent: jest.fn(),
    liveAssistant: null,
  };

  const mockAssistant: MinimalPersonaSnapshot = {
    id: 1,
    name: 'Test Assistant',
    description: 'Test assistant description',
    tools: [],
    starter_messages: [],
    document_sets: [],
    llm_model_version_override: 'claude-3-5-sonnet-20241022',
    llm_model_provider_override: null,
    llm_temperature_override: null,
    search_start_date: null,
    search_end_date: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom Trigger Support (RegenerateOption Pattern)', () => {
    test('should render custom trigger when provided', () => {
      const CustomTrigger = (
        <button data-testid="custom-refresh-trigger">
          <div data-testid="refresh-icon">🔄</div>
        </button>
      );

      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          trigger={CustomTrigger}
        />
      );

      // Should render the custom trigger instead of default
      expect(screen.getByTestId('custom-refresh-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      
      // Should NOT render the default trigger
      expect(screen.queryByTestId('llm-selector-button')).not.toBeInTheDocument();
    });

    test('should use default trigger when trigger prop is undefined', () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          trigger={undefined}
        />
      );

      // Should render the default trigger
      expect(screen.getByTestId('llm-selector-button')).toBeInTheDocument();
    });
  });

  describe('Custom onSelect Callback (RegenerateOption Pattern)', () => {
    test('should call custom onSelect when provided', async () => {
      const mockOnSelect = jest.fn();

      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          onSelect={mockOnSelect}
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        const modelOption = screen.getByTestId('model-option-2'); // Claude model
        fireEvent.click(modelOption);

        // Should call custom callback with model name
        expect(mockOnSelect).toHaveBeenCalledWith('claude-3-5-sonnet-20241022');
        
        // Should also still update llmManager (both behaviors)
        expect(mockLlmManager.updateCurrentLlm).toHaveBeenCalledWith({
          modelName: 'claude-3-5-sonnet-20241022',
          provider: 'anthropic',
          name: 'Anthropic Claude',
        });
      });
    });

    test('should use default behavior when onSelect is undefined', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          onSelect={undefined}
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        const modelOption = screen.getByTestId('model-option-1');
        fireEvent.click(modelOption);

        // Should only call llmManager.updateCurrentLlm (default behavior)
        expect(mockLlmManager.updateCurrentLlm).toHaveBeenCalled();
      });
    });
  });

  describe('Current Model Override Support', () => {
    test('should highlight overridden model when currentModelName provided', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          currentModelName="claude-3-5-sonnet-20241022"
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        // Claude model should be highlighted instead of current llmManager model
        const claudeOption = screen.getByTestId('model-option-2');
        expect(claudeOption).toHaveClass('bg-background-100', 'dark:bg-neutral-900');
      });
    });

    test('should fall back to llmManager.currentLlm when currentModelName not provided', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        // First GPT model should be highlighted (matches llmManager.currentLlm)
        const gptOption = screen.getByTestId('model-option-0');
        expect(gptOption).toHaveClass('bg-background-100', 'dark:bg-neutral-900');
      });
    });
  });

  describe('Assistant Context Support', () => {
    test('should show assistant indicator when model matches assistant override', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          currentAssistant={mockAssistant}
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        // Should show "(assistant)" indicator for claude model
        expect(screen.getByText('(assistant)')).toBeInTheDocument();
      });
    });

    test('should not show assistant indicator when no assistant context', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        // Should not show any assistant indicators
        expect(screen.queryByText('(assistant)')).not.toBeInTheDocument();
      });
    });
  });

  describe('Image Generation Filtering', () => {
    test('should filter models when requiresImageGeneration is true', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          requiresImageGeneration={true}
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        // Should only show gpt-4o (supports images according to our mock)
        expect(screen.getByText(/gpt-4o \(via OpenAI GPT-4\)/)).toBeInTheDocument();
        
        // Should not show models that don't support images
        expect(screen.queryByText(/gpt-4o-mini/)).not.toBeInTheDocument();
        expect(screen.queryByText(/claude-3-5-sonnet-20241022/)).not.toBeInTheDocument();
      });
    });

    test('should show all models when requiresImageGeneration is false or undefined', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          requiresImageGeneration={false}
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        // Should show all models
        expect(screen.getByText(/gpt-4o \(via OpenAI GPT-4\)/)).toBeInTheDocument();
        expect(screen.getByText(/gpt-4o-mini \(via OpenAI GPT-4\)/)).toBeInTheDocument();
        expect(screen.getByText(/claude-3-5-sonnet-20241022 \(via Anthropic Claude\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Temperature Slider Support', () => {
    test('should show temperature slider when showTemperature is true', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          showTemperature={true}
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        expect(screen.getByTestId('temperature-slider')).toBeInTheDocument();
        expect(screen.getByText('Temperature (creativity)')).toBeInTheDocument();
        expect(screen.getByText('0.7')).toBeInTheDocument(); // Current temperature
      });
    });

    test('should not show temperature slider when showTemperature is false or undefined', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          showTemperature={false}
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('temperature-slider')).not.toBeInTheDocument();
        expect(screen.queryByText('Temperature (creativity)')).not.toBeInTheDocument();
      });
    });

    test('should update temperature when slider is changed', async () => {
      const mockUpdateTemperature = jest.fn();
      const testManager = { ...mockLlmManager, updateTemperature: mockUpdateTemperature };

      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={testManager} 
          showTemperature={true}
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        const slider = screen.getByTestId('temperature-slider');
        fireEvent.change(slider, { target: { value: '1.0' } });
        fireEvent.blur(slider);

        expect(mockUpdateTemperature).toHaveBeenCalledWith(1.0);
      });
    });
  });

  describe('Disabled State Support', () => {
    test('should disable popover when disabled prop is true', () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          disabled={true}
        />
      );

      const trigger = screen.getByTestId('llm-selector-button');
      expect(trigger).toBeDisabled();
    });

    test('should enable popover when disabled prop is false or undefined', () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          disabled={false}
        />
      );

      const trigger = screen.getByTestId('llm-selector-button');
      expect(trigger).not.toBeDisabled();
    });
  });

  describe('Extended Props Combination (RegenerateOption Full Pattern)', () => {
    test('should work with all RegenerateOption-style props together', async () => {
      const CustomTrigger = (
        <button data-testid="regenerate-trigger">🔄</button>
      );
      const mockOnRegenerate = jest.fn();

      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
          trigger={CustomTrigger}
          onSelect={mockOnRegenerate}
          currentModelName="claude-3-5-sonnet-20241022"
          currentAssistant={mockAssistant}
          requiresImageGeneration={false}
          showTemperature={true}
        />
      );

      // Should render custom trigger
      expect(screen.getByTestId('regenerate-trigger')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('regenerate-trigger'));

      await waitFor(() => {
        // Should show temperature slider
        expect(screen.getByTestId('temperature-slider')).toBeInTheDocument();
        
        // Should show assistant indicator
        expect(screen.getByText('(assistant)')).toBeInTheDocument();
        
        // Should highlight correct model
        const claudeOption = screen.getByTestId('model-option-2');
        expect(claudeOption).toHaveClass('bg-background-100');

        // Should call custom callback when model selected
        fireEvent.click(claudeOption);
        expect(mockOnRegenerate).toHaveBeenCalledWith('claude-3-5-sonnet-20241022');
      });
    });
  });
});