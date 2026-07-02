import { parseColor, SyntaxStyle } from "@opentui/core";
import { theme } from "../theme.ts";

// Shared syntax highlighting for rendered post/reply markdown, reused by the
// reader detail view and the compose overlay's reply context.
export const postSyntaxStyle = SyntaxStyle.fromStyles({
  default: { fg: parseColor(theme.fg) },
  "markup.heading": { fg: parseColor(theme.accent), bold: true },
  "markup.heading.1": { fg: parseColor(theme.accent), bold: true, underline: true },
  "markup.strong": { fg: parseColor(theme.fg), bold: true },
  "markup.italic": { fg: parseColor(theme.fg), italic: true },
  "markup.link": { fg: parseColor(theme.accent), underline: true },
  "markup.link.label": { fg: parseColor(theme.accent), underline: true },
  "markup.link.url": { fg: parseColor(theme.accent), underline: true },
  "markup.raw": { fg: parseColor(theme.fg), bg: parseColor(theme.chipBg) },
  "markup.raw.inline": { fg: parseColor(theme.fg), bg: parseColor(theme.chipBg) },
  "markup.list": { fg: parseColor(theme.accent) },
  "markup.quote": { fg: parseColor(theme.fgDim), italic: true },
  conceal: { fg: parseColor(theme.fgDim) },
});

export function cleanMarkdown(content: string): string {
  return content
    .replace(/^[ \t]*&nbsp;[ \t]*$/gm, "")
    .replace(/^[ \t]* [ \t]*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) =>
      text === url ? `<${url}>` : m,
    );
}
