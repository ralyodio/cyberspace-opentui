import {
  BoxRenderable,
  TextRenderable,
  type CliRenderer,
} from "@opentui/core";
import { theme } from "../../theme.ts";

export interface LoadingHandle {
  dispose(): void;
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * A floating "Loading" popup with an animated braille spinner. Mounts itself as an
 * absolute, high-zIndex overlay; call dispose() to remove it (and stop the timer).
 */
export function createLoadingOverlay(renderer: CliRenderer, message = "Loading"): LoadingHandle {
  const overlay = new BoxRenderable(renderer, {
    id: "loading-overlay",
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 1500,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    // Transparent backdrop — the app stays visible around the card.
    backgroundColor: "transparent",
  });

  const card = new BoxRenderable(renderer, {
    id: "loading-card",
    flexDirection: "row",
    border: true,
    borderStyle: "double",
    borderColor: theme.accent,
    paddingLeft: 1,
    paddingRight: 1,
    paddingTop: 0,
    paddingBottom: 0,
    // Opaque black inside the window; only the backdrop around it is transparent.
    backgroundColor: theme.bg,
  });

  const spinner = new TextRenderable(renderer, {
    id: "loading-spinner",
    content: SPINNER_FRAMES[0]!,
    fg: theme.accent,
    bg: theme.bg,
    marginRight: 1,
  });
  const label = new TextRenderable(renderer, {
    id: "loading-label",
    content: message,
    fg: theme.fg,
    bg: theme.bg,
  });
  card.add(spinner);
  card.add(label);
  overlay.add(card);
  renderer.root.add(overlay);

  let frame = 0;
  const timer = setInterval(() => {
    if (spinner.isDestroyed) {
      clearInterval(timer);
      return;
    }
    frame = (frame + 1) % SPINNER_FRAMES.length;
    spinner.content = SPINNER_FRAMES[frame]!;
  }, 80);

  return {
    dispose: () => {
      clearInterval(timer);
      renderer.root.remove(overlay.id);
      overlay.destroyRecursively();
    },
  };
}
