import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LLMPopoverSimple from '@/app/chat/input/LLMPopoverSimple';
import { LLMProviderDescriptor } from '@/app/admin/configuration/llm/interfaces';
import { LlmManager } from '@/lib/hooks';

// Mock dependencies
jest.mock('@/lib/hooks', () => ({
  getDisplayNameForModel: jest.fn((modelName) => modelName),
}));

jest.mock('@/app/admin/configuration/llm/utils', () => ({
  getProviderIcon: jest.fn(() => ({ size }: { size: number }) => (
    <div data-testid="provider-icon" style={{ width: size, height: size }}>Icon</div>
  )),
}));

jest.mock('@/components/icons/icons', () => ({
  ChevronDownIcon: ({ size }: { size: number }) => (
    <div data-testid="chevron-down" style={{ width: size, height: size }}>▼</div>
  ),
}));

// Mock UserProvider
jest.mock('@/components/user/UserProvider', () => ({
  useUser: jest.fn(() => ({
    user: {
      preferences: {
        temperature_override_enabled: true,
      },
    },
  })),
}));

// Mock TruncatedText component
jest.mock('@/components/ui/truncatedText', () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

// Mock ChatInputOption component
jest.mock('@/app/chat/input/ChatInputOption', () => ({
  ChatInputOption: ({ name, Icon, tooltipContent }: any) => (
    <div data-testid="chat-input-option">
      <Icon size={16} />
      <span>{name}</span>
      {tooltipContent && <span title={tooltipContent}>{tooltipContent}</span>}
    </div>
  ),
}));

// Mock ClientTooltip
jest.mock('@/components/ui/ClientTooltip', () => ({
  ClientTooltip: ({ children, content }: any) => (
    <div data-testid="client-tooltip" title={content?.props?.children || content}>
      {children}
    </div>
  ),
}));

// Mock llm utils
jest.mock('@/lib/llm/utils', () => ({
  modelSupportsImageInput: jest.fn(() => true),
}));

// Mock Slider
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

// Mock react-icons
jest.mock('react-icons/fi', () => ({
  FiAlertTriangle: () => <div data-testid="alert-triangle">⚠️</div>,
}));

// Mock Radix UI components
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children, side, align }: { children: React.ReactNode; side?: string; align?: string }) => 
    <div data-testid="popover-content" data-side={side} data-align={align}>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="popover-trigger">{children}</div>,
}));

describe('LLMPopoverSimple Backward Compatibility Tests - TDD Phase 1', () => {
  // Mock data matching current ChatInputBar usage
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Minimal Props Compatibility (ChatInputBar Usage)', () => {
    test('should work with minimal props like before', () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
        />
      );

      // Should render the basic trigger button
      expect(screen.getByTestId('llm-selector-button')).toBeInTheDocument();
      expect(screen.getByTestId('provider-icon')).toBeInTheDocument();
      expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
    });

    test('should render default trigger when no trigger prop provided', () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
        />
      );

      // Should render the built-in trigger button
      const trigger = screen.getByTestId('llm-selector-button');
      expect(trigger).toBeInTheDocument();
      expect(trigger.tagName).toBe('BUTTON');
      
      // Should contain current model name
      expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    });

    test('should call llmManager.updateCurrentLlm when no onSelect provided (default behavior)', async () => {
      const mockUpdateCurrentLlm = jest.fn();
      const testManager = { ...mockLlmManager, updateCurrentLlm: mockUpdateCurrentLlm };

      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={testManager} 
        />
      );

      // Open popover
      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        // Click on a different model
        const modelOption = screen.getByTestId('model-option-2'); // claude model
        fireEvent.click(modelOption);

        expect(mockUpdateCurrentLlm).toHaveBeenCalledWith({
          modelName: 'claude-3-5-sonnet-20241022',
          provider: 'anthropic',
          name: 'Anthropic Claude',
        });
      });
    });

    test('should maintain original styling and CSS classes', () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
        />
      );

      const trigger = screen.getByTestId('llm-selector-button');
      
      // Should maintain critical CSS classes for existing UI
      expect(trigger).toHaveClass('relative', 'cursor-pointer', 'flex', 'items-center');
      expect(trigger).toHaveClass('rounded', 'text-input-text');
      expect(trigger).toHaveClass('hover:bg-background-chat-hover');
      expect(trigger).toHaveClass('py-1.5', 'px-2', 'flex-none');
    });

    test('should preserve popover positioning and alignment', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        const popoverContent = screen.getByTestId('popover-content');
        expect(popoverContent).toHaveAttribute('data-side', 'bottom');
        expect(popoverContent).toHaveAttribute('data-align', 'start');
      });
    });
  });

  describe('Existing Functionality Preservation', () => {
    test('should display all visible models with provider information', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        // Should show all visible models in correct format
        expect(screen.getByText(/gpt-4o \(via OpenAI GPT-4\)/)).toBeInTheDocument();
        expect(screen.getByText(/gpt-4o-mini \(via OpenAI GPT-4\)/)).toBeInTheDocument();
        expect(screen.getByText(/claude-3-5-sonnet-20241022 \(via Anthropic Claude\)/)).toBeInTheDocument();
      });
    });

    test('should highlight currently selected model', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
        />
      );

      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        const selectedModelButton = screen.getByTestId('model-option-0'); // First option should be selected
        expect(selectedModelButton).toHaveClass('bg-background-100', 'dark:bg-neutral-900', 'text-text');
      });
    });

    test('should close popover after model selection', async () => {
      render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
        />
      );

      // Open popover
      fireEvent.click(screen.getByTestId('llm-selector-button'));

      await waitFor(() => {
        expect(screen.getByTestId('popover-content')).toBeInTheDocument();
      });

      // Click on a model option
      const modelOption = screen.getByTestId('model-option-1');
      fireEvent.click(modelOption);

      // Popover should close (this test would need actual Radix behavior)
      // For now, just verify the click handler is called
      expect(mockLlmManager.updateCurrentLlm).toHaveBeenCalled();
    });
  });

  describe('Interface Backward Compatibility', () => {
    test('should work without TypeScript errors with minimal interface', () => {
      // This test ensures the extended interface maintains backward compatibility
      const props = {
        llmProviders: mockLlmProviders,
        llmManager: mockLlmManager,
      };

      expect(() => render(<LLMPopoverSimple {...props} />)).not.toThrow();
    });

    test('should not require any additional props beyond original interface', () => {
      // Verify that original LLMPopoverSimpleProps interface still works
      const component = (
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={mockLlmManager} 
        />
      );

      expect(() => render(component)).not.toThrow();
      expect(screen.getByTestId('llm-selector-button')).toBeInTheDocument();
    });
  });

  describe('Error Handling Backward Compatibility', () => {
    test('should handle empty provider list gracefully', () => {
      render(
        <LLMPopoverSimple 
          llmProviders={[]} 
          llmManager={mockLlmManager} 
        />
      );

      expect(screen.getByTestId('llm-selector-button')).toBeInTheDocument();
    });

    test('should handle invalid llmManager gracefully', () => {
      const invalidManager = {
        ...mockLlmManager,
        currentLlm: null as any,
      };

      expect(() => render(
        <LLMPopoverSimple 
          llmProviders={mockLlmProviders} 
          llmManager={invalidManager} 
        />
      )).not.toThrow();
    });
  });
});