import { NextResponse } from 'next/server';

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://agent:8889';

/**
 * GET /api/tools/n8n-workflow/[id]
 * Fetches full workflow JSON from n8n REST API (includes credentials).
 * Used for workflow submission to the Tool Registry.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const res = await fetch(`${WEBHOOK_URL}/n8n-workflow/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[/api/tools/n8n-workflow/${id}] Backend error:`, res.status, text);
      return NextResponse.json({ error: text || 'Backend error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[/api/tools/n8n-workflow] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
