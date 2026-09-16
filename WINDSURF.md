# Windsurf AI Rules

> **Read [`AGENTS.md`](./AGENTS.md) first** — it contains the complete project context, architecture, coding standards, and testing guidelines for this repository.
>
> **DeepWiki:** <https://deepwiki.com/gundestrup/obsidian-research>

## Windsurf-specific notes

- This is an Obsidian plugin (TypeScript + esbuild). Entry point: `main.ts`.
- Modular architecture: `src/types.ts`, `src/utils.ts`, `src/api.ts`, `src/providers.ts`, `src/modals.ts`, `src/settings.ts`.
- Pure functions live in `src/utils.ts`. API calls with dependency injection live in `src/api.ts`.
- Lint with `npm run lint`, test with `npm test`, build with `npm run build`.
- Use tabs for indentation. Strict TypeScript is enabled.
- `eslint-plugin-obsidianmd` enforces Obsidian best practices (sentence-case UI text, no `createEl('h2')`, use `Setting.setHeading()`).
- Tests use Vitest 4 with `vi.fn()` mocks for API calls. No real network calls in tests.
- See `AGENTS.md` for full details.
