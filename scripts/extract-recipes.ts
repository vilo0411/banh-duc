/**
 * Derive Recipe structured data from the article body.
 *
 * Google only shows a recipe rich result when the markup matches what the
 * reader can actually see, so ingredients and steps are lifted out of the
 * rendered prose — never invented. The result is written back into the MDX
 * frontmatter as `recipe:` so it is reviewable and hand-editable; a post that
 * does not yield a confident parse is left alone and stays an Article.
 *
 *   npm run extract-recipes
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const POSTS = path.join(process.cwd(), "content", "posts");

const INGREDIENT_HEADING = /nguyên\s*liệu/i;
const TOOL_HEADING = /dụng\s*cụ/i;
// Headings are numbered by the original author ("2.1 Bước 1: Trộn bột"), so the
// outline prefix has to be tolerated before the word "Bước".
const STEP_HEADING = /^(?:[\d.]+\s+)?bước\s*(\d+)\s*[:.\-–]?\s*(.*)$/i;
const METHOD_HEADING = /(chế\s*biến|hướng\s*dẫn|cách\s*làm|các\s*bước)/i;

/** Markdown -> plain sentence text, for a JSON-LD string field. */
function plain(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> label
    .replace(/[*_`]+/g, "")
    .replace(/\\([.\-*_])/g, "$1") // markdown-escaped punctuation, e.g. "1\."
    .replace(/^\s*[-+*]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Drop lines that are not part of the instruction prose: image captions (which
 * the migration emits as a standalone italic line) and raw HTML blocks.
 * Without this, a caption gets appended to the step text in the JSON-LD.
 */
function proseLines(lines: string[]): string[] {
  return lines.filter(
    (line) => !/^\s*_[^_].*_\s*$/.test(line) && !/^\s*<[a-z]/i.test(line),
  );
}

/** "1 giờ 30 phút" -> "PT1H30M". Returns undefined if no duration is present. */
function toIsoDuration(text: string): string | undefined {
  const hours = /(\d+)\s*(giờ|tiếng|h\b)/i.exec(text);
  const minutes = /(\d+)\s*(phút|p\b|m\b)/i.exec(text);
  if (!hours && !minutes) return undefined;
  return `PT${hours ? `${hours[1]}H` : ""}${minutes ? `${minutes[1]}M` : ""}`;
}

/**
 * The label row and value row of the article's summary table, whether it
 * survives as raw HTML or as a Markdown pipe table.
 */
function summaryTableRows(markdown: string): [string[], string[]] | null {
  const html = /<table[^>]*>([\s\S]*?)<\/table>/i.exec(markdown);
  if (html) {
    const cells = [...html[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
    );
    const half = cells.length / 2;
    if (!Number.isInteger(half) || half < 2) return null;
    return [cells.slice(0, half), cells.slice(half)];
  }

  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length - 2; i++) {
    // A pipe table is a header row, an alignment row, then the values.
    if (!/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;

    const split = (line: string) =>
      line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const labels = split(lines[i]);
    const values = split(lines[i + 2] ?? "");
    if (labels.length < 2 || values.length !== labels.length) continue;
    return [labels, values];
  }

  return null;
}

/**
 * Most posts open with a small summary table the original author wrote:
 * prep time / cook time / difficulty / servings. Those map straight onto
 * Recipe's prepTime, cookTime and recipeYield.
 */
function extractTimings(markdown: string) {
  const rows = summaryTableRows(markdown);
  if (!rows) return {};

  const [labels, values] = rows;
  const byLabel = new Map<string, string>();
  labels.forEach((label, i) => byLabel.set(label.toLowerCase(), values[i] ?? ""));

  const find = (pattern: RegExp) => {
    for (const [label, value] of byLabel) if (pattern.test(label)) return value;
    return undefined;
  };

  const prep = find(/chuẩn\s*bị/);
  const cook = find(/chế\s*biến|nấu|thực\s*hiện/);
  const servings = find(/khẩu\s*phần|phục\s*vụ|dành\s*cho/);
  const difficulty = find(/mức\s*độ|độ\s*khó/);

  return {
    prepTime: prep ? toIsoDuration(prep) : undefined,
    cookTime: cook ? toIsoDuration(cook) : undefined,
    yield: servings || undefined,
    difficulty: difficulty || undefined,
  };
}

type Block = { heading: string; level: number; lines: string[] };

/** Split a document into heading-delimited blocks, ignoring fenced code. */
function blocks(markdown: string): Block[] {
  const out: Block[] = [];
  let current: Block = { heading: "", level: 0, lines: [] };
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const h = !inFence && /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (h) {
      out.push(current);
      current = { heading: plain(h[2]), level: h[1].length, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  out.push(current);
  return out;
}

function extractIngredients(docBlocks: Block[]): string[] {
  const items: string[] = [];

  // An ingredient heading opens a section that often continues through deeper
  // sub-headings ("#### Phần bột", "#### Nước mắm"). Stay inside the section
  // until a heading at the same level or shallower closes it.
  let openLevel = 0;

  for (const block of docBlocks) {
    if (openLevel && block.level && block.level <= openLevel) openLevel = 0;

    if (INGREDIENT_HEADING.test(block.heading) && !TOOL_HEADING.test(block.heading)) {
      openLevel = block.level;
    } else if (!openLevel) {
      continue;
    } else if (TOOL_HEADING.test(block.heading) || STEP_HEADING.test(block.heading)) {
      // Equipment and step lists live at the same depth but are not ingredients.
      openLevel = 0;
      continue;
    }

    for (const line of block.lines) {
      const bullet = /^\s*[-+*]\s+(.*\S)\s*$/.exec(line);
      if (!bullet) continue;
      const text = plain(bullet[1]);
      // Real ingredient lines are short and almost always carry a quantity.
      if (text.length < 3 || text.length > 160) continue;
      items.push(text);
    }
  }

  // Dedupe while preserving order — some posts repeat a summary list.
  return [...new Set(items)];
}

function extractSteps(docBlocks: Block[]): { name: string; text: string }[] {
  const steps: { name: string; text: string }[] = [];

  for (const block of docBlocks) {
    const match = STEP_HEADING.exec(block.heading);
    if (!match) continue;

    const name = match[2].trim() || `Bước ${match[1]}`;
    const text = plain(proseLines(block.lines).join("\n")).slice(0, 900);
    if (text.length < 20) continue;
    steps.push({ name, text });
  }
  if (steps.length) return steps;

  // Some posts never write the word "Bước" — the method is simply the numbered
  // sub-headings under "Chế biến" / "Hướng dẫn". Fall back to those.
  let openLevel = 0;
  for (const block of docBlocks) {
    if (openLevel && block.level && block.level <= openLevel) openLevel = 0;

    if (!openLevel) {
      if (METHOD_HEADING.test(block.heading)) openLevel = block.level;
      continue;
    }

    const numbered = /^[\d.]+\s+(.+)$/.exec(block.heading);
    if (!numbered) continue;

    const text = plain(proseLines(block.lines).join("\n")).slice(0, 900);
    if (text.length < 20) continue;
    steps.push({ name: numbered[1].trim(), text });
  }

  return steps;
}

function yamlEscape(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

let updated = 0;
const skipped: string[] = [];

for (const file of fs.readdirSync(POSTS).filter((f) => f.endsWith(".mdx"))) {
  const full = path.join(POSTS, file);
  const parsed = matter(fs.readFileSync(full, "utf8"));
  const parts = blocks(parsed.content);

  const ingredients = extractIngredients(parts);
  const steps = extractSteps(parts);

  if (ingredients.length < 3 || steps.length < 2) {
    skipped.push(`${file} (${ingredients.length} nguyên liệu, ${steps.length} bước)`);
    continue;
  }

  const timings = extractTimings(parsed.content);

  parsed.data.recipe = {
    category: "Món ăn vặt",
    cuisine: "Việt Nam",
    ...timings,
    ingredients,
    steps,
  };

  // gray-matter's YAML dump quotes inconsistently across versions; emit the
  // recipe block by hand so the frontmatter stays readable to edit.
  const { recipe, ...rest } = parsed.data;
  const head = Object.entries(rest)
    .map(([k, v]) => `${k}: ${yamlEscape(String(v))}`)
    .join("\n");
  const recipeYaml = [
    "recipe:",
    `  category: ${yamlEscape(recipe.category)}`,
    `  cuisine: ${yamlEscape(recipe.cuisine)}`,
    ...(recipe.prepTime ? [`  prepTime: ${yamlEscape(recipe.prepTime)}`] : []),
    ...(recipe.cookTime ? [`  cookTime: ${yamlEscape(recipe.cookTime)}`] : []),
    ...(recipe.yield ? [`  yield: ${yamlEscape(recipe.yield)}`] : []),
    ...(recipe.difficulty ? [`  difficulty: ${yamlEscape(recipe.difficulty)}`] : []),
    "  ingredients:",
    ...recipe.ingredients.map((i: string) => `    - ${yamlEscape(i)}`),
    "  steps:",
    ...recipe.steps.flatMap((s: { name: string; text: string }) => [
      `    - name: ${yamlEscape(s.name)}`,
      `      text: ${yamlEscape(s.text)}`,
    ]),
  ].join("\n");

  fs.writeFileSync(full, `---\n${head}\n${recipeYaml}\n---\n${parsed.content}`, "utf8");
  console.log(`✓ ${file}: ${ingredients.length} nguyên liệu, ${steps.length} bước`);
  updated++;
}

console.log(`\n${updated} bài có Recipe schema.`);
if (skipped.length) {
  console.log(`\nBỏ qua (giữ Article schema):`);
  skipped.forEach((s) => console.log(`  - ${s}`));
}
