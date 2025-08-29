/**
 * useProviderTemplates Hook - Phase 3 Implementation  
 * React hooks for managing provider templates state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { ProviderTemplate, ModelFetchResponse } from '@/lib/types/providerTemplates';
import ProviderTemplateAPI from '@/lib/api/providerTemplates';

interface UseProviderTemplatesResult {
  providers: ProviderTemplate[];
  loading: boolean;
  error: string | null;
  providerModels: Record<string, string[]>;
  configuredProviders: Set<string>;
  refresh: () => Promise<void>;
  fetchModels: (providerId: string) => Promise<string[]>;
  refreshModels: (providerId: string) => Promise<string[]>;
  saveConfiguration: (providerId: string, config: Record<string, string>) => Promise<void>;
  testConnection: (providerId: string, config?: Record<string, string>) => Promise<boolean>;
  deleteConfiguration: (providerId: string) => Promise<void>;
}

export const useProviderTemplates = (): UseProviderTemplatesResult => {
  const [providers, setProviders] = useState<ProviderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>({});
  const [configuredProviders, setConfiguredProviders] = useState<Set<string>>(new Set());

  // Load provider templates
  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const templates = await ProviderTemplateAPI.getProviderTemplates();
      setProviders(templates);
      
      // Check which providers are configured
      const configured = new Set<string>();
      const modelsMap: Record<string, string[]> = {};
      
      await Promise.allSettled(
        templates.map(async (provider) => {
          // Critical: Provider must have ID
          if (!provider.id) {
            console.error('[useProviderTemplates] Provider missing ID:', provider.name);
            return; // Skip this provider
          }
          
          try {
            // Try to get configuration to see if provider is configured
            await ProviderTemplateAPI.getProviderConfiguration(provider.id);
            configured.add(provider.id);
            
            // If provider is configured and uses dynamic fetching, get models
            if (provider.model_fetching === 'dynamic') {
              const modelResponse = await ProviderTemplateAPI.fetchProviderModels(provider.id);
              modelsMap[provider.id] = modelResponse.models;
            } else if (provider.popular_models) {
              // For static providers, use popular models
              modelsMap[provider.id] = provider.popular_models;
            }
          } catch (err) {
            // Provider not configured or model fetch failed, use popular models
            if (provider.popular_models) {
              modelsMap[provider.id] = provider.popular_models;
            }
          }
        })
      );
      
      setConfiguredProviders(configured);
      setProviderModels(modelsMap);
      
    } catch (err) {
      console.error('Failed to load providers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch models for a specific provider
  const fetchModels = useCallback(async (providerId: string): Promise<string[]> => {
    try {
      const response = await ProviderTemplateAPI.fetchProviderModels(providerId);
      setProviderModels(prev => ({
        ...prev,
        [providerId]: response.models,
      }));
      return response.models;
    } catch (err) {
      console.error(`Failed to fetch models for ${providerId}:`, err);
      // Return popular models as fallback
      const provider = providers.find(p => p.id === providerId);
      return provider?.popular_models || [];
    }
  }, [providers]);

  // Refresh models for a specific provider (force API call)
  const refreshModels = useCallback(async (providerId: string): Promise<string[]> => {
    try {
      const response = await ProviderTemplateAPI.refreshProviderModels(providerId);
      setProviderModels(prev => ({
        ...prev,
        [providerId]: response.models,
      }));
      return response.models;
    } catch (err) {
      console.error(`Failed to refresh models for ${providerId}:`, err);
      throw err;
    }
  }, []);

  // Save provider configuration
  const saveConfiguration = useCallback(async (
    providerId: string,
    configuration: Record<string, string>
  ) => {
    try {
      await ProviderTemplateAPI.saveProviderConfiguration(providerId, configuration);
      
      // Mark as configured
      setConfiguredProviders(prev => new Set(Array.from(prev).concat(providerId)));
      
      // Fetch models if provider uses dynamic fetching
      const provider = providers.find(p => p.id === providerId);
      if (provider?.model_fetching === 'dynamic') {
        try {
          await fetchModels(providerId);
        } catch (err) {
          console.warn(`Failed to fetch models after configuration for ${providerId}:`, err);
        }
      }
    } catch (err) {
      console.error(`Failed to save configuration for ${providerId}:`, err);
      throw err;
    }
  }, [providers, fetchModels]);

  // Test provider connection
  const testConnection = useCallback(async (
    providerId: string,
    configuration?: Record<string, string>
  ): Promise<boolean> => {
    try {
      const result = await ProviderTemplateAPI.testProviderConnection(providerId, configuration);
      return result.success;
    } catch (err) {
      console.error(`Failed to test connection for ${providerId}:`, err);
      return false;
    }
  }, []);

  // Delete provider configuration
  const deleteConfiguration = useCallback(async (providerId: string) => {
    try {
      await ProviderTemplateAPI.deleteProviderConfiguration(providerId);
      
      // Remove from configured set
      setConfiguredProviders(prev => {
        const newSet = new Set(prev);
        newSet.delete(providerId);
        return newSet;
      });
      
      // Reset to popular models
      const provider = providers.find(p => p.id === providerId);
      if (provider?.popular_models) {
        setProviderModels(prev => ({
          ...prev,
          [providerId]: provider.popular_models!,
        }));
      } else {
        setProviderModels(prev => {
          const newModels = { ...prev };
          delete newModels[providerId];
          return newModels;
        });
      }
    } catch (err) {
      console.error(`Failed to delete configuration for ${providerId}:`, err);
      throw err;
    }
  }, [providers]);

  // Initialize
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    providers,
    loading,
    error,
    providerModels,
    configuredProviders,
    refresh: loadProviders,
    fetchModels,
    refreshModels,
    saveConfiguration,
    testConnection,
    deleteConfiguration,
  };
};

interface UseProviderConfigurationResult {
  configuration: Record<string, string>;
  loading: boolean;
  error: string | null;
  save: (config: Record<string, string>) => Promise<void>;
  test: (config?: Record<string, string>) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export const useProviderConfiguration = (providerId: string): UseProviderConfigurationResult => {
  const [configuration, setConfiguration] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfiguration = useCallback(async () => {
    if (!providerId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const config = await ProviderTemplateAPI.getProviderConfiguration(providerId);
      setConfiguration(config);
    } catch (err) {
      console.error(`Failed to load configuration for ${providerId}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      setConfiguration({});
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  const save = useCallback(async (config: Record<string, string>) => {
    try {
      await ProviderTemplateAPI.saveProviderConfiguration(providerId, config);
      setConfiguration(config);
    } catch (err) {
      console.error(`Failed to save configuration for ${providerId}:`, err);
      throw err;
    }
  }, [providerId]);

  const test = useCallback(async (config?: Record<string, string>): Promise<boolean> => {
    try {
      const result = await ProviderTemplateAPI.testProviderConnection(providerId, config);
      return result.success;
    } catch (err) {
      console.error(`Failed to test connection for ${providerId}:`, err);
      return false;
    }
  }, [providerId]);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  return {
    configuration,
    loading,
    error,
    save,
    test,
    refresh: loadConfiguration,
  };
};