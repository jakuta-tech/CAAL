'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, Warning, X } from '@phosphor-icons/react/dist/ssr';
import { useToolRegistry } from '@/hooks/useToolRegistry';
import type { ToolIndexEntry } from '@/types/tools';
import { BrowseToolsView } from './browse-tools-view';
import { CategoryFilter } from './category-filter';
import { InstalledToolsView } from './installed-tools-view';
import { ToolDetailModal } from './tool-detail-modal';
import { ToolInstallModal } from './tool-install-modal';

type PanelView = 'browse' | 'installed';

interface ToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ToolsPanel({ isOpen, onClose }: ToolsPanelProps) {
  const {
    filteredTools,
    tools: registryTools,
    loading,
    error,
    selectedCategory,
    searchQuery,
    sortBy,
    setCategory,
    setSearch,
    setSortBy,
    refresh,
  } = useToolRegistry();

  const [currentView, setCurrentView] = useState<PanelView>('browse');
  const [installingTool, setInstallingTool] = useState<ToolIndexEntry | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolIndexEntry | null>(null);
  const [n8nEnabled, setN8nEnabled] = useState<boolean | null>(null);
  const [checkingN8n, setCheckingN8n] = useState(true);
  const [installedSearchQuery, setInstalledSearchQuery] = useState('');
  // Map of registry_id -> { version, workflowId }
  const [installedToolsMap, setInstalledToolsMap] = useState<
    Map<string, { version: string; workflowId: string }>
  >(new Map());
  const [n8nBaseUrl, setN8nBaseUrl] = useState<string>('');

  const checkN8nStatus = useCallback(async () => {
    setCheckingN8n(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setN8nEnabled(data.settings?.n8n_enabled ?? false);
      }
    } catch {
      setN8nEnabled(false);
    } finally {
      setCheckingN8n(false);
    }
  }, []);

  const fetchInstalledTools = useCallback(async () => {
    try {
      const res = await fetch('/api/tools/n8n-workflows');
      if (res.ok) {
        const data = await res.json();
        const map = new Map<string, { version: string; workflowId: string }>();
        for (const wf of data.workflows || []) {
          if (wf.caal_registry_id && wf.caal_registry_version) {
            map.set(wf.caal_registry_id, {
              version: wf.caal_registry_version,
              workflowId: wf.id,
            });
          }
        }
        setInstalledToolsMap(map);
        setN8nBaseUrl(data.n8n_base_url || '');
      }
    } catch {
      // Ignore errors - just means we can't show installed status
    }
  }, []);

  // Load registry and check n8n status when panel opens
  useEffect(() => {
    if (isOpen) {
      refresh();
      checkN8nStatus();
      fetchInstalledTools();
    }
  }, [isOpen, refresh, checkN8nStatus, fetchInstalledTools]);

  const handleInstall = useCallback((tool: ToolIndexEntry) => {
    setSelectedTool(null); // Close detail modal if open
    setInstallingTool(tool);
  }, []);

  const handleCardClick = useCallback((tool: ToolIndexEntry) => {
    setSelectedTool(tool);
  }, []);

  const handleInstallComplete = useCallback(() => {
    // Refresh installed tools map after install
    fetchInstalledTools();
  }, [fetchInstalledTools]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="panel-elevated absolute inset-y-0 right-0 flex w-full flex-col sm:w-[85%] sm:max-w-5xl"
        style={{ borderLeft: '1px solid var(--border-subtle)' }}
      >
        {/* Header */}
        <header
          className="section-divider shrink-0"
          style={{
            background: 'rgb(from var(--surface-0) r g b / 0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <h1 className="text-2xl font-bold">Tools</h1>
              <p className="text-muted-foreground text-sm">Expand what CAAL can do</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" weight="bold" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 border-b px-6">
            <button
              onClick={() => setCurrentView('browse')}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                currentView === 'browse'
                  ? 'border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              Browse Registry
            </button>
            <button
              onClick={() => setCurrentView('installed')}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                currentView === 'installed'
                  ? 'border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              Installed Tools
            </button>
          </div>

          {/* Search and filter (for browse view) */}
          {currentView === 'browse' && (
            <div className="space-y-3 px-6 py-4">
              {/* Search and sort row */}
              <div className="flex gap-3">
                {/* Search input */}
                <div className="group relative flex-1">
                  <MagnifyingGlass className="text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2 transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tools..."
                    className="text-foreground placeholder:text-muted-foreground focus:ring-primary w-full border-none py-3 pr-4 pl-12 text-sm transition-all focus:ring-2 focus:outline-none"
                    style={{
                      background: 'rgb(from var(--surface-2) r g b / 0.5)',
                      borderRadius: '0.75rem',
                    }}
                  />
                </div>

                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="select-field text-foreground w-48 shrink-0 py-3 px-3 text-sm"
                >
                  <option value="alphabetical">A → Z</option>
                  <option value="alphabetical-desc">Z → A</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {/* Category filter */}
              <CategoryFilter selected={selectedCategory} onSelect={setCategory} />
            </div>
          )}

          {/* Search (for installed view) */}
          {currentView === 'installed' && (
            <div className="px-6 py-4">
              <div className="group relative">
                <MagnifyingGlass className="text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2 transition-colors" />
                <input
                  type="text"
                  value={installedSearchQuery}
                  onChange={(e) => setInstalledSearchQuery(e.target.value)}
                  placeholder="Search installed tools..."
                  className="text-foreground placeholder:text-muted-foreground focus:ring-primary w-full border-none py-3 pr-4 pl-12 text-sm transition-all focus:ring-2 focus:outline-none"
                  style={{
                    background: 'rgb(from var(--surface-2) r g b / 0.5)',
                    borderRadius: '0.75rem',
                  }}
                />
              </div>
            </div>
          )}
        </header>

        {/* Content */}
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{
            background: 'rgb(from var(--surface-0) r g b / 0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* n8n not enabled warning (only for browse view when trying to install) */}
          {currentView === 'browse' && !checkingN8n && n8nEnabled === false && (
            <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <div className="flex items-start gap-3">
                <Warning className="h-5 w-5 shrink-0 text-orange-400" weight="bold" />
                <div>
                  <p className="font-medium text-orange-200">n8n not configured</p>
                  <p className="text-sm text-orange-300/80">
                    Enable n8n in Settings → Integrations to install tools.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Conditional view rendering */}
          {currentView === 'browse' ? (
            <BrowseToolsView
              filteredTools={filteredTools}
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              n8nEnabled={n8nEnabled ?? false}
              installedToolsMap={installedToolsMap}
              onInstall={handleInstall}
              onCardClick={handleCardClick}
              onRefresh={refresh}
              onClearSearch={() => setSearch('')}
            />
          ) : (
            <InstalledToolsView
              registryTools={registryTools}
              n8nEnabled={n8nEnabled ?? false}
              searchQuery={installedSearchQuery}
            />
          )}
        </main>
      </div>

      {/* Detail modal */}
      {selectedTool && (
        <ToolDetailModal
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
          onInstall={handleInstall}
          n8nEnabled={n8nEnabled ?? false}
          installedStatus={
            selectedTool.id && installedToolsMap.has(selectedTool.id)
              ? {
                  version: installedToolsMap.get(selectedTool.id)!.version,
                  upToDate:
                    installedToolsMap.get(selectedTool.id)!.version === selectedTool.version,
                  workflowId: installedToolsMap.get(selectedTool.id)!.workflowId,
                  n8nBaseUrl: n8nBaseUrl || undefined,
                }
              : undefined
          }
        />
      )}

      {/* Install modal */}
      {installingTool && (
        <ToolInstallModal
          tool={installingTool}
          onClose={() => setInstallingTool(null)}
          onInstallComplete={handleInstallComplete}
        />
      )}
    </div>,
    document.body
  );
}
