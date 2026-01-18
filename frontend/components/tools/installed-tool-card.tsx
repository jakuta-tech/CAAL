'use client';

import { CheckCircle, ShareNetwork, Tag } from '@phosphor-icons/react/dist/ssr';

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface InstalledToolCardProps {
  workflow: N8nWorkflow;
  isFromRegistry: boolean;
  onShare: (workflow: N8nWorkflow) => void;
  onClick: (workflow: N8nWorkflow) => void;
}

export function InstalledToolCard({
  workflow,
  isFromRegistry,
  onShare,
  onClick,
}: InstalledToolCardProps) {
  const badgeColor = isFromRegistry
    ? 'bg-green-500/20 text-green-400'
    : 'bg-blue-500/20 text-blue-400';
  const badgeText = isFromRegistry ? 'From Registry' : 'Custom';

  return (
    <div
      onClick={() => onClick(workflow)}
      className="bg-card hover:border-primary group relative flex cursor-pointer flex-col rounded-xl border p-4 transition-colors"
    >
      {/* Badge */}
      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
          {badgeText}
        </span>
        {workflow.active && (
          <CheckCircle className="h-4 w-4 text-green-400" weight="fill" aria-label="Active" />
        )}
      </div>

      {/* Title */}
      <h3 className="mb-2 font-semibold">{workflow.name.replace(/-/g, ' ')}</h3>

      {/* Tags */}
      {workflow.tags && workflow.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {workflow.tags.slice(0, 3).map((tag) => (
            <div
              key={tag}
              className="bg-muted flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </div>
          ))}
          {workflow.tags.length > 3 && (
            <span className="text-muted-foreground px-2 py-0.5 text-xs">
              +{workflow.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Updated date */}
      <p className="text-muted-foreground mb-4 text-xs">
        Updated {new Date(workflow.updatedAt).toLocaleDateString()}
      </p>

      {/* Share button (only for custom tools) */}
      {!isFromRegistry && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(workflow);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-auto flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <ShareNetwork className="h-4 w-4" weight="bold" />
          Share to Registry
        </button>
      )}
    </div>
  );
}
