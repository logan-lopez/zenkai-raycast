/**
 * Tidies text used as an AI prompt without changing its meaning or structure.
 *
 * Deliberately conservative: runs of spaces inside a line and leading
 * indentation are left alone, so nested markdown lists and indented prose
 * survive untouched. Fenced code blocks are passed through verbatim.
 *
 * Pure and free of Raycast imports so it can be tested directly.
 */

/** Matches a markdown fence marker (up to 3 leading spaces, then ``` or ~~~). */
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

const TAB = "  ";

/** A fence closes only on the same character, at least as long, with nothing after it. */
function closesFence(line: string, matched: string, opener: string): boolean {
  if (matched[0] !== opener[0] || matched.length < opener.length) {
    return false;
  }
  const rest = line.slice(line.indexOf(matched) + matched.length);
  return rest.trim() === "";
}

export function clean(input: string): string {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");

  const out: string[] = [];
  // Parallel to `out`: true for lines copied verbatim out of a fenced block.
  const fenced: boolean[] = [];

  let opener: string | null = null;

  for (const line of lines) {
    const match = FENCE.exec(line);

    if (opener !== null) {
      // Inside a fence: copy through untouched, and look for the closer.
      out.push(line);
      fenced.push(true);
      if (match && closesFence(line, match[1], opener)) {
        opener = null;
      }
      continue;
    }

    if (match) {
      opener = match[1];
      out.push(line);
      fenced.push(true);
      continue;
    }

    const tidied = line.replace(/\t/g, TAB).replace(/[ \t]+$/, "");

    // At most one blank line in a row, i.e. one empty line between paragraphs.
    const last = out.length - 1;
    if (tidied === "" && last >= 0 && !fenced[last] && out[last] === "") {
      continue;
    }

    out.push(tidied);
    fenced.push(false);
  }

  // Trim blank lines off both ends, but never reach into a fenced block: an
  // unterminated fence keeps whatever trailing blank lines it had.
  let start = 0;
  while (start < out.length && !fenced[start] && out[start] === "") {
    start++;
  }
  let end = out.length;
  while (end > start && !fenced[end - 1] && out[end - 1] === "") {
    end--;
  }

  return out.slice(start, end).join("\n");
}
