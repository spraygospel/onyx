/**
 * ProviderCard Component - Phase 3 Implementation
 * Displays LLM provider information with configuration and model discovery
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, RefreshCw, Settings, ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { ProviderTemplate, ProviderCardProps } from '@/lib/types/providerTemplates';
import { cn } from '@/lib/utils';

export const ProviderCard: React.FC<ProviderCardProps> = ({
  template,
  models = [],
  loading = false,
  onConfigure,
  onRefreshModels,
  configured = false,
  className,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cloud':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'local':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'specialized':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <CheckCircle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'hard':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handleRefreshModels = async () => {
    if (!onRefreshModels || refreshing) return;
    
    setRefreshing(true);
    try {
      await onRefreshModels(template.id);
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfigure = () => {
    if (onConfigure) {
      onConfigure(template.id);
    }
  };

  const getModelFetchingIcon = (fetching: string) => {
    switch (fetching) {
      case 'dynamic':
        return <RefreshCw className="h-3 w-3" />;
      case 'static':
        return <CheckCircle className="h-3 w-3" />;
      case 'manual':
        return <Settings className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <Card className={cn(
        'w-full max-w-sm transition-all duration-200 hover:shadow-md',
        configured 
          ? 'border-emerald-200 dark:border-emerald-800' 
          : 'border-neutral-200 dark:border-neutral-800',
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {template.name}
                {configured && (
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </CardTitle>
              <CardDescription className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {template.description}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge 
              variant="secondary" 
              className={cn('text-xs', getCategoryColor(template.category))}
            >
              {template.category}
            </Badge>
            
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="secondary"
                  className={cn('text-xs flex items-center gap-1', getDifficultyColor(template.setup_difficulty))}
                >
                  {getDifficultyIcon(template.setup_difficulty)}
                  {template.setup_difficulty}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Setup difficulty: {template.setup_difficulty}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  {getModelFetchingIcon(template.model_fetching)}
                  {template.model_fetching}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Model fetching: {template.model_fetching}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>

        <CardContent className="py-3">
          {/* Model Information */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                {template.model_fetching === 'dynamic' ? 'Available Models' : 'Popular Models'}
              </p>
              
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading models...
                </div>
              ) : models.length > 0 ? (
                <div className="space-y-1">
                  {models.slice(0, 3).map((model, index) => (
                    <div 
                      key={index} 
                      className="text-xs font-mono bg-neutral-50 dark:bg-neutral-900 px-2 py-1 rounded"
                    >
                      {model}
                    </div>
                  ))}
                  {models.length > 3 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      +{models.length - 3} more models
                    </p>
                  )}
                </div>
              ) : template.popular_models && template.popular_models.length > 0 ? (
                <div className="space-y-1">
                  {template.popular_models.slice(0, 3).map((model, index) => (
                    <div 
                      key={index} 
                      className="text-xs font-mono bg-neutral-50 dark:bg-neutral-900 px-2 py-1 rounded opacity-75"
                    >
                      {model}
                    </div>
                  ))}
                  {template.popular_models.length > 3 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      +{template.popular_models.length - 3} more models
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">
                  No models available
                </p>
              )}
            </div>
            
            {/* Configuration Schema Info */}
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Required Configuration
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(template.config_schema).map(([key, config]) => (
                  <Badge 
                    key={key} 
                    variant="outline" 
                    className={cn(
                      'text-xs',
                      config.required 
                        ? 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400' 
                        : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'
                    )}
                  >
                    {config.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-3 gap-2">
          <Button
            onClick={handleConfigure}
            variant={configured ? "outline" : "default"}
            size="sm"
            className="flex-1"
          >
            <Settings className="h-3 w-3 mr-1" />
            {configured ? "Reconfigure" : "Configure"}
          </Button>
          
          {template.model_fetching === 'dynamic' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleRefreshModels}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh models from API</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {template.documentation_url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => window.open(template.documentation_url, '_blank')}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View documentation</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
};