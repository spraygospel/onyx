/**
 * TypeScript interfaces for Provider Template System
 * Phase 3: Frontend interfaces matching backend ProviderTemplate
 */

export interface FieldConfig {
  type: 'text' | 'password' | 'url' | 'select' | 'file' | 'textarea';
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  validation?: string;
  options?: string[];
  default_value?: string;
}

export interface ProviderTemplate {
  id: string;
  name: string;
  description: string;
  category: 'cloud' | 'local' | 'enterprise' | 'specialized';
  setup_difficulty: 'easy' | 'medium' | 'hard';
  config_schema: Record<string, FieldConfig>;
  popular_models?: string[];
  model_fetching: 'dynamic' | 'static' | 'manual';
  model_endpoint?: string;
  model_list_cache_ttl?: number;
  litellm_provider_name: string;
  model_prefix?: string;
  documentation_url?: string;
  logoUrl?: string;
}

export interface ModelFetchResponse {
  models: string[];
  cached: boolean;
  timestamp: number;
  ttl: number;
}

export interface ProviderCardProps {
  template: ProviderTemplate;
  models?: string[];
  loading?: boolean;
  onConfigure?: (providerId: string) => void;
  onRefreshModels?: (providerId: string) => void;
  configured?: boolean;
  className?: string;
}

export interface ModelDiscoveryProps {
  providerId: string;
  onModelsDiscovered?: (models: string[]) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}