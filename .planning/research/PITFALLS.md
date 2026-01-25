# Domain Pitfalls: i18n for Voice Assistant

**Project:** CAAL Multilingual Support
**Researched:** 2026-01-25
**Domains Covered:** Next.js App Router (next-intl), Flutter (intl), Voice Pipeline (STT/TTS/Prompts)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken functionality, or user-facing failures.

---

### Pitfall 1: Whisper 30-Second Language Detection Window

**What goes wrong:** Whisper uses only the first 30 seconds of audio to detect language when no language is explicitly specified. If the user's speech starts with silence, ambient noise, or a brief utterance in a different language, Whisper may misidentify the language for the entire session and transcribe everything incorrectly.

**Why it happens:** Whisper was designed for batch transcription of single-language files, not real-time multilingual voice assistants. It assumes the entire audio is in one language.

**Consequences:**
- User says "Hey Jarvis" (English wake word), then speaks French. Whisper detects English and transcribes French as English gibberish.
- Code-switching users (mixing languages mid-sentence) get poor transcription quality.
- Languages similar to others (Galician confused with Spanish/Portuguese) are frequently misidentified.

**Warning signs:**
- Transcription accuracy drops significantly for non-English languages
- Users report assistant "not understanding" them despite clear speech
- Transcripts contain nonsensical words when user speaks their native language

**Prevention:**
1. **Always specify language explicitly** - Pass the language setting from CAAL to Whisper/Speaches/Groq STT
2. **Use user-configured language, not auto-detection** - The global language setting should drive STT language, not Whisper's detection
3. **For future multi-language support**, consider speaker diarization + per-segment language detection

**Phase to address:** Phase 1 (Core Infrastructure) - Language setting must propagate to STT immediately

**Sources:** [OpenAI Whisper GitHub - Language Flag Discussion](https://github.com/openai/whisper/discussions/1456), [Whisper Multi-Language Issues](https://github.com/openai/whisper/discussions/2009)

---

### Pitfall 2: LLM Ignores Language Instructions and Switches to English

**What goes wrong:** Even when system prompts specify "respond in French," LLMs frequently revert to English mid-conversation. This is especially common when:
- Tool responses return English text
- The conversation topic involves English terminology
- The user asks about English-language content

**Why it happens:** LLMs are trained predominantly on English data (often 80%+ of training corpus). They exhibit "gravitational pull" toward English, especially for technical or factual content. System prompts are less effective than believed at controlling output language.

**Consequences:**
- French user asks about weather, gets response in English
- Tool returns "Temperature: 72F" and LLM continues in English
- Inconsistent language switching frustrates users

**Warning signs:**
- Responses randomly switch languages mid-conversation
- Tool call responses trigger language changes
- Technical topics produce English responses

**Prevention:**
1. **Match prompt language to target language** - System prompt should be written in the target language, not just instruct the model to use it
2. **Wrap tool responses with language instruction** - Before injecting tool results, prepend: "[Respond to the following in {language}:]"
3. **Add language reinforcement at message level** - Not just system prompt, but periodic reminders
4. **Test with actual multilingual conversations** - Don't assume English testing covers language consistency

**Phase to address:** Phase 2 (Prompt Localization) - Critical for prompt file architecture decisions

**Sources:** [LangChain Issue #14974](https://github.com/langchain-ai/langchain/issues/14974), [Cross-Lingual Prompt Steerability Research](https://arxiv.org/html/2512.02841)

---

### Pitfall 3: Breaking Existing English Users During i18n Migration

**What goes wrong:** Adding locale prefixes to URLs, restructuring settings files, or changing prompt file locations breaks existing installations that were working fine with English defaults.

**Why it happens:** i18n implementations often assume greenfield development. Retrofitting i18n requires preserving backward compatibility while adding new structures.

**Consequences:**
- Existing users upgrade and their bookmarks/links stop working
- Settings files without language key fail to load
- Default prompt lookup fails because file structure changed

**Warning signs:**
- Unit tests pass but existing installations break after upgrade
- Links in documentation no longer work
- Docker volumes with old settings cause crashes

**Prevention:**
1. **English must remain the implicit default** - If no language is set, behavior must match pre-i18n exactly
2. **Settings migration with fallbacks** - New `language` key should default to `"en"` if missing
3. **Prompt files: Keep `default.md` as English fallback** - New structure: `prompt/en/default.md` with symlink or lookup fallback
4. **URL strategy: Use `as-needed` prefix mode** - English routes stay as `/` not `/en/`, other locales get prefixes
5. **Test upgrade path explicitly** - Create test with pre-i18n settings.json and verify it still works

**Phase to address:** Phase 1 (Core Infrastructure) - Migration strategy must be defined before any structural changes

**Sources:** [next-intl Routing Configuration](https://next-intl.dev/docs/routing/configuration), [i18next Migration Guide](https://www.i18next.com/misc/migration-guide)

---

### Pitfall 4: TTS Voice Mismatch After Language Change

**What goes wrong:** User switches language from English to French, but TTS continues using English voice model. Result: French text spoken with American accent, mispronounced words, and unnatural prosody.

**Why it happens:** TTS voice selection is often configured separately from language settings. Developers forget to create the mapping between language codes and compatible voices.

**Consequences:**
- "Bonjour" pronounced as "Bon-jor" by English voice
- Users perceive assistant as "broken" or "stupid"
- Some TTS engines crash when voice and text language mismatch

**Warning signs:**
- TTS output sounds robotic or heavily accented
- Certain words are mangled or skipped
- TTS latency increases (engine struggling with mismatched content)

**Prevention:**
1. **Create explicit language-to-voice mapping** - Each supported language must have a designated voice
2. **Validate voice availability before language switch** - Don't allow language selection if no voice exists
3. **Handle voice model download/availability** - Kokoro and Piper voices are separate downloads per language
4. **Test TTS with actual target-language text** - Not just "hello" but complex sentences

**Phase to address:** Phase 3 (Voice Pipeline Integration) - Voice mapping must be part of language configuration

**Sources:** [Kokoro TTS GitHub](https://github.com/nazdridoy/kokoro-tts), [Home Assistant Voice Chapter 11](https://www.home-assistant.io/blog/2025/10/22/voice-chapter-11)

---

### Pitfall 5: Next.js Static Rendering Broken by Locale APIs

**What goes wrong:** Using `useTranslations()` or other next-intl hooks in Server Components causes Next.js to opt into dynamic rendering, eliminating static generation benefits. Pages that were fast become slow.

**Why it happens:** next-intl needs to know the locale at render time. Without special configuration, this forces dynamic rendering on every request.

**Consequences:**
- Page load times increase significantly
- Server costs increase (no CDN caching)
- SEO may suffer from slower pages

**Warning signs:**
- Build output shows pages as "dynamic" instead of "static"
- Time-to-first-byte increases after adding i18n
- Server CPU usage spikes

**Prevention:**
1. **Use `setRequestLocale()` in layouts and pages** - This enables static rendering by providing locale synchronously
2. **Call `setRequestLocale(locale)` at the top of every layout/page** - Before any other next-intl API calls
3. **Generate static params for all locales** - Use `generateStaticParams` to pre-render all locale variants

```typescript
// app/[locale]/layout.tsx
import { setRequestLocale } from 'next-intl/server';

export default function Layout({ params: { locale } }) {
  setRequestLocale(locale);  // Must be first!
  // ... rest of layout
}
```

**Phase to address:** Phase 4 (Frontend Localization) - Must be configured correctly from the start

**Sources:** [next-intl Static Rendering](https://next-intl.dev/docs/getting-started/app-router), [Vercel Common Mistakes](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded user experience.

---

### Pitfall 6: Flutter ARB Plural Forms Syntax Confusion

**What goes wrong:** Developers use `zero`, `one`, `two` keywords in ARB plural messages, but Flutter's gen_l10n expects `=0`, `=1`, `=2`. The generated code silently ignores the wrong syntax, producing incorrect pluralization.

**Why it happens:** ICU MessageFormat has two syntaxes: named forms (`zero`, `one`) and exact matches (`=0`, `=1`). They have different semantics, and Flutter only supports exact matches for some forms.

**Consequences:**
- "You have 0 messages" displays instead of "You have no messages"
- Slavic languages with complex plural rules display wrong forms
- Translators use standard ICU syntax that doesn't work

**Warning signs:**
- Plural strings show numbers instead of special forms
- Different behavior between Flutter and translation tools
- QA reports "wrong" strings in certain languages

**Prevention:**
1. **Use `=0` instead of `zero`, `=1` instead of `one`** in ARB files
2. **Document the correct syntax** for translators with examples
3. **Test all plural forms explicitly** - 0, 1, 2, 5, 21, etc.
4. **Use only one plural per string** - Multiple ICU plurals in one string don't work

**Correct syntax:**
```json
"itemCount": "{count, plural, =0{No items} =1{One item} other{{count} items}}"
```

**Phase to address:** Phase 5 (Mobile Localization) - Define ARB conventions before creating translation files

**Sources:** [Flutter Issue #109498](https://github.com/flutter/flutter/issues/109498), [Flutter Issue #84291](https://github.com/flutter/flutter/issues/84291)

---

### Pitfall 7: Hot Reload Does Not Regenerate Localization Files

**What goes wrong:** Developer adds new translation key to ARB file, hits hot reload, but new string doesn't appear. They assume something is broken and waste time debugging.

**Why it happens:** Flutter's hot reload doesn't regenerate the localization Dart files. Only hot restart or full rebuild triggers gen_l10n.

**Consequences:**
- Wasted developer time
- Confusion about whether changes were saved
- Habit of doing full rebuilds slows development

**Warning signs:**
- New translations don't appear after hot reload
- Developers reporting "localization is broken"
- Excessive use of full rebuilds

**Prevention:**
1. **Document clearly: new ARB keys require hot restart (R) not hot reload (r)**
2. **Add to onboarding/CLAUDE.md** for developers
3. **Consider file watcher script** that auto-runs `flutter gen-l10n` on ARB changes
4. **For new locales entirely, full rebuild is required** (`flutter clean && flutter pub get`)

**Phase to address:** Phase 5 (Mobile Localization) - Add to developer documentation

**Sources:** [Flutter Issue #58183](https://github.com/flutter/flutter/issues/58183), [Flutter Issue #110714](https://github.com/flutter/flutter/issues/110714)

---

### Pitfall 8: next-intl Middleware Cookie Overrides Browser Language

**What goes wrong:** User visits site in Chrome set to French, sees French. Next day, visits in Safari (English), still sees French because NEXT_LOCALE cookie persists.

**Why it happens:** next-intl sets a `NEXT_LOCALE` cookie when the locale is detected or changed. This cookie takes precedence over Accept-Language header on subsequent visits.

**Consequences:**
- Users confused about why language doesn't match browser settings
- Clearing cookies "fixes" it temporarily
- QA testing gives inconsistent results

**Warning signs:**
- "It worked yesterday, now it's wrong"
- Different behavior in incognito vs regular browsing
- Tests pass locally but fail in CI/staging

**Prevention:**
1. **Provide explicit language switcher UI** rather than relying on auto-detection
2. **Store language preference in user settings** (backend) not just cookie
3. **For testing: always clear NEXT_LOCALE cookie** before testing locale detection
4. **Consider `localeDetection: false`** if users should always choose explicitly

**Phase to address:** Phase 4 (Frontend Localization) - Decide on locale detection strategy upfront

**Sources:** [next-intl Middleware Documentation](https://next-intl.dev/docs/routing/middleware)

---

### Pitfall 9: Prompt Template Variables Break in Non-English Languages

**What goes wrong:** Prompt uses template variables like `{{CURRENT_DATE_CONTEXT}}`. The date formatter produces "Tuesday, January 23rd" but for French it should be "mardi 23 janvier" (different order, no "rd").

**Why it happens:** Date/time/number formatting is locale-specific. Using English formatting code with translated text produces unnatural results.

**Consequences:**
- French prompt says "Aujourd'hui c'est Tuesday, January 23rd" (mixed languages)
- Numbers formatted with wrong separators (1,000.00 vs 1 000,00)
- Dates in wrong order (month/day vs day/month)

**Warning signs:**
- Mixed language in agent responses
- Dates/numbers look "foreign" in localized interface
- Translators flag issues with dynamic content

**Prevention:**
1. **Use locale-aware formatters for all dynamic content**
   - Python: `babel.dates.format_date(locale='fr')`
   - TypeScript: `Intl.DateTimeFormat(locale)`
2. **Audit all template variables in prompts** - Each must have locale-aware generation
3. **Create `format_date_speech_friendly(date, locale)` function** - CAAL already has this, needs locale parameter

**Phase to address:** Phase 2 (Prompt Localization) - Formatting must be locale-aware from the start

**Sources:** [Phrase Flutter Localization Guide](https://phrase.com/blog/posts/flutter-localization/)

---

### Pitfall 10: Tool Responses Not Reformulated for Target Language

**What goes wrong:** n8n workflow returns `{"message": "Lights turned on successfully"}`. Agent is configured for French but speaks English because tool response is English.

**Why it happens:** External tools (n8n, Home Assistant, MCP servers) return responses in their configured language, not the user's language. The agent must reformulate, not just read verbatim.

**Consequences:**
- Random English phrases in otherwise French conversation
- Breaking of voice UX immersion
- User confusion about what happened

**Warning signs:**
- Tool responses appear verbatim in transcript
- Consistent English snippets regardless of language setting
- Agent personality changes when reading tool responses

**Prevention:**
1. **Never read tool `message` fields verbatim** - Always have LLM reformulate
2. **Add language instruction wrapper around tool results**:
   ```
   [Tool returned: {tool_response}]
   [Reformulate this result naturally in {language}. Do not read the JSON.]
   ```
3. **Update prompt instructions** to clarify reformulation requirement
4. **Consider separate "reading" vs "summarizing" modes** based on content type

**Phase to address:** Phase 2 (Prompt Localization) - Fundamental to voice UX

**Sources:** [Multilingual Prompt Engineering](https://latitude-blog.ghost.io/blog/multilingual-prompt-engineering-for-semantic-alignment/)

---

## Minor Pitfalls

Mistakes that cause annoyance or require small fixes.

---

### Pitfall 11: Missing `@@locale` Key in ARB Files

**What goes wrong:** ARB file is named `app_fr.arb` but doesn't contain `"@@locale": "fr"`. Flutter's gen_l10n may fail to generate the locale class or produce incorrect mappings.

**Prevention:** Always include `@@locale` key as the first entry in every ARB file:
```json
{
  "@@locale": "fr",
  "greeting": "Bonjour"
}
```

**Phase to address:** Phase 5 (Mobile Localization)

---

### Pitfall 12: Hardcoded Strings Scattered Throughout Codebase

**What goes wrong:** Developer adds quick UI text directly in TSX/Dart instead of translation file. When localization happens, these strings are missed.

**Prevention:**
1. **Lint rule to detect hardcoded strings** in component files
2. **Code review checklist item** for i18n
3. **Extract all strings before starting translation** - Don't translate incrementally

**Phase to address:** Phase 4/5 (Frontend/Mobile) - Extraction should be complete before translation begins

---

### Pitfall 13: URL Locale Prefix Inconsistency Between Frontend and Mobile

**What goes wrong:** Frontend uses `/fr/settings`, mobile deep links use `/settings?lang=fr`. Links shared between platforms don't work.

**Prevention:**
1. **Define URL strategy early** that works for both web and mobile
2. **Use consistent locale parameter approach** across platforms
3. **Document the canonical URL format** in project docs

**Phase to address:** Phase 1 (Core Infrastructure) - Architectural decision needed early

---

### Pitfall 14: Wake Greetings Not Localized

**What goes wrong:** Language is French, but wake word triggers "Hey, what's up?" because `wake_greetings` array in settings is still English.

**Prevention:**
1. **Create locale-specific greeting arrays** or translate dynamically
2. **Include wake greetings in localization scope**
3. **Test wake word → greeting flow** in each target language

**Phase to address:** Phase 3 (Voice Pipeline) - Part of voice UX localization

---

### Pitfall 15: Right-to-Left (RTL) Layout Not Considered

**What goes wrong:** Adding Hebrew or Arabic support later requires extensive UI rework because components weren't built with RTL in mind.

**Prevention:**
1. **Use logical properties** (`margin-inline-start` not `margin-left`)
2. **Test with RTL language early** even if not launching with one
3. **Flutter: Use `Directionality` widget** and logical EdgeInsets

**Phase to address:** Phase 4/5 (Frontend/Mobile) - Architectural consideration

---

## Phase-Specific Warning Summary

| Phase | Topic | Likely Pitfalls | Priority |
|-------|-------|-----------------|----------|
| Phase 1 | Core Infrastructure | #3 (Backward Compat), #13 (URL Strategy) | CRITICAL |
| Phase 2 | Prompt Localization | #2 (LLM Language Drift), #9 (Template Variables), #10 (Tool Reformulation) | CRITICAL |
| Phase 3 | Voice Pipeline | #1 (Whisper Detection), #4 (TTS Voice Mismatch), #14 (Wake Greetings) | CRITICAL |
| Phase 4 | Frontend (Next.js) | #5 (Static Rendering), #8 (Cookie Override), #12 (Hardcoded Strings) | HIGH |
| Phase 5 | Mobile (Flutter) | #6 (Plural Syntax), #7 (Hot Reload), #11 (@@locale Key) | MEDIUM |

---

## Testing Checklist for i18n

Before each phase completion, verify:

- [ ] Existing English installation still works after upgrade
- [ ] Language setting persists across sessions
- [ ] STT receives correct language parameter
- [ ] LLM responses stay in target language (test 10+ turns)
- [ ] TTS voice matches target language
- [ ] All dates/numbers formatted for locale
- [ ] Tool responses reformulated in target language
- [ ] URLs work with and without locale prefix (for default language)
- [ ] Mobile and web links interoperate correctly

---

## Sources

### Next.js / next-intl
- [next-intl App Router Setup](https://next-intl.dev/docs/getting-started/app-router)
- [next-intl Routing Configuration](https://next-intl.dev/docs/routing/configuration)
- [next-intl Middleware Documentation](https://next-intl.dev/docs/routing/middleware)
- [Vercel: Common Next.js App Router Mistakes](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)

### Flutter
- [Flutter Internationalization Guide](https://docs.flutter.dev/ui/internationalization)
- [Phrase: Flutter Localization Guide](https://phrase.com/blog/posts/flutter-localization/)
- [Flutter Issue #109498 - Multiple ICU Plurals](https://github.com/flutter/flutter/issues/109498)
- [Flutter Issue #58183 - ARB Hot Reload](https://github.com/flutter/flutter/issues/58183)

### Voice/STT/TTS
- [OpenAI Whisper GitHub](https://github.com/openai/whisper)
- [Whisper Language Flag Discussion](https://github.com/openai/whisper/discussions/1456)
- [Home Assistant Voice Chapter 11](https://www.home-assistant.io/blog/2025/10/22/voice-chapter-11)
- [Softcery: STT and TTS for Voice Agents](https://softcery.com/lab/how-to-choose-stt-tts-for-ai-voice-agents-in-2025-a-comprehensive-guide)

### LLM Multilingual
- [LangChain Language Switching Issue](https://github.com/langchain-ai/langchain/issues/14974)
- [Cross-Lingual Prompt Steerability Research](https://arxiv.org/html/2512.02841)
- [Multilingual Prompt Engineering](https://latitude-blog.ghost.io/blog/multilingual-prompt-engineering-for-semantic-alignment/)
