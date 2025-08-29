/**
 * ModelDiscovery Component - Phase 4 Implementation
 * Real-time model fetching with loading states, fallback models, and validation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  X,
  Clock,
  Zap,
  Cpu,
  Search
} from 'lucide-react';
import { ProviderTemplate, ModelFetchResponse } from '@/lib/types/providerTemplates';
import ProviderTemplateAPI from '@/lib/api/providerTemplates';
import { cn } from '@/lib/utils';

interface ModelDiscoveryProps {
  provider: ProviderTemplate;
  apiConfig: Record<string, string>;
  selectedModels: string[];
  onModelsSelected: (models: string[]) => void;
  className?: string;
}

interface ModelInfo {
  id: string;
  name: string;
  category?: 'popular' | 'fast' | 'powerful' | 'specialized';
  description?: string;
  isFromApi?: boolean;
  isAvailable?: boolean;
}

interface ModelFetchState {
  loading: boolean;
  error: string | null;
  cached: boolean;
  timestamp?: number;
  ttl?: number;
}

export const ModelDiscovery: React.FC<ModelDiscoveryProps> = ({
  provider,
  apiConfig,
  selectedModels,
  onModelsSelected,
  className,
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [fetchState, setFetchState] = useState<ModelFetchState>({
    loading: false,
    error: null,
    cached: false,
  });
  const [manualModel, setManualModel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Enhanced model categorization
  const categorizeModel = (modelName: string): ModelInfo['category'] => {
    const lowerName = modelName.toLowerCase();
    
    // Fast models
    if (lowerName.includes('instant') || lowerName.includes('turbo') || 
        lowerName.includes('fast') || lowerName.includes('quick')) {
      return 'fast';
    }
    
    // Powerful models
    if (lowerName.includes('70b') || lowerName.includes('175b') || 
        lowerName.includes('405b') || lowerName.includes('large')) {
      return 'powerful';
    }
    
    // Specialized models
    if (lowerName.includes('code') || lowerName.includes('math') || 
        lowerName.includes('vision') || lowerName.includes('embed')) {
      return 'specialized';
    }
    
    // Popular/default models
    return 'popular';
  };

  // Get category icon and color
  const getCategoryInfo = (category: ModelInfo['category']) => {
    switch (category) {
      case 'fast':
        return { icon: Zap, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
      case 'powerful':
        return { icon: Cpu, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
      case 'specialized':
        return { icon: CheckCircle2, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' };
      default:
        return { icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    }
  };

  // Fetch models from provider API
  const fetchModelsFromAPI = useCallback(async (forceRefresh = false) => {
    if (provider.model_fetching === 'manual') {
      return;
    }

    setFetchState({ loading: true, error: null, cached: false });

    try {
      const providerId = provider.name || provider.id || '';
      const response: ModelFetchResponse = forceRefresh 
        ? await ProviderTemplateAPI.refreshProviderModels(providerId)
        : await ProviderTemplateAPI.fetchProviderModels(providerId);

      const modelInfos: ModelInfo[] = response.models.map(modelName => ({
        id: modelName,
        name: modelName,
        category: categorizeModel(modelName),
        isFromApi: true,
        isAvailable: true,
      }));

      setModels(modelInfos);
      setFetchState({
        loading: false,
        error: null,
        cached: response.cached,
        timestamp: response.timestamp,
        ttl: response.ttl,
      });

    } catch (err) {
      console.error(`Failed to fetch models for ${provider.name || provider.id}:`, err);
      
      // Fallback to popular models
      const fallbackModels: ModelInfo[] = (provider.popular_models || []).map(modelName => ({
        id: modelName,
        name: modelName,
        category: categorizeModel(modelName),
        isFromApi: false,
        isAvailable: true,
      }));

      setModels(fallbackModels);
      setFetchState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch models',
        cached: false,
      });
    }
  }, [provider]);

  // Initialize models on component mount
  useEffect(() => {
    if (provider.model_fetching === 'static') {
      // Use popular models directly
      const staticModels: ModelInfo[] = (provider.popular_models || []).map(modelName => ({
        id: modelName,
        name: modelName,
        category: categorizeModel(modelName),
        isFromApi: false,
        isAvailable: true,
      }));
      setModels(staticModels);
    } else if (provider.model_fetching === 'dynamic' && Object.keys(apiConfig).length > 0) {
      // Fetch from API if provider is configured
      fetchModelsFromAPI();
    }
  }, [provider, apiConfig, fetchModelsFromAPI]);

  // Handle model selection
  const handleModelToggle = (modelId: string) => {
    const isSelected = selectedModels.includes(modelId);
    if (isSelected) {
      onModelsSelected(selectedModels.filter(id => id !== modelId));
    } else {
      onModelsSelected([...selectedModels, modelId]);
    }
  };

  // Add manual model
  const handleAddManualModel = () => {
    if (!manualModel.trim()) return;
    
    const newModel: ModelInfo = {
      id: manualModel.trim(),
      name: manualModel.trim(),
      category: categorizeModel(manualModel.trim()),
      isFromApi: false,
      isAvailable: true,
    };

    // Check if model already exists
    const exists = models.some(model => model.id === newModel.id);
    if (!exists) {
      setModels(prev => [...prev, newModel]);
      onModelsSelected([...selectedModels, newModel.id]);
    }
    
    setManualModel('');
    setShowManualInput(false);
  };

  // Remove manual model
  const handleRemoveManualModel = (modelId: string) => {
    setModels(prev => prev.filter(model => model.id !== modelId || model.isFromApi));
    onModelsSelected(selectedModels.filter(id => id !== modelId));
  };

  // Filter models based on search query
  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group models by category
  const groupedModels = filteredModels.reduce((acc, model) => {
    const category = model.category || 'popular';
    if (!acc[category]) acc[category] = [];
    acc[category]?.push(model);
    return acc;
  }, {} as Record<string, ModelInfo[]>);

  const getCacheStatus = () => {
    if (!fetchState.timestamp || !fetchState.ttl) return null;
    
    const ageSeconds = Math.floor((Date.now() - fetchState.timestamp) / 1000);
    const remainingSeconds = fetchState.ttl - ageSeconds;
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    
    return remainingMinutes > 0 ? `Cache expires in ${remainingMinutes}m` : 'Cache expired';
  };

  return (
    <Card className={cn('w-full max-w-4xl', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Model Discovery
              {fetchState.cached && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Cached
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {provider.model_fetching === 'dynamic' 
                ? `Dynamically fetch available models from ${provider.name}`
                : provider.model_fetching === 'static'
                ? `Using popular models for ${provider.name}`
                : 'Manually configure models'}
            </CardDescription>
          </div>

          {provider.model_fetching === 'dynamic' && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => fetchModelsFromAPI(true)}
                variant="outline"
                size="sm"
                disabled={fetchState.loading}
              >
                {fetchState.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Cache status */}
        {fetchState.cached && getCacheStatus() && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {getCacheStatus()}
            </AlertDescription>
          </Alert>
        )}

        {/* Error display */}
        {fetchState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {fetchState.error}
              {models.length > 0 && (
                <span className="block mt-1 text-sm">
                  Showing fallback models instead.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search and manual input controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setShowManualInput(!showManualInput)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Model
            </Button>
          </div>

          {/* Manual model input */}
          {showManualInput && (
            <div className="flex items-end gap-2 p-4 border rounded-lg bg-neutral-50 dark:bg-neutral-900">
              <div className="flex-1">
                <Label htmlFor="manual-model">Manual Model Name</Label>
                <Input
                  id="manual-model"
                  placeholder="e.g., custom-model-name"
                  value={manualModel}
                  onChange={(e) => setManualModel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddManualModel()}
                />
              </div>
              <Button onClick={handleAddManualModel} disabled={!manualModel.trim()}>
                Add
              </Button>
              <Button 
                onClick={() => {
                  setShowManualInput(false);
                  setManualModel('');
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Loading state */}
        {fetchState.loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">
                Fetching models from {provider.name}...
              </p>
            </div>
          </div>
        )}

        {/* Models display */}
        {!fetchState.loading && (
          <div className="space-y-6">
            {Object.entries(groupedModels).map(([category, categoryModels]) => {
              const categoryInfo = getCategoryInfo(category as ModelInfo['category']);
              const IconComponent = categoryInfo.icon;

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <IconComponent className={cn('h-4 w-4', categoryInfo.color)} />
                    <h3 className="text-sm font-medium capitalize">
                      {category === 'popular' ? 'Popular Models' : 
                       category === 'fast' ? 'Fast Models' :
                       category === 'powerful' ? 'Powerful Models' :
                       'Specialized Models'} ({categoryModels.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryModels.map((model) => {
                      const isSelected = selectedModels.includes(model.id);
                      const isManual = !model.isFromApi;

                      return (
                        <div
                          key={model.id}
                          className={cn(
                            'relative p-3 border rounded-lg cursor-pointer transition-all duration-200',
                            isSelected 
                              ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700',
                            categoryInfo.bg
                          )}
                          onClick={() => handleModelToggle(model.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-sm font-medium truncate">
                                  {model.name}
                                </p>
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {model.isFromApi ? 'API' : 'Manual'}
                                </Badge>
                                <IconComponent className={cn('h-3 w-3', categoryInfo.color)} />
                              </div>
                            </div>

                            {isManual && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveManualModel(model.id);
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 flex-shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {category !== Object.keys(groupedModels)[Object.keys(groupedModels).length - 1] && (
                    <Separator className="my-4" />
                  )}
                </div>
              );
            })}

            {filteredModels.length === 0 && !fetchState.loading && (
              <div className="text-center py-12">
                <div className="text-neutral-500 dark:text-neutral-400">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No models found</h3>
                  <p className="text-sm">
                    {searchQuery 
                      ? `No models match "${searchQuery}"`
                      : 'No models are available for this provider'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected
        </div>
        
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          {fetchState.cached && getCacheStatus() && (
            <>
              <Clock className="h-3 w-3" />
              {getCacheStatus()}
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};