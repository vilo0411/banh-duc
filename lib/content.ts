import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { editorial, safeDescription } from "./editorial";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type RecipeStep = { name: string; text: string };

export type Recipe = {
  prepTime?: string; // ISO 8601 duration, e.g. PT20M
  cookTime?: string;
  totalTime?: string;
  yield?: string;
  difficulty?: string;
  category?: string;
  cuisine?: string;
  ingredients: string[];
  steps: RecipeStep[];
};

/**
 * Ba loại tài liệu, khác nhau ở vai trò chứ không chỉ ở thư mục:
 *
 * - `posts`   — công thức, migrate về từ WordPress và bị ghi đè mỗi lần migrate.
 * - `pages`   — trang tĩnh (giới thiệu, liên hệ, chính sách), cũng migrate về.
 * - `guides`  — cẩm nang viết tay tại `content/cam-nang/`, KHÔNG do migrate sinh
 *               ra nên không bị ghi đè. Đây là nơi đặt nội dung giải thích chủ
 *               đề — thứ mà một trang danh sách công thức không bao giờ trả lời
 *               được cho các truy vấn kiểu "bánh đúc là gì".
 */
export type Collection = "posts" | "pages" | "guides";

/** Thư mục trên đĩa của từng loại. */
const DIRS: Record<Collection, string> = {
  posts: "posts",
  pages: "pages",
  guides: "cam-nang",
};

export type Doc = {
  slug: string;
  /** Site path, trailing slash included — identical to the old WordPress URL. */
  url: string;
  collection: Collection;
  title: string;
  /**
   * Nhãn ngắn cho điều hướng. Tiêu đề của một bài phải đủ dài để đứng một mình
   * trên SERP; một cột chân trang thì không chứa nổi nó. Mặc định bằng `title`.
   */
  shortTitle: string;
  description: string;
  date: string;
  updated: string;
  image?: string;
  imageAlt?: string;
  /** "Món mặn" | "Món ngọt" | "Món chay" | "Nước chấm" — see scripts/classify.ts */
  group?: string;
  /** Only set where the article itself names a region — see scripts/classify.ts. */
  region?: string;
  /** `schema.org/RestrictedDiet` URLs — from lib/editorial.ts, never guessed. */
  diet?: string[];
  /** Câu hỏi thường gặp; render ra HTML và phát kèm FAQPage. */
  faq?: { q: string; a: string }[];
  recipe?: Recipe;
  body: string;
  readingMinutes: number;
};

/**
 * Most migrated posts open with a small table of prep time / cook time /
 * difficulty / servings. That is exactly what the spec strip under the title
 * now shows, and the same four numbers twice on one screen is clutter — so
 * the table is dropped from the body. The frontmatter keeps the data; this
 * only removes the second rendering of it.
 */
function withoutSummaryTable(markdown: string): string {
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length - 2; i++) {
    if (!/^\s*\|/.test(lines[i]) || !/thời\s*gian\s*chuẩn\s*bị/i.test(lines[i])) continue;
    if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    lines.splice(i, 3);
    return lines.join("\n");
  }
  return markdown;
}

function parseFile(collection: Collection, file: string): Doc {
  const slug = file.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(path.join(CONTENT_DIR, DIRS[collection], file), "utf8");
  const { data, content } = matter(raw);

  // The homepage lives at "/", every other document at "/<slug>/".
  const url = slug === "home" ? "/" : `/${slug}/`;
  const body = data.recipe ? withoutSummaryTable(content) : content;
  const words = body.split(/\s+/).length;

  // Hand edits live in lib/editorial.ts, not in the MDX: `npm run migrate`
  // rewrites every file under content/, so anything fixed in place is lost on
  // the next run. See the file header there.
  const edits = editorial[slug];
  const recipe = data.recipe as Recipe | undefined;

  return {
    slug,
    url,
    collection,
    title: String(data.title ?? slug),
    shortTitle: String(data.shortTitle ?? data.title ?? slug),
    description: safeDescription(slug, String(data.description ?? "")),
    date: String(data.date ?? ""),
    updated: String(data.updated ?? data.date ?? ""),
    image: data.image ? String(data.image) : undefined,
    imageAlt: data.imageAlt ? String(data.imageAlt) : edits?.imageAlt,
    group: data.group ? String(data.group) : undefined,
    region: edits?.region ?? (data.region ? String(data.region) : undefined),
    diet: edits?.diet,
    faq: edits?.faq,
    // Frontmatter thắng: overlay chỉ điền vào chỗ bản migrate bỏ trống.
    recipe: recipe && (edits?.recipe ? { ...edits.recipe, ...recipe } : recipe),
    body,
    // ~200 wpm is the usual reading speed assumption for Vietnamese prose.
    readingMinutes: Math.max(1, Math.round(words / 200)),
  };
}

function readCollection(collection: Collection): Doc[] {
  const dir = path.join(CONTENT_DIR, DIRS[collection]);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => parseFile(collection, f));
}

let cache: Record<Collection, Doc[]> | null = null;

function all() {
  // Content is read from disk at build time; caching keeps prerendering cheap.
  if (!cache || process.env.NODE_ENV === "development") {
    cache = {
      posts: readCollection("posts"),
      pages: readCollection("pages"),
      guides: readCollection("guides"),
    };
  }
  return cache;
}

/** Every post, newest first. */
export function getPosts(): Doc[] {
  return [...all().posts].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPages(): Doc[] {
  return all().pages;
}

/** Cẩm nang, cũ nhất trước — thứ tự đọc, không phải thứ tự đăng. */
export function getGuides(): Doc[] {
  return [...all().guides].sort((a, b) => a.date.localeCompare(b.date));
}

/** Mọi tài liệu, cho sitemap và sinh route. */
export function getAllDocs(): Doc[] {
  return [...getPosts(), ...getGuides(), ...getPages()];
}

/** Resolve a slug across every collection. Posts win on collision. */
export function getDoc(slug: string): Doc | undefined {
  return getAllDocs().find((d) => d.slug === slug);
}

export function getHomePage(): Doc | undefined {
  return all().pages.find((d) => d.slug === "home");
}

/**
 * Other posts to surface at the end of an article. Internal links spread crawl
 * budget and keep readers on-site, so every post gets a few.
 */
export function getRelatedPosts(slug: string, limit = 3): Doc[] {
  const posts = getPosts();
  const current = posts.findIndex((p) => p.slug === slug);
  if (current === -1) return posts.slice(0, limit);

  const doc = posts[current];
  const rotated = [...posts.slice(current + 1), ...posts.slice(0, current)];

  // Someone reading a sweet recipe is more likely to want another sweet one,
  // so same group first and the rest of the rotation after — the list still
  // fills up either way.
  const score = (other: Doc) =>
    (other.group && other.group === doc.group ? 2 : 0) +
    (other.region && other.region === doc.region ? 1 : 0);

  return [...rotated].sort((a, b) => score(b) - score(a)).slice(0, limit);
}
