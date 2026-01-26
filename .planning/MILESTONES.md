# Project Milestones: CAAL

## v1.0 Multilingual Support (Shipped: 2026-01-26)

**Delivered:** Full multilingual support (EN/FR) across the entire CAAL stack — web UI, mobile app, and voice pipeline — controlled by a single global language setting.

**Phases completed:** 1-4 (7 plans total)

**Key accomplishments:**

- Global language setting infrastructure with propagation to all components
- Complete Next.js i18n with next-intl, EN/FR translations (128 keys), language selector
- Complete Flutter i18n with ARB files, LocaleProvider, all screens localized
- Language-aware voice pipeline: STT language param, TTS voice mapping, localized prompts
- Per-language wake greetings with automatic language-appropriate defaults
- Auto-switch from Kokoro to Piper TTS for non-English languages

**Stats:**

- 65 files created/modified
- +8,501 / -565 lines (Python, TypeScript, Dart)
- 4 phases, 7 plans, 37 commits
- 2 days from start to ship (2026-01-25 to 2026-01-26)
- Audit: 19/19 requirements, 4/4 phases, 7/7 integrations, 5/5 E2E flows
- Human testing: 8/8 tests passed (3 bugs found and fixed)

**Git range:** `97879a7` to `e0105d1`

**What's next:** TBD — next milestone via `/gsd:new-milestone`

---
