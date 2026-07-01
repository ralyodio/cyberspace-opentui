# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `bun install` — install dependencies
- `bun dev` — run the TUI in watch mode (runs `src/index.ts` via Bun with `--watch`)

There is no build, lint, or test script configured. TypeScript is used purely for type-checking in editors (`noEmit: true`); run `bunx tsc --noEmit` if you need to verify types.

Note: `package.json` declares `"module": "src/index.tsx"` but the actual entry and dev script use `src/index.ts`. Keep the runtime entry at `src/index.ts` unless intentionally switching to JSX.

## Architecture

This is a terminal UI application built on **OpenTUI** (`@opentui/core`), running on the Bun runtime. Uses OpenTUI's **core imperative API** (class-based `BoxRenderable`, `TextRenderable`, `SelectRenderable`, `InputRenderable`, `ScrollBoxRenderable`), not the React or Solid reconcilers. If you ever introduce JSX, switch the entry to `.tsx` and update the dev script and `"module"` field accordingly.

### Module layout

```
src/
  index.ts                # bootstrap: renderer, auth-gate, mount reader, wire feed
  app.ts                  # shell: header + swappable content area + footer
  theme.ts                # colors (cream/black base, purple accent)
  api/
    types.ts              # Post, Reply, User, Attachment — mirrored from references/api
    client.ts             # fetch wrapper: hard-coded base URL, bearer header, 401→refresh→retry
    endpoints.ts          # login, refreshToken, listPosts, getReplies
  auth/
    store.ts              # ~/.config/cyberspace-tui/auth.json (0600 perms)
    session.ts            # in-memory token state, writes through to disk
  focus/
    registry.ts           # pub/sub for the active focus context + its shortcuts
  ui/
    header.ts             # top row: ⌃R READER / ⌃P PROFILE + wordmark
    footer.ts             # subscribes to focus registry, renders active shortcuts
    reader/
      readerView.ts       # left/right split, Tab/arrow pane cycling, shortcut publish
      postList.ts         # SelectRenderable, packed @user / content / [AUDIO] / age rows
      postDetail.ts       # header (author / word+reply+age stats) + ScrollBox body + replies
    modals/
      login.ts            # centered card, email + masked-password inputs, API login
```

### API response shape — API wraps everything in `{ data }`

All `/v1/*` endpoints return `{ data: T }` or `{ data: T[], meta: { cursor } }`. The login/refresh endpoints are single-wrapped (`{ data: { idToken, refreshToken, rtdbToken } }`) — `src/api/endpoints.ts` unwraps them before returning. `listPosts`/`getReplies` return the `{ data, meta }` pair directly (typed as `Paginated<T>`). If you add a new endpoint, follow the same pattern: type the `apiFetch` call with `{ data: T }` and return `.data`, or return the full `{ data, meta }` for paginated lists.

**Auth endpoint quirk:** `POST /v1/auth/refresh` returns `{ data: { idToken, rtdbToken } }` — **no `refreshToken`**. On refresh, reuse the stored refresh token.

### Focus registry — context-aware footer

The footer is NOT a global keymap. Each focusable surface (list pane, detail pane, login modal) calls `setContext({ id, shortcuts })` in `focus/registry.ts` when it gains focus. The footer subscribes once and re-renders its chips whenever the context changes. When you add a new focusable view (compose box, post-detail scroll, etc.), declare its shortcuts as `Shortcut[]` and publish them on focus — don't touch `footer.ts`.

### Known OpenTUI gotcha

Setting a `bg` on a `TextRenderable` that's the first child of a row-flex `Box` with a differing parent `backgroundColor` causes the first child to render empty. Current workaround in `ui/header.ts`: active tab uses `fg: theme.accent + attributes: BOLD` instead of a pill bg. If you need a coloured pill, wrap the Text in its own BoxRenderable with that bg.

### Password input

OpenTUI has no built-in password mask (verified against `@opentui/core` types and `examples/opentui-examples-src/input-demo.ts`). `ui/modals/login.ts` works around this by keeping the real password in a closure and rewriting the displayed value to bullets on every `INPUT` event — guarded by a `maskingUpdate` flag to avoid a feedback loop. Reuse this pattern if you add another secret-entry field; don't introduce a generic abstraction until there's a second caller.

## OpenTUI documentation sources

OpenTUI is young and its API changes often — do not rely on training-data recall. Before writing non-trivial OpenTUI code, consult these, in this order:

1. **`opentui` skill** (installed at `~/.claude/skills/opentui/`) — invoke it via the Skill tool for any TUI work (components, layout, keyboard, animations, testing). This is the primary source.
   References it ships with: `core/`, `components/`, `layout/`, `keyboard/`, `animation/`, `react/`, `solid/`, `testing/`.
2. **`examples/opentui-examples-src/`** — concrete, runnable demos (see Repository layout below). Best source for "how does X actually look in code."
3. **Context7 docs** — query via the context7 MCP with library ID `/anomalyco/opentui` (High reputation, ~785 snippets). Useful when the skill and examples don't cover a specific API. Prefer this over web search for OpenTUI.

There is no dedicated OpenTUI MCP server; the three sources above are the full set.

## Repository layout

- `src/` — application source (see **Module layout** above).
- `references/` — read-only reference checkouts of sibling Cyberspace projects. These are **not** part of this project's build. Use them to mirror domain models, endpoints, terminology, and UX patterns. Do not import from them and do not modify them.
- `examples/opentui-examples` — prebuilt binary of the OpenTUI demo gallery; run it directly to explore widgets visually.
- `examples/opentui-examples-src/` — the **source** for those demos, sparse-checked-out from `anomalyco/opentui` at `packages/core/src/examples` (see `index.ts` for the demo registry). Read these when you need concrete, working reference code for any OpenTUI feature (input, scrollbox, select, markdown, shaders, mouse, z-index, focus, etc.). Not part of this project's build — do not import from it; copy or adapt patterns into `src/` as needed.

## Context: the Cyberspace ecosystem

This repo is the new terminal-client incarnation of Cyberspace. The wider product has several surfaces, all present under `references/`:

- `references/api` — the **backend API** this TUI will consume. Authoritative source for endpoints, request/response shapes, auth, and data models. When adding a TUI feature, start by reading the corresponding route/handler here.
- `references/tui-go` — an **earlier Go-based TUI** demo that already integrates with the API. Treat it as a working reference for API usage patterns (auth flow, endpoint choices, pagination, streaming) even though this project is TypeScript/OpenTUI and will not share code with it.
- `references/nuxt` — the **main Cyberspace website** and the most fully implemented client. Ground-truth for product behavior, naming, and UX flows when the API alone is ambiguous.
- `references/sacred` — a **simplified alternative React interface** to Cyberspace with a different layout. Useful as a second opinion on how a feature can be pared down to essentials — often closer in spirit to a TUI than the full Nuxt app.

When implementing features, cross-reference these so the TUI stays consistent with the rest of the ecosystem. Do not reimplement server or database code in this repo.
