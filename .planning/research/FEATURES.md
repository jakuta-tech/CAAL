# Feature Landscape: Voice Assistant i18n

**Domain:** Voice assistant internationalization
**Project:** CAAL multilingual support
**Researched:** 2026-01-25
**Confidence:** MEDIUM (based on competitive analysis and industry patterns)

## Table Stakes

Features users expect from a multilingual voice assistant. Missing = product feels incomplete or frustrating.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Global language setting | Users expect one setting to control entire experience. Mixed-language UX is confusing. | Low | Single setting propagates to all components |
| UI translations (web) | Basic i18n expectation. Untranslated UI is jarring when voice is localized. | Medium | next-intl handles this well with App Router |
| UI translations (mobile) | Same expectation for mobile. Consistency matters. | Medium | Flutter has built-in intl support |
| STT language configuration | Voice recognition must understand the user's language accurately. | Low | Whisper/Groq support language parameter natively |
| TTS voice in user's language | Assistant speaking wrong language is unusable. | Medium | Requires mapping voices per language, availability varies by provider |
| Agent responses in user's language | Core expectation. User speaks French, assistant responds in French. | Low | LLM naturally responds in input language with prompt guidance |
| Language selector in settings | User must be able to configure their language. | Low | Standard UI component |
| Fallback to English | When translation missing, English fallback is better than broken keys. | Low | Standard i18n library behavior |

## Differentiators

Features that set a product apart. Not expected, but valued when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tool response reformulation | When tools return English data, agent translates to user language naturally. Better UX than mixed-language. | Medium | LLM can do this with prompt instruction; adds slight latency |
| Localized prompt personality | System prompt adapted to cultural context, not just translated. French assistant can be more formal/casual per culture. | Medium | Separate prompt files per language allow full localization |
| Wake word per language | Different wake word for different language pipelines (e.g., "Hey Jarvis" for English, "Salut Cal" for French). Home Assistant does this. | High | Requires OpenWakeWord model training or separate models |
| Language-specific wake greetings | Greeting responses appropriate to culture. "Hey, what's up?" vs "Oui?" | Low | Simple array in settings per language |
| Regional voice variants | French (France) vs French (Canadian) voice options. Matters for accent preference. | Medium | Depends on TTS provider voice availability |
| Code-switching support | User can mix languages in single utterance (e.g., "Turn on the lampe"). System understands. | High | Requires STT with code-switching capability; not widely available |
| Automatic language detection | System detects user's language from speech without explicit setting. | High | Whisper can detect language, but adds complexity for consistency |
| Date/time/number formatting | "quatre heures trente" vs "4:30 PM" - locale-aware formatting in responses | Medium | Already partially implemented in CAAL; needs locale awareness |
| Contributor documentation | Clear guide for adding new languages lowers barrier for community contributions. | Low | Documentation effort, high value for open source |
| Setup wizard localization | First-run experience in user's language. Strong first impression. | Medium | Part of frontend i18n, but critical flow |

## Anti-Features

Features to explicitly NOT build for v1. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time language switching mid-conversation | Adds massive complexity (STT/TTS reconfiguration mid-stream), confuses context | Require session restart on language change |
| Auto-detect from browser/system | Voice assistants need explicit language choice. Browser locale often wrong, causes confusion. | Let user explicitly choose; default to English |
| Per-component language settings | "UI in English, voice in French" creates cognitive dissonance and testing matrix explosion | Single global language setting |
| Translating Home Assistant entity names | Entity names are user-defined, often proper nouns. Translation would break matching. | Keep entity names as-is; user configures them |
| Translating n8n workflow names | Same as above - user-defined identifiers. Translation adds confusion. | Keep workflow names as-is |
| Machine translation of prompts | Direct translation loses nuance and cultural context. "Be casual" translates poorly. | Human-authored prompts per language |
| More than 2 languages in v1 | Infrastructure yes, content no. Each language needs quality prompts, testing. Scope creep. | EN + FR complete; infrastructure supports more |
| RTL support in v1 | Arabic/Hebrew need significant UI work. Not needed for EN/FR. | Defer until Arabic/Hebrew requested |
| Pluralization complexity beyond basics | Some languages have 4+ plural forms. FR/EN have simple singular/plural. | Implement basic plural handling; extend when adding complex languages |
| Live translation (user speaks English, assistant responds in French) | Different from consistent language support. Complex, niche use case. | Out of scope; single language mode only |

## Feature Dependencies

```
Global Language Setting
    |
    +---> UI Translations (Web)
    |         |
    |         +---> Setup Wizard Localization
    |
    +---> UI Translations (Mobile)
    |
    +---> STT Language Configuration
    |
    +---> TTS Voice per Language
    |         |
    |         +---> Regional Voice Variants (optional)
    |
    +---> Agent Prompt per Language
    |         |
    |         +---> Wake Greetings per Language
    |         |
    |         +---> Tool Response Reformulation
    |
    +---> Language Selector UI

Wake Word per Language (independent, complex)
    |
    +---> Requires OpenWakeWord model per language
```

## MVP Recommendation

For the CAAL i18n milestone, prioritize:

**Must Have (Table Stakes):**
1. Global language setting in settings.json
2. Frontend i18n with next-intl (EN + FR)
3. Mobile i18n with Flutter intl (EN + FR)
4. STT language parameter configuration
5. TTS voice mapping per language
6. Agent prompt files per language
7. Language selector in settings panel

**Should Have (High-Value Differentiators):**
1. Tool response reformulation in user's language
2. Wake greetings per language
3. Contributor documentation for adding languages
4. Setup wizard fully localized

**Defer to Post-MVP:**
- Wake word per language (complex, requires model training)
- Regional voice variants (nice-to-have, provider dependent)
- Code-switching support (complex, limited STT support)
- Automatic language detection (complexity vs. value)

## Complexity Assessment

| Component | Complexity | Rationale |
|-----------|------------|-----------|
| Settings infrastructure | Low | Add language key, propagate to components |
| Frontend i18n (next-intl) | Medium | Well-documented, but requires restructuring for [locale] routes |
| Mobile i18n (Flutter) | Medium | Built-in support, but every screen needs updates |
| STT configuration | Low | Whisper accepts language parameter natively |
| TTS voice mapping | Medium | Need to verify voice availability per provider per language |
| Prompt localization | Medium | Authoring quality prompts per language requires care |
| Tool response reformulation | Low-Medium | LLM instruction in prompt; may need tuning |
| Testing matrix | Medium | 2 languages x 2 platforms x 3 TTS providers = 12 combinations |

## Competitive Reference

| Product | Languages | Notable Features | Missing Features |
|---------|-----------|------------------|------------------|
| Google Assistant | 40+ | Multiple wake words, code-switching, accent detection | Fully local not possible |
| Alexa | 15+ | Live translation, multilingual mode | Limited languages vs Google |
| Home Assistant Assist | 21 (growing) | Open source, dual wake word, community languages | Cloud dependency for some |
| Siri | 21 | Deep iOS integration | No local option |

**CAAL Positioning:** Local-first, open-source alternative with quality support for targeted languages rather than breadth.

## Sources

- [Home Assistant Voice Chapter 11: Multilingual Assistants](https://www.home-assistant.io/blog/2025/10/22/voice-chapter-11) - Wake word per language, dual pipeline approach
- [Voice Assistant Comparison 2025](https://smarthomewizards.com/voice-assistant-comparison-alexa-google-siri-2025/) - Market landscape
- [GALA: How to Build a Great Multilingual Voice Assistant](https://www.gala-global.org/knowledge-center/professional-development/articles/strategies-creating-great-multilingual-voice) - Best practices for personality consistency
- [next-intl Documentation](https://next-intl.dev/docs/getting-started/app-router) - Next.js 15 App Router i18n
- [Flutter Internationalization](https://docs.flutter.dev/ui/internationalization) - Official Flutter i18n guide
- [Phrase: 10 Common Localization Mistakes](https://phrase.com/blog/posts/10-common-mistakes-in-software-localization/) - Anti-patterns to avoid
- [DeepAI: Bilingual Voice Assistants and Code-switching](https://deepai.org/publication/bilingual-by-default-voice-assistants-and-the-role-of-code-switching-in-creating-a-bilingual-user-experience) - Code-switching research
- [Microsoft: Localizing AI-based Features](https://learn.microsoft.com/en-us/globalization/localization/ai/localizing-ai-based-features) - LLM prompt localization guidance

## Confidence Notes

| Area | Confidence | Rationale |
|------|------------|-----------|
| Table stakes features | HIGH | Well-established patterns across industry |
| Differentiator features | MEDIUM | Based on competitive analysis, value varies by user |
| Anti-features | HIGH | Common mistakes documented across industry |
| Complexity estimates | MEDIUM | Based on typical patterns, CAAL-specific may vary |
| TTS voice availability | LOW | Needs verification for Kokoro French voices specifically |
