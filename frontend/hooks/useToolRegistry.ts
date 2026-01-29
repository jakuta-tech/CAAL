import { useCallback, useMemo, useState } from 'react';
import type { ToolIndexEntry } from '@/types/tools';

export type SortOption = 'alphabetical' | 'alphabetical-desc' | 'newest' | 'oldest';

interface UseToolRegistryReturn {
  tools: ToolIndexEntry[];
  filteredTools: ToolIndexEntry[];
  loading: boolean;
  error: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  sortBy: SortOption;
  setCategory: (category: string | null) => void;
  setSearch: (query: string) => void;
  setSortBy: (sort: SortOption) => void;
  refresh: () => Promise<void>;
}

export function useToolRegistry(): UseToolRegistryReturn {
  const [tools, setTools] = useState<ToolIndexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tools/registry');

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch registry');
      }

      const data = await res.json();
      setTools(data.tools || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useToolRegistry] Error:', message);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredTools = useMemo(() => {
    let result = tools;

    // Filter by category
    if (selectedCategory) {
      result = result.filter((tool) => tool.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tool) =>
          tool.name.toLowerCase().includes(query) ||
          tool.description.toLowerCase().includes(query) ||
          tool.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          tool.voice_triggers.some((trigger) => trigger.toLowerCase().includes(query))
      );
    }

    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case 'alphabetical':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'alphabetical-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.updated).getTime() - new Date(b.updated).getTime());
        break;
    }

    return sorted;
  }, [tools, selectedCategory, searchQuery, sortBy]);

  const setCategory = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  const setSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const setSortByCallback = useCallback((sort: SortOption) => {
    setSortBy(sort);
  }, []);

  return {
    tools,
    filteredTools,
    loading,
    error,
    selectedCategory,
    searchQuery,
    sortBy,
    setCategory,
    setSearch,
    setSortBy: setSortByCallback,
    refresh,
  };
}
