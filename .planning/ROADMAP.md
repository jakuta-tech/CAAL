# Roadmap: CAAL v1.2

## Milestones

- **v1.0 MVP** - Core voice assistant (shipped 2025)
- **v1.1 Tool Registry i18n** - Phases 6-7 (shipped 2025-02)
- **v1.2 Additional LLM Providers** - Phases 8-12 (in progress)

## Phases

<details>
<summary>v1.0 MVP - SHIPPED 2025</summary>

Core voice assistant with LiveKit WebRTC, multiple providers (Ollama, Groq), Home Assistant integration, n8n workflows, wake word detection, web UI, mobile app, and multilingual support.

</details>

<details>
<summary>v1.1 Tool Registry i18n - SHIPPED 2025-02</summary>

Tool Registry with full i18n support for French and Italian translations.

</details>

### v1.2 Additional LLM Providers (In Progress)

**Milestone Goal:** Add OpenAI-compatible and OpenRouter LLM providers with full UI integration

#### Phase 8: Backend Provider Foundation - COMPLETE
**Goal**: Both new LLM providers can stream responses and execute tool calls
**Depends on**: Nothing (first phase of milestone)
**Requirements**: OPENAI-01, OPENAI-02, OPENAI-03, OPENAI-04, OPENROUTER-01, OPENROUTER-04, OPENROUTER-05
**Success Criteria** (what must be TRUE):
  1. Developer can instantiate OpenAI-compatible provider with custom base URL and API key
  2. Developer can instantiate OpenRouter provider with API key
  3. Both providers stream responses correctly in voice conversations
  4. Both providers execute tool calls (Home Assistant, n8n workflows) successfully
  5. Provider factory creates OpenAI-compatible and OpenRouter instances from settings
**Plans**: 3/3 complete

Plans:
- [x] 08-01-PLAN.md - OpenAI-compatible provider implementation
- [x] 08-02-PLAN.md - OpenRouter provider implementation
- [x] 08-03-PLAN.md - Factory integration for both providers

#### Phase 9: Settings Schema Extension - COMPLETE
**Goal**: Settings system supports both new providers with proper configuration keys
**Depends on**: Phase 8
**Requirements**: (Settings infrastructure for all provider features)
**Success Criteria** (what must be TRUE):
  1. settings.json includes openai_api_key, openai_base_url, openai_model keys with defaults
  2. settings.json includes openrouter_api_key, openrouter_model keys with defaults
  3. Existing installations migrate to new settings schema without data loss
  4. create_provider_from_settings() factory builds both new provider types
  5. Settings validation rejects invalid configurations (missing base URL, malformed URLs)
**Plans**: 1/1 complete

Plans:
- [x] 09-01-PLAN.md - Add DEFAULT_SETTINGS keys, URL validation, and webhook extensions

#### Phase 10: Connection Testing Endpoints — COMPLETE
**Goal**: Users can validate provider configuration before saving settings
**Depends on**: Phase 9
**Requirements**: OPENAI-05, OPENAI-06, OPENAI-07, OPENROUTER-02, OPENROUTER-06
**Success Criteria** (what must be TRUE):
  1. ✓ User can test OpenAI-compatible connection and receives success/failure feedback
  2. ✓ User can test OpenRouter connection and receives success/failure feedback
  3. ✓ System discovers available models from OpenAI-compatible servers via /v1/models
  4. ✓ System fetches available models from OpenRouter API (400+ models)
  5. ✓ User can manually enter model name when auto-discovery fails or is unavailable
  6. ✓ Connection tests validate not just connectivity but streaming and tool calling support
**Plans**: 1/1 complete

Plans:
- [x] 10-01-PLAN.md - Backend test endpoints and frontend proxy routes

#### Phase 11: Setup Wizard Frontend
**Goal**: First-run users can select and configure both new providers through setup wizard
**Depends on**: Phase 10
**Requirements**: WIZARD-01, WIZARD-02, WIZARD-03
**Success Criteria** (what must be TRUE):
  1. Setup wizard displays OpenAI-compatible as a provider choice alongside Ollama and Groq
  2. Setup wizard displays OpenRouter as a provider choice alongside other providers
  3. OpenAI-compatible form includes base URL, optional API key, and model selection
  4. OpenRouter form includes API key and model selection with search support
  5. Setup wizard tests connection before allowing user to proceed to next step
  6. Failed connection tests show clear error messages with troubleshooting guidance
**Plans**: TBD

Plans:
- [ ] 11-01: [TBD]

#### Phase 12: Settings Panel UI
**Goal**: Users can switch providers and reconfigure settings after initial setup
**Depends on**: Phase 11
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, OPENROUTER-03
**Success Criteria** (what must be TRUE):
  1. Settings panel Providers tab shows OpenAI-compatible option with full configuration form
  2. Settings panel Providers tab shows OpenRouter option with full configuration form
  3. OpenAI-compatible settings include base URL field, API key field, and model selection
  4. OpenRouter settings include API key field and searchable model dropdown
  5. Model dropdown for OpenRouter supports search/filter across 400+ models
  6. Settings panel includes test connection button for both providers
  7. Settings panel shows restart prompt after provider change
**Plans**: TBD

Plans:
- [ ] 12-01: [TBD]

## Progress

**Execution Order:**
Phases execute in numeric order: 8 -> 9 -> 10 -> 11 -> 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. Backend Provider Foundation | v1.2 | 3/3 | Complete | 2026-02-05 |
| 9. Settings Schema Extension | v1.2 | 1/1 | Complete | 2026-02-06 |
| 10. Connection Testing Endpoints | v1.2 | 1/1 | ✓ Complete | 2026-02-06 |
| 11. Setup Wizard Frontend | v1.2 | 0/TBD | Not started | - |
| 12. Settings Panel UI | v1.2 | 0/TBD | Not started | - |
