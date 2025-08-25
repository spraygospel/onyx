/**
 * Unit tests for Provider Template TypeScript interfaces - Phase 0 TDD tests
 * Testing TypeScript interface validation, config schema field types, model fetching configuration
 */

import { describe, test, expect } from '@jest/globals';

// These interfaces will be created in Phase 1 implementation
interface FieldConfig {
  type: 'text' | 'password' | 'url' | 'select' | 'file' | 'textarea';
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  validation?: string;
  options?: string[];
  default_value?: string;
}

interface ProviderTemplate {
  id: string;
  name: string;
  description: string;
  category: 'cloud' | 'local' | 'enterprise' | 'specialized';
  setup_difficulty: 'easy' | 'medium' | 'hard';
  config_schema: Record<string, FieldConfig>;
  popular_models?: string[];
  model_fetching: 'dynamic' | 'static' | 'manual';
  model_endpoint?: string;
  model_list_cache_ttl?: number;
  litellm_provider_name: string;
  model_prefix?: string;
  documentation_url?: string;
  logoUrl?: string;
}

// Mock provider templates for testing
const mockGroqProvider: ProviderTemplate = {
  id: 'groq',
  name: 'Groq',
  description: 'Ultra-fast inference with Groq\'s LPU technology',
  category: 'cloud',
  setup_difficulty: 'easy',
  config_schema: {
    api_key: {
      type: 'password',
      label: 'Groq API Key',
      placeholder: 'gsk_...',
      required: true,
      description: 'Get your API key from console.groq.com'
    }
  },
  model_fetching: 'dynamic',
  model_endpoint: 'https://api.groq.com/openai/v1/models',
  model_list_cache_ttl: 3600,
  popular_models: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
  litellm_provider_name: 'groq',
  model_prefix: 'groq/'
};

const mockOllamaProvider: ProviderTemplate = {
  id: 'ollama',
  name: 'Ollama', 
  description: 'Run LLMs locally on your machine',
  category: 'local',
  setup_difficulty: 'medium',
  config_schema: {
    api_base: {
      type: 'url',
      label: 'Ollama Server URL',
      placeholder: 'http://localhost:11434',
      required: true,
      default_value: 'http://localhost:11434',
      description: 'URL of your Ollama server'
    }
  },
  model_fetching: 'dynamic',
  model_endpoint: '/api/tags',
  model_list_cache_ttl: 300,
  popular_models: ['llama3.2:latest', 'qwen2.5:latest', 'deepseek-coder:latest'],
  litellm_provider_name: 'ollama'
};

describe('ProviderTemplate Interface', () => {
  test('should validate required fields', () => {
    const provider = mockGroqProvider;
    
    expect(provider.id).toBeDefined();
    expect(provider.name).toBeDefined();
    expect(provider.description).toBeDefined();
    expect(provider.category).toBeDefined();
    expect(provider.setup_difficulty).toBeDefined();
    expect(provider.config_schema).toBeDefined();
    expect(provider.litellm_provider_name).toBeDefined();
    
    // Required fields should not be empty
    expect(provider.id.length).toBeGreaterThan(0);
    expect(provider.name.length).toBeGreaterThan(0);
    expect(provider.description.length).toBeGreaterThan(0);
    expect(provider.litellm_provider_name.length).toBeGreaterThan(0);
  });

  test('should validate category enum values', () => {
    const validCategories: ProviderTemplate['category'][] = ['cloud', 'local', 'enterprise', 'specialized'];
    
    expect(validCategories.includes(mockGroqProvider.category)).toBe(true);
    expect(validCategories.includes(mockOllamaProvider.category)).toBe(true);
    
    // Should be one of the allowed categories
    expect(['cloud', 'local', 'enterprise', 'specialized']).toContain(mockGroqProvider.category);
  });

  test('should validate setup_difficulty enum values', () => {
    const validDifficulties: ProviderTemplate['setup_difficulty'][] = ['easy', 'medium', 'hard'];
    
    expect(validDifficulties.includes(mockGroqProvider.setup_difficulty)).toBe(true);
    expect(validDifficulties.includes(mockOllamaProvider.setup_difficulty)).toBe(true);
    
    // Should be one of the allowed difficulties
    expect(['easy', 'medium', 'hard']).toContain(mockGroqProvider.setup_difficulty);
  });

  test('should validate model_fetching enum values', () => {
    const validFetchingModes: ProviderTemplate['model_fetching'][] = ['dynamic', 'static', 'manual'];
    
    expect(validFetchingModes.includes(mockGroqProvider.model_fetching)).toBe(true);
    expect(validFetchingModes.includes(mockOllamaProvider.model_fetching)).toBe(true);
    
    // Should be one of the allowed fetching modes
    expect(['dynamic', 'static', 'manual']).toContain(mockGroqProvider.model_fetching);
  });

  test('should have config_schema with valid field configurations', () => {
    const provider = mockGroqProvider;
    
    expect(typeof provider.config_schema).toBe('object');
    expect(Object.keys(provider.config_schema).length).toBeGreaterThan(0);
    
    // Each field should have required properties
    Object.values(provider.config_schema).forEach(field => {
      expect(field.type).toBeDefined();
      expect(field.label).toBeDefined();
      expect(typeof field.required).toBe('boolean');
    });
  });

  test('should validate popular_models array when present', () => {
    if (mockGroqProvider.popular_models) {
      expect(Array.isArray(mockGroqProvider.popular_models)).toBe(true);
      expect(mockGroqProvider.popular_models.length).toBeGreaterThan(0);
      
      // All model names should be strings
      mockGroqProvider.popular_models.forEach(model => {
        expect(typeof model).toBe('string');
        expect(model.length).toBeGreaterThan(0);
      });
    }
  });

  test('should validate model endpoint for dynamic providers', () => {
    if (mockGroqProvider.model_fetching === 'dynamic') {
      expect(mockGroqProvider.model_endpoint).toBeDefined();
      expect(typeof mockGroqProvider.model_endpoint).toBe('string');
      expect(mockGroqProvider.model_endpoint!.length).toBeGreaterThan(0);
    }
  });

  test('should validate cache TTL for dynamic providers', () => {
    if (mockGroqProvider.model_fetching === 'dynamic' && mockGroqProvider.model_list_cache_ttl) {
      expect(typeof mockGroqProvider.model_list_cache_ttl).toBe('number');
      expect(mockGroqProvider.model_list_cache_ttl).toBeGreaterThan(0);
    }
  });
});

describe('FieldConfig Interface', () => {
  test('should validate field type enum values', () => {
    const validTypes: FieldConfig['type'][] = ['text', 'password', 'url', 'select', 'file', 'textarea'];
    
    const apiKeyField = mockGroqProvider.config_schema.api_key;
    const apiBaseField = mockOllamaProvider.config_schema.api_base;
    
    expect(validTypes.includes(apiKeyField.type)).toBe(true);
    expect(validTypes.includes(apiBaseField.type)).toBe(true);
    
    // Should be one of the allowed field types
    expect(['text', 'password', 'url', 'select', 'file', 'textarea']).toContain(apiKeyField.type);
  });

  test('should validate required field properties', () => {
    const field = mockGroqProvider.config_schema.api_key;
    
    expect(field.type).toBeDefined();
    expect(field.label).toBeDefined();
    expect(typeof field.required).toBe('boolean');
    
    // Label should not be empty
    expect(field.label.length).toBeGreaterThan(0);
  });

  test('should validate select field options', () => {
    const selectField: FieldConfig = {
      type: 'select',
      label: 'Region',
      required: true,
      options: ['us-east-1', 'us-west-2', 'eu-west-1'],
      default_value: 'us-east-1'
    };
    
    if (selectField.options) {
      expect(Array.isArray(selectField.options)).toBe(true);
      expect(selectField.options.length).toBeGreaterThan(0);
      
      // All options should be strings
      selectField.options.forEach(option => {
        expect(typeof option).toBe('string');
        expect(option.length).toBeGreaterThan(0);
      });
    }
  });

  test('should validate validation regex when present', () => {
    const fieldWithValidation: FieldConfig = {
      type: 'password',
      label: 'API Key',
      required: true,
      validation: '^sk_[a-zA-Z0-9]+$'
    };
    
    if (fieldWithValidation.validation) {
      expect(typeof fieldWithValidation.validation).toBe('string');
      expect(fieldWithValidation.validation.length).toBeGreaterThan(0);
      
      // Should be a valid regex pattern
      expect(() => new RegExp(fieldWithValidation.validation!)).not.toThrow();
    }
  });

  test('should validate placeholder text format', () => {
    const field = mockGroqProvider.config_schema.api_key;
    
    if (field.placeholder) {
      expect(typeof field.placeholder).toBe('string');
      expect(field.placeholder.length).toBeGreaterThan(0);
    }
  });

  test('should validate description text', () => {
    const field = mockGroqProvider.config_schema.api_key;
    
    if (field.description) {
      expect(typeof field.description).toBe('string');
      expect(field.description.length).toBeGreaterThan(0);
    }
  });

  test('should validate default_value when present', () => {
    const field = mockOllamaProvider.config_schema.api_base;
    
    if (field.default_value) {
      expect(typeof field.default_value).toBe('string');
      expect(field.default_value.length).toBeGreaterThan(0);
    }
  });
});

describe('Provider Template Collections', () => {
  test('should handle array of provider templates', () => {
    const providers: ProviderTemplate[] = [mockGroqProvider, mockOllamaProvider];
    
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBe(2);
    
    // Each provider should have unique ID
    const ids = providers.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('should validate provider template filtering by category', () => {
    const providers: ProviderTemplate[] = [mockGroqProvider, mockOllamaProvider];
    
    const cloudProviders = providers.filter(p => p.category === 'cloud');
    const localProviders = providers.filter(p => p.category === 'local');
    
    expect(cloudProviders.length).toBe(1);
    expect(localProviders.length).toBe(1);
    expect(cloudProviders[0].id).toBe('groq');
    expect(localProviders[0].id).toBe('ollama');
  });

  test('should validate provider template search functionality', () => {
    const providers: ProviderTemplate[] = [mockGroqProvider, mockOllamaProvider];
    
    // Search by name
    const groqResults = providers.filter(p => 
      p.name.toLowerCase().includes('groq') || 
      p.description.toLowerCase().includes('groq')
    );
    expect(groqResults.length).toBe(1);
    
    // Search by description keywords
    const localResults = providers.filter(p => 
      p.description.toLowerCase().includes('local')
    );
    expect(localResults.length).toBe(1);
  });

  test('should validate provider template sorting', () => {
    const providers: ProviderTemplate[] = [mockGroqProvider, mockOllamaProvider];
    
    // Sort by name
    const sortedByName = [...providers].sort((a, b) => a.name.localeCompare(b.name));
    expect(sortedByName[0].name).toBe('Groq');
    expect(sortedByName[1].name).toBe('Ollama');
    
    // Sort by difficulty
    const sortedByDifficulty = [...providers].sort((a, b) => {
      const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
      return difficultyOrder[a.setup_difficulty] - difficultyOrder[b.setup_difficulty];
    });
    expect(sortedByDifficulty[0].setup_difficulty).toBe('easy');
    expect(sortedByDifficulty[1].setup_difficulty).toBe('medium');
  });
});

describe('Model Fetching Configuration', () => {
  test('should validate dynamic fetching configuration', () => {
    const dynamicProvider = mockGroqProvider;
    
    expect(dynamicProvider.model_fetching).toBe('dynamic');
    expect(dynamicProvider.model_endpoint).toBeDefined();
    expect(dynamicProvider.model_list_cache_ttl).toBeDefined();
    
    if (dynamicProvider.model_endpoint) {
      // Should be a valid URL for external APIs
      expect(dynamicProvider.model_endpoint.startsWith('http')).toBe(true);
    }
  });

  test('should validate local API endpoints', () => {
    const localProvider = mockOllamaProvider;
    
    if (localProvider.model_endpoint && !localProvider.model_endpoint.startsWith('http')) {
      // Local endpoints should start with /
      expect(localProvider.model_endpoint.startsWith('/')).toBe(true);
    }
  });

  test('should validate cache TTL values', () => {
    const providers = [mockGroqProvider, mockOllamaProvider];
    
    providers.forEach(provider => {
      if (provider.model_list_cache_ttl) {
        expect(typeof provider.model_list_cache_ttl).toBe('number');
        expect(provider.model_list_cache_ttl).toBeGreaterThan(0);
        expect(provider.model_list_cache_ttl).toBeLessThanOrEqual(86400); // Max 24 hours
      }
    });
  });

  test('should validate LiteLLM provider name mapping', () => {
    const providers = [mockGroqProvider, mockOllamaProvider];
    
    providers.forEach(provider => {
      expect(provider.litellm_provider_name).toBeDefined();
      expect(typeof provider.litellm_provider_name).toBe('string');
      expect(provider.litellm_provider_name.length).toBeGreaterThan(0);
      
      // Should match provider ID for consistency
      expect(provider.litellm_provider_name).toBe(provider.id);
    });
  });
});

describe('UI Integration Types', () => {
  test('should support provider template to form props conversion', () => {
    interface FormProps {
      fields: Array<{
        name: string;
        type: FieldConfig['type'];
        label: string;
        required: boolean;
        placeholder?: string;
        options?: string[];
        defaultValue?: string;
      }>;
    }
    
    const convertToFormProps = (template: ProviderTemplate): FormProps => {
      return {
        fields: Object.entries(template.config_schema).map(([name, config]) => ({
          name,
          type: config.type,
          label: config.label,
          required: config.required,
          placeholder: config.placeholder,
          options: config.options,
          defaultValue: config.default_value
        }))
      };
    };
    
    const formProps = convertToFormProps(mockGroqProvider);
    expect(formProps.fields.length).toBeGreaterThan(0);
    expect(formProps.fields[0].name).toBe('api_key');
    expect(formProps.fields[0].type).toBe('password');
  });

  test('should support provider categorization for UI', () => {
    interface CategoryGroup {
      category: string;
      providers: ProviderTemplate[];
      count: number;
    }
    
    const providers = [mockGroqProvider, mockOllamaProvider];
    const categories: CategoryGroup[] = [];
    
    const categoryMap = new Map<string, ProviderTemplate[]>();
    providers.forEach(provider => {
      if (!categoryMap.has(provider.category)) {
        categoryMap.set(provider.category, []);
      }
      categoryMap.get(provider.category)!.push(provider);
    });
    
    categoryMap.forEach((providerList, category) => {
      categories.push({
        category,
        providers: providerList,
        count: providerList.length
      });
    });
    
    expect(categories.length).toBe(2);
    expect(categories.some(c => c.category === 'cloud')).toBe(true);
    expect(categories.some(c => c.category === 'local')).toBe(true);
  });
});