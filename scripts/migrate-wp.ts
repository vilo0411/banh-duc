/**
 * Migrate banhduc.vn (WordPress) -> MDX in ./content
 *
 * Pulls posts + pages from the public WP REST API, downloads every image
 * referenced (featured + inline) into ./public/images, rewrites the HTML to
 * point at the local copies, converts to Markdown, and writes MDX with
 * frontmatter. Slugs are preserved verbatim so the live URLs never change.
 *
 *   npm run migrate
 */
import fs from "node:fs/promises";
import path from "node:path";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const WP = "https://banhduc.vn/wp-json/wp/v2";
const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const IMAGES = path.join(ROOT, "public", "images");

type WPItem = {
  id: number;
  slug: string;
  link: string;
  date: string;
  modified: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  categories?: number[];
};

const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
});
td.use(gfm);
// WP wraps images in <figure><figcaption>; keep the caption as italic text.
td.addRule("figcaption", {
  filter: "figcaption",
  replacement: (content) => (content.trim() ? `\n\n_${content.trim()}_\n\n` : ""),
});

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#039;": "'",
  "&#39;": "'", "&nbsp;": " ", "&#8211;": "–", "&#8212;": "—",
  "&#8216;": "‘", "&#8217;": "’", "&#8220;": "“", "&#8221;": "”",
  "&hellip;": "…", "&#8230;": "…",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    // WP appends a "read more" tail to the excerpt; it is noise in a meta description.
    .replace(/\s*[…\.]{1,3}\s*(Xem thêm|Đọc tiếp|Read more)\s*$/i, "…")
    .trim();
}

async function wpFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${WP}/${endpoint}`);
  if (!res.ok) throw new Error(`${endpoint} -> ${res.status}`);
  return res.json() as Promise<T>;
}

/** Download a remote image once; returns the site-absolute local path. */
const downloaded = new Map<string, string>();
async function localizeImage(url: string): Promise<string> {
  const cached = downloaded.get(url);
  if (cached) return cached;

  // Strip WP's generated size suffix so we keep the full-resolution original.
  const clean = url.split("?")[0];
  const name = decodeURIComponent(path.basename(clean)).replace(/[^\w.\-]/g, "-");
  const local = `/images/${name}`;
  const dest = path.join(IMAGES, name);

  try {
    await fs.access(dest);
  } catch {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ! image ${res.status}: ${url}`);
      downloaded.set(url, url);
      return url;
    }
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`  + ${name}`);
  }
  downloaded.set(url, local);
  return local;
}

/** Rewrite <img src> to local copies and internal links to root-relative. */
async function rewriteHtml(html: string): Promise<string> {
  let out = html;

  const srcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  for (const src of new Set(srcs)) {
    if (!src.startsWith("http")) continue;
    const local = await localizeImage(src);
    out = out.split(src).join(local);
  }

  // Turndown only converts a table that has a header row, and these were
  // authored with <td> throughout — leaving raw HTML tables in the MDX, which
  // then bypass the renderer's scroll wrapper and overflow on mobile.
  // Promoting the first row to <th> makes them real Markdown tables.
  out = out.replace(/<tr>([\s\S]*?)<\/tr>/i, (row) =>
    row.replace(/<td(\s[^>]*)?>/gi, "<th$1>").replace(/<\/td>/gi, "</th>"),
  );

  // Drop srcset/sizes — next/image handles responsive sizing itself.
  out = out.replace(/\s(?:srcset|sizes)="[^"]*"/g, "");
  // Internal absolute links -> relative, so previews/staging don't leak to prod.
  out = out.replace(/https:\/\/banhduc\.vn\//g, "/");
  return out;
}

async function featuredImage(id: number): Promise<{ src: string; alt: string } | null> {
  if (!id) return null;
  try {
    const m = await wpFetch<{ source_url: string; alt_text: string }>(`media/${id}`);
    return { src: await localizeImage(m.source_url), alt: m.alt_text || "" };
  } catch {
    return null;
  }
}

function frontmatter(fields: Record<string, string | string[] | undefined>): string {
  const esc = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const lines = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== "" && (!Array.isArray(v) || v.length))
    .map(([k, v]) =>
      Array.isArray(v) ? `${k}:\n${v.map((i) => `  - ${esc(i)}`).join("\n")}` : `${k}: ${esc(v as string)}`,
    );
  return `---\n${lines.join("\n")}\n---\n`;
}

async function migrate(type: "posts" | "pages", outDir: string) {
  const items = await wpFetch<WPItem[]>(`${type}?per_page=100&status=publish`);
  console.log(`\n${type}: ${items.length}`);
  await fs.mkdir(outDir, { recursive: true });

  for (const item of items) {
    const title = decodeEntities(item.title.rendered);
    console.log(`- ${item.slug}  ${title}`);

    const hero = await featuredImage(item.featured_media);
    const html = await rewriteHtml(item.content.rendered);
    const markdown = td.turndown(html).replace(/\n{3,}/g, "\n\n").trim();

    const body =
      frontmatter({
        title,
        description: stripTags(item.excerpt.rendered).slice(0, 300),
        date: item.date,
        updated: item.modified,
        image: hero?.src,
        imageAlt: hero?.alt,
        wpId: String(item.id),
      }) + `\n${markdown}\n`;

    await fs.writeFile(path.join(outDir, `${item.slug}.mdx`), body, "utf8");
  }
}

async function main() {
  await fs.mkdir(IMAGES, { recursive: true });
  await migrate("posts", path.join(CONTENT, "posts"));
  await migrate("pages", path.join(CONTENT, "pages"));
  console.log(`\nDone. ${downloaded.size} images localized.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
