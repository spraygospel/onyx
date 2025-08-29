/**
 * ProviderGrid Component - Phase 3 Implementation
 * Grid layout for displaying multiple LLM provider cards
 */

import React, { useState, useEffect } from 'react';
import { ProviderCard } from './ProviderCard';
import { ProviderTemplate } from '@/lib/types/providerTemplates';
import { Loader2, Filter, Search, Grid3x3, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ProviderGridProps {
  providers: ProviderTemplate[];
  loading?: boolean;
  onConfigure?: (providerId: string) => void;
  onRefreshModels?: (providerId: string) => void;
  configuredProviders?: Set<string>;
  providerModels?: Record<string, string[]>;
  className?: string;
}

interface FilterState {
  search: string;
  category: string | null;
  difficulty: string | null;
  modelFetching: string | null;
  configured: string | null;
}

export const ProviderGrid: React.FC<ProviderGridProps> = ({
  providers,
  loading = false,
  onConfigure,
  onRefreshModels,
  configuredProviders = new Set(),
  providerModels = {},
  className,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: null,
    difficulty: null,
    modelFetching: null,
    configured: null,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filteredProviders, setFilteredProviders] = useState<ProviderTemplate[]>(providers);

  // Apply filters
  useEffect(() => {
    let filtered = providers;

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(provider => 
        provider.name.toLowerCase().includes(searchTerm) ||
        provider.description?.toLowerCase().includes(searchTerm) ||
        provider.litellm_provider_name.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(provider => provider.category === filters.category);
    }

    // Difficulty filter
    if (filters.difficulty && filters.difficulty !== 'all') {
      filtered = filtered.filter(provider => provider.setup_difficulty === filters.difficulty);
    }

    // Model fetching filter
    if (filters.modelFetching && filters.modelFetching !== 'all') {
      filtered = filtered.filter(provider => provider.model_fetching === filters.modelFetching);
    }

    // Configuration status filter
    if (filters.configured && filters.configured !== 'all') {
      const isConfiguredFilter = filters.configured === 'configured';
      filtered = filtered.filter(provider => {
        if (!provider.id) {
          console.warn('[ProviderGrid] Provider missing ID, excluding from filter:', provider.name);
          return false; // Exclude providers without ID
        }
        return configuredProviders.has(provider.id) === isConfiguredFilter;
      });
    }

    setFilteredProviders(filtered);
  }, [filters, providers, configuredProviders]);

  const categories = [...new Set(providers.map(p => p.category))];
  const difficulties = [...new Set(providers.map(p => p.setup_difficulty))];
  const modelFetchingModes = [...new Set(providers.map(p => p.model_fetching))];

  const clearFilters = () => {
    setFilters({
      search: '',
      category: null,
      difficulty: null,
      modelFetching: null,
      configured: null,
    });
  };

  const hasActiveFilters = 
    filters.search ||
    filters.category ||
    filters.difficulty ||
    filters.modelFetching ||
    filters.configured;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">LLM Providers</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Configure and manage your LLM provider connections
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            variant="outline"
            size="sm"
          >
            {viewMode === 'grid' ? (
              <List className="h-4 w-4" />
            ) : (
              <Grid3x3 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search providers..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.category || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({ ...prev, category: value === 'all' ? null : value }))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.difficulty || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({ ...prev, difficulty: value === 'all' ? null : value }))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.configured || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({ ...prev, configured: value === 'all' ? null : value }))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="configured">Configured</SelectItem>
                <SelectItem value="not-configured">Not Configured</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Active filters:</span>
            {filters.search && (
              <Badge variant="secondary" className="text-xs">
                Search: {filters.search}
              </Badge>
            )}
            {filters.category && (
              <Badge variant="secondary" className="text-xs">
                {filters.category.charAt(0).toUpperCase() + filters.category.slice(1)}
              </Badge>
            )}
            {filters.difficulty && (
              <Badge variant="secondary" className="text-xs">
                {filters.difficulty.charAt(0).toUpperCase() + filters.difficulty.slice(1)}
              </Badge>
            )}
            {filters.configured && (
              <Badge variant="secondary" className="text-xs">
                {filters.configured === 'configured' ? 'Configured' : 'Not Configured'}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Showing {filteredProviders.length} of {providers.length} providers
        </p>
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {configuredProviders.size} configured
        </div>
      </div>

      {/* Provider Cards */}
      {filteredProviders.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-4'
        )}>
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              template={provider}
              models={provider.id ? providerModels[provider.id] : undefined}
              onConfigure={onConfigure}
              onRefreshModels={onRefreshModels}
              configured={provider.id ? configuredProviders.has(provider.id) : false}
              className={viewMode === 'list' ? 'max-w-none' : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-neutral-500 dark:text-neutral-400">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No providers found</h3>
            <p className="text-sm">
              {hasActiveFilters 
                ? 'Try adjusting your filters to see more providers'
                : 'No providers are available at the moment'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};