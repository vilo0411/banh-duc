/**
 * Chụp lại các URL "phụ" của bản WordPress mà đường dẫn nội dung không tự giữ
 * được, và ghi đích 301 của chúng vào lib/legacy-redirects.json:
 *
 * - `/?p=<id>`, `/?page_id=<id>` — shortlink WP, vẫn nằm trong các lượt chia sẻ cũ.
 * - Trang đính kèm (`/<bài>/<ảnh>/`, `/<ảnh>/`) và `/?attachment_id=<id>` —
 *   Rank Math đã 301 chúng về bài cha; Google còn giữ trong chỉ mục.
 *
 * Đích được tính một lần rồi commit, vì sau khi chuyển tên miền sẽ không còn
 * WP REST API nào để hỏi lại. Chạy khi bản WordPress còn sống:
 *
 *   npx tsx scripts/legacy-redirects.ts
 */
import fs from "node:fs/promises";
import path from "node:path";

const WP = "https://banhduc.vn/wp-json/wp/v2";
const ROOT = process.cwd();
const OUT = path.join(ROOT, "lib", "legacy-redirects.json");

type Item = { id: number; link: string; post?: number | null; source_url?: string };

async function all<T>(endpoint: string, fields: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${WP}/${endpoint}?per_page=100&page=${page}&_fields=${fields}`);
    if (!res.ok) break; // WP trả 400 khi vượt trang cuối.
    const batch = (await res.json()) as T[];
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

/** Đường dẫn trên site mới. /tin-tuc/ đã 301 về /cong-thuc/ nên trỏ thẳng tới đích cuối. */
function sitePath(link: string): string {
  const p = new URL(link).pathname;
  return p === "/tin-tuc/" ? "/cong-thuc/" : p;
}

/** Ảnh nào xuất hiện trong bài nào — cho ảnh WP không gắn với bài cha. */
async function imageOwners(): Promise<Map<string, string>> {
  const owners = new Map<string, string>();
  for (const dir of ["posts", "pages", "cam-nang"]) {
    const files = await fs.readdir(path.join(ROOT, "content", dir));
    for (const file of files) {
      const slug = file.replace(/\.mdx?$/, "");
      const url = slug === "home" ? "/" : `/${slug}/`;
      const body = await fs.readFile(path.join(ROOT, "content", dir, file), "utf8");
      for (const m of body.matchAll(/\/images\/([\w.-]+)/g)) {
        if (!owners.has(m[1])) owners.set(m[1], url);
      }
    }
  }
  return owners;
}

async function main() {
  const [posts, pages, media, owners] = await Promise.all([
    all<Item>("posts", "id,link"),
    all<Item>("pages", "id,link"),
    all<Item>("media", "id,link,post,source_url"),
    imageOwners(),
  ]);

  const byId = new Map<number, string>();
  for (const d of [...posts, ...pages]) byId.set(d.id, sitePath(d.link));

  const ids: Record<string, string> = {};
  for (const [id, to] of byId) ids[id] = to;

  const attachments: Record<string, string> = {};
  for (const m of media) {
    const file = path.basename(new URL(m.source_url!).pathname);
    // Các "ảnh" .php_.jpg là dấu vết upload webshell, không phải nội dung: để 404.
    if (/\.(php\d?|phtml)_\./.test(file)) continue;
    const to = (m.post && byId.get(m.post)) || owners.get(file) || "/";
    ids[m.id] = to;
    // Ảnh chưa từng có permalink thì link là `/?attachment_id=<id>` — đã nằm trong `ids`.
    const link = new URL(m.link);
    if (!link.search) attachments[link.pathname] = to;
  }

  const sorted = (o: Record<string, string>) =>
    Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  await fs.writeFile(
    OUT,
    JSON.stringify({ ids: sorted(ids), attachments: sorted(attachments) }, null, 2) + "\n",
  );
  console.log(
    `✓ ${Object.keys(ids).length} id, ${Object.keys(attachments).length} trang đính kèm → ${path.relative(ROOT, OUT)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
