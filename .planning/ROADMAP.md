# Roadmap: CAAL

## Milestones

- SHIPPED **v1.0 Multilingual Support** — Phases 1-4 (shipped 2026-01-26)
- ACTIVE **v1.1 Complete Tool Registry i18n** — Phases 5-7

## Phases

<details>
<summary>v1.0 Multilingual Support (Phases 1-4) — SHIPPED 2026-01-26</summary>

- [x] Phase 1: Foundation (1/1 plans) — completed 2026-01-25
- [x] Phase 2: Frontend i18n (2/2 plans) — completed 2026-01-25
- [x] Phase 3: Mobile i18n (2/2 plans) — completed 2026-01-25
- [x] Phase 4: Voice Pipeline (2/2 plans) — completed 2026-01-26

</details>

### v1.1 Complete Tool Registry i18n

- [ ] **Phase 5: Extract & Add EN Keys** — Internationalize components, add English message keys
  **Plans:** 1 plan
  Plans:
  - [ ] 05-01-PLAN.md — Internationalize both components, add EN message keys
- [ ] **Phase 6: FR & IT Translations** — Add French and Italian translations
- [ ] **Phase 7: Quality Verification** — Verify no hardcoded strings, style consistency

---

## Phase Details

### Phase 5: Extract & Add EN Keys

**Goal:** Internationalize the two Tool Registry components and add English message keys.

**Requirements:**
- I18N-01: workflow-submission-dialog.tsx uses useTranslations hook
- I18N-02: workflow-detail-modal.tsx uses useTranslations hook
- I18N-03: All hardcoded strings extracted to message keys
- EN-01: Tools.share.* keys added to en.json for submission dialog
- EN-02: Tools.workflow.* keys added to en.json for detail modal

**Success Criteria:**
1. workflow-submission-dialog.tsx imports and uses useTranslations('Tools')
2. workflow-detail-modal.tsx imports and uses useTranslations('Tools')
3. en.json contains Tools.share.* keys (~15 keys)
4. en.json contains Tools.workflow.* keys (~10 keys)
5. Components render correctly with English translations

---

### Phase 6: FR & IT Translations

**Goal:** Add French and Italian translations for all new keys.

**Requirements:**
- FR-01: Tools.share.* keys translated in fr.json
- FR-02: Tools.workflow.* keys translated in fr.json
- FR-03: French translations use tu/toi register consistently
- IT-01: Tools.share.* keys translated in it.json
- IT-02: Tools.workflow.* keys translated in it.json

**Success Criteria:**
1. fr.json contains all Tools.share.* and Tools.workflow.* keys
2. it.json contains all Tools.share.* and Tools.workflow.* keys
3. French translations use informal "tu" register (not "vous")
4. Technical terms (n8n, credentials, workflow) stay in English
5. UI displays correctly in FR and IT locales

---

### Phase 7: Quality Verification

**Goal:** Verify no hardcoded strings remain and translation style is consistent.

**Requirements:**
- QA-01: No hardcoded English strings remain in target components
- QA-02: Translation style consistent with existing messages
- QA-03: All three languages (EN/FR/IT) have identical key structure

**Success Criteria:**
1. Grep for hardcoded strings in target files returns no matches
2. All message files have identical nested key structure
3. Translation tone matches existing translations in each language
4. Visual review confirms UI displays correctly in all 3 languages

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 1/1 | Complete | 2026-01-25 |
| 2. Frontend i18n | v1.0 | 2/2 | Complete | 2026-01-25 |
| 3. Mobile i18n | v1.0 | 2/2 | Complete | 2026-01-25 |
| 4. Voice Pipeline | v1.0 | 2/2 | Complete | 2026-01-26 |
| 5. Extract & Add EN Keys | v1.1 | 0/1 | Planned | — |
| 6. FR & IT Translations | v1.1 | 0/? | Pending | — |
| 7. Quality Verification | v1.1 | 0/? | Pending | — |

---
*Roadmap created: 2026-01-25*
*Last updated: 2026-02-05 — Phase 5 planned*
