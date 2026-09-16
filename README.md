# Research Article Fetcher Plugin for Obsidian

Fetch research article metadata from PubMed, PMC, DOI, arXiv, and Web of Science links automatically.

[![GitHub release](https://img.shields.io/github/v/release/gundestrup/obsidian-research)](https://github.com/gundestrup/obsidian-research/releases/latest)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://github.com/gundestrup/obsidian-research/blob/main/LICENSE)
[![CI](https://github.com/gundestrup/obsidian-research/actions/workflows/ci.yml/badge.svg)](https://github.com/gundestrup/obsidian-research/actions/workflows/ci.yml)
[![Release](https://github.com/gundestrup/obsidian-research/actions/workflows/release.yml/badge.svg)](https://github.com/gundestrup/obsidian-research/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/gundestrup/obsidian-research/graph/badge.svg)](https://app.codecov.io/gh/gundestrup/obsidian-research)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=gundestrup_obsedian-research&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=gundestrup_obsedian-research)
[![CodeFactor](https://www.codefactor.io/repository/github/gundestrup/obsidian-research/badge)](https://www.codefactor.io/repository/github/gundestrup/obsidian-research)
[![Semgrep](https://img.shields.io/badge/Semgrep-security%20scan-2c7a4b?logo=semgrep&logoColor=white)](https://semgrep.dev/)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-2c7a4b?logo=github&logoColor=white)](https://github.com/gundestrup/obsidian-research/security/code-scanning)
[![Dependabot](https://img.shields.io/badge/Dependabot-enabled-025e8c?logo=dependabot&logoColor=white)](https://github.com/gundestrup/obsidian-research/security/dependabot)
[![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.13.1-7c3aed?logo=obsidian&logoColor=white)](https://obsidian.md)
[![DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/gundestrup/obsidian-research)

## Features

- **Multiple Input Formats**: PubMed ID, PMC ID, DOI, arXiv ID, WoS ID, or their URLs/tags
- **Smart Detection**: Automatically identifies input type
- **Rich Citations**: Title, journal, year, and clickable links
- **Duplicate Prevention**: Skips already cited articles
- **Failure Markers**: Unmatched references are marked `🔴(id) ![icon]` — red means not found (no auto-retry), yellow means temporary error (auto-retry)
- **Failure Index**: Optional `research-article-unmatched.md` page (customizable) listing every unmatched link, grouped by note
- **Batch Processing**: Update all links in notes or vault
- **Full Text Access**: PMC links provide free full text

## Quick Start

1. Install plugin and enable in Obsidian
2. Use any of these methods:

### Command Palette

- "Fetch research article" - Create a new note with article metadata
- Enter ID/URL: `38570095` or `https://pubmed.ncbi.nlm.nih.gov/38570095/`

### Right-Click Menu

- Select text → "Fetch research article for selected link"
- Replaces selected text with a formatted citation

### Batch Processing

- "Fetch research articles in current note" - Process the active note
- "Force fetch research articles in current note" - Same, but also retries 🔴-marked references
- "Open unmatched research article references" - Open the generated failure-index note directly
- "Fetch research articles in all notes" - Process the entire vault (enable in settings first)
- "Force fetch research articles in all notes" - Same, but also retries 🔴-marked references (enable in settings first)

### Failed lookups

When a reference cannot be matched, the link is kept and marked with the provider's icon:

```text
🔴(pmc=PMC6792392) ![PMC|16](pmc-logo) https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/
```

- 🔴 **Not found** (permanent) — the ID does not exist. Skipped on later runs; retried only when you change the ID or run a **Force update** command.
- 🟡 **Temporary error** (transient) — timeout, network, or server error. Automatically retried on the next run.

Enable **Failure index page** in settings to maintain the configured failure-index note (default: `research-article-unmatched.md`) — a page listing every unmatched reference with its icon and a `[[link]]` to the note containing it. The filename can be changed in settings. The file is rewritten on each run and removed when nothing is unmatched.

## Supported Formats

Each citation is prefixed with a small provider logo badge (hosted in `assets/` on GitHub) that links to the source, followed by a central article-type icon, the article type, linked title, year, and journal. Extra identifiers appear as trailing badges. Shared status and article-type icons are centrally defined so their representation can be changed in one place.

| Type | Example | Result |
|------|---------|--------|
| PubMed ID | `38570095` | `[PubMed badge] Review: [Title](link) - Year, Journal` |
| PMC ID | `PMC6792392` | `[PubMed badge] Article: [Title](link) - Year, Journal [PMC badge](full-text)` |
| DOI | `10.1016/j.clinme.2024.100038` | `[DOI badge] Article: [Title](link) - Year, Journal` |
| arXiv ID | `arXiv:2609.12218` | `[arXiv badge] Preprint: [Title](link) - Year, arXiv preprint` |
| WoS ID | `WOS:001607817500001` | `[WoS badge] Article: [Title](link) - Year, Journal` |

Article types are normalized to a uniform vocabulary across providers (`Article`, `Review`, `Preprint`, `Proceedings`, `Book`, `Book Chapter`, `Clinical Trial`, `Case Report`, `Editorial`, `Letter`, `News`, `Dataset`, `Report`, `Thesis`, `Guideline`, `Comment`, `Other`) — so PubMed's `Journal Article`, CrossRef's `journal-article`, and WoS's `Article` all render as `Article`.

## Settings

- **PubMed/PMC API Key**: Optional NCBI key for higher rate limits (arXiv and CrossRef need no key)
- **Web of Science API Key**: Required for WoS lookups — each user registers their own free key (see below)
- **Failure Index Filename**: Name the generated failure-index note; defaults to `research-article-unmatched.md`
- **Enable Failure Index**: Maintain the configured failure-index note listing all unmatched links grouped by note
- **Enable Global Update**: Safety toggle for vault-wide operations

### Getting a Web of Science API key

The plugin does not ship a WoS key — every user registers their own:

1. Create an account at the [Clarivate developer portal](https://developer.clarivate.com/)
2. Register an application and subscribe it to the **Web of Science Starter API** (free tier)
3. When asked for a client type, choose **Public (Native)** — this plugin is a desktop application, not a server or browser app
4. Copy the generated API key into the plugin settings field above

## Development

```bash
npm install          # Install dependencies
npm run build        # Build plugin
npm test             # Run tests
npm run lint         # Check code quality
```

## Testing

- **Unit Tests**: Comprehensive suite covering core functionality
- **Coverage**: URL extraction, formatting, duplicate detection, API parsing (80% threshold enforced in CI)

## API Sources

- **PubMed**: NCBI E-utilities
- **DOI**: Crossref API
- **PMC**: PubMed Central
- **arXiv**: arXiv API (Atom feed, no key required)
- **Web of Science**: Clarivate Starter API (requires a free API key)

**Network use**: This plugin sends requests to NCBI E-utilities (PubMed/PMC), the Crossref API, the arXiv API, and the Clarivate Web of Science Starter API to fetch article metadata, only when you invoke its commands. No data is collected or shared beyond the article identifiers you provide.

Thank you to arXiv for use of its open access interoperability.

## License

AGPL-3.0
