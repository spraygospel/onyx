/**
 * ModelAdd Component - Manual Model Input with Individual Testing
 * Replaces ModelDiscovery.tsx to eliminate ad blocker conflicts
 * Following development plan in dev_plan/1.3_addLLM.md
 */

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TestTube,
  Zap,
  Cpu,
  Clock
} from 'lucide-react';
import { ProviderTemplate } from '@/lib/types/providerTemplates';
import ProviderTemplateAPI from '@/lib/api/providerTemplates';
import { cn } from '@/lib/utils';

interface ModelAddProps {
  provider: ProviderTemplate;
  apiConfig: Record<string, string>;
  selectedModels: string[];
  onModelsChanged: (models: string[]) => void;
  className?: string;
}

interface ModelEntry {
  name: string;
  status: 'verified' | 'testing' | 'error';
  error?: string;
  testResult?: {
    success: boolean;
    model_info?: {
      model_name: string;
      provider: string;
      supports_image_input?: boolean;
    };
  };
  category?: 'popular' | 'fast' | 'powerful' | 'specialized';
}

interface TestState {
  loading: boolean;
  error: string | null;
  testingModel: string | null;
}

export const ModelAdd: React.FC<ModelAddProps> = ({
  provider,
  apiConfig,
  selectedModels,
  onModelsChanged,
  className,
}) => {
  const [manualModelInput, setManualModelInput] = useState('');
  const [testState, setTestState] = useState<TestState>({
    loading: false,
    error: null,
    testingModel: null,
  });
  const [modelEntries, setModelEntries] = useState<Map<string, ModelEntry>>(new Map());

  // Categorize model based on naming patterns
  const categorizeModel = (modelName: string): ModelEntry['category'] => {
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
  const getCategoryInfo = (category: ModelEntry['category']) => {
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

  // Test and add model
  const handleTestAndAddModel = useCallback(async () => {
    const modelName = manualModelInput.trim();
    if (!modelName) return;

    // Check if model already exists
    if (selectedModels.includes(modelName)) {
      setTestState({
        loading: false,
        error: 'Model already added',
        testingModel: null,
      });
      return;
    }

    setTestState({
      loading: true,
      error: null,
      testingModel: modelName,
    });

    // Update model entry to show testing state
    setModelEntries(prev => {
      const newMap = new Map(prev);
      newMap.set(modelName, {
        name: modelName,
        status: 'testing',
        category: categorizeModel(modelName),
      });
      return newMap;
    });

    try {
      const result = await ProviderTemplateAPI.testModelConnection({
        provider_id: provider.id || provider.name,
        model_name: modelName,
        configuration: apiConfig,
      });

      if (result.success) {
        // Model test successful, add to selected models
        const updatedModels = [...selectedModels, modelName];
        onModelsChanged(updatedModels);

        // Update model entry with success
        setModelEntries(prev => {
          const newMap = new Map(prev);
          newMap.set(modelName, {
            name: modelName,
            status: 'verified',
            testResult: result,
            category: categorizeModel(modelName),
          });
          return newMap;
        });

        // Clear input
        setManualModelInput('');
        setTestState({
          loading: false,
          error: null,
          testingModel: null,
        });
      } else {
        // Model test failed
        setModelEntries(prev => {
          const newMap = new Map(prev);
          newMap.set(modelName, {
            name: modelName,
            status: 'error',
            error: result.error,
            category: categorizeModel(modelName),
          });
          return newMap;
        });

        setTestState({
          loading: false,
          error: result.error || 'Model test failed',
          testingModel: null,
        });
      }
    } catch (error) {
      console.error('Model test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      
      // Update model entry with error
      setModelEntries(prev => {
        const newMap = new Map(prev);
        newMap.set(modelName, {
          name: modelName,
          status: 'error',
          error: errorMessage,
          category: categorizeModel(modelName),
        });
        return newMap;
      });

      setTestState({
        loading: false,
        error: errorMessage,
        testingModel: null,
      });
    }
  }, [manualModelInput, selectedModels, onModelsChanged, provider, apiConfig]);

  // Handle model removal
  const handleRemoveModel = useCallback((modelName: string) => {
    const updatedModels = selectedModels.filter(model => model !== modelName);
    onModelsChanged(updatedModels);

    // Remove from model entries
    setModelEntries(prev => {
      const newMap = new Map(prev);
      newMap.delete(modelName);
      return newMap;
    });
  }, [selectedModels, onModelsChanged]);

  // Handle keyboard Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTestAndAddModel();
    }
  };

  // Handle input change (clear error when typing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualModelInput(e.target.value);
    if (testState.error) {
      setTestState(prev => ({ ...prev, error: null }));
    }
  };

  return (
    <Card className={cn('w-full max-w-4xl', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Models
            </CardTitle>
            <CardDescription>
              Add and verify your models by manually entering model names. Each model will be tested before being added.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Manual Model Input */}
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="model-input">Model Name</Label>
              <Input
                id="model-input"
                placeholder="Enter model name (e.g., llama-3.3-70b-versatile)"
                value={manualModelInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={testState.loading}
              />
            </div>
            <Button
              onClick={handleTestAndAddModel}
              disabled={!manualModelInput.trim() || testState.loading}
              className="min-w-[120px]"
            >
              {testState.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test & Add
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {testState.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{testState.error}</AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Models Display */}
        <div className="space-y-6">
          {selectedModels.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Added Models</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedModels.map((modelName) => {
                  const entry = modelEntries.get(modelName);
                  const category = entry?.category || categorizeModel(modelName);
                  const categoryInfo = getCategoryInfo(category);
                  const IconComponent = categoryInfo.icon;

                  return (
                    <div
                      key={modelName}
                      className={cn(
                        'relative p-3 border rounded-lg transition-all duration-200',
                        entry?.status === 'verified' 
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                          : entry?.status === 'testing'
                          ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                          : entry?.status === 'error'
                          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                          : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/20'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm font-medium truncate">
                              {modelName}
                            </p>
                            {entry?.status === 'verified' && (
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                            {entry?.status === 'testing' && (
                              <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
                            )}
                            {entry?.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Manual
                            </Badge>
                            <IconComponent className={cn('h-3 w-3', categoryInfo.color)} />
                          </div>

                          {entry?.error && (
                            <p className="text-xs text-red-600 mt-1">{entry.error}</p>
                          )}
                        </div>

                        <Button
                          onClick={() => handleRemoveModel(modelName)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-neutral-500 dark:text-neutral-400">
                <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No models added yet</h3>
                <p className="text-sm">
                  Add your first model using the form above. Each model will be tested before being added.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected
        </div>
        
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <TestTube className="h-3 w-3" />
          Manual model testing enabled
        </div>
      </CardFooter>
    </Card>
  );
};