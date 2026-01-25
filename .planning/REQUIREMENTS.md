# Requirements: CAAL Multilingual Support

**Defined:** 2026-01-25
**Core Value:** A French-speaking user can interact with CAAL entirely in French — from settings to voice conversations — with no English friction.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Global `language` setting in settings.json with ISO 639-1 code (en, fr)
- [ ] **INFRA-02**: Language setting propagates to all components (STT, TTS, prompts, UI)
- [ ] **INFRA-03**: Backward compatibility with existing English-only installations

### Frontend (Next.js)

- [ ] **FRONT-01**: next-intl infrastructure with App Router integration
- [ ] **FRONT-02**: EN message file as reference (messages/en.json)
- [ ] **FRONT-03**: FR message file complete (messages/fr.json)
- [ ] **FRONT-04**: Settings panel fully localized
- [ ] **FRONT-05**: Language selector dropdown in settings
- [ ] **FRONT-06**: Static rendering preserved (setRequestLocale pattern)

### Mobile (Flutter)

- [ ] **MOBILE-01**: Flutter intl infrastructure with flutter_localizations
- [ ] **MOBILE-02**: ARB EN file (lib/l10n/app_en.arb)
- [ ] **MOBILE-03**: ARB FR file (lib/l10n/app_fr.arb)
- [ ] **MOBILE-04**: All screens localized (settings, main, connection)
- [ ] **MOBILE-05**: Language selector in mobile settings

### Voice Pipeline (Agent)

- [ ] **VOICE-01**: Prompt files per language (prompt/en/default.md, prompt/fr/default.md)
- [ ] **VOICE-02**: STT receives language parameter (Whisper/Groq)
- [ ] **VOICE-03**: TTS voice mapping per language (Piper siwis-medium for FR)
- [ ] **VOICE-04**: Agent reformulates tool responses in configured language
- [ ] **VOICE-05**: Wake greetings localized per language

## v2 Requirements

Deferred to future milestone. Infrastructure supports these, content later.

### Documentation

- **DOC-01**: Contributor guide for adding new languages
- **DOC-02**: Translator onboarding documentation

### Extended Localization

- **EXT-01**: Setup wizard fully localized
- **EXT-02**: Error messages and logs localized
- **EXT-03**: Additional languages (DE, ES, IT)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-detection from browser/system | Explicit setting preferred for voice assistant consistency |
| Real-time language switching mid-conversation | Requires session restart; adds complexity without value |
| Translation of n8n workflow names | User-defined identifiers; translation would break matching |
| Translation of Home Assistant entities | User-defined names; kept as-is |
| Per-component language settings | Single global setting is simpler UX |
| RTL layout support | Not needed for EN/FR; defer until Arabic/Hebrew requested |
| Code-switching support | Complex, limited STT support; defer to future |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| FRONT-01 | Phase 2 | Pending |
| FRONT-02 | Phase 2 | Pending |
| FRONT-03 | Phase 2 | Pending |
| FRONT-04 | Phase 2 | Pending |
| FRONT-05 | Phase 2 | Pending |
| FRONT-06 | Phase 2 | Pending |
| MOBILE-01 | Phase 3 | Pending |
| MOBILE-02 | Phase 3 | Pending |
| MOBILE-03 | Phase 3 | Pending |
| MOBILE-04 | Phase 3 | Pending |
| MOBILE-05 | Phase 3 | Pending |
| VOICE-01 | Phase 4 | Pending |
| VOICE-02 | Phase 4 | Pending |
| VOICE-03 | Phase 4 | Pending |
| VOICE-04 | Phase 4 | Pending |
| VOICE-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-25*
*Last updated: 2026-01-25 after initial definition*
