# CAAL Multilingual Support (i18n)

## What This Is

Adding full multilingual support to CAAL voice assistant. A global language setting controls the entire experience: UI, agent responses, speech-to-text, and text-to-speech. English (reference) and French (complete implementation) are supported across all components.

## Core Value

A French-speaking user can interact with CAAL entirely in French — from the setup wizard to voice conversations — with no English friction.

## Requirements

### Validated

<!-- Existing CAAL capabilities -->

- ✓ Voice assistant with LiveKit WebRTC — existing
- ✓ Multi-provider LLM (Ollama, Groq) — existing
- ✓ Multi-provider STT (Speaches/Whisper, Groq) — existing
- ✓ Multi-provider TTS (Kokoro, Piper) — existing
- ✓ Tool integrations (n8n, Home Assistant, web search) — existing
- ✓ Settings-driven configuration with JSON persistence — existing
- ✓ Next.js frontend with setup wizard — existing
- ✓ Flutter mobile app — existing

<!-- v1.0 Multilingual Support -->

- ✓ Global language setting in settings.json — v1.0
- ✓ Language propagation to all components — v1.0
- ✓ Backward compatibility with English-only installations — v1.0
- ✓ Frontend i18n with next-intl (EN/FR, 128 keys) — v1.0
- ✓ Language selector in web settings panel — v1.0
- ✓ Static rendering preserved — v1.0
- ✓ Mobile i18n with Flutter intl (EN/FR, 84 keys) — v1.0
- ✓ Language selector in mobile settings — v1.0
- ✓ Per-language system prompts — v1.0
- ✓ STT language configuration (Whisper parameter) — v1.0
- ✓ TTS voice mapping per language (Piper) — v1.0
- ✓ Tool response reformulation in configured language — v1.0
- ✓ Localized wake greetings — v1.0

### Active

(None — next milestone requirements via `/gsd:new-milestone`)

### Out of Scope

- Auto-detection from browser/system — explicit setting preferred for voice assistant
- Real-time language switching mid-conversation — requires session restart
- Translation of n8n workflow names/descriptions — kept as-is
- Home Assistant entity names translation — kept as-is
- More than EN/FR — infrastructure supports it, content later
- RTL layout support — not needed for EN/FR
- Code-switching support — complex, limited STT support

## Context

**Shipped v1.0 Multilingual Support (2026-01-26):**
- 65 files, +8,501 / -565 lines across Python, TypeScript, Dart
- 4 phases, 7 plans, 37 commits over 2 days
- Tech stack: next-intl (frontend), flutter_localizations (mobile), per-language prompts (agent)
- Audit: 19/19 requirements, all integration points verified
- Human testing: 8/8 tests passed, 3 bugs found and fixed during testing
- Documentation: `docs/I18N.md` added with full contributor guide

**Known issues (not i18n):**
- DuckDuckGo web search returns poor results for French queries (search quality, not i18n)

## Constraints

- **Compatibility**: Must not break existing EN-only installations
- **Default**: English remains default language for new installations
- **Tech stack**: next-intl for frontend (not react-i18next)
- **Prompts**: Per-language directories: prompt/{lang}/default.md

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Global language setting | Simpler UX than separate UI/voice settings | ✓ Good |
| Separate prompt files per language | Allows full localization including personality | ✓ Good |
| next-intl for frontend | Best App Router integration, popular | ✓ Good |
| Agent reformulates tool responses | Better UX than mixed-language responses | ✓ Good |
| Cookie-based locale (CAAL_LOCALE) | No URL routing changes needed, simpler | ✓ Good |
| English messages as base fallback | Missing translations fall back to EN | ✓ Good |
| Technical terms stay in English | Ollama, Groq, Piper etc. are proper nouns | ✓ Good |
| Per-language prompt dirs | prompt/{lang}/default.md with flat fallback | ✓ Good |
| Custom prompts language-neutral | prompt/custom.md always wins over language | ✓ Good |
| PIPER_VOICE_MAP in voice_agent.py | Keep mapping close to usage, not in settings | ✓ Good |
| Auto-switch Kokoro→Piper for non-EN | Kokoro has limited multilingual support | ✓ Good |
| French tu/toi register | More natural for voice assistant context | ✓ Good |

---
*Last updated: 2026-01-26 after v1.0 milestone*
