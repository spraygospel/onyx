import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LLMPopover from '@/app/chat/input/LLMPopover';
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

jest.mock('@/lib/llm/utils', () => ({
  modelSupportsImageInput: jest.fn(() => true),
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

// Mock Radix UI components
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children, side, align }: { children: React.ReactNode; side?: string; align?: string }) => 
    <div data-testid="popover-content" data-side={side} data-align={align}>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="popover-trigger">{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe('LLMPopover Component - TDD Phase 1: RED Tests', () => {
  // Mock data based on dev_plan/1.4_LLMbutton.md specifications
  const mockLlmProviders: LLMProviderDescriptor[] = [
    {
      name: 'OpenAI GPT-4',
      provider: 'openai',
      model_configurations: [
        {
          name: 'gpt-4o',
          is_visible: true,
        },
        {
          name: 'gpt-4o-mini',
          is_visible: true,
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
        },
        {
          name: 'claude-3-5-haiku-20241022',
          is_visible: false,
        },
      ],
    },
    {
      name: 'Groq Cloud',
      provider: 'groq',
      model_configurations: [
        {
          name: 'llama-3.1-70b-versatile',
          is_visible: true,
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Button Click Functionality', () => {
    test('should open popover when button is clicked', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('popover-content')).toBeInTheDocument();
      });
    });

    test('should close popover when clicking outside', async () => {
      render(
        <div>
          <LLMPopover
            llmProviders={mockLlmProviders}
            llmManager={mockLlmManager}
          />
          <div data-testid="outside-element">Outside</div>
        </div>
      );

      // Open popover
      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('popover-content')).toBeInTheDocument();
      });

      // Click outside to close
      fireEvent.click(screen.getByTestId('outside-element'));

      await waitFor(() => {
        expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
      });
    });

    test('should toggle popover state on multiple clicks', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');

      // First click - open
      fireEvent.click(trigger);
      await waitFor(() => {
        expect(screen.getByTestId('popover-content')).toBeInTheDocument();
      });

      // Second click - close
      fireEvent.click(trigger);
      await waitFor(() => {
        expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
      });

      // Third click - open again
      fireEvent.click(trigger);
      await waitFor(() => {
        expect(screen.getByTestId('popover-content')).toBeInTheDocument();
      });
    });
  });

  describe('Popover Positioning - Upward Display', () => {
    test('should render popover with side="top" for upward positioning', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        const popoverContent = screen.getByTestId('popover-content');
        expect(popoverContent).toHaveAttribute('data-side', 'top');
      });
    });

    test('should maintain align="start" positioning', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        const popoverContent = screen.getByTestId('popover-content');
        expect(popoverContent).toHaveAttribute('data-align', 'start');
      });
    });
  });

  describe('LLM Provider Display Format - "Model Name (via Provider)"', () => {
    test('should display visible models with provider information', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        // Should show visible models with provider format
        expect(screen.getAllByText(/^gpt-4o \(via OpenAI GPT-4\)$/i)).toHaveLength(2); // visible + hidden accessibility
        expect(screen.getAllByText(/^gpt-4o-mini \(via OpenAI GPT-4\)$/i)).toHaveLength(2);
        expect(screen.getAllByText(/^claude-3-5-sonnet-20241022 \(via Anthropic Claude\)$/i)).toHaveLength(2);
        expect(screen.getAllByText(/^llama-3.1-70b-versatile \(via Groq Cloud\)$/i)).toHaveLength(2);
      });
    });

    test('should not display invisible models', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        // Should NOT show invisible models
        expect(screen.queryByText(/claude-3-5-haiku-20241022/i)).not.toBeInTheDocument();
      });
    });

    test('should display provider icons for each model', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        const providerIcons = screen.getAllByTestId('provider-icon');
        expect(providerIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Model Selection and State Management', () => {
    test('should call updateCurrentLlm when model is selected', async () => {
      const mockUpdateCurrentLlm = jest.fn();
      const testManager = { ...mockLlmManager, updateCurrentLlm: mockUpdateCurrentLlm };

      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={testManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        const claudeModel = screen.getByText(/claude-3-5-sonnet-20241022/i);
        fireEvent.click(claudeModel);

        expect(mockUpdateCurrentLlm).toHaveBeenCalledWith({
          modelName: 'claude-3-5-sonnet-20241022',
          provider: 'anthropic',
          name: 'Anthropic Claude',
        });
      });
    });

    test('should close popover after model selection', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        const model = screen.getByText(/gpt-4o-mini/i);
        fireEvent.click(model);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
      });
    });

    test('should highlight currently selected model', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        const selectedModel = screen.getByText(/gpt-4o/i);
        expect(selectedModel.closest('button')).toHaveClass('bg-background-100', 'dark:bg-neutral-900');
      });
    });

    test('should call onSelect callback when provided', async () => {
      const mockOnSelect = jest.fn();

      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
          onSelect={mockOnSelect}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        const model = screen.getByText(/claude-3-5-sonnet-20241022/i);
        fireEvent.click(model);

        expect(mockOnSelect).toHaveBeenCalledWith('claude-3-5-sonnet-20241022');
      });
    });
  });

  describe('Temperature Control Integration', () => {
    test('should display temperature slider when user has override enabled', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('temperature-slider')).toBeInTheDocument();
        expect(screen.getByText('Temperature (creativity)')).toBeInTheDocument();
      });
    });

    test('should update temperature when slider is changed', async () => {
      const mockUpdateTemperature = jest.fn();
      const testManager = { ...mockLlmManager, updateTemperature: mockUpdateTemperature };

      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={testManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        const slider = screen.getByTestId('temperature-slider');
        fireEvent.change(slider, { target: { value: '1.0' } });
        fireEvent.blur(slider);

        expect(mockUpdateTemperature).toHaveBeenCalledWith(1.0);
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    test('should have proper aria labels for screen readers', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      expect(trigger).toHaveAttribute('aria-label', 'Select LLM model');
    });

    test('should support keyboard navigation', async () => {
      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      
      // Test Enter key
      fireEvent.keyDown(trigger, { key: 'Enter' });
      await waitFor(() => {
        expect(screen.getByTestId('popover-content')).toBeInTheDocument();
      });

      // Test Escape key
      fireEvent.keyDown(trigger, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
      });
    });

    test('should handle image input warnings for non-vision models', async () => {
      const mockLlmManagerWithImages = {
        ...mockLlmManager,
        imageFilesPresent: true,
      };

      render(
        <LLMPopover
          llmProviders={mockLlmProviders}
          llmManager={mockLlmManagerWithImages}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        // Should show warning icon for models that don't support vision
        expect(screen.getByTestId('vision-warning')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty provider list gracefully', async () => {
      render(
        <LLMPopover
          llmProviders={[]}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('No models available')).toBeInTheDocument();
      });
    });

    test('should handle provider with no visible models', async () => {
      const providersWithNoVisible: LLMProviderDescriptor[] = [
        {
          name: 'Hidden Provider',
          provider: 'hidden',
          model_configurations: [
            {
              name: 'hidden-model',
              is_visible: false,
            },
          ],
        },
      ];

      render(
        <LLMPopover
          llmProviders={providersWithNoVisible}
          llmManager={mockLlmManager}
        />
      );

      const trigger = screen.getByTestId('popover-trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByText(/hidden-model/i)).not.toBeInTheDocument();
      });
    });

    test('should handle missing llmManager gracefully', () => {
      expect(() => {
        render(
          <LLMPopover
            llmProviders={mockLlmProviders}
            llmManager={null as any}
          />
        );
      }).not.toThrow();
    });
  });
});