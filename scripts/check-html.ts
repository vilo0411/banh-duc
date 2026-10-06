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

  console.log(
    failed === 0
      ? `\n✓ ${files.length} trang: đúng một h1, không nhảy cấp tiêu đề, đủ landmark và thẻ SEO.`
      : `\n${failed}/${files.length} trang có vấn đề.`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
