# Research Summary: CAAL Multilingual Support

**Domain:** Voice Assistant Internationalization
**Researched:** 2026-01-25
**Overall Confidence:** HIGH

## Executive Summary

Implementing multilingual support in CAAL requires coordinating five components: Next.js frontend UI, Flutter mobile UI, Python agent prompts, Whisper STT, and TTS (Kokoro/Piper). The technology choices are straightforward with well-established solutions for each layer. The primary constraint is TTS quality for French.

**Critical finding:** Kokoro TTS has severely limited French support (1 voice, B- quality, <11h training data). For production French TTS, Piper is the recommended provider with 6 French voice models including the high-quality `siwis-medium` female voice.

Whisper's multilingual capabilities are excellent - French is a top-5 supported language. The STT layer requires minimal changes beyond passing the language parameter.

## Key Findings

**Stack:** next-intl 4.7 (frontend), Flutter intl (mobile), locale-specific prompts (agent), Whisper language param (STT), Piper for French TTS

**Architecture:** Single `language` setting in settings.json propagates to all components; per-language voice configurations for TTS

**Critical pitfall:** Kokoro's French voice quality is insufficient for production use; design must support Piper as French TTS fallback

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Phase 1: Foundation** - Add global language setting to settings.json and wire it through to all components
   - Addresses: Core infrastructure for language selection
   - Avoids: Premature UI work before settings infrastructure exists

2. **Phase 2: Frontend i18n** - Implement next-intl in Next.js, create en/fr message files
   - Addresses: User-facing language toggle, translated UI strings
   - Avoids: N/A - standard implementation

3. **Phase 3: Mobile i18n** - Implement flutter_localizations, create ARB files
   - Addresses: Mobile app language support
   - Can run parallel with Phase 2

4. **Phase 4: Agent Prompts** - Create locale-specific prompt files (prompt/en/, prompt/fr/)
   - Addresses: Localized agent personality and responses
   - Avoids: Over-engineering with gettext for markdown documents

5. **Phase 5: STT/TTS Integration** - Wire language to Whisper providers, configure French TTS voices
   - Addresses: Full voice pipeline localization
   - Avoids: Kokoro-only approach (need Piper fallback for French quality)

**Phase ordering rationale:**
- Settings infrastructure must come first (all other phases depend on it)
- Frontend and Mobile can run in parallel (no dependencies)
- Agent prompts can run in parallel with UI work
- STT/TTS comes last because it depends on settings and requires testing with the full pipeline

**Research flags for phases:**
- Phase 5 (STT/TTS): Needs deeper research on livekit-plugins-openai language parameter support
- All others: Standard patterns, unlikely to need additional research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified via official docs |
| Features | HIGH | Standard i18n feature set, well documented |
| Architecture | HIGH | Simple propagation pattern |
| Pitfalls | HIGH | Kokoro limitation clearly documented in VOICES.md |

## Gaps to Address

- Verify livekit-plugins-openai passes language parameter to Speaches (MEDIUM confidence currently)
- Determine exact Speaches model IDs for Piper French voices
- Test Kokoro French voice quality to confirm B- rating

## Files Created

| File | Purpose |
|------|---------|
| STACK.md | Technology recommendations with versions |
| SUMMARY.md | This file - executive summary |
| PITFALLS.md | Domain-specific warnings |
| FEATURES.md | Feature landscape |
| ARCHITECTURE.md | System integration patterns |
