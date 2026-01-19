import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://agent:8889';

interface InstallRequest {
  workflow: Record<string, unknown>;
  variables: Record<string, string>;
  credentials: Record<string, string>;
  toolName: string;
  voiceTrigger?: string;
}

function substituteVariables(
  workflow: Record<string, unknown>,
  variables: Record<string, string>
): Record<string, unknown> {
  let json = JSON.stringify(workflow);
  for (const [key, value] of Object.entries(variables)) {
    // Escape special regex characters in the value
    const escapedValue = value.replace(/[\\$'"]/g, '\\$&');
    json = json.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), escapedValue);
  }
  return JSON.parse(json);
}

function substituteCredentials(
  workflow: Record<string, unknown>,
  credentials: Record<string, string>
): Record<string, unknown> {
  // credentials is { "GITHUBAPI_CREDENTIAL": "github_account" }
  // Workflow has: "credentials": { "type": { "id": null, "name": "${GITHUBAPI_CREDENTIAL}" } }
  // We need to replace ${VAR_NAME} with the user's n8n credential name
  let json = JSON.stringify(workflow);
  for (const [varName, userCredName] of Object.entries(credentials)) {
    // Credentials use the same ${VAR} syntax as variables
    // Escape special regex characters in the value
    const escapedValue = userCredName.replace(/[\\$'"]/g, '\\$&');
    json = json.replace(new RegExp(`\\$\\{${varName}\\}`, 'g'), escapedValue);
  }
  return JSON.parse(json);
}

function extractN8nBaseUrl(mcpUrl: string): string {
  // n8n_url is stored as full MCP URL: http://host:5678/mcp-server/http
  // We need base URL: http://host:5678
  return mcpUrl.replace(/\/mcp-server\/http\/?$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body: InstallRequest = await request.json();
    const { workflow, variables, credentials, toolName, voiceTrigger } = body;

    if (!workflow || !toolName) {
      return NextResponse.json({ error: 'Missing workflow or toolName' }, { status: 400 });
    }

    // Get n8n settings from backend
    const settingsRes = await fetch(`${WEBHOOK_URL}/settings`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!settingsRes.ok) {
      return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
    }

    const settingsData = await settingsRes.json();
    const settings = settingsData.settings || {};

    if (!settings.n8n_enabled) {
      return NextResponse.json(
        { error: 'n8n is not enabled. Enable it in Settings > Integrations.' },
        { status: 400 }
      );
    }

    if (!settings.n8n_url) {
      return NextResponse.json(
        { error: 'n8n URL not configured. Check Settings > Integrations.' },
        { status: 400 }
      );
    }

    if (!settings.n8n_api_key) {
      return NextResponse.json(
        {
          error: 'n8n API Key not configured. Add one in Settings > Integrations to install tools.',
        },
        { status: 400 }
      );
    }

    const n8nBaseUrl = extractN8nBaseUrl(settings.n8n_url);
    const n8nApiKey = settings.n8n_api_key;

    console.log('[/api/tools/install] n8n base URL:', n8nBaseUrl);
    console.log('[/api/tools/install] API key present:', !!n8nApiKey, 'length:', n8nApiKey?.length);

    // Substitute variables and credentials in workflow
    console.log('[/api/tools/install] Variables to substitute:', variables);
    console.log('[/api/tools/install] Credentials to substitute:', credentials);

    let processedWorkflow = substituteVariables(workflow, variables || {});
    processedWorkflow = substituteCredentials(processedWorkflow, credentials || {});

    // Debug: check if credentials were substituted
    const workflowStr = JSON.stringify(processedWorkflow);
    if (workflowStr.includes('${')) {
      console.log('[/api/tools/install] WARNING: Unsubstituted variables remain in workflow');
      const remaining = workflowStr.match(/\$\{[^}]+\}/g);
      console.log('[/api/tools/install] Remaining placeholders:', remaining);
    }

    // Create workflow in n8n
    const createRes = await fetch(`${n8nBaseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify(processedWorkflow),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error('[/api/tools/install] n8n create error:', createRes.status, errorText);
      return NextResponse.json(
        { error: `Failed to create workflow in n8n: ${errorText}` },
        { status: createRes.status }
      );
    }

    const createdWorkflow = await createRes.json();
    const workflowId = createdWorkflow.id;

    // Activate workflow
    const activateRes = await fetch(`${n8nBaseUrl}/api/v1/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
    });

    if (!activateRes.ok) {
      const activateError = await activateRes.text();
      console.error('[/api/tools/install] n8n activate failed:', activateRes.status, activateError);
      // Don't fail - workflow is created, just not activated
    } else {
      console.log('[/api/tools/install] Workflow activated successfully');
    }

    // Reload tools in agent (will work if session is active)
    try {
      await fetch(`${WEBHOOK_URL}/reload-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_name: 'voice_assistant_room',
          tool_name: toolName,
          message: voiceTrigger ? `I now know how to ${voiceTrigger}` : undefined,
        }),
      });
    } catch {
      // Don't fail install if reload fails (no active session)
      console.log('[/api/tools/install] Tool reload skipped (no active session)');
    }

    return NextResponse.json({
      success: true,
      workflow_id: workflowId,
      message: `Tool "${toolName}" installed successfully`,
    });
  } catch (error) {
    console.error('[/api/tools/install] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
