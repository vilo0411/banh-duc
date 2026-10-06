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
  return scanHeadings(markdown).map(({ id, text, level }) => ({ id, text, level }));
}

/** Every heading with the line it sits on, so callers can slice its section. */
function scanHeadings(markdown: string): (Heading & { line: number })[] {
  const slugger = new GithubSlugger();
  const headings: (Heading & { line: number })[] = [];
  let inFence = false;

  for (const [index, line] of markdown.split("\n").entries()) {
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
      line: index,
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
    const free = headings.filter((h) => !used.has(h.id));
    // Closest match wins: an ingredient sub-heading "Bột" sits before the method
    // and is contained in "Làm bột bánh", so a loose first-hit search sent that
    // step to the shopping list. A heading shorter than half the step name is
    // too generic to be the step at all.
    const hit =
      free.find((h) => h.key === key) ??
      free.find((h) => h.key.includes(key)) ??
      free.find((h) => h.key.length * 2 >= key.length && key.includes(h.key));
    if (hit) used.add(hit.id);
    return hit?.id;
  });
}

/* --- Step images ---------------------------------------------------------
   Google asks for an image on each HowToStep. Every recipe already has one:
   the photo the author put under the step's own heading. Only that section is
   searched — up to the next heading of the same or a higher level — so a step
   never borrows the photo of the step after it. */

const IMAGE = /!\[[^\]]*\]\(\s*([^)\s]+)[^)]*\)|<img\b[^>]*\bsrc=["']([^"']+)["']/;

export function stepImages(markdown: string, anchors: (string | undefined)[]): (string | undefined)[] {
  const lines = markdown.split("\n");
  const headings = scanHeadings(markdown);

  return anchors.map((anchor) => {
    const at = headings.findIndex((h) => h.id === anchor);
    if (!anchor || at === -1) return undefined;
    const heading = headings[at];
    const next = headings.slice(at + 1).find((h) => h.level <= heading.level);
    const section = lines.slice(heading.line + 1, next?.line ?? lines.length).join("\n");
    const match = IMAGE.exec(section);
    return match?.[1] ?? match?.[2];
  });
}
