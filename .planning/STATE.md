# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** A French-speaking user can interact with CAAL entirely in French with no English friction
**Current focus:** Phase 3 - Mobile i18n (Complete)

## Current Position

Phase: 3 of 4 (Mobile i18n)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-01-25 - Completed 03-02-PLAN.md (Screen Localization)

Progress: [#####-----] 63% (5/8 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 5.4 min
- Total execution time: 27 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 1/1 | 4 min | 4 min |
| 2. Frontend i18n | 2/2 | 10 min | 5 min |
| 3. Mobile i18n | 2/2 | 13 min | 6.5 min |
| 4. Voice Pipeline | 0/3 | - | - |

**Recent Trend:**
- Last 5 plans: 4 min, 6 min, 6 min, 6 min, 7 min
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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research] Verify livekit-plugins-openai passes language parameter to Speaches
- [Research] Determine exact Speaches model IDs for Piper French voices

## Session Continuity

Last session: 2026-01-25T19:03:58Z
Stopped at: Completed 03-02-PLAN.md (Screen Localization) - Phase 3 complete
Resume file: None
