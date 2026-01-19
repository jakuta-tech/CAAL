'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise, Warning } from '@phosphor-icons/react/dist/ssr';
import { type SanitizationResult, sanitizeWorkflow } from '@/lib/workflow-sanitizer';
import type { ToolIndexEntry } from '@/types/tools';
import { InstalledToolCard } from './installed-tool-card';
import { ToolDetailModal } from './tool-detail-modal';
import { WorkflowDetailModal } from './workflow-detail-modal';
import { WorkflowSubmissionDialog } from './workflow-submission-dialog';

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  settings?: {
    caal_registry_id?: string;
    caal_registry_version?: string;
  };
}

type WorkflowStatus =
  | { type: 'custom' }
  | { type: 'registry'; upToDate: true }
  | { type: 'registry'; upToDate: false; currentVersion: string; latestVersion: string };

interface InstalledToolsViewProps {
  registryTools: ToolIndexEntry[];
  n8nEnabled: boolean;
}

export function InstalledToolsView({ registryTools, n8nEnabled }: InstalledToolsViewProps) {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [n8nBaseUrl, setN8nBaseUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingWorkflow, setSubmittingWorkflow] = useState<N8nWorkflow | null>(null);
  const [sanitizationResult, setSanitizationResult] = useState<SanitizationResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolIndexEntry | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8nWorkflow | null>(null);

  const fetchWorkflows = useCallback(async () => {
    if (!n8nEnabled) {
      setError('n8n is not enabled. Configure n8n in Settings to see installed tools.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tools/n8n-workflows');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch workflows');
      }

      const data = await res.json();
      setWorkflows(data.workflows || []);
      setN8nBaseUrl(data.n8n_base_url || '');
    } catch (err) {
      console.error('Failed to fetch n8n workflows:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  }, [n8nEnabled]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const getWorkflowStatus = useCallback(
    (workflow: N8nWorkflow): WorkflowStatus => {
      const registryId = workflow.settings?.caal_registry_id;
      const registryVersion = workflow.settings?.caal_registry_version;

      if (!registryId) {
        // No registry ID = custom workflow
        return { type: 'custom' };
      }

      const registryTool = registryTools.find((t) => t.id === registryId);

      if (!registryTool) {
        // ID not found in registry (tool removed?) - treat as custom
        return { type: 'custom' };
      }

      if (registryVersion === registryTool.version) {
        return { type: 'registry', upToDate: true };
      }

      // Version mismatch = update available
      return {
        type: 'registry',
        upToDate: false,
        currentVersion: registryVersion || 'unknown',
        latestVersion: registryTool.version,
      };
    },
    [registryTools]
  );

  const handleShare = useCallback(async (workflow: N8nWorkflow) => {
    setSubmitError(null);

    try {
      // Fetch full workflow JSON (includes credentials)
      const res = await fetch(`/api/tools/n8n-workflow/${workflow.id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch workflow');
      }

      const { workflow: fullWorkflow } = await res.json();

      // Sanitize workflow locally
      const result = sanitizeWorkflow(fullWorkflow);

      console.log('Sanitization result:', result);
      console.log('Detected credentials:', result.detected.credentials);
      console.log('Detected variables:', result.detected.variables);

      // Show confirmation dialog
      setSubmittingWorkflow(workflow);
      setSanitizationResult(result);
    } catch (err) {
      console.error('Share error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to prepare workflow');
    }
  }, []);

  const handleConfirmSubmission = useCallback(async () => {
    if (!submittingWorkflow || !sanitizationResult) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Strip private data before sending to VPS (privacy)
      const detectedForApi = {
        ...sanitizationResult.detected,
        // Strip displayHint from variables
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        variables: sanitizationResult.detected.variables.map(({ displayHint, ...rest }) => rest),
        // Replace original credential names with variable names (privacy + consistency)
        credentials: sanitizationResult.detected.credentials.map((c) => ({
          credential_type: c.credential_type,
          name: c.credential_type.toUpperCase() + '_CREDENTIAL',
        })),
      };

      // POST to VPS
      const response = await fetch('https://registry.caal.io/api/submit/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: sanitizationResult.sanitized,
          detected: detectedForApi,
          metadata: {
            installed_name: submittingWorkflow.name,
            n8n_workflow_id: submittingWorkflow.id,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Submission failed' }));
        throw new Error(errorData.detail || errorData.error || 'Submission failed');
      }

      const { form_url } = await response.json();

      // Open submission form in new tab
      window.open(form_url, '_blank');

      // Close dialog
      setSubmittingWorkflow(null);
      setSanitizationResult(null);
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [submittingWorkflow, sanitizationResult]);

  const handleCancelSubmission = useCallback(() => {
    setSubmittingWorkflow(null);
    setSanitizationResult(null);
    setSubmitError(null);
  }, []);

  const handleCardClick = useCallback(
    (workflow: N8nWorkflow) => {
      // Use registry ID to find matching registry tool
      const registryId = workflow.settings?.caal_registry_id;
      const matchingTool = registryId ? registryTools.find((tool) => tool.id === registryId) : null;

      if (matchingTool) {
        // Show registry tool detail modal
        setSelectedTool(matchingTool);
      } else {
        // Show custom workflow detail modal
        setSelectedWorkflow(workflow);
      }
    },
    [registryTools]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ArrowClockwise className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-muted-foreground mt-4">Loading installed tools...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Warning className="h-8 w-8 text-red-500" />
        <p className="text-muted-foreground mt-4">{error}</p>
        <button
          onClick={fetchWorkflows}
          className="bg-muted hover:bg-muted/80 mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No workflows installed in n8n</p>
      </div>
    );
  }

  // Workflow grid
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <InstalledToolCard
            key={workflow.id}
            workflow={workflow}
            status={getWorkflowStatus(workflow)}
            onShare={handleShare}
            onClick={handleCardClick}
          />
        ))}
      </div>

      {/* Tool detail modal (for registry tools) */}
      {selectedTool && (
        <ToolDetailModal
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
          onInstall={() => {}}
          n8nEnabled={n8nEnabled}
        />
      )}

      {/* Workflow detail modal (for custom workflows) */}
      {selectedWorkflow && (
        <WorkflowDetailModal
          workflow={selectedWorkflow}
          n8nBaseUrl={n8nBaseUrl}
          onClose={() => setSelectedWorkflow(null)}
        />
      )}

      {/* Submission dialog */}
      {submittingWorkflow && sanitizationResult && (
        <WorkflowSubmissionDialog
          workflow={submittingWorkflow}
          result={sanitizationResult}
          error={submitError}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirmSubmission}
          onCancel={handleCancelSubmission}
        />
      )}
    </>
  );
}
