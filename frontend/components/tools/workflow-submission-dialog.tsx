'use client';

import { createPortal } from 'react-dom';
import { CheckCircle, Warning, X } from '@phosphor-icons/react/dist/ssr';
import type { SanitizationResult } from '@/lib/workflow-sanitizer';

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowSubmissionDialogProps {
  workflow: N8nWorkflow;
  result: SanitizationResult;
  error: string | null;
  isSubmitting?: boolean;
  formUrl?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WorkflowSubmissionDialog({
  workflow,
  result,
  error,
  isSubmitting = false,
  formUrl,
  onConfirm,
  onCancel,
}: WorkflowSubmissionDialogProps) {
  const { detected, warnings } = result;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="bg-background relative z-10 w-full max-w-2xl rounded-xl border shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-bold">Share Workflow to Registry</h2>
            <p className="text-muted-foreground mt-1 text-sm">{workflow.name}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-6">
          {/* Security note */}
          <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-400" weight="fill" />
            <div>
              <p className="font-medium text-green-200">Your secrets never leave your network</p>
              <p className="text-sm text-green-300/80">
                Sanitization happens locally in your browser before submission. Credential IDs are
                nullified.
              </p>
            </div>
          </div>

          {/* Variables detected */}
          {detected.variables.length > 0 && (
            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="mb-2 font-medium">Variables detected (will be parameterized):</p>
              <ul className="space-y-1 text-sm">
                {detected.variables.map((v, i) => (
                  <li key={i} className="text-muted-foreground font-mono">
                    {v.displayHint ? (
                      <>
                        <span className="text-foreground/80">{v.displayHint}</span>
                        <span className="text-muted-foreground/60"> → </span>${'{'}
                        {v.name}
                        {'}'}
                      </>
                    ) : (
                      <>
                        ${'{'}
                        {v.name}
                        {'}'} - {v.description}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Credentials detected */}
          {detected.credentials.length > 0 && (
            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="mb-2 font-medium">Credentials found and being parameterized:</p>
              <ul className="space-y-1 text-sm">
                {detected.credentials.map((c, i) => {
                  const varName =
                    c.credential_type.toUpperCase().replace(/([a-z])([A-Z])/g, '$1_$2') +
                    '_CREDENTIAL';
                  return (
                    <li key={i} className="text-muted-foreground font-mono">
                      {c.name} ({c.credential_type}) → ${'{'}
                      {varName}
                      {'}'}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Private URLs detected */}
          {detected.private_urls && detected.private_urls.length > 0 && (
            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="mb-2 font-medium">Private network URLs (will be parameterized):</p>
              <ul className="space-y-1 text-sm">
                {detected.private_urls.map((url, i) => (
                  <li key={i} className="text-muted-foreground font-mono">
                    {url}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <Warning className="h-5 w-5 shrink-0 text-yellow-400" weight="fill" />
              <div className="space-y-1">
                {warnings.map((warning, i) => (
                  <p key={i} className="text-sm text-yellow-300/80">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <Warning className="h-5 w-5 shrink-0 text-red-400" weight="fill" />
              <div>
                <p className="font-medium text-red-200">Submission failed</p>
                <p className="text-sm text-red-300/80">{error}</p>
              </div>
            </div>
          )}

          {/* Success - Form URL ready */}
          {formUrl && !error && (
            <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <CheckCircle className="h-5 w-5 shrink-0 text-green-400" weight="fill" />
              <div className="flex-1">
                <p className="font-medium text-green-200">Ready to submit!</p>
                <p className="mt-1 text-sm text-green-300/80">
                  Complete your submission in the form. If popup was blocked, click below:
                </p>
                <a
                  href={formUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-500"
                >
                  Open Submission Form
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t p-6">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="hover:bg-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {formUrl ? 'Close' : 'Cancel'}
          </button>
          {!formUrl && (
            <button
              onClick={onConfirm}
              disabled={!!error || isSubmitting}
              className="bg-primary-bg text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium shadow-[0_2px_4px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {isSubmitting ? 'Preparing submission...' : 'Continue to Submission Form'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
