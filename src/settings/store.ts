import { homedir } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface Settings {
  /** Reader left-pane width as a percentage (20–80). */
  readerLeftPct?: number;
}

const CONFIG_DIR = join(homedir(), ".config", "cyberspace-tui");
const SETTINGS_FILE = join(CONFIG_DIR, "settings.json");

let cache: Settings | null = null;

export async function loadSettings(): Promise<Settings> {
  if (cache) return cache;
  try {
    const file = Bun.file(SETTINGS_FILE);
    if (!(await file.exists())) {
      cache = {};
      return cache;
    }
    const json = await file.json();
    cache = json && typeof json === "object" ? (json as Settings) : {};
  } catch {
    cache = {};
  }
  return cache;
}

/** Merge a patch into settings and persist. Never throws — persistence is best-effort. */
export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  cache = { ...(cache ?? {}), ...patch };
  try {
    await mkdir(dirname(SETTINGS_FILE), { recursive: true });
    await writeFile(SETTINGS_FILE, JSON.stringify(cache, null, 2));
  } catch {
    // ignore — a failed settings write shouldn't disrupt the session
  }
}
