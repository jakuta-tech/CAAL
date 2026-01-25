# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** A French-speaking user can interact with CAAL entirely in French with no English friction
**Current focus:** Phase 2 - Frontend i18n (IN PROGRESS)

## Current Position

Phase: 2 of 4 (Frontend i18n)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-01-25 - Completed 02-01-PLAN.md

Progress: [##--------] 25% (2/8 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 4 min
- Total execution time: 8 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 1/1 | 4 min | 4 min |
| 2. Frontend i18n | 1/2 | 4 min | 4 min |
| 3. Mobile i18n | 0/2 | - | - |
| 4. Voice Pipeline | 0/3 | - | - |

**Recent Trend:**
- Last 5 plans: 4 min, 4 min
- Trend: Stable at ~4 min/plan

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research] Verify livekit-plugins-openai passes language parameter to Speaches
- [Research] Determine exact Speaches model IDs for Piper French voices

## Session Continuity

Last session: 2026-01-25T18:24:00Z
Stopped at: Completed 02-01-PLAN.md (next-intl Infrastructure)
Resume file: None
