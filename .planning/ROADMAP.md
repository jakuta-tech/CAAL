# Roadmap: CAAL Multilingual Support (i18n)

## Overview

This milestone adds full multilingual support to CAAL, enabling French-speaking users to interact entirely in their language. The journey starts with infrastructure (global language setting), flows through UI localization (frontend and mobile in parallel), and completes with voice pipeline integration (STT language parameter, TTS voice mapping, localized prompts). Each phase delivers a coherent, testable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, etc.): Urgent insertions if needed (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Global language setting infrastructure with propagation to all components
- [x] **Phase 2: Frontend i18n** - Next.js localization with next-intl, EN/FR message files, language selector
- [x] **Phase 3: Mobile i18n** - Flutter localization with intl, ARB files, language selector
- [ ] **Phase 4: Voice Pipeline** - STT language param, TTS voice mapping, localized prompts

## Phase Details

### Phase 1: Foundation
**Goal**: Users can configure their preferred language, and that setting is available to all CAAL components
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. User can set language to "en" or "fr" in settings.json
  2. Language setting is readable by frontend, mobile, and agent components
  3. Existing English-only installations continue working without any configuration changes
  4. Default language is English for new installations
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md - Add global language setting to backend, frontend, and mobile

### Phase 2: Frontend i18n
**Goal**: Users can interact with the web UI entirely in their configured language
**Depends on**: Phase 1 (needs language setting to read)
**Requirements**: FRONT-01, FRONT-02, FRONT-03, FRONT-04, FRONT-05, FRONT-06
**Success Criteria** (what must be TRUE):
  1. User sees all UI text in their configured language (EN or FR)
  2. User can change language via dropdown in settings panel
  3. Settings panel shows all labels, buttons, and descriptions in selected language
  4. Page loads remain fast (static rendering preserved via setRequestLocale)
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md - next-intl infrastructure setup (install, config, provider)
- [x] 02-02-PLAN.md - EN/FR message files and UI localization

### Phase 3: Mobile i18n
**Goal**: Users can interact with the mobile app entirely in their configured language
**Depends on**: Phase 1 (needs language setting to read)
**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03, MOBILE-04, MOBILE-05
**Success Criteria** (what must be TRUE):
  1. User sees all mobile app text in their configured language (EN or FR)
  2. User can change language via selector in mobile settings
  3. All screens (settings, main, connection) display localized content
  4. App respects the global language setting from CAAL backend
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md - Flutter intl infrastructure (l10n config, ARB files, LocaleProvider)
- [x] 03-02-PLAN.md - Screen localization and language selector

### Phase 4: Voice Pipeline
**Goal**: Users can have full voice conversations in their configured language
**Depends on**: Phase 1 (needs language setting), Phases 2-3 optional (UI to change setting)
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05
**Success Criteria** (what must be TRUE):
  1. User speaks French and STT transcribes correctly (Whisper with language param)
  2. Agent responds in French with natural TTS voice (Piper siwis-medium for FR)
  3. Agent personality and responses reflect French language and culture (localized prompts)
  4. Tool responses (weather, home assistant, etc.) are reformulated in configured language
  5. Wake greeting plays in configured language
**Plans**: TBD

Plans:
- [ ] 04-01: Localized prompts (EN/FR)
- [ ] 04-02: STT language parameter integration
- [ ] 04-03: TTS voice mapping per language

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4
Note: Phases 2 and 3 can run in parallel after Phase 1 completes.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/1 | Complete | 2026-01-25 |
| 2. Frontend i18n | 2/2 | Complete | 2026-01-25 |
| 3. Mobile i18n | 2/2 | Complete | 2026-01-25 |
| 4. Voice Pipeline | 0/3 | Not started | - |

---
*Roadmap created: 2026-01-25*
*Last updated: 2026-01-25 - Phase 3 complete*
