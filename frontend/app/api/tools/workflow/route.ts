import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

const REGISTRY_BASE = 'https://registry.caal.io';
const LOCAL_REGISTRY_PATH =
  process.env.TOOLS_REGISTRY_PATH || '/home/cmac/CoreWorx/2 - Development/caal-tools';

export async function GET(request: NextRequest) {
  const toolPath = request.nextUrl.searchParams.get('path');

  if (!toolPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Validate path format to prevent directory traversal
  if (toolPath.includes('..') || !toolPath.startsWith('tools/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const useLocal = process.env.TOOLS_REGISTRY_LOCAL === 'true';

  try {
    let manifest, workflow;
    let readme: string | null = null;

    if (useLocal) {
      const basePath = path.join(LOCAL_REGISTRY_PATH, toolPath);
      const manifestPath = path.join(basePath, 'manifest.json');
      const workflowPath = path.join(basePath, 'workflow.json');
      const readmePath = path.join(basePath, 'README.md');

      if (!existsSync(manifestPath)) {
        return NextResponse.json({ error: 'Tool manifest not found' }, { status: 404 });
      }

      if (!existsSync(workflowPath)) {
        return NextResponse.json({ error: 'Tool workflow not found' }, { status: 404 });
      }

      manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
      workflow = JSON.parse(await readFile(workflowPath, 'utf-8'));

      try {
        readme = await readFile(readmePath, 'utf-8');
      } catch {
        // README is optional
      }
    } else {
      const manifestUrl = `${REGISTRY_BASE}/${toolPath}/manifest.json`;
      const workflowUrl = `${REGISTRY_BASE}/${toolPath}/workflow.json`;
      const readmeUrl = `${REGISTRY_BASE}/${toolPath}/README.md`;

      const [manifestRes, workflowRes, readmeRes] = await Promise.all([
        fetch(manifestUrl, { headers: { Accept: 'application/json' } }),
        fetch(workflowUrl, { headers: { Accept: 'application/json' } }),
        fetch(readmeUrl, { headers: { Accept: 'text/plain' } }),
      ]);

      if (!manifestRes.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch manifest from registry' },
          { status: manifestRes.status }
        );
      }

      if (!workflowRes.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch workflow from registry' },
          { status: workflowRes.status }
        );
      }

      manifest = await manifestRes.json();
      workflow = await workflowRes.json();

      if (readmeRes.ok) {
        readme = await readmeRes.text();
      }
    }

    return NextResponse.json({ manifest, workflow, readme });
  } catch (error) {
    console.error('[/api/tools/workflow] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
