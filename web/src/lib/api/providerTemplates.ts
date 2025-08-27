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
   * Intelligent fetch with fallback for ad blocker compatibility
   */
  private static async fetchWithFallback(url: string, fallbackUrl?: string): Promise<Response> {
    try {
      // Try clean proxy endpoint first
      const response = await fetch(url);
      if (response.ok) return response;
      
      console.warn('Primary endpoint failed with status:', response.status);
    } catch (error) {
      // Ad blocker or network issue
      console.warn('Primary endpoint failed, trying fallback:', error);
    }
    
    if (fallbackUrl) {
      try {
        return await fetch(fallbackUrl);
      } catch (error) {
        // Enhanced error message for ad blocker detection
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          throw new Error(`Model discovery blocked. Please disable ad blocker for localhost:8080 or try incognito mode.`);
        }
        throw error;
      }
    }
    
    throw new Error('All endpoints failed');
  }

  /**
   * Fetch models for a specific provider with intelligent fallback
   */
  static async fetchProviderModels(providerId: string): Promise<ModelFetchResponse> {
    // Clean proxy endpoint (ad blocker safe)
    const proxyUrl = `${API_BASE}/api/llm-models?provider=${providerId}`;
    // Fallback endpoint (original, might be blocked)
    const fallbackUrl = `${API_BASE}/admin/llm/providers/${providerId}/models`;
    
    const response = await this.fetchWithFallback(proxyUrl, fallbackUrl);
    
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
   * Refresh models for a specific provider with intelligent fallback
   */
  static async refreshProviderModels(providerId: string): Promise<ModelFetchResponse> {
    // Clean proxy endpoint (ad blocker safe)
    const proxyUrl = `${API_BASE}/api/llm-models/refresh?provider=${providerId}`;
    // Fallback endpoint (original, might be blocked)
    const fallbackUrl = `${API_BASE}/admin/llm/providers/${providerId}/refresh-models`;
    
    const response = await this.fetchWithFallback(proxyUrl, fallbackUrl);
    
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
   * Test connection to specific model for a provider
   */
  static async testModelConnection(request: {
    provider_id: string;
    model_name: string;
    configuration: Record<string, string>;
  }): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    model_info?: {
      model_name: string;
      provider: string;
      supports_image_input?: boolean;
    };
  }> {
    const response = await fetch('/api/admin/llm/test-model-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to test model connection: ${response.statusText}`);
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