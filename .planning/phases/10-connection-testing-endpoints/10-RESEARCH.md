# Phase 10: Connection Testing Endpoints - Research

**Researched:** 2026-02-06
**Domain:** API Connection Testing, Model Discovery, Capability Validation
**Confidence:** HIGH

## Summary

This phase adds connection testing endpoints for the two new LLM providers (OpenAI-compatible and OpenRouter) created in Phase 8. The work follows established patterns from existing test endpoints (`/setup/test-ollama`, `/setup/test-groq`) and requires minimal new architecture decisions.

Key aspects:
1. **OpenAI-compatible testing**: Validate connectivity via `/v1/models` endpoint and discover available models
2. **OpenRouter testing**: Validate API key via `https://openrouter.ai/api/v1/models` and fetch 400+ models with capability filtering
3. **Model capability validation**: Both providers should verify tool calling support through model metadata (OpenRouter) or a simple test call (OpenAI-compatible)

The existing `TestConnectionResponse` Pydantic model already supports returning `models: list[str]`, making integration straightforward. The frontend pattern from `provider-step.tsx` shows how to wire up test buttons with status indicators and model selection.

**Primary recommendation:** Create two new test endpoints following the exact pattern of `test-groq`. OpenAI-compatible uses configurable base URL; OpenRouter uses fixed URL with filtering for tool-capable models.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | (bundled) | Async HTTP client for API calls | Already used in webhooks.py |
| FastAPI | (installed) | REST endpoint definitions | Already used in webhooks.py |
| Pydantic | (via FastAPI) | Request/response validation | Already used, TestConnectionResponse exists |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| json | stdlib | Parse API responses | Model list parsing |
| logging | stdlib | Debug and error logging | Follow existing pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| httpx | openai library | Overkill for simple GET; httpx is lighter |
| Separate endpoints | Single polymorphic endpoint | Separate is clearer, matches existing pattern |

**Installation:**
```bash
# No installation needed - all already available
```

## Architecture Patterns

### Recommended Endpoint Structure
```
Backend (webhooks.py):
  POST /setup/test-openai-compatible  # Test OpenAI-compatible server
  POST /setup/test-openrouter         # Test OpenRouter API key

Frontend (Next.js):
  /api/setup/test-openai-compatible/route.ts  # Proxy to agent
  /api/setup/test-openrouter/route.ts         # Proxy to agent
```

### Pattern 1: Test Endpoint with Model Discovery
**What:** Test connection AND return available models in one call
**When to use:** All connection test endpoints
**Example:**
```python
# Source: Existing pattern from webhooks.py test-groq
@app.post("/setup/test-openai-compatible", response_model=TestConnectionResponse)
async def test_openai_compatible(req: TestOpenAICompatibleRequest) -> TestConnectionResponse:
    """Test OpenAI-compatible server and list available models."""
    try:
        async with httpx.AsyncClient() as client:
            # Use /v1/models endpoint (OpenAI standard)
            response = await client.get(
                f"{req.base_url}/models",
                headers={"Authorization": f"Bearer {req.api_key}"} if req.api_key else {},
                timeout=10.0,
            )
            if response.status_code == 401:
                return TestConnectionResponse(success=False, error="Invalid API key")
            response.raise_for_status()

            data = response.json()
            # OpenAI format: {"data": [{"id": "model-name", ...}]}
            models = [m.get("id") for m in data.get("data", [])]
            models = [m for m in models if m]

            return TestConnectionResponse(success=True, models=models)
    except httpx.ConnectError:
        return TestConnectionResponse(
            success=False, error=f"Cannot connect to server at {req.base_url}"
        )
    except Exception as e:
        return TestConnectionResponse(success=False, error=str(e))
```

### Pattern 2: OpenRouter Model Filtering
**What:** Filter OpenRouter's 400+ models to show relevant ones
**When to use:** OpenRouter model discovery
**Example:**
```python
# Source: OpenRouter API docs - /api/v1/models with filtering
@app.post("/setup/test-openrouter", response_model=TestConnectionResponse)
async def test_openrouter(req: TestOpenRouterRequest) -> TestConnectionResponse:
    """Test OpenRouter API key and list available models."""
    try:
        async with httpx.AsyncClient() as client:
            # Fetch models with tool support filter
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                params={"supported_parameters": "tools"},  # Filter for tool-capable
                headers={"Authorization": f"Bearer {req.api_key}"},
                timeout=15.0,  # Longer timeout - many models
            )
            if response.status_code == 401:
                return TestConnectionResponse(success=False, error="Invalid API key")
            response.raise_for_status()

            data = response.json()
            # OpenRouter format: {"data": [{"id": "provider/model", ...}]}
            models = [m.get("id") for m in data.get("data", [])]
            models = [m for m in models if m]

            return TestConnectionResponse(success=True, models=models)
    except Exception as e:
        return TestConnectionResponse(success=False, error=str(e))
```

### Pattern 3: Request Models with Validation
**What:** Pydantic models for request validation
**When to use:** All test endpoints
**Example:**
```python
# Source: Existing pattern from webhooks.py
class TestOpenAICompatibleRequest(BaseModel):
    """Request body for /setup/test-openai-compatible endpoint."""
    base_url: str      # Required: server URL
    api_key: str = ""  # Optional: some servers don't need auth

class TestOpenRouterRequest(BaseModel):
    """Request body for /setup/test-openrouter endpoint."""
    api_key: str  # Required: OpenRouter always needs API key
```

### Pattern 4: Frontend Proxy Route
**What:** Next.js API route that proxies to agent webhook
**When to use:** All frontend API routes
**Example:**
```typescript
// Source: Existing pattern from frontend/app/api/setup/test-groq/route.ts
import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://agent:8889';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${WEBHOOK_URL}/setup/test-openai-compatible`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### Anti-Patterns to Avoid
- **Testing with chat completion**: Use `/v1/models` GET, not POST to `/v1/chat/completions` - faster and doesn't consume tokens
- **No timeout**: Always set timeout (10-15s) to avoid hanging on unreachable servers
- **Blocking on model list**: Don't block UI while fetching OpenRouter's 400+ models - consider pagination or filtering
- **Returning ALL OpenRouter models**: Filter to tool-capable models to reduce noise

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API connection testing | Custom retry logic | httpx with timeout | Built-in, handles edge cases |
| Model list parsing | Custom JSON parsing | Standard `data.get("data", [])` | Same format across providers |
| Error categorization | Complex error types | Simple success/error string | Matches existing pattern |
| Capability detection | Test chat call | OpenRouter's `supported_parameters` | Metadata is cheaper than test call |

**Key insight:** OpenRouter provides model capability metadata (`supported_parameters` includes `tools`), so filtering happens server-side. OpenAI-compatible servers typically don't expose capabilities in `/v1/models`, so tool support must be validated separately or assumed based on user's model choice.

## Common Pitfalls

### Pitfall 1: OpenAI-Compatible URL Formatting
**What goes wrong:** Double slashes or missing `/v1` in URL
**Why it happens:** User enters `http://localhost:8000/v1/` with trailing slash, code appends `/models`
**How to avoid:** Strip trailing slash before appending path: `base_url.rstrip("/") + "/models"`
**Warning signs:** 404 errors, malformed URLs in logs

### Pitfall 2: Empty Model List on OpenAI-Compatible
**What goes wrong:** Models endpoint returns empty list or different format
**Why it happens:** Some OpenAI-compatible servers (vLLM, LocalAI) have non-standard `/v1/models` responses
**How to avoid:** Handle both `{"data": [...]}` and `{"models": [...]}` formats
**Warning signs:** Empty model dropdown despite successful connection

### Pitfall 3: OpenRouter Rate Limiting
**What goes wrong:** 429 Too Many Requests when testing rapidly
**Why it happens:** User clicks "Test" multiple times quickly
**How to avoid:** Frontend debounce (already handled by `testStatus === 'testing'` disable)
**Warning signs:** Intermittent test failures with rate limit errors

### Pitfall 4: Missing Tool Support Filtering
**What goes wrong:** User selects model that doesn't support tool calling, agent fails at runtime
**Why it happens:** Model list includes all models, not just tool-capable ones
**How to avoid:** For OpenRouter, use `?supported_parameters=tools` filter. For OpenAI-compatible, document that user must verify model supports tools.
**Warning signs:** Runtime errors about unsupported tool_choice parameter

### Pitfall 5: API Key Optional vs Required
**What goes wrong:** Test passes but provider creation fails
**Why it happens:** `/v1/models` doesn't require auth on some servers, but `/v1/chat/completions` does
**How to avoid:** If API key provided, use it; add note that auth may be required for chat even if models endpoint works without it
**Warning signs:** Test succeeds, but actual usage fails with 401

## Code Examples

### Complete Test Endpoint (OpenAI-Compatible)
```python
# Source: Derived from existing test-ollama/test-groq patterns
class TestOpenAICompatibleRequest(BaseModel):
    """Request body for /setup/test-openai-compatible endpoint."""
    base_url: str      # e.g., "http://localhost:8000/v1"
    api_key: str = ""  # Optional - some servers don't need auth


@app.post("/setup/test-openai-compatible", response_model=TestConnectionResponse)
async def test_openai_compatible(req: TestOpenAICompatibleRequest) -> TestConnectionResponse:
    """Test OpenAI-compatible server connection and list available models.

    Args:
        req: TestOpenAICompatibleRequest with base URL and optional API key

    Returns:
        TestConnectionResponse with success status and model list
    """
    # Normalize URL
    base_url = req.base_url.rstrip("/")

    try:
        headers = {}
        if req.api_key:
            headers["Authorization"] = f"Bearer {req.api_key}"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/models",
                headers=headers,
                timeout=10.0,
            )

            if response.status_code == 401:
                return TestConnectionResponse(success=False, error="Invalid API key")
            response.raise_for_status()

            data = response.json()

            # Handle both OpenAI format {"data": [...]} and alternative {"models": [...]}
            model_list = data.get("data") or data.get("models") or []

            # Extract model IDs
            models = []
            for m in model_list:
                if isinstance(m, dict):
                    model_id = m.get("id") or m.get("name")
                    if model_id:
                        models.append(model_id)
                elif isinstance(m, str):
                    models.append(m)

            return TestConnectionResponse(success=True, models=models)

    except httpx.ConnectError:
        return TestConnectionResponse(
            success=False,
            error=f"Cannot connect to server at {base_url}"
        )
    except httpx.TimeoutException:
        return TestConnectionResponse(
            success=False,
            error=f"Connection timed out - server at {base_url} may be slow or unreachable"
        )
    except Exception as e:
        return TestConnectionResponse(success=False, error=str(e))
```

### Complete Test Endpoint (OpenRouter)
```python
# Source: OpenRouter API docs + existing test-groq pattern
class TestOpenRouterRequest(BaseModel):
    """Request body for /setup/test-openrouter endpoint."""
    api_key: str  # Required - OpenRouter always needs authentication


@app.post("/setup/test-openrouter", response_model=TestConnectionResponse)
async def test_openrouter(req: TestOpenRouterRequest) -> TestConnectionResponse:
    """Test OpenRouter API key and list available models with tool support.

    Args:
        req: TestOpenRouterRequest with API key

    Returns:
        TestConnectionResponse with success status and tool-capable model list
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                params={"supported_parameters": "tools"},
                headers={"Authorization": f"Bearer {req.api_key}"},
                timeout=15.0,  # Longer timeout for large response
            )

            if response.status_code == 401:
                return TestConnectionResponse(success=False, error="Invalid API key")
            response.raise_for_status()

            data = response.json()
            models = [m.get("id") for m in data.get("data", [])]
            models = [m for m in models if m]

            return TestConnectionResponse(success=True, models=models)

    except httpx.TimeoutException:
        return TestConnectionResponse(
            success=False,
            error="Request timed out - try again"
        )
    except Exception as e:
        return TestConnectionResponse(success=False, error=str(e))
```

### Manual Model Entry (UI Pattern)
```tsx
// Source: Derived from provider-step.tsx pattern
// For when auto-discovery fails or user wants custom model
{models.length === 0 && testStatus === 'success' && (
  <div className="space-y-1">
    <label className="text-sm font-medium">
      {t('model')} ({t('manualEntry')})
    </label>
    <input
      type="text"
      value={data.openai_model}
      onChange={(e) => updateData({ openai_model: e.target.value })}
      placeholder="gpt-3.5-turbo"
      className="border-input bg-background w-full rounded-md border px-3 py-2"
    />
    <p className="text-muted-foreground text-xs">
      {t('manualModelNote')}
    </p>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Test with chat completion | Test with /v1/models GET | Always | Faster, no token cost |
| Return all models | Filter by capability | OpenRouter 2024+ | Relevant results |
| Single generic test endpoint | Provider-specific endpoints | Established pattern | Clearer contracts |

**Deprecated/outdated:**
- Using POST to test connectivity: Use GET `/v1/models` instead
- Assuming all models support tools: OpenRouter provides capability metadata

## Open Questions

1. **Capability Validation for OpenAI-Compatible**
   - What we know: OpenRouter has `supported_parameters` field with tool support info
   - What's unclear: Most OpenAI-compatible servers don't expose capability metadata
   - Recommendation: For OpenAI-compatible, rely on user to select appropriate model; document requirement for tool support

2. **Streaming Support Validation**
   - What we know: Success criteria mentions "streaming and tool calling support" validation
   - What's unclear: Whether to test streaming explicitly or just validate model exists
   - Recommendation: Validate model exists via `/v1/models`. Tool calling verified implicitly through OpenRouter filter. Streaming assumed for all OpenAI-compatible servers (universal support).

3. **Model Count for OpenRouter**
   - What we know: OpenRouter has 400+ models, filtering by tools reduces this
   - What's unclear: Exact count of tool-capable models
   - Recommendation: Use `supported_parameters=tools` filter. If still too many, consider client-side search/filter in UI.

## Sources

### Primary (HIGH confidence)
- `src/caal/webhooks.py` - Existing test endpoint patterns (test-ollama, test-groq)
- `frontend/components/setup/provider-step.tsx` - Frontend test button pattern
- [OpenRouter Models API](https://openrouter.ai/docs/api/api-reference/models/get-models) - Model discovery with filtering
- [OpenAI Models API](https://platform.openai.com/docs/api-reference/models/list) - Standard /v1/models format

### Secondary (MEDIUM confidence)
- [LiteLLM OpenAI-Compatible](https://docs.litellm.ai/docs/providers/openai_compatible) - Confirms /v1/models support
- Phase 8/9 RESEARCH.md files - Provider architecture decisions

### Tertiary (LOW confidence)
- Community patterns for vLLM/LocalAI - may have non-standard /v1/models responses

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Follows existing webhooks.py patterns exactly
- Architecture: HIGH - Matches existing test endpoint structure
- Pitfalls: MEDIUM - OpenAI-compatible server variance is documented but not exhaustively tested

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (stable domain, 30 days)
