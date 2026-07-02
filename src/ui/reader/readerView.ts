import { BoxRenderable, type CliRenderer, type KeyEvent } from "@opentui/core";
import { setContext, type Shortcut } from "../../focus/registry.ts";
import { theme } from "../../theme.ts";
import { createPostList, type PostListHandle, type PostRow } from "./postList.ts";
import {
  createPostDetail,
  type FocusedDetailItem,
  type PostDetailHandle,
  type PostDetailModel,
  type ReplyModel,
} from "./postDetail.ts";

type Pane = "list" | "detail";

export interface ReaderViewHandle {
  root: BoxRenderable;
  list: PostListHandle;
  detail: PostDetailHandle;
  setPosts(rows: PostRow[]): void;
  focusPane(pane: Pane): void;
  dispose(): void;
  onPostSelected(fn: (row: PostRow | null) => void): () => void;
  onOpenAuthor(fn: (row: PostRow) => void): () => void;
  onCompose(fn: () => void): () => void;
  onReply(fn: (row: PostRow) => void): () => void;
  onDelete(fn: (item: FocusedDetailItem) => void): () => void;
  onRefresh(fn: () => void): () => void;
  onLoadNew(fn: () => void): () => void;
  setNewPostsCount(count: number): void;
  refreshShortcuts(): void;
  setActive(active: boolean): void;
}

// Base shortcuts WITHOUT the delete chip — DELETE is spliced in only when the
// focused item belongs to the current user (see publishShortcuts).
const LIST_SHORTCUTS: Shortcut[] = [
  { key: "↑↓", label: "NAV" },
  { key: "↔", label: "PANEL" },
  { key: "C", label: "NEW" },
  { key: "R", label: "REPLY" },
  { key: "U", label: "AUTHOR" },
  { key: "[ ]", label: "RESIZE" },
  { key: "G", label: "REFRESH" },
  { key: "⌃Q", label: "QUIT" },
];

const DETAIL_SHORTCUTS: Shortcut[] = [
  { key: "↑↓", label: "NAV" },
  { key: "↔", label: "PANEL" },
  { key: "C", label: "NEW" },
  { key: "R", label: "REPLY" },
  { key: "[ ]", label: "RESIZE" },
  { key: "G", label: "REFRESH" },
  { key: "⌃Q", label: "QUIT" },
];

const DELETE_SHORTCUT: Shortcut = { key: "D", label: "DELETE" };

const MIN_LEFT_PCT = 20;
const MAX_LEFT_PCT = 80;
const RESIZE_STEP = 5;
const DEFAULT_LEFT_PCT = 45;

export interface ReaderViewOptions {
  /** Initial left-pane width percent (restored from settings). */
  initialLeftPct?: number;
  /** Called whenever the user resizes the split, for persistence. */
  onLeftPctChange?: (pct: number) => void;
  /** Current user's username, used to show the DELETE chip only on own content. */
  currentUsername?: () => string | null;
}

export function createReaderView(renderer: CliRenderer, opts: ReaderViewOptions = {}): ReaderViewHandle {
  const root = new BoxRenderable(renderer, {
    id: "reader",
    flexDirection: "row",
    flexGrow: 1,
    backgroundColor: theme.bg,
  });

  const clampPct = (n: number) => Math.max(MIN_LEFT_PCT, Math.min(MAX_LEFT_PCT, n));
  let leftPct = clampPct(opts.initialLeftPct ?? DEFAULT_LEFT_PCT);

  const leftPane = new BoxRenderable(renderer, {
    id: "reader-left",
    flexDirection: "column",
    width: `${leftPct}%`,
    flexShrink: 1,
    flexGrow: 0,
    backgroundColor: theme.bg,
    paddingLeft: 1,
    paddingRight: 1,
    border: ["right"],
    borderStyle: "double",
    borderColor: theme.divider,
  });

  const rightPane = new BoxRenderable(renderer, {
    id: "reader-right",
    flexDirection: "column",
    flexGrow: 1,
    flexShrink: 1,
    backgroundColor: theme.bg,
    paddingLeft: 1,
    paddingRight: 1,
  });

  const list = createPostList(renderer);
  const detail = createPostDetail(renderer);

  leftPane.add(list.root);
  rightPane.add(detail.root);

  root.add(leftPane);
  root.add(rightPane);

  let activePane: Pane = "list";
  let active = false;
  const openAuthorListeners = new Set<(row: PostRow) => void>();
  const composeListeners = new Set<() => void>();
  const replyListeners = new Set<(row: PostRow) => void>();
  const deleteListeners = new Set<(item: FocusedDetailItem) => void>();
  const refreshListeners = new Set<() => void>();
  const loadNewListeners = new Set<() => void>();
  let newPostsCount = 0;

  // Re-evaluate the DELETE chip whenever the list selection changes.
  list.onSelectionChange(() => {
    if (active && activePane === "list") publishShortcuts();
  });

  function focusedAuthor(): string | null {
    if (activePane === "detail") return detail.getFocused()?.author ?? null;
    return list.getSelected()?.author ?? null;
  }

  function focusedIsOwn(): boolean {
    const me = opts.currentUsername?.();
    if (!me) return false;
    const author = focusedAuthor();
    return !!author && author === me;
  }

  function publishShortcuts(): void {
    const base = activePane === "list" ? LIST_SHORTCUTS : DETAIL_SHORTCUTS;
    let shortcuts = base;
    if (focusedIsOwn()) {
      // Splice DELETE in right after the REPLY chip.
      const idx = base.findIndex((s) => s.label === "REPLY");
      shortcuts = [...base];
      shortcuts.splice(idx + 1, 0, DELETE_SHORTCUT);
    }
    if (newPostsCount > 0) {
      shortcuts = [{ key: "N", label: "LOAD NEW" }, ...shortcuts];
    }
    setContext({ id: activePane === "list" ? "reader.list" : "reader.detail", shortcuts });
  }

  function focusPane(pane: Pane): void {
    activePane = pane;
    if (pane === "list") {
      detail.blur();
      list.focus();
    } else {
      list.blur();
      detail.focus();
    }
    publishShortcuts();
  }

  function cyclePane(): void {
    focusPane(activePane === "list" ? "detail" : "list");
  }

  function setLeftPct(next: number): void {
    const clamped = clampPct(next);
    if (clamped === leftPct) return;
    leftPct = clamped;
    leftPane.width = `${leftPct}%`;
    list.setWidthPct(leftPct);
    opts.onLeftPctChange?.(leftPct);
  }

  const keyHandler = (key: KeyEvent) => {
    if (!active) return;
    if (key.name === "tab") {
      cyclePane();
      return;
    }
    if (key.sequence === "[" || key.name === "[") {
      setLeftPct(leftPct - RESIZE_STEP);
      return;
    }
    if (key.sequence === "]" || key.name === "]") {
      setLeftPct(leftPct + RESIZE_STEP);
      return;
    }
    if (key.sequence === "c" || key.name === "c") {
      for (const fn of composeListeners) fn();
      return;
    }
    if (key.sequence === "r" || key.name === "r") {
      const row = list.getSelected();
      if (row) {
        for (const fn of replyListeners) fn(row);
      }
      return;
    }
    if (key.sequence === "g" || key.name === "g") {
      for (const fn of refreshListeners) fn();
      return;
    }
    if (key.sequence === "n" || key.name === "n") {
      if (newPostsCount > 0) {
        for (const fn of loadNewListeners) fn();
      }
      return;
    }
    if (key.sequence === "d" || key.name === "d") {
      const item: FocusedDetailItem | null =
        activePane === "detail"
          ? detail.getFocused()
          : (() => {
              const row = list.getSelected();
              return row ? { kind: "post", id: row.id, author: row.author } : null;
            })();
      if (item) {
        for (const fn of deleteListeners) fn(item);
      }
      return;
    }
    if (activePane === "list" && (key.sequence === "u" || key.name === "u")) {
      const row = list.getSelected();
      if (row) {
        for (const fn of openAuthorListeners) fn(row);
      }
      return;
    }
    if (activePane === "detail") {
      if (key.name === "up") {
        detail.focusPrev();
        publishShortcuts();
        return;
      }
      if (key.name === "down") {
        detail.focusNext();
        publishShortcuts();
        return;
      }
    }
    // Left/right switch panes — but only when the event isn't captured by a focused input.
    // Select + ScrollBox consume up/down but not left/right, so we can use them here safely.
    if (key.name === "left" && activePane === "detail") {
      focusPane("list");
      return;
    }
    if (key.name === "right" && activePane === "list") {
      focusPane("detail");
      return;
    }
  };

  renderer.keyInput.on("keypress", keyHandler);

  function setPosts(rows: PostRow[]): void {
    list.setRows(rows);
  }

  function onPostSelected(fn: (row: PostRow | null) => void): () => void {
    return list.onSelectionChange(fn);
  }

  function onOpenAuthor(fn: (row: PostRow) => void): () => void {
    openAuthorListeners.add(fn);
    return () => openAuthorListeners.delete(fn);
  }

  function onCompose(fn: () => void): () => void {
    composeListeners.add(fn);
    return () => composeListeners.delete(fn);
  }

  function onReply(fn: (row: PostRow) => void): () => void {
    replyListeners.add(fn);
    return () => replyListeners.delete(fn);
  }

  function onDelete(fn: (item: FocusedDetailItem) => void): () => void {
    deleteListeners.add(fn);
    return () => deleteListeners.delete(fn);
  }

  function onRefresh(fn: () => void): () => void {
    refreshListeners.add(fn);
    return () => refreshListeners.delete(fn);
  }

  function onLoadNew(fn: () => void): () => void {
    loadNewListeners.add(fn);
    return () => loadNewListeners.delete(fn);
  }

  function setNewPostsCount(count: number): void {
    newPostsCount = count;
    list.setNewCount(count);
    if (active) publishShortcuts();
  }

  function setActive(next: boolean): void {
    if (active === next) return;
    active = next;
    if (active) {
      // Re-focus the current pane and republish its shortcuts. Something else
      // (e.g. the compose overlay) may have stolen focus while we were inactive.
      focusPane(activePane);
    }
  }

  function refreshShortcuts(): void {
    if (active) publishShortcuts();
  }

  function dispose(): void {
    renderer.keyInput.off("keypress", keyHandler);
  }

  // Default focus
  focusPane("list");

  return {
    root,
    list,
    detail,
    setPosts,
    focusPane,
    dispose,
    onPostSelected,
    onOpenAuthor,
    onCompose,
    onReply,
    onDelete,
    onRefresh,
    onLoadNew,
    setNewPostsCount,
    refreshShortcuts,
    setActive,
  };
}

export type { PostRow, PostDetailModel, ReplyModel, FocusedDetailItem };
