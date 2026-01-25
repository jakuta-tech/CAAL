# Technology Stack: CAAL Multilingual Support (i18n)

**Project:** CAAL Voice Assistant - Multilingual Support
**Researched:** 2026-01-25
**Overall Confidence:** HIGH

---

## Executive Summary

This stack recommendation enables a global language setting that propagates across all CAAL components: Next.js frontend, Flutter mobile, Python agent (prompts), Whisper STT, and TTS (Kokoro/Piper). French is the first non-English target language.

**Key constraints discovered:**
- Kokoro TTS has LIMITED French support (1 voice, <11h training data, grade B-)
- Piper TTS has BETTER French support (6 voice models, multiple quality levels)
- Whisper natively supports French with excellent quality (top-5 supported language)

---

## Recommended Stack

### 1. Next.js 15 Frontend Internationalization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **next-intl** | ^4.7.0 | UI translations | De facto standard for Next.js App Router; 7% smaller bundle than v3; type-safe locale and ICU arguments; works with React 19 |

**Confidence:** HIGH (verified via [next-intl official blog](https://next-intl.dev/blog/next-intl-4-0))

**Why next-intl over alternatives:**
- `react-intl`: Heavier, older API design, less App Router integration
- `next-i18next`: Pages Router focused, clunky with App Router
- `i18next`: Generic React library, doesn't leverage Next.js server components
- `next-intl`: Purpose-built for App Router, excellent TypeScript support, ICU message format

**Installation:**
```bash
cd frontend && pnpm add next-intl
```

**Required configuration files:**

```
frontend/
  messages/
    en.json
    fr.json
  src/
    i18n/
      routing.ts      # Locale list and default
      request.ts      # Message loading config
    middleware.ts     # Locale detection/routing
    app/
      [locale]/       # Dynamic locale segment
        layout.tsx
        page.tsx
```

**Key code patterns:**

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
});

// src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);
export const config = { matcher: ['/', '/(fr|en)/:path*'] };

// Usage in components
import { useTranslations } from 'next-intl';
const t = useTranslations('Settings');
// t('language.label') -> "Language" or "Langue"
```

**NOT recommended:**
- `getServerSideProps` based i18n (Pages Router pattern)
- Global `_()` function injection (breaks tree-shaking)

---

### 2. Flutter Mobile Internationalization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **flutter_localizations** | SDK | Material/Cupertino locale | Official Flutter SDK package |
| **intl** | ^0.19.0 | Message formatting | Official Dart i18n; already in pubspec.yaml (v0.20.0) |

**Confidence:** HIGH (verified via [Flutter official docs](https://docs.flutter.dev/ui/internationalization))

**Why official packages over alternatives:**
- `easy_localization`: Simpler but less control over ARB workflow
- `get`: Bundled localization is tied to GetX state management
- Official `intl` + `flutter_localizations`: Dart team maintained, ARB format (industry standard), compile-time code generation

**Current state:** Already has `intl: ^0.20.0` in pubspec.yaml. Just need to add `flutter_localizations`.

**Installation (add to pubspec.yaml):**
```yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: ^0.20.0  # Already present

flutter:
  generate: true  # Enable codegen
```

**Create l10n.yaml:**
```yaml
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
output-class: AppLocalizations
synthetic-package: false  # 2025 best practice - generates into lib/
output-dir: lib/src/generated/l10n
```

**ARB file structure:**
```
mobile/lib/l10n/
  app_en.arb
  app_fr.arb
```

**MaterialApp configuration:**
```dart
MaterialApp(
  localizationsDelegates: const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  supportedLocales: const [
    Locale('en'),
    Locale('fr'),
  ],
  locale: selectedLocale,  // From settings/provider
);
```

**NOT recommended:**
- `synthetic-package: true` (deprecated in Flutter 2025)
- Storing translations in .json (loses ARB metadata for translators)

---

### 3. Python Agent Prompt Localization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **gettext** | stdlib | Prompt translation | Zero dependencies; proven 25+ year standard; .po/.mo tooling ecosystem |

**Confidence:** HIGH (verified via [Python official docs](https://docs.python.org/3/library/gettext.html))

**Why gettext over alternatives:**
- `python-i18n`: Extra dependency for simple use case
- `Babel`: Overkill for prompt-only localization
- `gettext`: Built-in, no dependencies, excellent tooling (xgettext, poedit)

**However, for CAAL's specific case - prompts only - a simpler approach:**

**Recommended: Markdown prompt files per locale**

Given that CAAL already uses `prompt/default.md` and `prompt/custom.md`, the simplest approach is:

```
prompt/
  en/
    default.md
    custom.md
  fr/
    default.md
    custom.md
```

**Implementation in settings.py:**
```python
# Add to DEFAULT_SETTINGS
"language": "en",  # "en" | "fr"

# Modify load_prompt_content() to use locale
def get_prompt_path(prompt_name: str, locale: str = None) -> Path:
    if locale is None:
        locale = get_setting("language", "en")
    return PROMPT_DIR / locale / f"{prompt_name}.md"
```

**Why this over gettext for prompts:**
- Prompts are large markdown documents, not UI strings
- Translators can edit full context (not fragmented .po entries)
- No build step required
- Existing `prompt/` structure is preserved

**For UI strings in webhooks.py (error messages, etc.):**
```python
import gettext
from pathlib import Path

LOCALE_DIR = Path(__file__).parent / "locales"

def get_translator(language: str = "en"):
    try:
        return gettext.translation("caal", LOCALE_DIR, languages=[language])
    except FileNotFoundError:
        return gettext.NullTranslations()

_ = get_translator().gettext
```

---

### 4. Whisper STT Language Configuration

| Technology | Configuration | Purpose | Why |
|------------|--------------|---------|-----|
| **Whisper language param** | `language="fr"` | French transcription | Native support; French is top-5 quality language in Whisper |

**Confidence:** HIGH (verified via [OpenAI Whisper GitHub](https://github.com/openai/whisper))

**Current CAAL integration (voice_agent.py lines 466-477):**
```python
# Current - English hardcoded for Groq
base_stt = groq_plugin.STT(
    model="whisper-large-v3-turbo",
    language="en",  # <- This needs to be configurable
)

# For Speaches (local Faster-Whisper)
base_stt = openai.STT(
    base_url=f"{SPEACHES_URL}/v1",
    api_key="not-needed",
    model=WHISPER_MODEL,
    # language param NOT currently passed - uses auto-detect
)
```

**Required changes:**

1. Add language setting:
```python
# settings.py DEFAULT_SETTINGS
"language": "en",  # Global language setting
```

2. Pass to STT providers:
```python
# voice_agent.py
runtime = get_runtime_settings()
language = runtime.get("language", "en")

# Groq
base_stt = groq_plugin.STT(
    model="whisper-large-v3-turbo",
    language=language,
)

# Speaches/Faster-Whisper via OpenAI-compatible API
# Note: OpenAI STT plugin may need language passed differently
# Check livekit-plugins-openai source for language parameter support
```

**Language codes:**
- English: `"en"`
- French: `"fr"`

**Model recommendations for French:**
- **Groq cloud:** `whisper-large-v3-turbo` (excellent French support)
- **Local Speaches:** `Systran/faster-whisper-medium` or `faster-whisper-large-v3` (larger = better French accuracy)
- **French-optimized (optional):** `bofenghuang/whisper-large-v3-french` (fine-tuned on 2200h French audio)

**Confidence:** HIGH for multilingual Whisper; MEDIUM for Speaches API language parameter (need to verify OpenAI plugin passes it through)

---

### 5. TTS French Voice Options

#### Kokoro TTS (GPU)

| Voice ID | Name | Gender | Quality | Training Data |
|----------|------|--------|---------|---------------|
| `ff_siwis` | SIWIS | Female | B- | <11 hours |

**Confidence:** HIGH (verified via [Kokoro VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md))

**Critical limitation:** Kokoro has only ONE French voice with limited training data. The documentation explicitly warns: "Support for non-English languages may be absent or thin due to weak G2P and/or lack of training data."

**Configuration in settings.py:**
```python
"tts_voice_kokoro_fr": "ff_siwis",  # Only French voice available
```

**Recommendation:** For French TTS quality, prefer Piper over Kokoro.

---

#### Piper TTS (CPU)

| Voice | Quality Levels | Gender | Notes |
|-------|---------------|--------|-------|
| `siwis` | low, medium | Female | Best quality French voice |
| `tom` | medium | Male | Good alternative |
| `upmc` | medium | Female | Reported speed issues |
| `mls` | medium | Various | Multi-speaker (124 speakers) |
| `mls_1840` | low | Various | Lower quality MLS |
| `gilles` | low | Male | Basic quality |

**Confidence:** HIGH (verified via [Piper VOICES.md](https://github.com/rhasspy/piper/blob/master/VOICES.md))

**Recommended French voices:**
1. **siwis-medium** - Best balance of quality and speed
2. **tom-medium** - Male alternative

**Model path format for Speaches:**
```python
# Current English
"tts_voice_piper": "speaches-ai/piper-en_US-ryan-high"

# French equivalents (need to verify exact Speaches model IDs)
"tts_voice_piper_fr": "speaches-ai/piper-fr_FR-siwis-medium"
```

**Download URLs (Hugging Face):**
```
https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/siwis/medium/
  - fr_FR-siwis-medium.onnx
  - fr_FR-siwis-medium.onnx.json
```

**Warning:** The Piper repository was archived October 2025. Models remain available on Hugging Face but no new development expected.

---

## Unified Language Setting Architecture

```
settings.json
{
  "language": "fr",           // Global language
  "tts_voice_kokoro": "af_heart",      // English Kokoro
  "tts_voice_kokoro_fr": "ff_siwis",   // French Kokoro
  "tts_voice_piper": "speaches-ai/piper-en_US-ryan-high",
  "tts_voice_piper_fr": "speaches-ai/piper-fr_FR-siwis-medium"
}
```

**Runtime resolution:**
```python
language = get_setting("language", "en")
if tts_provider == "kokoro":
    voice = get_setting(f"tts_voice_kokoro_{language}", get_setting("tts_voice_kokoro"))
else:
    voice = get_setting(f"tts_voice_piper_{language}", get_setting("tts_voice_piper"))
```

---

## Installation Summary

### Frontend (Next.js)
```bash
cd frontend
pnpm add next-intl
```

### Mobile (Flutter)
```yaml
# pubspec.yaml - add flutter_localizations
dependencies:
  flutter_localizations:
    sdk: flutter
```

### Agent (Python)
No new dependencies for prompts (use locale-specific markdown files).
For UI strings: gettext (stdlib).

### STT (Whisper)
No new dependencies. Pass `language` parameter to existing providers.

### TTS (Kokoro/Piper)
No new dependencies. Configure voice IDs per language in settings.

---

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| `next-i18next` | Pages Router focused, awkward with App Router |
| `react-intl` | Heavier bundle, less Next.js 15 integration |
| `easy_localization` (Flutter) | Less control than official intl package |
| `python-i18n` | Unnecessary dependency for prompt files |
| Kokoro for French production | Only 1 voice, B- quality, <11h training data |

---

## Confidence Assessment

| Component | Confidence | Reason |
|-----------|------------|--------|
| next-intl v4.7 | HIGH | Official docs verified, v4.0 released March 2025 |
| Flutter intl | HIGH | Official Flutter SDK, already partially in use |
| Python gettext | HIGH | Stdlib, 25+ year track record |
| Whisper French | HIGH | Top-5 supported language, well documented |
| Kokoro French | HIGH | Verified limited support (1 voice, B- quality) |
| Piper French | HIGH | 6 voice options verified, siwis recommended |
| Speaches language API | MEDIUM | Need to verify OpenAI plugin passes language param |

---

## Sources

### Next.js i18n
- [next-intl 4.0 Release Blog](https://next-intl.dev/blog/next-intl-4-0)
- [next-intl App Router Docs](https://next-intl.dev/docs/getting-started/app-router)
- [next-intl GitHub Releases](https://github.com/amannn/next-intl/releases)

### Flutter i18n
- [Flutter Internationalization Guide](https://docs.flutter.dev/ui/internationalization)
- [Flutter l10n Breaking Change (2025)](https://docs.flutter.dev/release/breaking-changes/flutter-generate-i10n-source)

### Python i18n
- [Python gettext Documentation](https://docs.python.org/3/library/gettext.html)
- [Python i18n Best Practices](https://lokalise.com/blog/beginners-guide-to-python-i18n/)

### Whisper STT
- [OpenAI Whisper GitHub](https://github.com/openai/whisper)
- [Faster-Whisper GitHub](https://github.com/SYSTRAN/faster-whisper)
- [Whisper French Fine-tuned Model](https://huggingface.co/bofenghuang/whisper-large-v3-french)

### Kokoro TTS
- [Kokoro VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)

### Piper TTS
- [Piper VOICES.md](https://github.com/rhasspy/piper/blob/master/VOICES.md)
- [Piper Voice Models (Hugging Face)](https://huggingface.co/rhasspy/piper-voices)
