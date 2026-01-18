'use client';

import { createPortal } from 'react-dom';
import { CheckCircle, Tag, X, XCircle } from '@phosphor-icons/react/dist/ssr';

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowDetailModalProps {
  workflow: N8nWorkflow;
  n8nBaseUrl: string;
  onClose: () => void;
}

export function WorkflowDetailModal({ workflow, n8nBaseUrl, onClose }: WorkflowDetailModalProps) {
  const workflowUrl = `${n8nBaseUrl}/workflow/${workflow.id}`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="bg-background relative z-10 flex h-[80vh] w-full max-w-3xl flex-col rounded-xl border shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b p-6">
          <div>
            <h2 className="text-2xl font-bold">{workflow.name}</h2>
            <p className="text-muted-foreground mt-1 text-sm">Custom Workflow</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-2 transition-colors"
          >
            <X className="h-6 w-6" weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Status */}
            <div>
              <h3 className="mb-2 text-sm font-medium">Status</h3>
              <div className="flex items-center gap-2">
                {workflow.active ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-400" weight="fill" />
                    <span className="text-green-400">Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-400" weight="fill" />
                    <span className="text-red-400">Inactive</span>
                  </>
                )}
              </div>
            </div>

            {/* Tags */}
            {workflow.tags && workflow.tags.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {workflow.tags.map((tag) => (
                    <div
                      key={tag}
                      className="bg-muted flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm"
                    >
                      <Tag className="h-4 w-4" />
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium">Created</h3>
                <p className="text-muted-foreground text-sm">
                  {new Date(workflow.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">Last Updated</h3>
                <p className="text-muted-foreground text-sm">
                  {new Date(workflow.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Workflow URL */}
            <div>
              <h3 className="mb-2 text-sm font-medium">Workflow</h3>
              <a
                href={workflowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-muted block rounded-lg p-3 font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline"
              >
                {workflowUrl}
              </a>
            </div>

            {/* Info box */}
            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-sm">
                This is a custom workflow not published to the CAAL Tool Registry. You can share it
                to the registry using the &quot;Share to Registry&quot; button.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
