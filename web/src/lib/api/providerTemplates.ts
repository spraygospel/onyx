/**
 * Provider Template API Service - Phase 3 Implementation
 * API functions for managing provider templates and model fetching
 */

import { ProviderTemplate, ModelFetchResponse } from '@/lib/types/providerTemplates';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export class ProviderTemplateAPI {
  /**
   * Get all available provider templates
   */
  static async getProviderTemplates(): Promise<ProviderTemplate[]> {
    const response = await fetch(`${API_BASE}/admin/llm/built-in/options`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch provider templates: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a specific provider template by ID
   */
  static async getProviderTemplate(providerId: string): Promise<ProviderTemplate> {
    const response = await fetch(`${API_BASE}/api/admin/llm/provider-templates/${providerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch provider template: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get provider templates by category
   */
  static async getProviderTemplatesByCategory(category: string): Promise<ProviderTemplate[]> {
    const response = await fetch(`${API_BASE}/api/admin/llm/provider-templates?category=${category}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch provider templates by category: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch models for a specific provider
   */
  static async fetchProviderModels(providerId: string): Promise<ModelFetchResponse> {
    const response = await fetch(`${API_BASE}/admin/llm/providers/${providerId}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models for provider ${providerId}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      models: data.models || [],
      cached: data.cached || false,
      timestamp: data.timestamp || Date.now(),
      ttl: data.ttl || 3600,
    };
  }

  /**
   * Refresh models for a specific provider (force API call)
   */
  static async refreshProviderModels(providerId: string): Promise<ModelFetchResponse> {
    const response = await fetch(`${API_BASE}/admin/llm/providers/${providerId}/refresh-models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh models for provider ${providerId}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      models: data.models || [],
      cached: false,
      timestamp: data.timestamp || Date.now(),
      ttl: data.ttl || 3600,
    };
  }

  /**
   * Save provider configuration
   */
  static async saveProviderConfiguration(
    providerId: string, 
    configuration: Record<string, string>
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/api/admin/llm/providers/${providerId}/configure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configuration),
    });

    if (!response.ok) {
      throw new Error(`Failed to save configuration for provider ${providerId}: ${response.statusText}`);
    }
  }

  /**
   * Get provider configuration
   */
  static async getProviderConfiguration(providerId: string): Promise<Record<string, string>> {
    const response = await fetch(`${API_BASE}/api/admin/llm/providers/${providerId}/configuration`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get configuration for provider ${providerId}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Test provider connection
   */
  static async testProviderConnection(
    providerId: string,
    configuration?: Record<string, string>
  ): Promise<{ success: boolean; error?: string; models?: string[] }> {
    const response = await fetch(`${API_BASE}/api/admin/llm/providers/${providerId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configuration || {}),
    });

    if (!response.ok) {
      throw new Error(`Failed to test provider connection: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete provider configuration
   */
  static async deleteProviderConfiguration(providerId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/admin/llm/providers/${providerId}/configuration`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete configuration for provider ${providerId}: ${response.statusText}`);
    }
  }

  /**
   * Get model fetcher cache info for debugging
   */
  static async getCacheInfo(providerId: string): Promise<{
    provider_id: string;
    model_count: number;
    age_seconds: number;
    ttl_seconds: number;
    is_valid: boolean;
    expires_in: number;
  } | null> {
    const response = await fetch(`${API_BASE}/api/admin/llm/providers/${providerId}/cache-info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No cache info available
      }
      throw new Error(`Failed to get cache info for provider ${providerId}: ${response.statusText}`);
    }

    return response.json();
  }
}

export default ProviderTemplateAPI;