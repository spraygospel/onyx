/**
 * useModelDiscovery Hook - Phase 4 Implementation
 * Advanced hook for managing model discovery state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import { ProviderTemplate, ModelFetchResponse } from '@/lib/types/providerTemplates';
import ProviderTemplateAPI from '@/lib/api/providerTemplates';

interface ModelInfo {
  id: string;
  name: string;
  category: 'popular' | 'fast' | 'powerful' | 'specialized';
  description?: string;
  isFromApi: boolean;
  isAvailable: boolean;
  contextLength?: number;
  costPer1K?: number;
}

interface ModelDiscoveryState {
  models: ModelInfo[];
  loading: boolean;
  error: string | null;
  cached: boolean;
  timestamp?: number;
  ttl?: number;
  lastRefresh?: number;
}

interface UseModelDiscoveryResult {
  state: ModelDiscoveryState;
  fetchModels: (forceRefresh?: boolean) => Promise<void>;
  addManualModel: (modelName: string) => void;
  removeModel: (modelId: string) => void;
  searchModels: (query: string) => ModelInfo[];
  getCacheStatus: () => { valid: boolean; expiresInMinutes: number } | null;
  clearCache: () => void;
  getModelsByCategory: (category?: string) => Record<string, ModelInfo[]>;
}

export const useModelDiscovery = (
  provider: ProviderTemplate,
  apiConfig: Record<string, string>
): UseModelDiscoveryResult => {
  const [state, setState] = useState<ModelDiscoveryState>({
    models: [],
    loading: false,
    error: null,
    cached: false,
  });

  // Enhanced model categorization with more intelligence
  const categorizeModel = useCallback((modelName: string): ModelInfo['category'] => {
    const lowerName = modelName.toLowerCase();
    
    // Fast/instant models - optimized for speed
    if (lowerName.includes('instant') || lowerName.includes('turbo') || 
        lowerName.includes('fast') || lowerName.includes('quick') ||
        lowerName.includes('lite') || lowerName.includes('mini')) {
      return 'fast';
    }
    
    // Powerful models - large parameter counts
    if (lowerName.includes('70b') || lowerName.includes('175b') || 
        lowerName.includes('405b') || lowerName.includes('large') ||
        lowerName.includes('xl') || lowerName.includes('ultra') ||
        lowerName.match(/\d{2,3}b/)) {
      return 'powerful';
    }
    
    // Specialized models - domain-specific
    if (lowerName.includes('code') || lowerName.includes('math') || 
        lowerName.includes('vision') || lowerName.includes('embed') ||
        lowerName.includes('instruct') || lowerName.includes('chat') ||
        lowerName.includes('reasoning') || lowerName.includes('tool')) {
      return 'specialized';
    }
    
    // Default to popular
    return 'popular';
  }, []);

  // Enhanced model info creation
  const createModelInfo = useCallback((modelName: string, isFromApi: boolean): ModelInfo => {
    return {
      id: modelName,
      name: modelName,
      category: categorizeModel(modelName),
      isFromApi,
      isAvailable: true,
      // Future: Add context length and cost estimation
    };
  }, [categorizeModel]);

  // Fetch models from provider API
  const fetchModels = useCallback(async (forceRefresh = false) => {
    if (provider.model_fetching === 'manual') {
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let response: ModelFetchResponse;
      
      if (provider.model_fetching === 'static') {
        // Use static popular models
        response = {
          models: provider.popular_models || [],
          cached: true,
          timestamp: Date.now(),
          ttl: 86400, // 24 hours for static models
        };
      } else {
        // Dynamic fetching from API
        if (Object.keys(apiConfig).length === 0) {
          throw new Error('Provider configuration required for dynamic model fetching');
        }

        response = forceRefresh 
          ? await ProviderTemplateAPI.refreshProviderModels(provider.id)
          : await ProviderTemplateAPI.fetchProviderModels(provider.id);
      }

      const modelInfos = response.models.map(modelName => 
        createModelInfo(modelName, provider.model_fetching === 'dynamic')
      );

      setState(prev => ({
        ...prev,
        models: modelInfos,
        loading: false,
        error: null,
        cached: response.cached,
        timestamp: response.timestamp,
        ttl: response.ttl,
        lastRefresh: Date.now(),
      }));

    } catch (err) {
      console.error(`Failed to fetch models for ${provider.id}:`, err);
      
      // Fallback to popular models
      const fallbackModels = (provider.popular_models || []).map(modelName => 
        createModelInfo(modelName, false)
      );

      setState(prev => ({
        ...prev,
        models: fallbackModels,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch models',
        cached: false,
        lastRefresh: Date.now(),
      }));
    }
  }, [provider, apiConfig, createModelInfo]);

  // Add manual model
  const addManualModel = useCallback((modelName: string) => {
    const trimmedName = modelName.trim();
    if (!trimmedName) return;

    setState(prev => {
      // Check if model already exists
      const exists = prev.models.some(model => model.id === trimmedName);
      if (exists) return prev;

      const newModel = createModelInfo(trimmedName, false);
      return {
        ...prev,
        models: [...prev.models, newModel],
      };
    });
  }, [createModelInfo]);

  // Remove model (only manual models can be removed)
  const removeModel = useCallback((modelId: string) => {
    setState(prev => ({
      ...prev,
      models: prev.models.filter(model => 
        model.id !== modelId || model.isFromApi
      ),
    }));
  }, []);

  // Search models
  const searchModels = useCallback((query: string): ModelInfo[] => {
    if (!query.trim()) return state.models;
    
    const lowerQuery = query.toLowerCase();
    return state.models.filter(model => 
      model.name.toLowerCase().includes(lowerQuery) ||
      model.category.toLowerCase().includes(lowerQuery)
    );
  }, [state.models]);

  // Get cache status
  const getCacheStatus = useCallback(() => {
    if (!state.timestamp || !state.ttl) return null;
    
    const ageSeconds = Math.floor((Date.now() - state.timestamp) / 1000);
    const remainingSeconds = state.ttl - ageSeconds;
    const expiresInMinutes = Math.ceil(remainingSeconds / 60);
    
    return {
      valid: remainingSeconds > 0,
      expiresInMinutes: Math.max(0, expiresInMinutes),
    };
  }, [state.timestamp, state.ttl]);

  // Clear cache
  const clearCache = useCallback(() => {
    setState(prev => ({
      ...prev,
      cached: false,
      timestamp: undefined,
      ttl: undefined,
    }));
  }, []);

  // Get models grouped by category
  const getModelsByCategory = useCallback((filterCategory?: string) => {
    const modelsToGroup = filterCategory 
      ? state.models.filter(model => model.category === filterCategory)
      : state.models;

    return modelsToGroup.reduce((acc, model) => {
      const category = model.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(model);
      return acc;
    }, {} as Record<string, ModelInfo[]>);
  }, [state.models]);

  // Auto-fetch models when provider or config changes
  useEffect(() => {
    if (provider.model_fetching === 'static') {
      fetchModels();
    } else if (provider.model_fetching === 'dynamic' && Object.keys(apiConfig).length > 0) {
      fetchModels();
    }
  }, [provider.id, provider.model_fetching, apiConfig, fetchModels]);

  // Auto-refresh expired cache
  useEffect(() => {
    if (!state.cached || !state.timestamp || !state.ttl) return;

    const cacheStatus = getCacheStatus();
    if (cacheStatus && !cacheStatus.valid && provider.model_fetching === 'dynamic') {
      // Auto-refresh expired cache for dynamic providers
      fetchModels();
    }
  }, [state.cached, state.timestamp, state.ttl, getCacheStatus, fetchModels, provider.model_fetching]);

  return {
    state,
    fetchModels,
    addManualModel,
    removeModel,
    searchModels,
    getCacheStatus,
    clearCache,
    getModelsByCategory,
  };
};