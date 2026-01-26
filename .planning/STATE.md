# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** A French-speaking user can interact with CAAL entirely in French with no English friction
**Current focus:** Phase 4 - Voice Pipeline (In progress)

## Current Position

Phase: 4 of 4 (Voice Pipeline)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-01-26 - Completed 04-01-PLAN.md

Progress: [########--] 86% (6/7 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 5.2 min
- Total execution time: 31 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 1/1 | 4 min | 4 min |
| 2. Frontend i18n | 2/2 | 10 min | 5 min |
| 3. Mobile i18n | 2/2 | 13 min | 6.5 min |
| 4. Voice Pipeline | 1/2 | 4 min | 4 min |

**Recent Trend:**
- Last 5 plans: 6 min, 6 min, 6 min, 7 min, 4 min
- Trend: Stable at ~6 min/plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Global language setting (single setting controls all components)
- Piper TTS for French (Kokoro has limited French support)
- next-intl for frontend (best App Router integration)
- Language uses ISO 639-1 codes ("en", "fr") - from 01-01
- Language field in SetupCompleteRequest is optional for backward compatibility - from 01-01
- Cookie-based locale (CAAL_LOCALE) instead of URL routing - from 02-01
- English messages as base with locale overlay for fallback - from 02-01
- Technical terms stay in English: Ollama, Groq, Kokoro, Piper, STT, TTS, LLM, API, n8n - from 02-02
- Language selector in Agent tab with save/cookie/reload flow - from 02-02
- Output l10n to lib/l10n instead of deprecated synthetic-package - from 03-01
- Relative imports for AppLocalizations (package:flutter_gen deprecated) - from 03-01
- Enum-based status messages in setup_screen for context-free localization - from 03-02
- Language selector visible in settings even without server connection - from 03-02
- Per-language prompt dirs: prompt/{lang}/default.md with fallback to prompt/default.md - from 04-01
- Custom prompts remain language-neutral (prompt/custom.md always wins) - from 04-01
- French dates use cardinal numbers except "premier" for 1st - from 04-01
- French prompt uses informal tu/toi register - from 04-01

### Pending Todos

None yet.

### Blockers/Concerns

- [Research] Verify livekit-plugins-openai passes language parameter to Speaches
- [Research] Determine exact Speaches model IDs for Piper French voices

## Session Continuity

Last session: 2026-01-26
Stopped at: Completed 04-01-PLAN.md
Resume file: None
