import {
  BoxRenderable,
  TextRenderable,
  type CliRenderer,
  type KeyEvent,
} from "@opentui/core";
import { theme } from "../../theme.ts";

export interface ConfirmHandle {
  /** Resolves true if confirmed (Yes), false if cancelled (No/Esc). */
  done: Promise<boolean>;
  dispose(): void;
}

export interface ConfirmOptions {
  message: string;
  /** Title shown on the card border. */
  title?: string;
}

type Choice = "no" | "yes";

/**
 * A floating yes/no dialog with two focusable buttons. Left/Right/Tab move between
 * them; Enter activates the focused button. Esc is always "No". Enter defaults to
 * "Yes" since that button starts focused. Mounts itself as an absolute, high-zIndex
 * overlay; dispose() removes it.
 */
export function createConfirmDialog(renderer: CliRenderer, opts: ConfirmOptions): ConfirmHandle {
  const overlay = new BoxRenderable(renderer, {
    id: "confirm-overlay",
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 2000,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    // Transparent backdrop — the app stays visible around the card.
    backgroundColor: "transparent",
  });

  const card = new BoxRenderable(renderer, {
    id: "confirm-card",
    width: 36,
    flexDirection: "column",
    alignItems: "center",
    border: true,
    borderStyle: "double",
    borderColor: theme.accent,
    title: opts.title ?? "CONFIRM",
    titleAlignment: "left",
    padding: 1,
    backgroundColor: theme.bg,
  });

  card.add(
    new TextRenderable(renderer, {
      id: "confirm-message",
      content: opts.message,
      fg: theme.fg,
      bg: theme.bg,
      wrapMode: "word",
      alignSelf: "center",
    }),
  );

  const buttonRow = new BoxRenderable(renderer, {
    id: "confirm-buttons",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 1,
    backgroundColor: theme.bg,
  });

  function makeButton(id: string, label: string, marginRight = 0): { box: BoxRenderable; text: TextRenderable } {
    const box = new BoxRenderable(renderer, {
      id,
      flexDirection: "column",
      paddingLeft: 2,
      paddingRight: 2,
      marginRight,
      backgroundColor: theme.chipBg,
    });
    const text = new TextRenderable(renderer, {
      id: `${id}-label`,
      content: label,
      fg: theme.fg,
      bg: theme.chipBg,
    });
    box.add(text);
    return { box, text };
  }

  const noBtn = makeButton("confirm-no", "No [ESC]", 2);
  const yesBtn = makeButton("confirm-yes", "Yes [ENTER]");
  buttonRow.add(noBtn.box);
  buttonRow.add(yesBtn.box);
  card.add(buttonRow);

  overlay.add(card);
  renderer.root.add(overlay);

  let focused: Choice = "yes";

  function paint(): void {
    for (const [choice, btn] of [["no", noBtn], ["yes", yesBtn]] as const) {
      const on = focused === choice;
      const bg = on ? theme.accent : theme.chipBg;
      btn.box.backgroundColor = bg;
      btn.text.bg = bg;
      btn.text.fg = on ? theme.accentFg : theme.fg;
    }
  }
  paint();

  let settled = false;
  let resolve: (v: boolean) => void = () => {};
  const done = new Promise<boolean>((res) => {
    resolve = res;
  });

  const keyHandler = (key: KeyEvent) => {
    if (settled) return;
    if (key.name === "left" || key.name === "up") {
      focused = "no";
      paint();
      return;
    }
    if (key.name === "right" || key.name === "down") {
      focused = "yes";
      paint();
      return;
    }
    if (key.name === "tab") {
      focused = focused === "yes" ? "no" : "yes";
      paint();
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      settled = true;
      resolve(focused === "yes");
      return;
    }
    if (key.name === "escape") {
      settled = true;
      resolve(false);
      return;
    }
  };
  renderer.keyInput.on("keypress", keyHandler);

  return {
    done,
    dispose: () => {
      renderer.keyInput.off("keypress", keyHandler);
      renderer.root.remove(overlay.id);
      overlay.destroyRecursively();
    },
  };
}
