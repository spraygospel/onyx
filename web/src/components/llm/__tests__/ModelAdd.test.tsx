/**
 * ModelAdd Component Tests - TDD Implementation
 * Tests for manual model input with individual validation
 * Following development plan in dev_plan/1.3_addLLM.md
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ModelAdd } from '../ModelAdd';
import { ProviderTemplate } from '@/lib/types/providerTemplates';

// Mock the API calls
jest.mock('@/lib/api/providerTemplates', () => ({
  testModelConnection: jest.fn(),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  X: () => <div data-testid="x-icon">X</div>,
  CheckCircle2: () => <div data-testid="check-icon">Check</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  Loader2: () => <div data-testid="loader-icon">Loader</div>,
  TestTube: () => <div data-testid="test-icon">Test</div>,
}));

const mockProvider: ProviderTemplate = {
  id: 'groq',
  name: 'Groq',
  description: 'Fast inference for LLMs',
  category: 'cloud',
  setup_difficulty: 'easy',
  config_schema: {
    api_key: {
      type: 'password',
      label: 'API Key',
      required: true,
    },
  },
  popular_models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  model_fetching: 'manual',
  litellm_provider_name: 'groq',
};

const mockApiConfig = {
  api_key: 'test-api-key',
};

const defaultProps = {
  provider: mockProvider,
  apiConfig: mockApiConfig,
  selectedModels: [],
  onModelsChanged: jest.fn(),
};

describe('ModelAdd Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders ModelAdd component with correct title', () => {
      render(<ModelAdd {...defaultProps} />);
      
      expect(screen.getByText('Add Models')).toBeInTheDocument();
      expect(screen.getByText(/Add and verify your models/)).toBeInTheDocument();
    });

    test('renders manual model input form', () => {
      render(<ModelAdd {...defaultProps} />);
      
      expect(screen.getByPlaceholderText(/Enter model name/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Test & Add/i })).toBeInTheDocument();
    });

    test('displays empty state when no models added', () => {
      render(<ModelAdd {...defaultProps} />);
      
      expect(screen.getByText(/No models added yet/)).toBeInTheDocument();
      expect(screen.getByText(/Add your first model using the form above/)).toBeInTheDocument();
    });
  });

  describe('Manual Model Addition', () => {
    test('allows typing in model name input', async () => {
      const user = userEvent.setup();
      render(<ModelAdd {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Enter model name/);
      await user.type(input, 'llama-3.3-70b-versatile');
      
      expect(input).toHaveValue('llama-3.3-70b-versatile');
    });

    test('disables Test & Add button when input is empty', () => {
      render(<ModelAdd {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /Test & Add/i });
      expect(button).toBeDisabled();
    });

    test('enables Test & Add button when input has value', async () => {
      const user = userEvent.setup();
      render(<ModelAdd {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Enter model name/);
      const button = screen.getByRole('button', { name: /Test & Add/i });
      
      await user.type(input, 'llama-3.3-70b-versatile');
      
      expect(button).not.toBeDisabled();
    });

    test('prevents adding duplicate models', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        selectedModels: ['llama-3.3-70b-versatile'],
      };
      
      render(<ModelAdd {...props} />);
      
      const input = screen.getByPlaceholderText(/Enter model name/);
      await user.type(input, 'llama-3.3-70b-versatile');
      
      const button = screen.getByRole('button', { name: /Test & Add/i });
      await user.click(button);
      
      expect(screen.getByText(/Model already added/)).toBeInTheDocument();
    });
  });

  describe('Model Testing', () => {
    test('shows testing state when testing model', async () => {
      const user = userEvent.setup();
      const mockTestModelConnection = require('@/lib/api/providerTemplates').testModelConnection;
      mockTestModelConnection.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<ModelAdd {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Enter model name/);
      await user.type(input, 'llama-3.3-70b-versatile');
      
      const button = screen.getByRole('button', { name: /Test & Add/i });
      await user.click(button);
      
      expect(screen.getByText(/Testing.../)).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    test('adds model successfully after successful test', async () => {
      const user = userEvent.setup();
      const mockTestModelConnection = require('@/lib/api/providerTemplates').testModelConnection;
      const mockOnModelsChanged = jest.fn();
      
      mockTestModelConnection.mockResolvedValue({
        success: true,
        message: 'Model connection successful',
        model_info: {
          model_name: 'llama-3.3-70b-versatile',
          provider: 'groq',
          supports_image_input: false,
        },
      });
      
      render(<ModelAdd {...defaultProps} onModelsChanged={mockOnModelsChanged} />);
      
      const input = screen.getByPlaceholderText(/Enter model name/);
      await user.type(input, 'llama-3.3-70b-versatile');
      
      const button = screen.getByRole('button', { name: /Test & Add/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(mockOnModelsChanged).toHaveBeenCalledWith(['llama-3.3-70b-versatile']);
      });
      
      expect(input).toHaveValue(''); // Input should be cleared after successful add
    });

    test('shows error when model test fails', async () => {
      const user = userEvent.setup();
      const mockTestModelConnection = require('@/lib/api/providerTemplates').testModelConnection;
      
      mockTestModelConnection.mockResolvedValue({
        success: false,
        error: 'Model not found',
      });
      
      render(<ModelAdd {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Enter model name/);
      await user.type(input, 'invalid-model');
      
      const button = screen.getByRole('button', { name: /Test & Add/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/Model not found/)).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });

    test('handles network errors during testing', async () => {
      const user = userEvent.setup();
      const mockTestModelConnection = require('@/lib/api/providerTemplates').testModelConnection;
      
      mockTestModelConnection.mockRejectedValue(new Error('Network error'));
      
      render(<ModelAdd {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Enter model name/);
      await user.type(input, 'test-model');
      
      const button = screen.getByRole('button', { name: /Test & Add/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Model Management', () => {
    test('displays added models with status indicators', () => {
      const props = {
        ...defaultProps,
        selectedModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
      };
      
      render(<ModelAdd {...props} />);
      
      expect(screen.getByText('llama-3.3-70b-versatile')).toBeInTheDocument();
      expect(screen.getByText('mixtral-8x7b-32768')).toBeInTheDocument();
      expect(screen.getAllByTestId('check-icon')).toHaveLength(2);
    });

    test('allows removing added models', async () => {
      const user = userEvent.setup();
      const mockOnModelsChanged = jest.fn();
      const props = {
        ...defaultProps,
        selectedModels: ['llama-3.3-70b-versatile'],
        onModelsChanged: mockOnModelsChanged,
      };
      
      render(<ModelAdd {...props} />);
      
      const removeButton = screen.getByTestId('x-icon');
      await user.click(removeButton);
      
      expect(mockOnModelsChanged).toHaveBeenCalledWith([]);
    });

    test('shows model count in footer', () => {
      const props = {
        ...defaultProps,
        selectedModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
      };
      
      render(<ModelAdd {...props} />);
      
      expect(screen.getByText('2 models selected')).toBeInTheDocument();
    });

    test('shows singular form for single model', () => {
      const props = {
        ...defaultProps,
        selectedModels: ['llama-3.3-70b-versatile'],
      };
      
      render(<ModelAdd {...props} />);
      
      expect(screen.getByText('1 model selected')).toBeInTheDocument();
    });
  });

  describe('Keyboard Interactions', () => {
    test('submits form when Enter key is pressed in input', async () => {
      const user = userEvent.setup();
      const mockTestModelConnection = require('@/lib/api/providerTemplates').testModelConnection;
      const mockOnModelsChanged = jest.fn();
      
      mockTestModelConnection.mockResolvedValue({
        success: true,
        message: 'Success',
        model_info: { model_name: 'test-model', provider: 'groq' },
      });
      
      render(<ModelAdd {...defaultProps} onModelsChanged={mockOnModelsChanged} />);
      
      const input = screen.getByPlaceholderText(/Enter model name/);
      await user.type(input, 'test-model');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockOnModelsChanged).toHaveBeenCalledWith(['test-model']);
      });
    });
  });

  describe('Model Categories and Display', () => {
    test('categorizes models correctly', () => {
      const props = {
        ...defaultProps,
        selectedModels: ['llama-3.3-70b-versatile', 'whisper-large-v3-turbo', 'gemma-7b-it'],
      };
      
      render(<ModelAdd {...props} />);
      
      // Should show models grouped by categories based on naming patterns
      expect(screen.getByText('llama-3.3-70b-versatile')).toBeInTheDocument();
      expect(screen.getByText('whisper-large-v3-turbo')).toBeInTheDocument();
      expect(screen.getByText('gemma-7b-it')).toBeInTheDocument();
    });

    test('shows manual model indicator badge', () => {
      const props = {
        ...defaultProps,
        selectedModels: ['custom-model'],
      };
      
      render(<ModelAdd {...props} />);
      
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    test('clears error when typing in input after error', async () => {
      const user = userEvent.setup();
      const mockTestModelConnection = require('@/lib/api/providerTemplates').testModelConnection;
      
      // First, cause an error
      mockTestModelConnection.mockResolvedValueOnce({
        success: false,
        error: 'Model not found',
      });
      
      render(<ModelAdd {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Enter model name/);
      await user.type(input, 'invalid-model');
      
      const button = screen.getByRole('button', { name: /Test & Add/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/Model not found/)).toBeInTheDocument();
      });
      
      // Now type in input to clear error
      await user.clear(input);
      await user.type(input, 'new-model');
      
      expect(screen.queryByText(/Model not found/)).not.toBeInTheDocument();
    });
  });

  describe('Props Interface Compatibility', () => {
    test('maintains compatibility with existing ModelDiscovery props', () => {
      // Test that ModelAdd can receive same props as ModelDiscovery
      const legacyProps = {
        provider: mockProvider,
        apiConfig: mockApiConfig,
        selectedModels: ['model1', 'model2'],
        onModelsSelected: jest.fn(),
        className: 'custom-class',
      };
      
      render(<ModelAdd {...legacyProps} onModelsChanged={legacyProps.onModelsSelected} />);
      
      expect(screen.getByText('Add Models')).toBeInTheDocument();
    });
  });
});

// Integration tests with API
describe('ModelAdd API Integration', () => {
  test('calls correct API endpoint with proper parameters', async () => {
    const user = userEvent.setup();
    const mockTestModelConnection = require('@/lib/api/providerTemplates').testModelConnection;
    
    mockTestModelConnection.mockResolvedValue({
      success: true,
      message: 'Success',
      model_info: { model_name: 'test-model', provider: 'groq' },
    });
    
    render(<ModelAdd {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Enter model name/);
    await user.type(input, 'llama-3.3-70b-versatile');
    
    const button = screen.getByRole('button', { name: /Test & Add/i });
    await user.click(button);
    
    expect(mockTestModelConnection).toHaveBeenCalledWith({
      provider_id: 'groq',
      model_name: 'llama-3.3-70b-versatile',
      configuration: mockApiConfig,
    });
  });
});