/**
 * ModelSelector Component - Phase 4 Implementation
 * Simplified model selection component for forms and quick selection
 */

import React, { useState, useMemo } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Zap,
  Cpu,
  Clock,
  Settings
} from 'lucide-react';
import { ProviderTemplate } from '@/lib/types/providerTemplates';
import { useModelDiscovery } from '@/hooks/useModelDiscovery';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  provider: ProviderTemplate;
  apiConfig: Record<string, string>;
  selectedModel?: string;
  onModelSelected: (model: string) => void;
  placeholder?: string;
  showRefresh?: boolean;
  showCategories?: boolean;
  className?: string;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  provider,
  apiConfig,
  selectedModel,
  onModelSelected,
  placeholder = "Select a model",
  showRefresh = true,
  showCategories = true,
  className,
  disabled = false,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const {
    state,
    fetchModels,
    getCacheStatus,
    getModelsByCategory,
  } = useModelDiscovery(provider, apiConfig);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fast':
        return <Zap className="h-3 w-3 text-yellow-500" />;
      case 'powerful':
        return <Cpu className="h-3 w-3 text-red-500" />;
      case 'specialized':
        return <Settings className="h-3 w-3 text-purple-500" />;
      default:
        return <Clock className="h-3 w-3 text-blue-500" />;
    }
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'fast':
        return 'Fast Models';
      case 'powerful':
        return 'Powerful Models';
      case 'specialized':
        return 'Specialized Models';
      default:
        return 'Popular Models';
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (provider.model_fetching !== 'dynamic') return;
    
    setRefreshing(true);
    try {
      await fetchModels(true);
    } finally {
      setRefreshing(false);
    }
  };

  // Prepare models for display
  const groupedModels = useMemo(() => {
    return getModelsByCategory();
  }, [getModelsByCategory]);

  const allModels = useMemo(() => {
    return Object.values(groupedModels).flat();
  }, [groupedModels]);

  // Get cache info
  const cacheStatus = getCacheStatus();

  // If no models available and not loading, show manual input option
  const showManualFallback = !state.loading && allModels.length === 0 && provider.model_fetching === 'dynamic';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Error display */}
      {state.error && !state.loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {state.error}
            {allModels.length > 0 && (
              <span className="block mt-1 text-sm">
                Using fallback models.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Cache status */}
      {state.cached && cacheStatus && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <CheckCircle2 className="h-3 w-3" />
            Cached models 
            {cacheStatus.valid && `(expires in ${cacheStatus.expiresInMinutes}m)`}
          </div>
          {showRefresh && provider.model_fetching === 'dynamic' && (
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={refreshing || disabled}
              className="h-6 px-2 text-xs"
            >
              {refreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      )}

      {/* Model selector */}
      <div className="space-y-2">
        <Select
          value={selectedModel}
          onValueChange={onModelSelected}
          disabled={disabled || state.loading}
        >
          <SelectTrigger className={cn(state.loading && 'opacity-50')}>
            <SelectValue>
              {state.loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading models...
                </div>
              ) : selectedModel ? (
                <div className="flex items-center gap-2">
                  {showCategories && (
                    <>
                      {getCategoryIcon(
                        allModels.find(m => m.id === selectedModel)?.category || 'popular'
                      )}
                    </>
                  )}
                  <span className="font-mono text-sm">{selectedModel}</span>
                </div>
              ) : (
                placeholder
              )}
            </SelectValue>
          </SelectTrigger>
          
          <SelectContent>
            {showCategories ? (
              // Grouped by category
              Object.entries(groupedModels).map(([category, models]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    {getCategoryIcon(category)}
                    {getCategoryLabel(category)}
                    <Badge variant="secondary" className="text-xs">
                      {models.length}
                    </Badge>
                  </div>
                  {models.map((model) => (
                    <SelectItem 
                      key={model.id} 
                      value={model.id}
                      className="font-mono text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        {!model.isFromApi && (
                          <Badge variant="outline" className="text-xs">
                            Manual
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))
            ) : (
              // Flat list
              allModels.map((model) => (
                <SelectItem 
                  key={model.id} 
                  value={model.id}
                  className="font-mono text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span>{model.name}</span>
                    {!model.isFromApi && (
                      <Badge variant="outline" className="text-xs">
                        Manual
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
            
            {allModels.length === 0 && !state.loading && (
              <div className="px-2 py-6 text-center text-sm text-neutral-500">
                No models available
              </div>
            )}
          </SelectContent>
        </Select>

        {/* Manual fallback message */}
        {showManualFallback && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Unable to fetch models from {provider.name}. You can manually enter a model name or configure the provider first.
            </AlertDescription>
          </Alert>
        )}

        {/* Model info display */}
        {selectedModel && allModels.length > 0 && (
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            {(() => {
              const selectedModelInfo = allModels.find(m => m.id === selectedModel);
              if (!selectedModelInfo) return null;
              
              return (
                <div className="flex items-center gap-3">
                  {showCategories && (
                    <div className="flex items-center gap-1">
                      {getCategoryIcon(selectedModelInfo.category)}
                      <span className="capitalize">{selectedModelInfo.category}</span>
                    </div>
                  )}
                  <span>
                    {selectedModelInfo.isFromApi ? 'From API' : 'Manual'}
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Model fetching info */}
      {provider.model_fetching === 'static' && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Using popular models for {provider.name}
        </div>
      )}
      
      {provider.model_fetching === 'manual' && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Manual model configuration required
        </div>
      )}
    </div>
  );
};