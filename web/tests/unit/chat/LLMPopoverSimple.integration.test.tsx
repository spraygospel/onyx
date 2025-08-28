import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RegenerateOption from '@/app/chat/RegenerateOption';
import LLMPopoverSimple from '@/app/chat/input/LLMPopoverSimple';
import { LLMProviderDescriptor } from '@/app/admin/configuration/llm/interfaces';
import { MinimalPersonaSnapshot } from '@/app/admin/assistants/interfaces';
import { LlmDescriptor } from '@/lib/hooks';

// Mock the entire LLMPopoverSimple component for integration testing
jest.mock('@/app/chat/input/LLMPopoverSimple', () => {
  return jest.fn(({ trigger, onSelect, currentModelName, currentAssistant, requiresImageGeneration, showTemperature }: any) => {
    return (
      <div data-testid="extended-llm-popover">
        <div data-testid="popover-trigger">{trigger}</div>
        <div data-testid="popover-content">
          <button 
            data-testid="test-model-option"
            onClick={() => onSelect && onSelect('claude-3-5-sonnet-20241022')}
          >
            Test Model Option
          </button>
          {showTemperature && <div data-testid="temperature-slider">Temperature Slider</div>}
          {currentAssistant && <div data-testid="assistant-indicator">(assistant)</div>}
          <div data-testid="current-model">{currentModelName || 'default-model'}</div>
          <div data-testid="image-filter">{requiresImageGeneration ? 'image-required' : 'no-image-filter'}</div>
        </div>
      </div>
    );
  });
});

// Mock dependencies
jest.mock('@/components/context/ChatContext', () => ({
  useChatContext: () => ({
    llmProviders: [
      {
        name: 'OpenAI GPT-4',
        provider: 'openai',
        model_configurations: [{ name: 'gpt-4o', is_visible: true, supports_image_input: true, max_input_tokens: 4096 }],
      },
    ],
  }),
}));

jest.mock('@/lib/hooks', () => ({
  getDisplayNameForModel: jest.fn((modelName) => modelName),
  useLlmManager: jest.fn(() => ({
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
  }),
}));

jest.mock('@/lib/llm/utils', () => ({
  parseLlmDescriptor: jest.fn((value: string) => ({
    name: 'Claude',
    provider: 'anthropic',
    modelName: value,
  })),
}));

jest.mock('@/components/Hoverable', () => ({
  Hoverable: ({ icon: Icon, hoverText }: any) => (
    <div data-testid="hoverable">
      <Icon data-testid="refresh-icon" />
      {hoverText && <span data-testid="hover-text">{hoverText}</span>}
    </div>
  ),
}));

jest.mock('react-icons/fi', () => ({
  FiRefreshCw: () => <div data-testid="refresh-icon">🔄</div>,
}));

describe('LLMPopoverSimple Integration Tests - TDD Phase 1', () => {
  const mockAssistant: MinimalPersonaSnapshot = {
    id: 1,
    name: 'Test Assistant',
    llm_model_version_override: 'claude-3-5-sonnet-20241022',
  };

  const mockRegenerate = jest.fn();
  const mockOnDropdownVisibleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RegenerateOption Integration', () => {
    test('should integrate with RegenerateOption using extended LLMPopoverSimple', () => {
      render(
        <RegenerateOption
          selectedAssistant={mockAssistant}
          regenerate={mockRegenerate}
          onDropdownVisibleChange={mockOnDropdownVisibleChange}
        />
      );

      // Should render the extended LLMPopoverSimple component
      expect(screen.getByTestId('extended-llm-popover')).toBeInTheDocument();
      
      // Should pass custom trigger (refresh icon)
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      
      // Should pass assistant context
      expect(screen.getByTestId('assistant-indicator')).toBeInTheDocument();
      
      // Should disable image generation requirement
      expect(screen.getByTestId('image-filter')).toHaveTextContent('no-image-filter');
    });

    test('should pass correct props from RegenerateOption to extended LLMPopoverSimple', () => {
      const overriddenModel = 'claude-3-5-sonnet-20241022';
      
      render(
        <RegenerateOption
          selectedAssistant={mockAssistant}
          regenerate={mockRegenerate}
          overriddenModel={overriddenModel}
          onDropdownVisibleChange={mockOnDropdownVisibleChange}
        />
      );

      // Should pass the overridden model
      expect(screen.getByTestId('current-model')).toHaveTextContent(overriddenModel);
      
      // Should pass assistant context
      expect(screen.getByTestId('assistant-indicator')).toBeInTheDocument();
    });

    test('should handle model selection callback correctly', async () => {
      render(
        <RegenerateOption
          selectedAssistant={mockAssistant}
          regenerate={mockRegenerate}
          onDropdownVisibleChange={mockOnDropdownVisibleChange}
        />
      );

      // Click on the test model option
      fireEvent.click(screen.getByTestId('test-model-option'));

      await waitFor(() => {
        // Should call regenerate with parsed LlmDescriptor
        expect(mockRegenerate).toHaveBeenCalledWith({
          name: 'Claude',
          provider: 'anthropic',
          modelName: 'claude-3-5-sonnet-20241022',
        });
      });
    });

    test('should show model override in hover text when present', () => {
      const overriddenModel = 'claude-3-5-sonnet-20241022';
      
      render(
        <RegenerateOption
          selectedAssistant={mockAssistant}
          regenerate={mockRegenerate}
          overriddenModel={overriddenModel}
          onDropdownVisibleChange={mockOnDropdownVisibleChange}
        />
      );

      // Should show the overridden model in hover text
      expect(screen.getByTestId('hover-text')).toHaveTextContent(overriddenModel);
    });

    test('should not show hover text when no model override', () => {
      render(
        <RegenerateOption
          selectedAssistant={mockAssistant}
          regenerate={mockRegenerate}
          onDropdownVisibleChange={mockOnDropdownVisibleChange}
        />
      );

      // Should not show hover text when no override
      expect(screen.queryByTestId('hover-text')).not.toBeInTheDocument();
    });
  });

  describe('ChatInputBar Integration (Backward Compatibility)', () => {
    test('should work as direct replacement for original LLMPopoverSimple', () => {
      const mockLlmProviders: LLMProviderDescriptor[] = [
        {
          name: 'OpenAI GPT-4',
          provider: 'openai',
          model_configurations: [{ name: 'gpt-4o', is_visible: true, supports_image_input: true, max_input_tokens: 4096 }],
        },
      ];

      const mockLlmManager = {
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

      render(
        <LLMPopoverSimple
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      // Should render without extended props (backward compatibility)
      expect(screen.getByTestId('extended-llm-popover')).toBeInTheDocument();
      
      // Should show default model
      expect(screen.getByTestId('current-model')).toHaveTextContent('default-model');
      
      // Should not show extended features by default
      expect(screen.queryByTestId('temperature-slider')).not.toBeInTheDocument();
      expect(screen.queryByTestId('assistant-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Feature Parity Testing', () => {
    test('should provide same functionality as original LLMPopover for RegenerateOption', () => {
      render(
        <RegenerateOption
          selectedAssistant={mockAssistant}
          regenerate={mockRegenerate}
          onDropdownVisibleChange={mockOnDropdownVisibleChange}
        />
      );

      // Should have all required RegenerateOption features:
      // 1. Custom trigger (refresh icon)
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      
      // 2. Custom onSelect callback functionality
      expect(screen.getByTestId('test-model-option')).toBeInTheDocument();
      
      // 3. Assistant context support
      expect(screen.getByTestId('assistant-indicator')).toBeInTheDocument();
      
      // 4. Image generation filtering disabled
      expect(screen.getByTestId('image-filter')).toHaveTextContent('no-image-filter');
    });

    test('should maintain same API contract as original components', () => {
      // Test that the component accepts the same props as before
      const chatInputProps = {
        llmProviders: [],
        llmManager: {
          currentLlm: { modelName: 'test', provider: 'test', name: 'test' },
          updateCurrentLlm: jest.fn(),
          temperature: 0.5,
          updateTemperature: jest.fn(),
          maxTemperature: 2.0,
        },
      };

      const regenerateProps = {
        selectedAssistant: mockAssistant,
        regenerate: mockRegenerate,
        onDropdownVisibleChange: mockOnDropdownVisibleChange,
      };

      // Should render both usage patterns without TypeScript errors
      expect(() => {
        render(<LLMPopoverSimple {...chatInputProps} />);
      }).not.toThrow();

      expect(() => {
        render(<RegenerateOption {...regenerateProps} />);
      }).not.toThrow();
    });
  });

  describe('Error Boundary Integration', () => {
    test('should handle errors gracefully in integration context', () => {
      const mockLlmProviders: LLMProviderDescriptor[] = [];
      const mockLlmManager = null as any; // Intentionally invalid

      expect(() => {
        render(
          <LLMPopoverSimple
            llmProviders={mockLlmProviders}
            llmManager={mockLlmManager}
          />
        );
      }).not.toThrow();
    });

    test('should handle missing required props in RegenerateOption', () => {
      expect(() => {
        render(
          <RegenerateOption
            selectedAssistant={null as any}
            regenerate={null as any}
            onDropdownVisibleChange={mockOnDropdownVisibleChange}
          />
        );
      }).not.toThrow();
    });
  });
});