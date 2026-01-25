---
phase: 02-frontend-i18n
plan: 01
subsystem: ui
tags: [next-intl, i18n, react, next.js, cookies]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: language field in settings.json with ISO 639-1 codes

provides:
  - next-intl infrastructure for frontend i18n
  - cookie-based locale detection (CAAL_LOCALE)
  - NextIntlClientProvider in root layout
  - Locale type and configuration exports

affects: [02-02-PLAN, 03-mobile-i18n, ui-components]

# Tech tracking
tech-stack:
  added: [next-intl@4.7.0]
  patterns: [cookie-based locale detection, English fallback for missing translations]

key-files:
  created:
    - frontend/src/i18n/config.ts
    - frontend/src/i18n/request.ts
    - frontend/messages/en.json
    - frontend/messages/fr.json
  modified:
    - frontend/package.json
    - frontend/next.config.ts
    - frontend/app/layout.tsx

key-decisions:
  - "Cookie-based locale (CAAL_LOCALE) instead of URL routing - mirrors backend setting"
  - "English messages as base with locale overlay for fallback on missing translations"

patterns-established:
  - "i18n config exports: locales, Locale type, defaultLocale from config.ts"
  - "Server-side locale detection via getRequestConfig in request.ts"
  - "Provider hierarchy: NextIntlClientProvider > ThemeProvider > children"

# Metrics
duration: 4min
completed: 2026-01-25
---

# Phase 02 Plan 01: next-intl Infrastructure Summary

**next-intl 4.7.0 configured with cookie-based locale detection (CAAL_LOCALE) and English fallback for missing translations**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-25T18:19:37Z
- **Completed:** 2026-01-25T18:24:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed next-intl 4.7.0 with all peer dependencies
- Created i18n configuration with locales array, Locale type, and defaultLocale export
- Implemented cookie-based locale detection reading CAAL_LOCALE cookie
- Configured Next.js with withNextIntl plugin
- Wrapped app with NextIntlClientProvider in root layout
- Build verified successful with all pages generating correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Install next-intl and create i18n configuration** - `302532a` (feat)
2. **Task 2: Update Next.js config and root layout** - `87e5ec1` (feat)

## Files Created/Modified
- `frontend/src/i18n/config.ts` - Locale configuration (locales, Locale type, defaultLocale)
- `frontend/src/i18n/request.ts` - Server-side locale detection from CAAL_LOCALE cookie
- `frontend/messages/en.json` - Placeholder English messages (replaced in 02-02)
- `frontend/messages/fr.json` - Placeholder French messages (replaced in 02-02)
- `frontend/package.json` - Added next-intl dependency
- `frontend/next.config.ts` - Added withNextIntl plugin wrapper
- `frontend/app/layout.tsx` - Added NextIntlClientProvider and dynamic locale

## Decisions Made
- Used "without i18n routing" pattern to avoid URL segments for locale - locale determined by cookie matching backend setting
- English messages used as base with locale-specific overlay - ensures graceful fallback for untranslated strings
- Provider hierarchy places NextIntlClientProvider outside ThemeProvider - i18n context available everywhere

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed import order in request.ts**
- **Found during:** Task 2 (build verification)
- **Issue:** Prettier error on import order - `defaultLocale, type Locale` should be `type Locale, defaultLocale`
- **Fix:** Reordered imports to satisfy Prettier rules
- **Files modified:** frontend/src/i18n/request.ts
- **Verification:** Build passed after fix
- **Committed in:** 87e5ec1 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor style fix required for build to pass. No scope creep.

## Issues Encountered
None - all tasks executed smoothly after style fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- next-intl infrastructure complete and verified
- Ready for 02-02: Extract UI strings into message files
- Placeholder message files in place for TypeScript resolution

---
*Phase: 02-frontend-i18n*
*Completed: 2026-01-25*
