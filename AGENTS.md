# AGENTS.md — Research Article Fetcher Obsidian Plugin

> **Single source of truth for all coding agents working on this project.**
>
> **Canonical AI/LLM context file.** All AI assistant config files (`CLAUDE.md`, `.windsurf/rules`, `.devin/workflows`) link here.
>
> **DeepWiki:** <https://deepwiki.com/gundestrup/obsidian-research>

## Project overview

Obsidian plugin that fetches academic article metadata from **PubMed**, **PMC**, **DOI**, **arXiv**, and **Web of Science** identifiers. Users can create new notes from article data, insert citations into existing notes, and batch-update all article links in a note or across the vault.

- **Plugin ID:** `pubmed-fetcher`
- **Author:** Svend Gundestrup
- **License:** AGPL-3.0
- **Repo:** <https://github.com/gundestrup/obsidian-research>
- **DeepWiki:** <https://deepwiki.com/gundestrup/obsidian-research>

## Tech stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript (strict mode, ES6 target) |
| Bundler | esbuild (CJS output, `main.ts` → `main.js`) |
| Linter | ESLint 9 flat config + `eslint-plugin-obsidianmd` |
| Tests | Vitest 4 + `@vitest/coverage-v8` |
| Platform | Obsidian plugin API (`obsidian` npm package) |
| Node | ≥ 20 (CI uses Node 24) |

## Project structure

```typescript
main.ts                  # Plugin entry point — ResearchArticleFetcherPlugin class
src/
  types.ts               # Shared interfaces, types, DEFAULT_SETTINGS
  utils.ts               # Pure functions: ID extraction, URL patterns/builders, badge markup, duplicate detection
  citation.ts            # formatCitation — iterates CITATION_ORDER, renders provider and article-type icons
  icons.ts               # Central typed catalog for shared emoji, Obsidian icons, assets, and article-type icons
  api.ts                 # Raw API fetchers with dependency injection (PubMed E-utilities, CrossRef, arXiv, WoS Starter)
  providers/             # One file per provider — each owns extraction + response translation to ArticleInfo
    types.ts             # ArticleProvider interface, FetchContext
    index.ts             # PROVIDERS registry + collectProviderIds()
    pubmed.ts            # PubMed provider + parsePubMedResult (shared by pmc/doi chains)
    pmc.ts               # PMC provider (resolves PMC → PubMed)
    doi.ts               # DOI provider + parseCrossRefMessage (resolves DOI → PubMed, falls back to CrossRef)
    arxiv.ts             # arXiv provider + parseArxivEntry (Atom XML)
    wos.ts               # Web of Science provider + parseWosDocument (requires wosApiKey)
  modals.ts              # FolderSelectionModal, ArticleInputModal
  settings.ts            # ResearchArticleFetcherSettingTab
styles.css               # Modal and button styles (loaded by Obsidian)
tests/
  extraction.test.ts      # Unit tests for ID/URL extraction
  citation-formatting.test.ts  # Unit tests for formatCitation()
  duplicate-detection.test.ts  # Unit tests for isAlreadyCited()
  replacement.test.ts     # Unit tests for URL replacement helpers
  api.test.ts             # Unit tests for API functions with mocked requestUrl
  providers.test.ts       # Unit tests for the provider registry and fetch chains
manifest.json            # Obsidian plugin manifest
esbuild.config.mjs       # Build config
eslint.config.mjs        # ESLint flat config
vitest.config.ts         # Vitest config with v8 coverage
tsconfig.json            # TypeScript strict config
```

## Architecture

### Module dependency graph

```typescript
main.ts
  ├── src/types.ts        (types only, no runtime deps)
  ├── src/utils.ts        (pure functions, imports types only)
  ├── src/citation.ts     (imports providers/CITATION_ORDER + utils — provider-aware layer above providers)
  ├── src/api.ts          (imports types only, uses dependency-injected requestFn)
  ├── src/providers/      (imports types + utils + api, one file per provider)
  │     └── index.ts      (PROVIDERS registry + collectProviderIds)
  ├── src/modals.ts       (imports obsidian API only)
  └── src/settings.ts     (imports obsidian API + main plugin type)
```

### Key design patterns

- **Provider abstraction:** Each article source is an `ArticleProvider` in `src/providers/` exposing `extractId`, `scanPattern`, `isIdCited`, `replaceUrl`, `fetch`, optional `fetchMany` (batch fetch), and a `rateLimitDelay`. arXiv batches via one `id_list` request; the NCBI-backed providers share `fetchViaPubMedMany` (pubmed.ts), which ORs esearch terms and fetches all records in one `esummary`, matching records back to requested IDs via `articleids` (DOI misses fall back to per-item CrossRef). `main.ts` dispatches user input and batch-processing by iterating the `PROVIDERS` registry; `collectProviderIds(content)` scans content for all providers at once. Adding a new provider = new file in `src/providers/` + entry in `PROVIDERS`.
- **Provider-owned translation:** `src/api.ts` returns provider-native payloads (`PubMedResult`, `CrossRefMessage`, Atom XML string, `WosDocument`). Each provider's `parse*` function is the translation layer that converts the raw payload into the uniform `ArticleInfo`. Provider-native type vocabularies are mapped to a canonical label set by `normalizeArticleType()` in `src/utils.ts`.
- **Central icon catalog:** `src/icons.ts` is the single catalog for shared status/UI icons and canonical article-type icons. It supports emoji, Obsidian built-in icon names, and hosted SVG/image assets through a typed `IconDefinition`. Providers retain ownership of their provider logos and declare `supportedArticleTypes` using the canonical article-type keys.
- **Citation badges:** each provider declares `badge: { alt, logo }` and `citationUrl(info)`; `formatCitation` (src/citation.ts) leads with the source provider's badge when one is passed (the referenced source always wins primary), then iterates `CITATION_ORDER` (display priority — differs from registry dispatch order) for remaining badges, rendering every link via the shared `providerBadge` helper (`[![alt|16](raw.githubusercontent.com/.../assets/logo.svg)](source-url)`). Logos live in `assets/`, served from GitHub raw URLs since Obsidian markdown cannot embed plugin-local images. Canonical URL builders (`pubmedUrl`, `pmcUrl`, `doiUrl`, `arxivAbsUrl`, `wosRecordUrl`) live in `src/utils.ts` — the single reference shared by citations, cited-detection, and replacement.
- **Failure index command:** `open-unmatched-article-references` opens the configured failure-index filename directly when it exists; the default is `research-article-unmatched.md`. Otherwise it tells the user to enable the index and run an update.
- **Failure markers:** unmatched references gain a leading `🔴(<key>) ![Provider|16](logo)` marker in front of the reference (`🔴` = not found/permanent → no auto-retry; `🟡` = transient like timeout/5xx → auto-retry). `<key>` = `provider.markerKey(id)` (e.g. `pmc=PMC6792392`; never matches `scanPattern`; WoS strips the `WOS:` prefix). The icon uses `providerIcon` (unlinked `![alt|16](logo)` — a linked badge would look cited). `failureKind(error)` classifies throws (`Article not found`/HTTP 404 → permanent). 🔴-marked IDs retry only when the ID changes (stale key won't match) or via the force commands. Markers never count as cited; `replaceAnyIgnoreCase` and the WoS URL regex consume a marker+icon before (or stray marker after) a replaced reference. `fetchMany` returns `Map<id, FetchOutcome>` (`ArticleInfo | {failure: FailureKind}`) so batch misses carry their kind. When `enableFailureIndex` is on, runs (re)write the configured failure-index filename (default `research-article-unmatched.md`) grouping failures by `[[note]]` — the index file itself is excluded from vault scans (its `](url)` links would read as cited); deleted when empty.
- **Fetch chains stay inside providers:** PMC→PubMed and DOI→PubMed resolution happen inside the provider's `fetch(id, ctx)`. `FetchContext` carries `settings` (including `apiKey`/`wosApiKey`), `requestFn`, and `delay` — provider-specific keys flow through without plumbing changes.
- **Dependency injection for API calls:** All API functions in `src/api.ts` accept a `RequestFunction` parameter (`(params: { url: string; headers?: Record<string, string> }) => Promise<RequestUrlResponse>`) instead of calling `requestUrl` directly. This enables unit testing with `vi.fn()` mocks.
- **Pure functions in utils:** `src/utils.ts` contains only pure functions with no side effects — fully testable without mocking.
- **Settings via Obsidian's loadData/saveData:** Plugin settings are persisted through Obsidian's built-in data persistence.

## Commands

```bash
npm run dev          # Start esbuild in watch mode
npm run build        # Type-check (tsc --noEmit) + esbuild production bundle
npm run lint         # ESLint on all .ts files
npm test             # Run vitest once
npm run test:watch   # Run vitest in watch mode
npm run test:coverage # Run vitest with v8 coverage report
npm run release      # lint + test + build (used before version bump)
```

## APIs used

### NCBI E-utilities (PubMed)

- **ESummary:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` — fetch article metadata by PubMed ID
- **ESearch:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` — find PubMed ID from PMC ID or DOI
- Optional API key for higher rate limits (configurable in settings)

### CrossRef

- `https://api.crossref.org/works/{doi}` — fetch article metadata by DOI when no PubMed ID is available

### arXiv

- `https://export.arxiv.org/api/query?id_list={id}` — fetch preprint metadata by arXiv ID, returns Atom XML (parsed via `parseArxivEntry` in `src/api.ts`, since `RequestUrlResponse.text` carries the raw body)
- No API key required; arXiv's terms of use ask for ≥3s between requests (`arxivProvider.rateLimitDelay = 3000`)

### Web of Science

- `https://api.clarivate.com/apis/wos-starter/v1/documents/{uid}` — fetch record by `WOS:{ut}` UID, JSON response
- Requires a Clarivate API key sent as the `X-ApiKey` header (the `wosApiKey` setting); the WoS provider throws a settings hint when the key is missing

## ESLint rules of note

- `eslint-plugin-obsidianmd` recommended config enforces Obsidian-specific best practices
- `obsidianmd/ui/sentence-case` — UI text must be sentence case. The rule is configured in `eslint.config.mjs` with `acronyms` (NCBI, DOI, PMC, API, URL, ID) and `ignoreWords` (PubMed, Obsidian), so known proper nouns do not need eslint-disable comments. If a new proper noun trips the rule, add it to the config rather than disabling inline.
- `@typescript-eslint/no-unused-vars` — error level (args excluded)
- Test files relax unused vars and unused expressions

## Testing guidelines

- **Unit tests** live in `tests/` and import directly from `src/` modules (not duplicated code)
- **API tests** use `vi.fn()` to mock `RequestFunction` — no real network calls
- **Coverage target:** 80% statements, branches, functions, lines
- Run `npm test` to verify all tests pass before submitting changes
- When adding new utility functions, add corresponding tests in the appropriate test file
- When adding new API functions, add tests in `tests/api.test.ts` with mocked responses

## Code style

- **No `console.debug`** — use `console.error` for errors only
- **No `createEl('h2')`** — use `Setting.setHeading()` instead (Obsidian best practice)
- **No inline styles** — use `styles.css` with CSS classes
- **No dead code** — remove unused methods and functions
- **Strict TypeScript** — all strict flags enabled in `tsconfig.json`
- **Tab indentation** — the project uses tabs, not spaces

## Obsidian plugin best practices

- `main.js` **is** committed to git — `.gitignore` ignores `*.js` but un-ignores `main.js` (`!main.js`), since users can install the plugin by cloning the repo. Rebuild it (`npm run build`) before committing source changes.
- `manifest.json` must have `fundingUrl` as a non-empty string or omitted entirely
- `minAppVersion` should target a reasonably current Obsidian version
- Plugin settings should use `loadData()`/`saveData()` for persistence
- Use `Setting` component for all settings UI, not raw HTML

## CI/CD

GitHub Actions workflow (`.github/workflows/release.yml`) triggers on tag push:

1. Checkout code
2. Setup Node.js 24
3. `npm ci`
4. `npm run build`
5. Upload `main.js`, `manifest.json`, and `styles.css` as GitHub release assets

## Build configuration

- `tsconfig.json` — IDE and lint config, includes `**/*.ts` (covers test files)
- `tsconfig.build.json` — production build config, extends `tsconfig.json` with `include: ["main.ts", "src/**/*.ts"]` (excludes tests)
- `npm run build` runs `tsc -p tsconfig.build.json -noEmit -skipLibCheck` then `esbuild.config.mjs production`
- `esbuild.config.mjs` uses Node's built-in `module.builtinModules` (no external `builtin-modules` package)
- `src/settings.ts` imports `PluginSettingsHolder` from `src/types.ts` instead of the full plugin class from `main.ts`
