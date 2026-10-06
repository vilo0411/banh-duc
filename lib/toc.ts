import GithubSlugger from "github-slugger";

export type Heading = { id: string; text: string; level: 2 | 3 | 4 };

/**
 * Headings for the in-article table of contents.
 *
 * Uses the same slugger as rehype-slug so the ids here always match the ids
 * rendered into the HTML. Fenced code blocks are skipped so a commented line
 * inside a snippet is never mistaken for a heading.
 */
export function getHeadings(markdown: string): Heading[] {
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // h4 is collected too, even though the contents list only shows h2: the
    // slugger has to see every heading in order, or its duplicate counter
    // drifts out of step with rehype-slug and the ids stop matching.
    const match = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const text = match[2]
      .replace(/\*\*|__|\*|_|`/g, "") // strip inline emphasis markers
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // keep link text only
      // Turndown escapes the author's outline numbering as "1\." — the
      // renderer unescapes it, so the contents list must too.
      .replace(/\\([.\-*_+#])/g, "$1")
      .trim();
    if (!text) continue;

    headings.push({
      id: slugger.slug(text),
      text,
      level: match[1].length as 2 | 3 | 4,
    });
  }

  return headings;
}

/* --- Step anchors --------------------------------------------------------
   The recipe steps were extracted from the article's own headings, so each
   one has a heading it belongs to. Recovering that id lets the kitchen slip
   link into the full method — and gives the HowToStep markup a URL that
   actually resolves, which it previously did not. */

function normalise(text: string): string {
  return text
    .toLowerCase()
    // "2.1 Bước 1: Pha bột" and "Pha bột" have to compare equal.
    .replace(/^[\d.\s]*(bước\s*\d+\s*[:.\-–]?)?\s*/, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stepAnchors(markdown: string, steps: { name: string }[]): (string | undefined)[] {
  const headings = getHeadings(markdown).map((h) => ({ id: h.id, key: normalise(h.text) }));
  const used = new Set<string>();

  return steps.map((step) => {
    const key = normalise(step.name);
    if (key.length < 3) return undefined;
    const hit = headings.find(
      (h) => !used.has(h.id) && (h.key === key || h.key.includes(key) || key.includes(h.key)),
    );
    if (hit) used.add(hit.id);
    return hit?.id;
  });
}
