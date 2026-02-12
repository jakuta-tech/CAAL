'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Brain, Clock, FloppyDisk, Trash, X } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/livekit/button';

interface MemoryEntry {
  key: string;
  value: unknown;
  stored_at: number;
  expires_at: number | null;
  source: 'tool_hint' | 'explicit' | 'api';
}

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatExpiry(expiresAt: number | null): string {
  if (expiresAt === null) return 'no expiry';

  const now = Date.now() / 1000;
  const remaining = expiresAt - now;

  if (remaining <= 0) return 'expired';
  if (remaining < 60) return `${Math.floor(remaining)}s`;
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m`;
  if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`;
  return `${Math.floor(remaining / 86400)}d`;
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    const str = JSON.stringify(value);
    return str.length > 80 ? str.slice(0, 77) + '...' : str;
  } catch {
    return String(value);
  }
}

function expiryToTtlOption(expiresAt: number | null): string {
  if (expiresAt === null) return 'never';
  const remaining = expiresAt - Date.now() / 1000;
  if (remaining <= 0) return '1h';
  if (remaining <= 3600) return '1h';
  if (remaining <= 21600) return '6h';
  if (remaining <= 86400) return '1d';
  if (remaining <= 604800) return '7d';
  return '30d';
}

const TTL_OPTIONS: Record<string, number | null> = {
  '1h': 3600,
  '6h': 21600,
  '1d': 86400,
  '7d': 604800,
  '30d': 2592000,
  never: null,
};

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    tool_hint: 'bg-blue-500/20 text-blue-400',
    explicit: 'bg-green-500/20 text-green-400',
    api: 'bg-purple-500/20 text-purple-400',
  };

  const labels: Record<string, string> = {
    tool_hint: 'tool',
    explicit: 'voice',
    api: 'api',
  };

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors[source] || 'bg-gray-500/20 text-gray-400'}`}
    >
      {labels[source] || source}
    </span>
  );
}

export function MemoryPanel({ isOpen, onClose }: MemoryPanelProps) {
  const t = useTranslations('Memory');
  const tCommon = useTranslations('Common');

  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<MemoryEntry | null>(null);
  const [originalValue, setOriginalValue] = useState('');
  const [editValue, setEditValue] = useState('');
  const [originalTtl, setOriginalTtl] = useState('');
  const [editTtl, setEditTtl] = useState('');
  const editing = editValue !== originalValue || editTtl !== originalTtl;

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch memory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMemory();
    }
  }, [isOpen, fetchMemory]);

  const handleDelete = async (key: string) => {
    try {
      const res = await fetch(`/api/memory/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEntries(entries.filter((e) => e.key !== key));
        setSelectedEntry(null);
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(t('confirmClearAll'))) return;

    try {
      const res = await fetch('/api/memory', { method: 'DELETE' });
      if (res.ok) {
        setEntries([]);
      }
    } catch (err) {
      console.error('Failed to clear memory:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedEntry) return;

    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: selectedEntry.key,
          value: editValue,
          source: selectedEntry.source,
          ttl_seconds: TTL_OPTIONS[editTtl],
        }),
      });
      if (res.ok) {
        setSelectedEntry(null);
        fetchMemory();
      }
    } catch (err) {
      console.error('Failed to save memory entry:', err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="panel-elevated absolute inset-y-0 right-0 flex w-full flex-col sm:w-[85%] sm:max-w-3xl"
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
            <div className="flex items-center gap-3">
              <Brain className="text-primary h-7 w-7" weight="fill" />
              <div>
                <h1 className="text-2xl font-bold">{t('panel.title')}</h1>
                <p className="text-muted-foreground text-sm">
                  {t('panel.subtitle', { count: entries.length })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" weight="bold" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-muted-foreground py-12 text-center">{tCommon('loading')}</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center">
              <Brain className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground">{t('panel.emptyState')}</p>
              <p className="text-muted-foreground mt-2 text-sm">{t('panel.emptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.key}
                  className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors"
                  style={{ borderColor: 'var(--border-subtle)' }}
                  onClick={() => {
                    const val =
                      typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value);
                    const ttl = expiryToTtlOption(entry.expires_at);
                    setSelectedEntry(entry);
                    setOriginalValue(val);
                    setEditValue(val);
                    setOriginalTtl(ttl);
                    setEditTtl(ttl);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{entry.key}</span>
                      <SourceBadge source={entry.source} />
                    </div>
                    <p className="text-muted-foreground mt-1 truncate text-sm">
                      {formatValue(entry.value)}
                    </p>
                    <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                      <span>{formatTimeAgo(entry.stored_at)}</span>
                      {entry.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatExpiry(entry.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry.key);
                    }}
                    className="text-muted-foreground hover:text-destructive ml-4 p-2 transition-colors"
                    title={tCommon('delete')}
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <div
          className="section-divider shrink-0 p-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <Button
            variant="secondary"
            onClick={handleClearAll}
            disabled={entries.length === 0}
            className="w-full"
          >
            <Trash className="h-4 w-4" />
            {t('panel.clearAll')}
          </Button>
        </div>
      </div>

      {/* Detail modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedEntry(null)} />
          <div
            className="panel-elevated relative mx-4 max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl p-6"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={() => setSelectedEntry(null)}
              className="text-muted-foreground hover:text-foreground absolute top-4 right-4 p-1"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-mono text-lg font-bold">{selectedEntry.key}</h2>
              <SourceBadge source={selectedEntry.source} />
            </div>

            <div className="mb-4">
              <label className="text-muted-foreground mb-1 block text-xs uppercase">
                {t('detail.value')}
              </label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-muted w-full rounded-lg border p-3 font-mono text-sm"
                style={{ borderColor: 'var(--border-subtle)' }}
              />
            </div>

            <div className="text-muted-foreground space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs uppercase">{t('detail.storedAt')}</label>
                  <span>{new Date(selectedEntry.stored_at * 1000).toLocaleString()}</span>
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase">TTL</label>
                  <select
                    value={editTtl}
                    onChange={(e) => setEditTtl(e.target.value)}
                    className="bg-muted rounded-lg border px-2 py-1 text-sm"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <option value="1h">1 hour</option>
                    <option value="6h">6 hours</option>
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="never">{t('detail.noExpiry')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase">{t('detail.expiresAt')}</label>
                <span>
                  {selectedEntry.expires_at
                    ? new Date(selectedEntry.expires_at * 1000).toLocaleString()
                    : t('detail.noExpiry')}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedEntry(null)}>
                {tCommon('close')}
              </Button>
              {editing ? (
                <Button variant="primary" onClick={handleSaveEdit}>
                  <FloppyDisk className="h-4 w-4" />
                  {tCommon('save')}
                </Button>
              ) : (
                <Button variant="primary" onClick={() => handleDelete(selectedEntry.key)}>
                  <Trash className="h-4 w-4" />
                  {tCommon('delete')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
