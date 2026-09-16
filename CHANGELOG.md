# Changelog

## [Unreleased]

## [1.4.13] - 2026-09-16

### Fixed

- Eliminated all `new RegExp` usages flagged by the custom Semgrep ReDoS rule: failure-marker patterns are now regex literals, `replaceWosUrl` suffix-matches the record ID instead of interpolating it into a `RegExp`, and arXiv XML tags are extracted with string scanning.

### Changed

- Added `npm run security` (local Semgrep rules) to `npm run release` so scan findings surface before pushing.
- Codecov coverage uploads now fail the CI job when they error instead of being silently masked.

## [1.4.12] - 2026-09-16

### Added

- Added arXiv and Web of Science providers with provider-owned translation layers and citation identities.
- Added batch fetching for arXiv, PubMed, PMC, and DOI references where the APIs support it.
- Added red permanent-failure and yellow transient-failure markers with retry and force-update behavior.
- Added an optional, configurable unmatched-reference index note with a direct-open command.
- Added a central typed icon catalog and canonical article-type icons used in citations and generated notes.

### Changed

- Renamed the plugin display name to Research Article Fetcher while preserving the stable `pubmed-fetcher` plugin ID.
- Renamed user-visible commands and internal branding to Research Article Fetcher.
- Changed the default unmatched-reference note to `research-article-unmatched.md`.
- Set explicit `sonar.sources` in `.sonarcloud.properties` so the source set no longer overlaps `sonar.tests` and keeps the generated `main.js` bundle out of scope.
- Set `min-release-age=7` in `.npmrc` so newly published package versions must age seven days before npm resolves them.

### Fixed

- Improved provider-specific citation ordering, canonical URLs, and logo handling.
- Added locale-aware folder sorting with `String.localeCompare`.
- Reached 100% statement, branch, function, and line coverage on unit-testable modules.

## [1.4.11] - 2026-09-13

### Fixed

- Fixed supported-formats examples in the README rendering as broken relative links; they are now literal code text.
- Removed the hardcoded unit test count from the README to avoid recurring drift.
- Added PMC to the `manifest.json` description shown in Obsidian's plugin list.

### Changed

- `version-bump.mjs` now syncs `manifest.json` `description` from the README tagline on every release to prevent drift.

## [1.4.10] - 2026-09-13

### Fixed

- Replaced the `LICENSE` notice stub with the full AGPL-3.0 license text so GitHub and the Obsidian community plugin review recognize the license.

### Changed

- GitHub releases now include the matching changelog section as release notes, resolving the missing release description flagged by the Obsidian review bot.

## [1.4.9] - 2026-09-13

### Changed

- Use `Vault.process` instead of `Vault.modify` for batch note updates so background writes are atomic, per Obsidian plugin guidelines.
- Disclosed network use in the README per Obsidian developer policies.

## [1.4.8] - 2026-09-13

### Fixed

- Fixed `version-bump.mjs` failing on machines where Node is not installed in a system directory — the hardened PATH now includes the running Node's own bin directory so `env node` shebangs resolve.

### Changed

- Synced agent and testing docs (AGENTS.md, CLAUDE.md, DEVIN.md, WINDSURF.md, RELEASE.md, TESTING.md, tests/README.md) with current tooling: Vitest 4, Node 24 CI, tracked `main.js`, configured sentence-case proper nouns, and corrected coverage thresholds.

## [1.4.7] - 2026-09-13

### Added

- Added unit tests for `extractUniqueIds`, the `isPubMedIdCited`/`isPMCIdCited`/`isDOICited` helpers, `isAlreadyCited` title-and-year detection, and NCBI API key request parameters.
- Upload coverage reports to Codecov from CI.
- Added release, license, CodeQL, Dependabot, Codecov, and minimum Obsidian version badges to the README.

### Changed

- Excluded the generated `main.js` bundle from SonarCloud analysis via `.sonarcloud.properties`, removing the bulk of reported code duplication.
- Refactored the extraction and replacement unit tests into table-driven `it.each`/`describe.each` cases to eliminate duplicated test blocks.
- Classified `tests/` as test code in SonarCloud via `sonar.tests`, fixing the duplication quality gate failure.
- Scoped Vitest coverage to unit-testable modules, excluding the Obsidian-bound `main.ts`, `src/modals.ts`, and `src/settings.ts`.
- Run `npm run test:coverage` in CI so the 80 percent coverage thresholds are enforced.
- Updated TypeScript from 5.9.3 to 6.0.3.
- Reached 100 percent statement, branch, function, and line coverage on unit-testable modules.

### Removed

- Removed the unused `escapeRegex` helper.
- Removed unreachable branches in citation-link detection: a dead marker guard in `hasMarkedMarkdownLink` and the redundant `🔗` DOI-link check subsumed by the unmarked scan.

## [1.4.6] - 2026-09-11

### Fixed

- Resolved the remaining SonarQube PATH-resolution finding for Git invocation in the release script.

## [1.4.5] - 2026-09-11

### Fixed

- Documented the fixed release-script PATH as an intentional SonarQube S4036 suppression.

## [1.4.4] - 2026-09-11

### Fixed

- Restricted the release script PATH to fixed system directories to clear the remaining SonarQube S4036 finding.

## [1.4.3] - 2026-09-11

### Added

- Added a SonarQube Cloud quality gate badge to the README.

### Changed

- Updated release actions to Node.js 24-compatible versions to remove deprecated Node.js 20 action runtimes.
- Configured Dependabot to defer TypeScript 7 and Vitest 5 major updates until their compatibility migrations are reviewed.
- Pinned Vitest and `@vitest/coverage-v8` to the patched 4.1.11 release for CVE-2026-84373.
- Hardened CI dependency installation and release-script command execution for SonarQube security findings.

## [1.4.2] - 2026-09-10

### Changed

- Updated CI and release workflows to Node.js 24 and Node 24-compatible GitHub Actions.
- Split Semgrep CI dashboard scanning from the local custom-rule scan.
- Refactored note and vault batch processing into focused article-link helpers.

## [1.4.1] - 2026-09-10

### Added

- Added Semgrep Pro security scanning configuration and CI integration.
- Added CodeFactor configuration and README status badges.
- Added weekly Dependabot updates with a seven-day cooldown.
- Added build provenance attestations for release artifacts.

### Changed

- **AI_INSTRUCTIONS.md → AGENTS.md**: Renamed to follow the agents.md open convention. AGENTS.md is now the single source of truth for all coding agents. `CLAUDE.md`, `DEVIN.md`, and `WINDSURF.md` updated to point to `AGENTS.md`.
- Pinned GitHub Actions to immutable commit SHAs for supply-chain security.
- Pinned TypeScript to 5.9.3 for reproducible builds.
- Updated semver-compatible development dependencies and refreshed the lockfile.
- Replaced dynamic regular expressions and logging format strings with safer implementations.

### Fixed

- Resolved all findings from the local Semgrep Pro scan.
- Resolved CodeQL findings for version escaping and DOI parsing.
- Updated TypeScript configuration for modern module resolution and Obsidian-compatible timer usage.

## [1.4.0] - 2026-07-24

### Changed

- **Declarative settings API**: Migrated `settings.ts` from deprecated `display()` to `getSettingDefinitions()` (Obsidian 1.13+), enabling settings search
- **Dependency upgrades**: Updated all devDependencies to latest compatible versions
  - `@types/node` 22 → 26
  - `@typescript-eslint/eslint-plugin` and `parser` 8.57 → 8.65
  - `vitest` and `@vitest/coverage-v8` 3 → 4
  - `eslint` 9 → 10
  - `eslint-plugin-obsidianmd` 0.1 → 0.4
- **ESLint config**: Configured `obsidianmd/ui/sentence-case` rule with acronyms (NCBI, DOI, PMC, API, URL, ID) and ignore words (PubMed, Obsidian)
- **modals.ts**: Replaced `createEl('div', ...)` with `createDiv(...)` per new `obsidianmd/prefer-create-el` rule
- **AI_INSTRUCTIONS.md**: Updated URL formatting and code block language tags

### Fixed

- **Lint warnings**: Removed all `eslint-disable` comments for `obsidianmd/ui/sentence-case` (no longer needed with proper rule config)
- **Settings search**: Plugin settings now appear in Obsidian's global settings search

## [1.3.0] - 2026-07-23

### Added

- **Edge-case tests**: 30+ tests for identifier extraction (trailing punctuation, mixed casing, malformed URLs, false-positive hostnames), API responses (encoded params, malformed bodies, PMC non-200), and URL replacement (Markdown links, fragments/query strings, code blocks, repeated IDs)
- **Replacement test suite**: New `tests/replacement.test.ts` covering all URL replacement helpers
- **PluginSettingsHolder interface**: Reduced coupling between `settings.ts` and `main.ts` via interface in `types.ts`

### Changed

- **Migrated from Mocha/Chai to Vitest 3**: All tests now use Vitest with `vi.fn()` mocks
- **Build separation**: Created `tsconfig.build.json` to exclude test files from production `tsc` type-checking
- **Replaced `builtin-modules`**: Now uses Node's built-in `module.builtinModules` in `esbuild.config.mjs`
- **Updated `esbuild`**: Bumped from 0.25.0 to 0.28.0
- **Pinned `obsidian`**: Locked to 1.13.1 matching `minAppVersion`
- **Case-insensitive extraction**: `extractPubMedId`, `extractPMCId`, and `extractDOI` now handle mixed-case URLs
- **DOI cleaning**: `parsePubMedResult` now applies `cleanDOI()` to top-level `result.doi` and `result.elocationid`
- **DOI trailing period**: `extractDOI` now strips trailing periods from extracted DOIs

### Fixed

- **`findPubMedIdFromPMC`**: Normalized URL construction with `URLSearchParams` and added HTTP status checking
- **`styles.css` release asset**: Added to GitHub Actions release workflow
- **`manifest.json`**: Removed empty `fundingUrl`, updated `minAppVersion` to 1.13.1
- **`version-bump.mjs`**: Removed obsolete `test:integration` call
- **Mock type safety**: `mockRequest()` now uses `MockedFunction<RequestFunction>` with typed call inspection

### Removed

- **Legacy Mocha files**: Deleted `tests/setup.ts`, `tests/test-utils.ts`, `.mocharc.json`, `run-tests.js`, `test-doi.js`, `test-pmc.js`, `test-pmid.js`, `test-duplicate-prevention.js`, `test-enhanced-detection.js`
- **`mockRequestSequence()`**: Removed unused helper from `tests/api.test.ts`
- **`builtin-modules`**: Removed deprecated dependency

## [1.2.3] - 2026-03-12

### Fixed

- **Version Bump Script**: Now supports patch/minor/major version bumps (was only patch)
- **Regex Escaping**: Properly escape all dots in version numbers for changelog validation
- **Error Visibility**: Show full test output for easier debugging when checks fail
- **Exact Version Validation**: Validate exact version match after npm bump

### Improved

- **Version Comparison**: Semantic version comparison instead of hardcoded patch increment
- **Dual Validation**: Check for newer version in preversion, exact match in version script
- **Package Scripts**: Added missing preversion script for proper lifecycle

## [1.2.2] - 2026-03-12

### Fixed

- **Release Safety**: Implemented pre-version validation to prevent version inconsistency
- **Atomic Releases**: Tests now run BEFORE any version files are updated
- **Version Validation**: changelog validation happens before package.json changes

### Improved

- **Release Documentation**: Updated RELEASE.md to reflect new validation order
- **Error Prevention**: No more inconsistent version states when tests fail
- **Safety Guarantee**: Either all checks pass and versions update, or nothing changes

## [1.2.1] - 2026-03-12

### Added

- **Comprehensive Test Suite**: 72 unit tests + 5 integration test suites
- **Modern Tooling**: ESLint v10, c8 v11, sinon v21, TypeScript v5.9
- **Package Updates**: All safe dependencies updated to latest versions

### Improved

- **Documentation**: Streamlined README and CHANGELOG (KISS principle)
- **Code Quality**: Full linting coverage for all TypeScript files
- **Project Structure**: Cleaned up debugging artifacts and IDE files
- **Testing Protocol**: Complete pre-release checklist in RELEASE.md

### Changed

- **Test Organization**: Separated unit tests (fast) from integration tests (API calls)
- **Documentation**: Merged test docs into single TESTING.md file
- **Development Workflow**: Updated build, lint, and test scripts

## [1.1.1] - 2026-03-11

### Fixed

- **Performance**: Reduced API calls by 80% for already cited articles
- **Rate Limiting**: Added delays to prevent 429 errors
- **Duplicate Detection**: Skip already processed URLs

### Improved

- **Two-layer detection**: Quick check + API check only when needed
- **Debugging**: Better console logging and error messages
- **User Feedback**: Clear progress indicators

## [1.1.0] - 2026-03-11

### Added

- **PMC Support**: Full PubMed Central integration
- **Batch Processing**: "Link All" and "Link Global" commands
- **Duplicate Prevention**: Smart detection of existing citations
- **Test Suite**: 72 unit tests + integration tests

### Fixed

- **PMC URL Processing**: Corrected regex and API calls
- **PMC to PubMed Conversion**: Fixed ID mapping
- **Code Quality**: Eliminated duplication, added type safety

### Improved

- **Citation Format**: Added article types and icons
- **Error Handling**: Better validation and fallbacks
- **Architecture**: 23% code reduction, improved maintainability

## [1.0.2] - 2026-03-11

### Fixed

- **DOI Formatting**: Removed "doi: " prefix from URLs
- **TypeScript**: Fixed compilation errors
- **Icons**: Unicode emojis for better compatibility

## [1.0.1] - 2026-03-11

### Fixed

- **Icon Rendering**: Inline SVG data URIs

## [1.0.0] - 2026-03-11

### Added

- Initial release
- PubMed and DOI support
- Command palette and context menu
- NCBI API key settings
- AGPL-3.0 license
