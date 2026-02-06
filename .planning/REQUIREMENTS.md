# Requirements: CAAL v1.2

**Defined:** 2025-02-05
**Core Value:** Users can have natural voice conversations with an AI assistant using their preferred LLM provider

## v1.2 Requirements

Requirements for milestone v1.2 — Additional LLM Providers.

### OpenAI-Compatible Provider

- [x] **OPENAI-01**: User can configure custom base URL for OpenAI-compatible servers
- [x] **OPENAI-02**: User can optionally provide API key for authenticated servers
- [x] **OPENAI-03**: Agent streams responses from OpenAI-compatible provider
- [x] **OPENAI-04**: Agent executes tool calls with OpenAI-compatible provider
- [x] **OPENAI-05**: User can test connection before saving settings
- [x] **OPENAI-06**: System discovers available models via /v1/models endpoint
- [x] **OPENAI-07**: User can manually enter model name when discovery unavailable

### OpenRouter Provider

- [x] **OPENROUTER-01**: User can configure OpenRouter API key
- [x] **OPENROUTER-02**: System fetches available models from OpenRouter API
- [ ] **OPENROUTER-03**: User can search/filter models in selection dropdown
- [x] **OPENROUTER-04**: Agent streams responses from OpenRouter
- [x] **OPENROUTER-05**: Agent executes tool calls with OpenRouter
- [x] **OPENROUTER-06**: User can test connection before saving settings

### Frontend - Settings Panel

- [ ] **UI-01**: Settings panel shows OpenAI-compatible provider option
- [ ] **UI-02**: Settings panel shows OpenRouter provider option
- [ ] **UI-03**: OpenAI-compatible settings include base URL, API key, model fields
- [ ] **UI-04**: OpenRouter settings include API key and model selection
- [ ] **UI-05**: Model dropdown supports search for OpenRouter (400+ models)

### Frontend - Setup Wizard

- [ ] **WIZARD-01**: Setup wizard includes OpenAI-compatible provider choice
- [ ] **WIZARD-02**: Setup wizard includes OpenRouter provider choice
- [ ] **WIZARD-03**: Setup wizard tests connection before proceeding

## Future Requirements

Deferred to later milestones.

### OpenRouter Enhanced

- **OPENROUTER-FUTURE-01**: Display per-token pricing for models
- **OPENROUTER-FUTURE-02**: Show provider routing information
- **OPENROUTER-FUTURE-03**: Automatic fallback configuration

## Out of Scope

Explicitly excluded from this milestone.

| Feature | Reason |
|---------|--------|
| Pricing display | Complexity, not essential for MVP |
| Provider routing info | Nice-to-have, not core functionality |
| Auto-fallback | Complex feature, defer to future |
| Hot-swap providers | Requires agent restart by design |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPENAI-01 | Phase 8 | Complete |
| OPENAI-02 | Phase 8 | Complete |
| OPENAI-03 | Phase 8 | Complete |
| OPENAI-04 | Phase 8 | Complete |
| OPENAI-05 | Phase 10 | Complete |
| OPENAI-06 | Phase 10 | Complete |
| OPENAI-07 | Phase 10 | Complete |
| OPENROUTER-01 | Phase 8 | Complete |
| OPENROUTER-02 | Phase 10 | Complete |
| OPENROUTER-03 | Phase 12 | Pending |
| OPENROUTER-04 | Phase 8 | Complete |
| OPENROUTER-05 | Phase 8 | Complete |
| OPENROUTER-06 | Phase 10 | Complete |
| UI-01 | Phase 12 | Pending |
| UI-02 | Phase 12 | Pending |
| UI-03 | Phase 12 | Pending |
| UI-04 | Phase 12 | Pending |
| UI-05 | Phase 12 | Pending |
| WIZARD-01 | Phase 11 | Pending |
| WIZARD-02 | Phase 11 | Pending |
| WIZARD-03 | Phase 11 | Pending |

**Coverage:**
- v1.2 requirements: 21 total
- Mapped to phases: 21 (100% coverage)
- Unmapped: 0

**Phase distribution:**
- Phase 8 (Backend Provider Foundation): 7 requirements
- Phase 9 (Settings Schema Extension): 0 requirements (infrastructure)
- Phase 10 (Connection Testing Endpoints): 5 requirements
- Phase 11 (Setup Wizard Frontend): 3 requirements
- Phase 12 (Settings Panel UI): 6 requirements

---
*Requirements defined: 2025-02-05*
*Last updated: 2026-02-06 after Phase 10 completion*
