# i18n Architecture for CAAL

**Project:** CAAL Multilingual Support
**Researched:** 2026-01-25
**Dimension:** Architecture

## Current Architecture Overview

CAAL is a voice assistant with three client surfaces and a Python agent backend:

```
+------------------+     +------------------+     +------------------+
|    Frontend      |     |     Mobile       |     |     Agent        |
|   (Next.js 15)   |     |    (Flutter)     |     |    (Python)      |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+----------------------------------------------------------+
|                    LiveKit Server                         |
+----------------------------------------------------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
    +----v----+         +-----v-----+        +----v----+
    |   STT   |         |    LLM    |        |   TTS   |
    | Speaches|         |  Ollama/  |        | Kokoro/ |
    | or Groq |         |   Groq    |        |  Piper  |
    +---------+         +-----------+        +---------+
```

## Components Requiring i18n Modification

### 1. Settings Layer (`src/caal/settings.py`)

**Role:** Central configuration store with JSON persistence

**Required Changes:**
- Add `language` setting to `DEFAULT_SETTINGS`
- Store language as ISO 639-1 code (e.g., "en", "fr", "de", "es")

**File:** `/Users/mmaudet/work/CAAL/src/caal/settings.py`

```python
DEFAULT_SETTINGS = {
    # ... existing settings ...
    "language": "en",  # ISO 639-1 language code
}
```

**Boundary:** Settings is the source of truth. All other components read from here.

### 2. Agent Voice Pipeline (`voice_agent.py`)

**Role:** Orchestrates STT, LLM, TTS for voice conversations

**Required Changes:**

| Subsystem | Current Code | Required Modification |
|-----------|--------------|----------------------|
| **STT (Groq)** | `language="en"` hardcoded (line 470) | Read from settings |
| **STT (Speaches)** | No language param | Add language parameter |
| **TTS voice** | Voice per provider | Map language to voice |
| **Agent prompt** | English `prompt/default.md` | Load localized prompt |

**Files:**
- `/Users/mmaudet/work/CAAL/voice_agent.py` - STT language parameter, TTS voice mapping
- `/Users/mmaudet/work/CAAL/prompt/default.md` - Template with localization hooks

**Key Code Locations:**

```python
# voice_agent.py line 467-477 - STT setup
if runtime["stt_provider"] == "groq":
    base_stt = groq_plugin.STT(
        model="whisper-large-v3-turbo",
        language="en",  # <-- MODIFY: runtime["language"]
    )
else:
    base_stt = openai.STT(
        base_url=f"{SPEACHES_URL}/v1",
        api_key="not-needed",
        model=WHISPER_MODEL,
        # <-- ADD: language=runtime["language"]
    )

# voice_agent.py line 553-568 - TTS setup
if runtime["tts_provider"] == "piper":
    tts_instance = openai.TTS(
        ...
        model=runtime["tts_voice_piper"],  # <-- MODIFY: language-aware voice
    )
else:
    tts_instance = openai.TTS(
        ...
        voice=runtime["tts_voice_kokoro"],  # <-- MODIFY: language-aware voice
    )
```

### 3. Webhook Server (`src/caal/webhooks.py`)

**Role:** HTTP API for settings, voices, setup

**Required Changes:**
- Filter voices by language in `/voices` endpoint
- Return language-appropriate Piper models
- Add language to setup complete flow

**File:** `/Users/mmaudet/work/CAAL/src/caal/webhooks.py`

**Key Code Location:**

```python
# webhooks.py line 447-475 - PIPER_VOICES constant
# Currently a flat list - needs restructuring by language
PIPER_VOICES = [
    # English
    "speaches-ai/piper-en_US-ryan-high",
    ...
    # German
    "speaches-ai/piper-de_DE-thorsten-high",
    ...
]

# Restructure to:
PIPER_VOICES_BY_LANGUAGE = {
    "en": ["speaches-ai/piper-en_US-ryan-high", ...],
    "de": ["speaches-ai/piper-de_DE-thorsten-high", ...],
    "fr": ["speaches-ai/piper-fr_FR-siwis-medium", ...],
    ...
}
```

### 4. Frontend Settings Panel (`frontend/components/settings/settings-panel.tsx`)

**Role:** Web UI for configuration

**Required Changes:**
- Add language dropdown to "Agent" tab
- Filter voice dropdown based on selected language
- Update Settings interface type

**File:** `/Users/mmaudet/work/CAAL/frontend/components/settings/settings-panel.tsx`

**UI Strings:** 100+ hardcoded English strings throughout the file

**Key Code Locations:**

```typescript
// settings-panel.tsx line 12-45 - Settings interface
interface Settings {
  // ... existing fields ...
  language: string;  // <-- ADD
}

// settings-panel.tsx line 55-83 - DEFAULT_SETTINGS
const DEFAULT_SETTINGS: Settings = {
  // ... existing defaults ...
  language: 'en',  // <-- ADD
};

// settings-panel.tsx line 95-102 - TABS constant
const TABS: { id: TabId; label: string }[] = [
  { id: 'agent', label: 'Agent' },  // <-- LOCALIZE
  ...
];
```

### 5. Mobile Settings Screen (`mobile/lib/screens/settings_screen.dart`)

**Role:** Flutter mobile UI for configuration

**Required Changes:**
- Add language dropdown
- Filter voice options by language
- Mirror all frontend settings changes

**File:** `/Users/mmaudet/work/CAAL/mobile/lib/screens/settings_screen.dart`

**UI Strings:** 50+ hardcoded English strings

**Key Code Locations:**

```dart
// settings_screen.dart line 37-77 - State fields
String _language = 'en';  // <-- ADD

// settings_screen.dart line 487-524 - Settings map
final settings = {
  // ... existing fields ...
  'language': _language,  // <-- ADD
};
```

### 6. Prompt Templates (`prompt/`)

**Role:** LLM system instructions

**Required Changes:**
- Create language-specific prompts OR
- Add language instruction to existing prompt template

**Directory:** `/Users/mmaudet/work/CAAL/prompt/`

**Options:**

**Option A: Language directive in template (simpler)**
```markdown
# prompt/default.md
You are an ACTION-ORIENTED voice assistant. {{CURRENT_DATE_CONTEXT}}

**LANGUAGE: Respond in {{LANGUAGE}}.**

When asked to do something:
...
```

**Option B: Per-language prompt files (more control)**
```
prompt/
  default.md      # English (fallback)
  default_de.md   # German
  default_fr.md   # French
  custom.md       # User custom (English)
  custom_de.md    # User custom (German)
```

**Recommendation:** Option A for MVP - simpler, works with existing prompt system.

## Data Flow: Language Setting

```
User selects language in UI
           |
           v
+----------+----------+
|  Frontend/Mobile    |
|  POST /api/settings |
+----------+----------+
           |
           v
+----------+----------+
|  Webhook Server     |
|  save_settings()    |
+----------+----------+
           |
           v
+----------+----------+
|  settings.json      |
|  { "language": "de" }|
+----------+----------+
           |
           v (on next session)
+----------+----------+
|  voice_agent.py     |
|  get_runtime_settings() |
+----------+----------+
           |
     +-----+-----+-----+-----+
     |           |           |
     v           v           v
+----+----+ +----+----+ +----+----+
|   STT   | |  Prompt | |   TTS   |
| lang=de | | lang=de | | voice=  |
|         | |         | | de_DE   |
+---------+ +---------+ +---------+
```

## Build Order (Dependencies)

Phase ordering based on technical dependencies:

### Phase 1: Settings Foundation
1. `src/caal/settings.py` - Add `language` to DEFAULT_SETTINGS
2. `src/caal/webhooks.py` - Update setup/complete endpoint

**Rationale:** All other components depend on settings existing.

### Phase 2: Agent Pipeline
1. `voice_agent.py` - Pass language to STT
2. `voice_agent.py` - Language-aware TTS voice selection
3. `prompt/default.md` - Add language directive

**Rationale:** Agent changes depend on settings. Can be tested with curl before UI.

### Phase 3: Voice Filtering
1. `src/caal/webhooks.py` - Restructure PIPER_VOICES by language
2. `src/caal/webhooks.py` - Filter `/voices` endpoint by language

**Rationale:** UI depends on filtered voice list. Kokoro voices are English-only, so filtering only affects Piper.

### Phase 4: Frontend UI
1. `frontend/components/settings/settings-panel.tsx` - Add language dropdown
2. Frontend voice dropdown - Filter by language

**Rationale:** UI changes depend on backend filtering being ready.

### Phase 5: Mobile UI
1. `mobile/lib/screens/settings_screen.dart` - Mirror frontend changes

**Rationale:** Mobile should match frontend behavior.

### Phase 6 (Optional): UI String Localization
1. Extract frontend strings to JSON files
2. Extract mobile strings to ARB files
3. Add language switcher that also controls UI language

**Rationale:** UI localization is a "nice to have" - the core value is voice language support. UI localization can be a separate milestone.

## Voice-Language Mapping

### Kokoro (GPU TTS)
- **Supported languages:** English only (American/British accents)
- **Voice selection:** Language-agnostic (accent preference)
- **Action:** No filtering needed - all voices work for English

### Piper (CPU TTS)
- **Supported languages:** 35+ languages
- **Voice selection:** Language embedded in model ID (e.g., `piper-de_DE-thorsten-high`)
- **Action:** Filter voices by language prefix

**Mapping Table:**

| Language Code | Piper Prefix | Available Voices |
|---------------|--------------|------------------|
| en | en_US, en_GB | 6 voices |
| de | de_DE | 3 voices |
| fr | fr_FR | 2 voices |
| es | es_ES, es_MX | 2 voices |
| ru | ru_RU | 1 voice |
| it | it_IT | 1 voice |
| pl | pl_PL | 1 voice |
| pt | pt_BR | 1 voice |
| sk | sk_SK | 1 voice |
| uk | uk_UA | 1 voice |

## STT Language Support

### Groq Whisper
- **Model:** whisper-large-v3-turbo
- **Supported languages:** 100+ (auto-detect or explicit)
- **Parameter:** `language` in constructor
- **Codes:** ISO 639-1 (same as settings)

### Speaches (local Whisper)
- **Model:** Configurable (default: faster-whisper-small)
- **Supported languages:** Same as base Whisper model
- **Parameter:** `language` in STT constructor or transcribe call
- **Codes:** ISO 639-1

## Files Requiring Modification (Summary)

| File | Changes | Priority |
|------|---------|----------|
| `src/caal/settings.py` | Add `language` default | P1 |
| `voice_agent.py` | STT lang, TTS voice mapping | P1 |
| `src/caal/webhooks.py` | Voice filtering, setup flow | P2 |
| `prompt/default.md` | Language directive | P2 |
| `frontend/components/settings/settings-panel.tsx` | Language dropdown | P3 |
| `mobile/lib/screens/settings_screen.dart` | Language dropdown | P3 |

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Settings architecture | HIGH | Clear single source of truth pattern |
| STT language param | HIGH | Both Groq and Whisper support ISO 639-1 |
| Piper voice mapping | HIGH | Language embedded in model IDs |
| Kokoro limitation | HIGH | Verified English-only from voice list |
| Prompt localization | MEDIUM | Simple approach works; complex prompts may need per-language files |
| UI localization | LOW | Not researched deeply - separate milestone recommended |

## Anti-Patterns to Avoid

### 1. Coupling Voice and Language Settings
**Wrong:** Separate `stt_language`, `tts_language`, `ui_language` settings
**Right:** Single `language` setting that drives all components

### 2. Hardcoding Voice-Language Mappings
**Wrong:** If statements mapping language to specific voice
**Right:** Filter available voices, let user choose from filtered list

### 3. Breaking Existing English Users
**Wrong:** Changing default voice names or behavior
**Right:** Default to "en", existing settings continue working

### 4. Complex Prompt Localization
**Wrong:** Translating entire prompts into each language
**Right:** Add language directive, let LLM handle response language

## Open Questions

1. **Should Kokoro users be limited to English?**
   - Option A: Yes, show warning if non-English selected
   - Option B: Allow any language, Kokoro speaks with English accent
   - Recommendation: Option B with warning in UI

2. **What happens to existing wake_greetings?**
   - Current: English greetings in settings
   - Option A: Let user translate manually
   - Option B: Provide default greetings per language
   - Recommendation: Option A for MVP

3. **Should custom prompts support language variants?**
   - Current: Single `custom.md` file
   - Recommendation: Defer to future milestone
