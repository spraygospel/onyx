/**
 * ProviderConfigurationForm Component - Phase 3 Implementation
 * Dynamic form for configuring LLM provider settings based on config schema
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Eye, 
  EyeOff, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Info,
  X,
  Loader2
} from 'lucide-react';
import { ProviderTemplate, FieldConfig } from '@/lib/types/providerTemplates';
import { cn } from '@/lib/utils';

interface ProviderConfigurationFormProps {
  template: ProviderTemplate;
  initialValues?: Record<string, string>;
  onSave: (values: Record<string, string>) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

interface FormState {
  values: Record<string, string>;
  errors: Record<string, string>;
  showPasswords: Record<string, boolean>;
  touched: Record<string, boolean>;
}

export const ProviderConfigurationForm: React.FC<ProviderConfigurationFormProps> = ({
  template,
  initialValues = {},
  onSave,
  onCancel,
  loading = false,
  className,
}) => {
  const [formState, setFormState] = useState<FormState>({
    values: { ...initialValues },
    errors: {},
    showPasswords: {},
    touched: {},
  });
  const [saving, setSaving] = useState(false);

  // Initialize form values with defaults
  useEffect(() => {
    const defaultValues: Record<string, string> = {};
    
    Object.entries(template.config_schema).forEach(([key, config]) => {
      if (config.default_value && !initialValues[key]) {
        defaultValues[key] = config.default_value;
      }
    });

    if (Object.keys(defaultValues).length > 0) {
      setFormState(prev => ({
        ...prev,
        values: { ...defaultValues, ...initialValues },
      }));
    }
  }, [template.config_schema, initialValues]);

  const validateField = (key: string, value: string, config: FieldConfig): string => {
    // Required field validation
    if (config.required && (!value || value.trim() === '')) {
      return `${config.label} is required`;
    }

    // Regex validation
    if (value && config.validation) {
      try {
        const regex = new RegExp(config.validation);
        if (!regex.test(value)) {
          return `${config.label} format is invalid`;
        }
      } catch (error) {
        console.warn(`Invalid regex pattern for ${key}:`, config.validation);
      }
    }

    // URL validation
    if (value && config.type === 'url') {
      try {
        new URL(value);
      } catch {
        return `${config.label} must be a valid URL`;
      }
    }

    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.entries(template.config_schema).forEach(([key, config]) => {
      const value = formState.values[key] || '';
      const error = validateField(key, value, config);
      
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setFormState(prev => ({ ...prev, errors: newErrors }));
    return isValid;
  };

  const handleFieldChange = (key: string, value: string) => {
    const config = template.config_schema[key];
    const error = config ? validateField(key, value, config) : "";

    setFormState(prev => ({
      ...prev,
      values: { ...prev.values, [key]: value },
      errors: { ...prev.errors, [key]: error },
      touched: { ...prev.touched, [key]: true },
    }));
  };

  const togglePasswordVisibility = (key: string) => {
    setFormState(prev => ({
      ...prev,
      showPasswords: {
        ...prev.showPasswords,
        [key]: !prev.showPasswords[key],
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formState.values);
    } catch (error) {
      console.error('Failed to save provider configuration:', error);
      // Handle error (could show toast notification)
    } finally {
      setSaving(false);
    }
  };

  const renderField = (key: string, config: FieldConfig) => {
    const value = formState.values[key] || '';
    const error = formState.errors[key];
    const touched = formState.touched[key];
    const hasError = error && touched;

    const baseInputProps = {
      id: key,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleFieldChange(key, e.target.value),
      placeholder: config.placeholder || '',
      className: cn(
        hasError && 'border-red-500 dark:border-red-400'
      ),
    };

    switch (config.type) {
      case 'password':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={key} className={cn(hasError && 'text-red-600 dark:text-red-400')}>
                {config.label} {config.required && <span className="text-red-500">*</span>}
              </Label>
              {config.description && (
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-neutral-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="relative">
              <Input
                {...baseInputProps}
                type={formState.showPasswords[key] ? 'text' : 'password'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => togglePasswordVisibility(key)}
              >
                {formState.showPasswords[key] ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {hasError && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={key} className={cn(hasError && 'text-red-600 dark:text-red-400')}>
                {config.label} {config.required && <span className="text-red-500">*</span>}
              </Label>
              {config.description && (
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-neutral-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <Textarea
              {...baseInputProps}
              rows={3}
            />
            {hasError && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={key} className={cn(hasError && 'text-red-600 dark:text-red-400')}>
                {config.label} {config.required && <span className="text-red-500">*</span>}
              </Label>
              {config.description && (
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-neutral-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <Select
              value={value}
              onValueChange={(newValue) => handleFieldChange(key, newValue)}
            >
              <SelectTrigger className={cn(hasError && 'border-red-500 dark:border-red-400')}>
                <SelectValue placeholder={config.placeholder || `Select ${config.label}`} />
              </SelectTrigger>
              <SelectContent>
                {config.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      default: // text, url, file
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={key} className={cn(hasError && 'text-red-600 dark:text-red-400')}>
                {config.label} {config.required && <span className="text-red-500">*</span>}
              </Label>
              {config.description && (
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-neutral-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <Input
              {...baseInputProps}
              type={config.type === 'url' ? 'url' : 'text'}
            />
            {hasError && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );
    }
  };

  const hasErrors = Object.values(formState.errors).some(error => error);
  const isFormValid = !hasErrors && Object.keys(formState.touched).length > 0;

  return (
    <TooltipProvider>
      <Card className={cn('w-full max-w-2xl', className)}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Configure {template.name}
                <Badge variant="secondary" className="text-xs">
                  {template.category}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                {template.description}
              </CardDescription>
            </div>
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {template.documentation_url && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Need help with configuration?</span>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => window.open(template.documentation_url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View docs
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {Object.entries(template.config_schema).map(([key, config]) => (
              <div key={key}>
                {renderField(key, config)}
              </div>
            ))}
          </CardContent>

          <CardFooter className="flex justify-between">
            <div className="flex items-center gap-2">
              {isFormValid && (
                <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Configuration valid
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={saving || !isFormValid}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </TooltipProvider>
  );
};