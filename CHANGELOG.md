# Changelog

## Unreleased

### Changed
- **Upgraded `@opentui/core` `0.1.97` → `0.4.2`.** Drop-in for this app — no source changes required; `MarkdownRenderable` + `SyntaxStyle` and all renderable/event APIs still work. Verified with `tsc --noEmit` (clean) and a live boot against `api.cyberspace.online`.
- **Pinned `typescript` to `5.9.3`.** TypeScript 6.0 (latest) can't load the `@types/bun`/`bun-types` declarations (they target TS 5.x), so it drops every Bun/Node global (`Bun`, `fetch`, `URL`, `process`, `setInterval`, `node:*`) and misreads OpenTUI's event types — 22 spurious errors. Type-checking only; `bun dev` runtime was never affected. Revisit once `bun-types` ships TS 6 support.
- **Pinned `@types/bun` to `^1.3.12`** (was `"latest"`).

### Removed
- **`web-tree-sitter` dependency.** OpenTUI `0.4` renders markdown with a bundled engine (`marked`) instead of tree-sitter, so the external wasm asset and its `0.25.10` version pin are no longer needed.
- Unused `ProfileViewHandle` type import in `src/index.ts` (flagged by oxlint).

## v0.2

### Added
- **Profile view** — new `⌃P` tab shows the authenticated user's profile (stats, bio, location, posts). `U` from the reader opens the selected post's author.
- **Markdown rendering** in post bodies and replies (right pane). Uses OpenTUI's `MarkdownRenderable` with a theme-mapped `SyntaxStyle` — headings, bold, italic, inline code, lists, links.
- **Pre-processing** for the renderer: collapses 3+ blank lines to 2, strips `&nbsp;`/`\u00A0`-only lines, rewrites `[url](url)` as autolinks so self-referential links aren't duplicated.
- **Markdown stripping** for preview rows in both reader and profile lists — no more raw `**`, `#`, link syntax in the single-line preview. Skips empty leading lines and falls through to the first line with real content.
- **Animated spinner** while replies load (braille-dot frames).
- **`web-tree-sitter@0.25.10`** pinned as a direct dependency — required at runtime for markdown syntax highlighting (the wasm asset name changed in `0.26.x` and OpenTUI's worker can't resolve it).

### Changed
- **Tab shortcuts** are now `⌃R` (Reader) and `⌃P` (Profile) instead of digit keys. `FEED` tab removed — was a placeholder.
- **Detail pane keys** swapped: `↑/↓` now moves between cards (post → replies); `j/k` scrolls line-by-line.
- **`Q` exits cleanly** — added `process.exit(0)` so the tree-sitter worker thread doesn't keep the process alive after `renderer.destroy()`.
- **Profile layout** — bio moved inside the main header card (above the stats row); separate BIO box removed. Top/bottom padding zeroed.
- **Post card layout** — top/bottom padding removed; margins around the replies divider removed.
- **Theme** — `fgDim` brightened from `#8a7f6f` to `#a89e8e` for better legibility on borders and muted text.
- **Footer legend** no longer duplicates the tab shortcuts (they're in the header).

### Fixed
- Tree-sitter markdown parsing was silently failing due to a `web-tree-sitter` version mismatch (`0.26.x` vs the `0.25.10` OpenTUI expects), which caused the `MarkdownRenderable` to render every post as raw plain text with visible `**`/`#`/`[...](...)` markers.

## v0.1

- One-shotted from [sacred.cyberspace.online](https://sacred.cyberspace.online) and API docs