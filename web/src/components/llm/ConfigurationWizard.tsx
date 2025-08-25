/**
 * ConfigurationWizard Component - Phase 4 Implementation
 * Step-by-step wizard for provider configuration with model discovery
 */

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle,
  Loader2,
  Settings,
  Zap,
  TestTube
} from 'lucide-react';
import { ProviderTemplate } from '@/lib/types/providerTemplates';
import { ProviderConfigurationForm } from './ProviderConfigurationForm';
import { ModelDiscovery } from './ModelDiscovery';
import { cn } from '@/lib/utils';

interface ConfigurationWizardProps {
  provider: ProviderTemplate;
  initialConfiguration?: Record<string, string>;
  initialSelectedModels?: string[];
  onComplete: (configuration: Record<string, string>, models: string[]) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  optional?: boolean;
}

interface WizardState {
  currentStep: number;
  configuration: Record<string, string>;
  selectedModels: string[];
  stepErrors: Record<number, string>;
  stepComplete: Record<number, boolean>;
  testing: boolean;
  testResult: { success: boolean; error?: string; message?: string; modelCount?: number } | null;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'configure',
    title: 'Configuration',
    description: 'Configure your provider settings',
    icon: Settings,
  },
  {
    id: 'test',
    title: 'Test Connection',
    description: 'Verify your configuration works',
    icon: TestTube,
  },
  {
    id: 'models',
    title: 'Model Discovery',
    description: 'Select available models',
    icon: Zap,
  },
];

export const ConfigurationWizard: React.FC<ConfigurationWizardProps> = ({
  provider,
  initialConfiguration = {},
  initialSelectedModels = [],
  onComplete,
  onCancel,
  className,
}) => {
  const [state, setState] = useState<WizardState>({
    currentStep: 0,
    configuration: { ...initialConfiguration },
    selectedModels: [...initialSelectedModels],
    stepErrors: {},
    stepComplete: {},
    testing: false,
    testResult: null,
  });

  // Check if current step is valid
  const isStepValid = useCallback((stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Configuration
        // Check if all required fields are filled
        return Object.entries(provider.config_schema)
          .filter(([_, config]) => config.required)
          .every(([key, _]) => state.configuration[key]?.trim());
      
      case 1: // Test Connection
        // Test should be successful
        return state.testResult?.success === true;
      
      case 2: // Models
        // At least one model should be selected (only if test passed)
        return state.testResult?.success === true && state.selectedModels.length > 0;
      
      default:
        return false;
    }
  }, [provider.config_schema, state.configuration, state.selectedModels, state.testResult]);

  // Update step completion status
  const updateStepCompletion = useCallback(() => {
    setState(prev => ({
      ...prev,
      stepComplete: {
        ...prev.stepComplete,
        [prev.currentStep]: isStepValid(prev.currentStep),
      },
    }));
  }, [isStepValid]);

  // Handle configuration change
  const handleConfigurationChange = useCallback((newConfiguration: Record<string, string>) => {
    setState(prev => ({
      ...prev,
      configuration: newConfiguration,
      testResult: null, // Clear test result when config changes
      stepErrors: { ...prev.stepErrors, [prev.currentStep]: '' },
    }));
  }, []);

  // Handle model selection change
  const handleModelSelectionChange = useCallback((models: string[]) => {
    setState(prev => ({
      ...prev,
      selectedModels: models,
      stepErrors: { ...prev.stepErrors, [prev.currentStep]: '' },
    }));
  }, []);

  // Test connection
  const handleTestConnection = useCallback(async () => {
    setState(prev => ({ ...prev, testing: true, testResult: null }));
    
    // Debug log
    console.log('Frontend provider object:', provider);
    console.log('model_endpoint:', provider.model_endpoint);
    
    try {
      // Test the provider connection by fetching available models
      const response = await fetch("/api/admin/llm/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: provider.litellm_provider_name || provider.id,
          api_key: state.configuration.api_key,
          api_base: state.configuration.api_base,
          api_version: state.configuration.api_version,
          custom_config: state.configuration,
          deployment_name: state.configuration.deployment_name,
          model_endpoint: provider.model_endpoint,
          litellm_provider_name: provider.litellm_provider_name,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setState(prev => ({
          ...prev,
          testing: false,
          testResult: { 
            success: true, 
            message: result.message || 'Connection successful',
            modelCount: result.model_count || 0
          },
        }));
      } else {
        const errorData = await response.json();
        setState(prev => ({
          ...prev,
          testing: false,
          testResult: { 
            success: false, 
            error: errorData.detail || 'Connection test failed. Please check your configuration.' 
          },
        }));
      }
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        testing: false,
        testResult: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Test failed' 
        },
      }));
    }
  }, [provider, state.configuration]);

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (!isStepValid(state.currentStep)) {
      setState(prev => ({
        ...prev,
        stepErrors: {
          ...prev.stepErrors,
          [prev.currentStep]: 'Please complete this step before continuing',
        },
      }));
      return;
    }

    if (state.currentStep < WIZARD_STEPS.length - 1) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        stepErrors: { ...prev.stepErrors, [prev.currentStep + 1]: '' },
      }));
    }
  }, [state.currentStep, isStepValid]);

  // Navigate to previous step
  const handlePrevious = useCallback(() => {
    if (state.currentStep > 0) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    }
  }, [state.currentStep]);

  // Complete wizard
  const handleComplete = useCallback(async () => {
    if (!isStepValid(2)) {
      setState(prev => ({
        ...prev,
        stepErrors: { ...prev.stepErrors, 2: 'Connection test must pass before completing setup' },
      }));
      return;
    }

    try {
      await onComplete(state.configuration, state.selectedModels);
    } catch (error) {
      setState(prev => ({
        ...prev,
        stepErrors: {
          ...prev.stepErrors,
          [prev.currentStep]: error instanceof Error ? error.message : 'Failed to save configuration',
        },
      }));
    }
  }, [state.configuration, state.selectedModels, onComplete, isStepValid]);

  const currentStepData = WIZARD_STEPS[state.currentStep];
  const currentStepError = state.stepErrors[state.currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <Card className={cn('w-full max-w-4xl', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconComponent className="h-5 w-5" />
              Setup {provider.name}
            </CardTitle>
            <CardDescription>
              Follow the steps to configure your {provider.name} provider
            </CardDescription>
          </div>
          <Badge variant="outline">
            Step {state.currentStep + 1} of {WIZARD_STEPS.length}
          </Badge>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mt-6">
          {WIZARD_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    index < state.currentStep || state.stepComplete[index]
                      ? 'bg-primary border-primary text-primary-foreground'
                      : index === state.currentStep
                      ? 'border-primary text-primary'
                      : 'border-neutral-300 text-neutral-400'
                  )}
                >
                  {index < state.currentStep || state.stepComplete[index] ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    index === state.currentStep ? 'text-primary' : 'text-neutral-600 dark:text-neutral-400'
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <ArrowRight className="h-4 w-4 mx-4 text-neutral-400" />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error display */}
        {currentStepError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{currentStepError}</AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Step content */}
        <div className="min-h-[400px]">
          {state.currentStep === 0 && (
            <ProviderConfigurationForm
              template={provider}
              initialValues={state.configuration}
              onSave={async (values) => {
                handleConfigurationChange(values);
                updateStepCompletion();
              }}
              loading={false}
            />
          )}

          {state.currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <TestTube className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
                <h3 className="text-lg font-medium mb-2">Test Your Configuration</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  Verify that your {provider.name} configuration is working correctly
                </p>
                
                <Button
                  onClick={handleTestConnection}
                  disabled={state.testing}
                  size="lg"
                >
                  {state.testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
              </div>

              {/* Test result */}
              {state.testResult && (
                <Alert variant={state.testResult.success ? 'default' : 'destructive'}>
                  {state.testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {state.testResult.success
                      ? state.testResult.message || `Successfully connected to ${provider.name}! Your configuration is working.`
                      : state.testResult.error || 'Connection test failed'
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Configuration summary */}
              <div className="mt-8 p-4 border rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <h4 className="font-medium mb-3">Configuration Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-neutral-600 dark:text-neutral-400">Provider</p>
                    <p>{provider.name}</p>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-600 dark:text-neutral-400">Models Selected</p>
                    <p>{state.selectedModels.length} models</p>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-600 dark:text-neutral-400">Configuration Fields</p>
                    <p>{Object.keys(state.configuration).length} fields configured</p>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-600 dark:text-neutral-400">Model Fetching</p>
                    <p className="capitalize">{provider.model_fetching}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {state.currentStep === 2 && (
            <div className="space-y-6">
              {state.testResult?.success === true ? (
                <ModelDiscovery
                  provider={provider}
                  apiConfig={state.configuration}
                  selectedModels={state.selectedModels}
                  onModelsSelected={handleModelSelectionChange}
                />
              ) : (
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
                  <h3 className="text-lg font-medium mb-2">Connection Test Required</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                    Please complete the connection test in the previous step before selecting models.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          {onCancel && (
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          )}
          {state.currentStep > 0 && (
            <Button onClick={handlePrevious} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {state.currentStep < WIZARD_STEPS.length - 1 ? (
            <Button 
              onClick={handleNext} 
              disabled={!isStepValid(state.currentStep)}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete}
              disabled={!isStepValid(state.currentStep)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Setup
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};