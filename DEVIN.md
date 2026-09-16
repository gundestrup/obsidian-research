# Devin AI Instructions

> **Read [`AGENTS.md`](./AGENTS.md) first** — it contains the complete project context, architecture, coding standards, and testing guidelines for this repository.
>
> **DeepWiki:** <https://deepwiki.com/gundestrup/obsidian-research>

## Devin-specific notes

- **Project type:** Obsidian plugin (TypeScript, esbuild bundler, Vitest tests)
- **Entry point:** `main.ts` → bundles to `main.js`
- **Module structure:** `src/types.ts` | `src/utils.ts` | `src/api.ts` | `src/providers.ts` | `src/modals.ts` | `src/settings.ts`
- **Build:** `npm run build` (tsc type-check + esbuild production)
- **Lint:** `npm run lint` (ESLint 9 flat config + obsidianmd plugin)
- **Test:** `npm test` (Vitest 4, mocked API calls, 80% coverage target)
- **Indentation:** Tabs (not spaces)
- **No `console.debug`**, no inline styles, no `createEl('h2')` — use `Setting.setHeading()`
- **API pattern:** Functions in `src/api.ts` accept `RequestFunction` param for testability — do not call `requestUrl` directly
- **Proper nouns** (PubMed, DOI, PMC, NCBI) are whitelisted in the sentence-case rule config — add new ones to `eslint.config.mjs` instead of eslint-disable comments
- See `AGENTS.md` for full architecture, module dependency graph, and API documentation.
