---
phase: 04-voice-pipeline
plan: 01
subsystem: agent
tags: [i18n, prompts, formatting, french, tts, datetime]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: language setting in settings.json
provides:
  - Per-language system prompts (EN/FR)
  - French date/time formatting functions
  - Language-aware prompt loading in settings.py
affects: [04-02 voice pipeline wiring, future language additions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-language prompt directories: prompt/{lang}/default.md"
    - "Language parameter threading through formatting and prompt loading"
    - "Backward-compatible fallback: prompt/default.md for existing installs"

key-files:
  created:
    - prompt/en/default.md
    - prompt/fr/default.md
  modified:
    - src/caal/utils/formatting.py
    - src/caal/settings.py

key-decisions:
  - "French dates use cardinal numbers except 'premier' for 1st (standard French convention)"
  - "French times use 24-hour spoken form: '15 heures 30', with 'midi' and 'minuit' special cases"
  - "Custom prompts remain language-neutral (prompt/custom.md always wins regardless of language)"
  - "French prompt uses tu/toi (informal) not vous (formal) per plan specification"

patterns-established:
  - "Per-language prompt resolution: try prompt/{lang}/{name}.md, fall back to prompt/{name}.md"
  - "Language parameter default 'en' for backward compatibility in all public functions"

# Metrics
duration: 4min
completed: 2026-01-26
---

# Phase 4 Plan 1: Per-Language Prompts Summary

**French/English system prompts with localized date/time formatting and language-aware prompt loading**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-26T08:03:48Z
- **Completed:** 2026-01-26T08:07:18Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- French date formatting: "mercredi 21 janvier 2026" with "premier" for 1st day
- French time formatting: "15 heures 30", "midi", "minuit" special cases
- Full French system prompt with explicit "Reponds toujours en francais" instruction
- Language-aware prompt loading with backward-compatible fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Add French date/time formatting** - `bbd70e4` (feat)
2. **Task 2: Create per-language prompt structure and update prompt loading** - `0886851` (feat)

## Files Created/Modified
- `src/caal/utils/formatting.py` - Added language parameter to format_date_speech_friendly() and format_time_speech_friendly(), plus French formatting helpers
- `src/caal/settings.py` - Added language parameter to load_prompt_content() and load_prompt_with_context() with per-language path resolution
- `prompt/en/default.md` - English system prompt (exact copy of original default.md)
- `prompt/fr/default.md` - French system prompt with "Reponds toujours en francais" and all sections translated

## Decisions Made
- French dates use cardinal numbers except "premier" for the 1st (standard French convention)
- French times use 24-hour spoken form ("15 heures 30") with "midi" and "minuit" special cases
- Custom prompts remain language-neutral -- prompt/custom.md always wins regardless of language setting
- French prompt uses informal tu/toi register (not formal vous) per plan specification
- Kept prompt/default.md unchanged for backward compatibility with existing installations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unicode escape sequences in French prompt file**
- **Found during:** Task 2 (French prompt creation)
- **Issue:** Unicode escape sequences (\u00e7) were written literally instead of as actual characters
- **Fix:** Post-processed the file to replace literal escapes with proper unicode characters
- **Files modified:** prompt/fr/default.md
- **Verification:** Python assertion confirmed "francais" with cedilla present in loaded content
- **Committed in:** 0886851 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor encoding fix, no scope change.

## Issues Encountered
- Pre-existing ruff E501 lint error on formatting.py line 62 (long line in number_to_ordinal_word) -- not introduced by this plan, left as-is

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Per-language prompts ready for voice pipeline wiring (plan 04-02)
- load_prompt_with_context(language=...) ready to be called from voice_agent.py
- format_date_speech_friendly and format_time_speech_friendly ready for French output
- Plan 04-02 will wire language parameter through voice_agent.py and handle TTS/STT provider switching

---
*Phase: 04-voice-pipeline*
*Completed: 2026-01-26*
