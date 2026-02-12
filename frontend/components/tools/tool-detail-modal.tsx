'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Markdown from 'react-markdown';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import remarkGfm from 'remark-gfm';
import {
  ArrowRight,
  ArrowSquareOut,
  BookOpenText,
  ChatCircle,
  CheckCircle,
  CheckSquare,
  CircleNotch,
  Code,
  GithubLogo,
  HardDrives,
  House,
  Key,
  ListBullets,
  Microphone,
  Package,
  PlayCircle,
  PuzzlePiece,
  Stack,
  Tag,
  Trophy,
  Warning,
  Wrench,
  X,
} from '@phosphor-icons/react/dist/ssr';
import { Tooltip } from '@/components/ui/tooltip';
import {
  CATEGORY_LABELS,
  TIER_LABELS,
  type ToolCategory,
  type ToolIndexEntry,
  type ToolManifest,
} from '@/types/tools';

// Category icon styles (matching tool-card.tsx)
const CATEGORY_ICON_STYLES: Record<ToolCategory, { bg: string; text: string }> = {
  'smart-home': { bg: 'bg-green-500/10', text: 'text-green-400' },
  media: { bg: 'bg-red-500/10', text: 'text-red-400' },
  homelab: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  productivity: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  developer: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  utilities: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
  sports: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  social: { bg: 'bg-pink-500/10', text: 'text-pink-400' },
  other: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
};

// Fallback Phosphor icons per category
const CATEGORY_ICONS: Record<
  ToolCategory,
  React.ComponentType<{ className?: string; weight?: 'fill' | 'regular' | 'bold' }>
> = {
  'smart-home': House,
  media: PlayCircle,
  homelab: HardDrives,
  productivity: CheckSquare,
  developer: Code,
  utilities: Wrench,
  sports: Trophy,
  social: ChatCircle,
  other: PuzzlePiece,
};

interface InstalledStatus {
  version: string;
  upToDate: boolean;
  workflowId?: string;
  n8nBaseUrl?: string;
}

interface ToolDetailModalProps {
  tool: ToolIndexEntry;
  onClose: () => void;
  onInstall: (tool: ToolIndexEntry) => void;
  n8nEnabled: boolean;
  installedStatus?: InstalledStatus;
}

export function ToolDetailModal({
  tool,
  onClose,
  onInstall,
  n8nEnabled,
  installedStatus,
}: ToolDetailModalProps) {
  const t = useTranslations('Tools');

  const [manifest, setManifest] = useState<ToolManifest | null>(null);
  const [readme, setReadme] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'readme'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const category = tool.category as ToolCategory;
  const iconStyles = CATEGORY_ICON_STYLES[category] || CATEGORY_ICON_STYLES.other;
  const IconComponent = CATEGORY_ICONS[category] || CATEGORY_ICONS.other;
  const categoryLabel = CATEGORY_LABELS[category] || tool.category;
  const tierLabel = TIER_LABELS[tool.tier] || tool.tier;

  // Registry icon URL (when tool.icon exists)
  const iconUrl = tool.icon
    ? `https://raw.githubusercontent.com/CoreWorxLab/caal-tools/main/icons/${tool.icon}`
    : null;

  useEffect(() => {
    async function fetchManifest() {
      try {
        const res = await fetch(`/api/tools/workflow?path=${encodeURIComponent(tool.path)}`);
        if (!res.ok) {
          throw new Error('Failed to fetch tool details');
        }
        const data = await res.json();
        setManifest(data.manifest);
        if (data.readme) setReadme(data.readme);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchManifest();
  }, [tool.path]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="bg-surface-1 relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        {/* Watermark icon (faded, rotated) */}
        <div
          className={`pointer-events-none absolute -top-8 -right-8 opacity-[0.03] ${iconStyles.text}`}
          style={{ fontSize: '200px', transform: 'rotate(-15deg)' }}
        >
          {iconUrl ? (
            <Image src={iconUrl} alt="" width={200} height={200} unoptimized />
          ) : (
            <IconComponent className="h-[200px] w-[200px]" />
          )}
        </div>

        {/* Header */}
        <div className="relative z-10 shrink-0 border-b border-white/10 px-6 py-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            {iconUrl ? (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center">
                <Image
                  src={iconUrl}
                  alt=""
                  width={56}
                  height={56}
                  className="max-h-14 w-auto"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${iconStyles.bg}`}
              >
                <IconComponent className={`h-7 w-7 ${iconStyles.text}`} weight="fill" />
              </div>
            )}

            {/* Title and badges */}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  {categoryLabel}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground rounded border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                  {tierLabel}
                </span>
              </div>
              <h2 className="text-xl font-bold">
                {tool.friendlyName || tool.name.replace(/-/g, ' ')}
              </h2>
            </div>

            {/* Header actions */}
            <div className="flex shrink-0 items-center gap-1">
              {readme && (
                <Tooltip
                  content={activeTab === 'readme' ? 'View details' : 'View README'}
                  side="bottom"
                >
                  <button
                    onClick={() => setActiveTab(activeTab === 'readme' ? 'details' : 'readme')}
                    className={`rounded-full p-1.5 transition-colors ${
                      activeTab === 'readme'
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {activeTab === 'readme' ? (
                      <ListBullets className="h-5 w-5" />
                    ) : (
                      <BookOpenText className="h-5 w-5" />
                    )}
                  </button>
                </Tooltip>
              )}
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CircleNotch className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-4">{t('detail.loading')}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Warning className="h-8 w-8 text-red-500" />
              <p className="text-muted-foreground mt-4">{error}</p>
            </div>
          ) : activeTab === 'readme' && readme ? (
            <div className="prose-invert prose prose-sm max-w-none">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-4 border-b border-white/10 pb-2 text-xl font-bold">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mt-6 mb-3 border-b border-white/10 pb-1.5 text-lg font-semibold">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mt-4 mb-2 text-base font-semibold">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-muted-foreground mb-3 leading-relaxed">{children}</p>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => (
                    <ul className="text-muted-foreground mb-3 list-disc space-y-1 pl-5">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="text-muted-foreground mb-3 list-decimal space-y-1 pl-5">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  code: ({ className, children }) => {
                    const isBlock = className?.includes('language-');
                    return isBlock ? (
                      <code className={`${className} text-sm`}>{children}</code>
                    ) : (
                      <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-orange-300">
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="mb-3 overflow-x-auto rounded-lg border border-white/5 bg-black/30 p-4 text-sm">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-primary/30 text-muted-foreground mb-3 border-l-2 pl-4 italic">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="mb-3 overflow-x-auto">
                      <table className="w-full border-collapse text-sm">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="text-muted-foreground border border-white/10 px-3 py-2">
                      {children}
                    </td>
                  ),
                  hr: () => <hr className="my-4 border-white/10" />,
                }}
              >
                {readme}
              </Markdown>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <p className="text-muted-foreground leading-relaxed">
                  {manifest?.description || tool.description}
                </p>
              </div>

              {/* Tool Suite indicator */}
              {(manifest?.toolSuite || tool.toolSuite) && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Stack className="h-4 w-4 text-cyan-400" />
                    {t('detail.toolSuiteTitle')}
                  </h3>
                  <p className="text-muted-foreground mb-3 text-sm">
                    {t('detail.toolSuiteDescription')}
                  </p>
                  {(manifest?.actions || tool.actions) && (
                    <div className="flex flex-wrap gap-2">
                      {(manifest?.actions || tool.actions)?.map((action) => (
                        <span
                          key={action}
                          className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-300 capitalize"
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Voice triggers */}
              {manifest?.voice_triggers && manifest.voice_triggers.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Microphone className="text-primary h-4 w-4" />
                    {t('detail.voiceTriggersTitle')}
                  </h3>
                  <div className="space-y-2">
                    {manifest.voice_triggers.map((trigger, i) => (
                      <div
                        key={i}
                        className="border-primary/20 bg-primary/10 text-primary rounded-lg border p-3 text-sm italic"
                      >
                        &ldquo;{t('detail.voiceTriggerFormat', { trigger })}&rdquo;
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required services */}
              {manifest?.required_services && manifest.required_services.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4 text-purple-400" />
                    {t('detail.requiredServicesTitle')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {manifest.required_services.map((service) => (
                      <span
                        key={service}
                        className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-sm text-purple-300"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Required variables */}
              {manifest?.required_variables && manifest.required_variables.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Key className="h-4 w-4 text-orange-400" />
                    {t('detail.requiredVariablesTitle')}
                  </h3>
                  <div className="space-y-3 rounded-lg border border-white/5 bg-white/5 p-4">
                    {manifest.required_variables.map((v) => (
                      <div key={v.name} className="last:mb-0">
                        <code className="text-xs font-semibold text-orange-300">{v.name}</code>
                        <p className="text-muted-foreground mt-0.5 text-sm">{v.description}</p>
                        <p className="text-muted-foreground/60 mt-1 text-xs">
                          {t('detail.exampleLabel')}{' '}
                          <code className="text-orange-300/60">{v.example}</code>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required credentials */}
              {manifest?.required_credentials && manifest.required_credentials.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Key className="h-4 w-4 text-green-400" />
                    {t('detail.requiredCredentialsTitle')}
                  </h3>
                  <div className="space-y-3 rounded-lg border border-white/5 bg-white/5 p-4">
                    {manifest.required_credentials.map((c) => (
                      <div key={c.name}>
                        <p className="text-sm font-medium">{c.description}</p>
                        <p className="text-muted-foreground text-xs">
                          {c.credential_type}
                          {c.node && ` • ${c.node}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {manifest?.tags && manifest.tags.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Tag className="text-muted-foreground h-4 w-4" />
                    {t('detail.tagsTitle')}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {manifest.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-muted-foreground rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-semibold tracking-tight uppercase"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Author */}
              {manifest?.author && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <GithubLogo className="text-muted-foreground h-4 w-4" />
                    {t('detail.authorTitle')}
                  </h3>
                  <a
                    href={`https://github.com/${manifest.author.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm hover:underline"
                  >
                    @{manifest.author.github}
                  </a>
                </div>
              )}

              {/* n8n Workflow Link (when installed) */}
              {installedStatus?.workflowId && installedStatus?.n8nBaseUrl && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <ArrowSquareOut className="text-muted-foreground h-4 w-4" />
                    {t('detail.workflowTitle')}
                  </h3>
                  <a
                    href={`${installedStatus.n8nBaseUrl}/workflow/${installedStatus.workflowId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-2 text-sm hover:underline"
                  >
                    {t('detail.openWorkflowButton')}
                    <ArrowSquareOut className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 shrink-0 border-t border-white/10 px-6 py-4">
          {!n8nEnabled ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-400">
              <Warning className="h-4 w-4" />
              {t('detail.n8nDisabledMessage')}
            </div>
          ) : installedStatus?.upToDate ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-green-400">
              <CheckCircle className="h-5 w-5" weight="fill" />
              <span className="font-medium">{t('card.installedBadge')}</span>
              <span className="text-sm text-green-400/60">v{installedStatus.version}</span>
            </div>
          ) : installedStatus ? (
            <button
              onClick={() => onInstall(tool)}
              disabled={loading || !!error}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('detail.updateButton', { version: tool.version })}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onInstall(tool)}
              disabled={loading || !!error}
              className="bg-primary-bg hover:bg-primary-bg/90 disabled:bg-muted disabled:text-muted-foreground flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-white transition-colors disabled:cursor-not-allowed"
            >
              {t('detail.installButton')}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
