import fs from "node:fs";
import path from "node:path";

/**
 * Soát HTML đã dựng: dàn tiêu đề, landmark, ảnh và các thẻ SEO bắt buộc.
 *
 * Nó đọc chính những file mà trình thu thập sẽ đọc (`.next/server/app/**.html`)
 * chứ không đọc JSX — một `h3` sai cấp chỉ lộ ra sau khi mọi component đã ghép
 * lại, và đó cũng là thứ duy nhất Google nhìn thấy. Chạy sau `npm run build`.
 *
 *   npm run check
 *
 * Thoát với mã 1 nếu có lỗi, nên nó dùng được thẳng trong CI.
 */

const ROOT = ".next/server/app";

/** Bỏ script và style: chữ bên trong chúng không phải nội dung trang. */
function strip(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "");
}

/** Giải mã entity trong thuộc tính HTML — độ dài phải đếm trên chữ thật. */
function decode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

function checkPage(file: string, raw: string): string[] {
  const html = strip(raw);
  const errors: string[] = [];
  // Trang lỗi của Next không đi qua layout, nên nó không có landmark lẫn thẻ
  // SEO nào — và cũng không bao giờ được index.
  const isErrorPage = path.basename(file).startsWith("_");

  const levels = [...html.matchAll(/<h([1-6])[^>]*>/g)].map((m) => Number(m[1]));
  const h1 = levels.filter((level) => level === 1).length;
  if (h1 !== 1) errors.push(`${h1} thẻ h1 (phải đúng 1)`);

  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      errors.push(`dàn tiêu đề nhảy cấp h${levels[i - 1]} → h${levels[i]}`);
      break;
    }
  }

  for (const [, tag] of html.matchAll(/<(h[1-6])[^>]*>\s*<\/\1>/g)) {
    errors.push(`thẻ ${tag} rỗng`);
  }

  const images = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const noAlt = images.filter((img) => !/\balt=/.test(img)).length;
  if (noAlt) errors.push(`${noAlt} thẻ img không có alt`);

  if (!/<html[^>]*\blang="[^"]+"/.test(raw)) errors.push("thiếu <html lang>");
  if (!/<title>[^<]+<\/title>/.test(raw)) errors.push("thiếu <title>");

  if (isErrorPage) return errors;

  for (const tag of ["<main", "<header", "<footer", "<nav"]) {
    if (!html.includes(tag)) errors.push(`thiếu landmark ${tag}>`);
  }

  if (!/<link[^>]+rel="canonical"/.test(raw)) errors.push("thiếu canonical");
  if (!/<meta[^>]+property="og:image"/.test(raw)) errors.push("thiếu og:image");
  // Thiếu kích thước, Facebook/Zalo phải tải ảnh về mới dựng được thẻ xem
  // trước, nên lượt chia sẻ đầu tiên của một bài ra không có ảnh.
  for (const prop of ["og:image:width", "og:image:height"]) {
    if (!new RegExp(`<meta[^>]+property="${prop}"`).test(raw)) errors.push(`thiếu ${prop}`);
  }

  // Description: có, đủ dài để nói được điều gì, và KHÔNG cụt.
  //
  // Bản migrate cắt excerpt WordPress ở 300 ký tự rồi dán "…" vào, nên cả 23
  // bài từng phát ra một câu đứt giữa chừng trên mọi kết quả tìm kiếm. Google
  // cắt hiển thị quanh 155 ký tự; dài hơn thì phần đuôi chắc chắn mất, mà đuôi
  // của một câu bị cắt máy móc lại thường là phần vô nghĩa nhất.
  const description = raw.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/)?.[1];
  if (!description) {
    errors.push("thiếu meta description");
  } else {
    const text = decode(description);
    if (text.length < 50) errors.push(`meta description chỉ ${text.length} ký tự (tối thiểu 50)`);
    if (text.length > 160) errors.push(`meta description ${text.length} ký tự (tối đa 160)`);
    if (/[…]$|\.\.\.$/.test(text)) errors.push("meta description kết thúc bằng dấu ba chấm (câu bị cắt cụt)");

    // Next thay sạch khối `openGraph` khi một segment con khai lại nó, nên hai
    // chuỗi này lệch nhau là dấu hiệu một trang đã đi vòng qua `pageMetadata()`.
    const og = raw.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/)?.[1];
    if (og !== undefined && decode(og) !== text) {
      errors.push("og:description khác meta description");
    }
  }

  // Một trang = một khối JSON-LD = một `@graph`. Nhiều khối rời là cách nhanh
  // nhất để Google đọc ra hai thực thể không liên quan trên cùng một URL.
  const blocks = [...raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (blocks.length !== 1) {
    errors.push(`${blocks.length} khối JSON-LD (phải đúng 1)`);
  } else {
    try {
      const data = JSON.parse(blocks[0][1]) as { "@graph"?: Record<string, unknown>[] };
      const graph = data["@graph"];
      if (!Array.isArray(graph) || graph.length === 0) {
        errors.push("JSON-LD không phải một @graph");
      } else {
        errors.push(...checkGraph(graph, html));
      }
    } catch {
      errors.push("JSON-LD không parse được");
    }
  }

  return errors;
}

/**
 * Các luật trên chính khối JSON-LD.
 *
 * Chúng bắt một lớp lỗi mà việc soát thẻ không thấy: schema khai một thứ mà
 * trang không có. `banh-duc-hue` từng phát ra một `Recipe` không có thời gian
 * nấu lẫn khẩu phần vì frontmatter thiếu, và không có gì báo.
 */
function checkGraph(graph: Record<string, unknown>[], html: string): string[] {
  const errors: string[] = [];
  const nodeOf = (type: string) => graph.find((node) => node["@type"] === type);

  // Một `{"@id": …}` đứng một mình là lời hứa "nút này có trong graph". Nút ở
  // trang khác thì không — Person từng trỏ `mainEntityOfPage` vào ProfilePage
  // của trang tác giả trên mọi trang, và không có gì báo. Trỏ sang trang khác
  // thì dùng URL thật.
  const ids = new Set(graph.map((node) => node["@id"]).filter(Boolean));
  const dangling = new Set<string>();
  const walk = (value: unknown, root: boolean): void => {
    if (Array.isArray(value)) return value.forEach((item) => walk(item, false));
    if (!value || typeof value !== "object") return;
    const entries = Object.entries(value);
    if (!root && entries.length === 1 && entries[0][0] === "@id" && !ids.has(entries[0][1])) {
      dangling.add(String(entries[0][1]));
    }
    for (const [, child] of entries) walk(child, false);
  };
  graph.forEach((node) => walk(node, true));
  for (const id of dangling) errors.push(`JSON-LD tham chiếu ${id} nhưng graph không có nút đó`);

  const recipe = nodeOf("Recipe");
  if (recipe) {
    // Google Recipe: thiếu bất kỳ trường nào dưới đây là mất quyền hiển thị
    // rich result, và cũng là mất chính thông tin người đọc tìm.
    const required = ["recipeIngredient", "recipeInstructions", "prepTime", "cookTime", "recipeYield"];
    const missing = required.filter((field) => {
      const value = recipe[field];
      return value === undefined || (Array.isArray(value) && value.length === 0);
    });
    if (missing.length) errors.push(`Recipe thiếu ${missing.join(", ")}`);

    // Điểm khai trong schema mà trang không hiện là đánh giá bịa trong mắt
    // Google — lý do phạt thủ công phổ biến nhất của markup công thức. Cả điểm
    // lẫn số lượt phải nằm trong khối tóm tắt của chính phần đánh giá.
    const rating = recipe.aggregateRating as
      | { ratingValue?: number; ratingCount?: number }
      | undefined;
    if (rating) {
      const summary = html.match(/<p[^>]*data-rating-summary[^>]*>([\s\S]*?)<\/p>/)?.[1];
      const shown = summary ? decode(summary.replace(/<[^>]+>/g, "")) : "";
      const value = rating.ratingValue?.toFixed(1).replace(".", ",");
      if (!summary) {
        errors.push("Recipe khai aggregateRating nhưng trang không có khối data-rating-summary");
      } else if (!value || !shown.includes(value) || !shown.includes(`${rating.ratingCount} lượt`)) {
        errors.push(
          `Recipe khai ${rating.ratingValue}/${rating.ratingCount} lượt nhưng trang hiện "${shown.trim()}"`,
        );
      }
    }

    // Ảnh của một bước phải là ảnh người đọc thấy trên trang, và URL của bước
    // phải trỏ tới một id có thật — nếu không thì schema đang mô tả một trang
    // khác. Ảnh có thể đi qua /_next/image, nên so cả dạng đã mã hoá.
    const steps = Array.isArray(recipe.recipeInstructions)
      ? (recipe.recipeInstructions as { name?: string; url?: string; image?: string }[])
      : [];
    for (const step of steps) {
      if (step.image) {
        const path = new URL(step.image).pathname;
        if (!html.includes(path) && !html.includes(encodeURIComponent(decodeURI(path)))) {
          errors.push(`HowToStep "${step.name}" khai ảnh ${path} nhưng trang không hiện ảnh đó`);
        }
      }
      const anchor = step.url?.split("#")[1];
      if (anchor && !html.includes(`id="${anchor}"`)) {
        errors.push(`HowToStep "${step.name}" trỏ tới #${anchor} nhưng trang không có id đó`);
      }
    }

    // Calo khai trong schema mà trang không hiện là markup không khớp nội dung
    // — và với một con số sức khoẻ, là một lời khẳng định người đọc không kiểm
    // được. Con số phải nằm trong chính khối dinh dưỡng, không phải đâu đó
    // trong trang (một số "450" trong bài viết không chứng minh gì).
    const nutrition = recipe.nutrition as { calories?: string } | undefined;
    if (nutrition) {
      const kcal = nutrition.calories?.match(/^(\d+) calories$/)?.[1];
      const block = html.match(/<section[^>]*data-nutrition[^>]*>([\s\S]*?)<\/section>/)?.[1];
      if (!kcal) {
        errors.push(`Recipe.nutrition.calories sai dạng "${nutrition.calories}"`);
      } else if (!block) {
        errors.push("Recipe khai nutrition nhưng trang không có khối data-nutrition");
      } else {
        const shown = decode(block.replace(/<[^>]+>/g, " ")).replace(/[.\s]/g, "");
        if (!shown.includes(kcal)) {
          errors.push(`Recipe khai ${kcal} kcal nhưng khối dinh dưỡng không hiện con số đó`);
        }
      }
    }
  }

  // Một FAQPage mô tả nội dung không có trên trang là schema rỗng — Google gọi
  // đây là markup không khớp nội dung hiển thị, và phạt được. Không đếm thẻ
  // (thanh thông số cũng dùng <dt>) mà tìm chính chữ của từng câu hỏi và câu
  // trả lời trong HTML đã render.
  const faq = nodeOf("FAQPage");
  if (faq) {
    const questions = Array.isArray(faq.mainEntity)
      ? (faq.mainEntity as { name?: string; acceptedAnswer?: { text?: string } }[])
      : [];
    if (questions.length === 0) {
      errors.push("FAQPage không có Question nào");
    } else {
      const text = decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
      for (const question of questions) {
        const missing = [question.name, question.acceptedAnswer?.text].find(
          (value) => !value || !text.includes(value.replace(/\s+/g, " ")),
        );
        if (missing !== undefined) {
          errors.push(`FAQPage khai "${question.name}" nhưng trang không render ra chữ đó`);
          break;
        }
      }
    }
  }

  return errors;
}

/** `.next/server/app/a/b.html` → `/a/b/`, đúng dạng URL có `/` cuối của site. */
function routeOf(file: string): string {
  const rel = path.relative(ROOT, file).replace(/\.html$/, "");
  return rel === "index" ? "/" : `/${rel}/`;
}

/**
 * Sitemap phải khớp đúng tập trang đã dựng: thiếu một trang là trang đó chỉ còn
 * trông vào liên kết nội bộ để được tìm thấy; thừa một URL là gửi Google tới
 * một 404 hoặc một redirect. Mọi `lastmod` phải có múi giờ (W3C Datetime) và
 * mọi ảnh khai báo phải có file thật trong `public/`.
 */
function checkSitemap(files: string[]): string[] {
  const file = path.join(ROOT, "sitemap.xml.body");
  if (!fs.existsSync(file)) return ["không tìm thấy sitemap.xml đã dựng"];
  const xml = fs.readFileSync(file, "utf8");
  const errors: string[] = [];

  const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    decodeURI(new URL(decode(m[1])).pathname),
  );
  const pages = files
    .filter((f) => !path.basename(f).startsWith("_"))
    .map(routeOf);

  const seen = new Set<string>();
  for (const url of listed) {
    if (seen.has(url)) errors.push(`${url} xuất hiện hơn một lần`);
    seen.add(url);
    if (!pages.includes(url)) errors.push(`${url} có trong sitemap nhưng không phải trang đã dựng`);
  }
  for (const url of pages) {
    if (!seen.has(url)) errors.push(`${url} thiếu trong sitemap`);
  }

  for (const [, value] of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
    if (/T/.test(value) && !/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
      errors.push(`lastmod ${value} không có múi giờ`);
    }
  }

  for (const [, src] of xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)) {
    const local = path.join("public", decodeURI(new URL(decode(src)).pathname));
    if (!fs.existsSync(local)) errors.push(`ảnh ${src} không có trong public/`);
  }

  return errors;
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`Chưa có ${ROOT}. Chạy \`npm run build\` trước.`);
    process.exit(1);
  }

  // `_global-error` là trang dự phòng của Next, không đi qua layout của mình
  // và không bao giờ được index — nó không phải một trang của site.
  const files = walk(ROOT)
    .filter((file) => path.basename(file) !== "_global-error.html")
    .sort();
  let failed = 0;

  for (const file of files) {
    const errors = checkPage(file, fs.readFileSync(file, "utf8"));
    if (errors.length === 0) continue;
    failed++;
    console.error(`\n✗ /${path.relative(ROOT, file).replace(/\.html$/, "")}`);
    for (const error of errors) console.error(`  · ${error}`);
  }

  const sitemapErrors = checkSitemap(files);
  if (sitemapErrors.length) {
    failed++;
    console.error("\n✗ /sitemap.xml");
    for (const error of sitemapErrors) console.error(`  · ${error}`);
  }

  console.log(
    failed === 0
      ? `\n✓ ${files.length} trang: đúng một h1, không nhảy cấp tiêu đề, đủ landmark và thẻ SEO.`
      : `\n${failed}/${files.length} trang có vấn đề.`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
