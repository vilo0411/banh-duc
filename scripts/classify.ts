/**
 * Sorts every recipe into a group (mặn / ngọt / chay / nước chấm) and, where
 * the article itself says so, a region.
 *
 * The group is decided from the ingredient list rather than from the title,
 * because the ingredients are the evidence: a recipe with mắm and thịt is a
 * savoury one whatever it is called. Every decision is printed with the words
 * it was based on so a wrong call is easy to spot and fix by hand — the value
 * written to frontmatter is a starting point, not a verdict.
 *
 * The region is read from the title *and* the description, because that is the
 * text a reader and a search engine both see: a group page for "bánh đúc miền
 * Bắc" is only worth having if the recipes on it actually say they are Northern.
 * A guess made from ingredients alone (coconut milk ⇒ Southern) would fill the
 * page with articles that never claim the region, so ingredients never decide it.
 * Where the dish is regional but the prose never spells it out, the call is made
 * by hand in OVERRIDES with the reason written down.
 *
 *   npx tsx scripts/classify.ts
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content/posts");

type Group = "Món mặn" | "Món ngọt" | "Món chay" | "Nước chấm";

// Meat, shrimp and fish sauce settle it on their own: bánh đúc miền Trung has
// coconut milk and sugar in the batter and 200g of dried shrimp on top, and it
// is a savoury dish. Counting keywords would call it sweet.
const SAVOURY_DECISIVE = /thịt|tôm|cua|giò|chả|mắm/i;
const SAVOURY = /thịt|tôm|cua|giò|chả|mắm|nước mắm|hành phi|mộc nhĩ|nấm hương|xúc xích|trứng/i;
const SWEET = /đường|mật mía|mật|nước cốt dừa|lá dứa|lá cẩm|đậu xanh|vừng|mè|dừa nạo/i;
const VEGAN = /chay/i;

// Place names count as a regional claim as much as the region itself does:
// "phiên chợ vùng cao Lào Cai" and "xứ Thanh" name a region without using the
// word. Thanh Hóa is Bắc Trung Bộ — it goes with miền Trung, and the group
// page says so rather than pretending it is deep-Central.
const REGIONS: [RegExp, string][] = [
  [/huế|cố đô/i, "Miền Trung"],
  [/miền trung/i, "Miền Trung"],
  [/thanh hóa|xứ thanh/i, "Miền Trung"],
  [/hà nội|hải phòng|miền bắc|chuẩn vị bắc/i, "Miền Bắc"],
  [/lào cai|vùng cao|tây bắc|đông bắc/i, "Miền Bắc"],
  [/miền nam|sài gòn|nam bộ/i, "Miền Nam"],
];

// Hand calls, applied last. Only for dishes whose region is not in dispute but
// whose prose never names it — not a place to park guesses.
const OVERRIDES: Record<string, { region?: string; why: string }> = {
  // Nước vôi trong + lạc rang + chấm tương là bánh đúc lạc Bắc Bộ; bài viết
  // chỉ ghi "truyền thống" nên regex không bắt được.
  "banh-duc-lac": { region: "Miền Bắc", why: "quyết định tay" },
};

function classify(slug: string, title: string, description: string, ingredients: string[]) {
  const text = ingredients.join(" • ");
  const hits = (re: RegExp) => [...new Set(text.match(new RegExp(re, "gi")) ?? [])];

  const savoury = hits(SAVOURY);
  const sweet = hits(SWEET);

  let group: Group;
  let why: string[];

  if (/nước chấm|nước mắm chua ngọt|pha nước chấm/i.test(title)) {
    group = "Nước chấm";
    why = ["tiêu đề"];
  } else if (VEGAN.test(title)) {
    group = "Món chay";
    why = ["tiêu đề"];
  } else if (SAVOURY_DECISIVE.test(text) || savoury.length > sweet.length) {
    group = "Món mặn";
    why = savoury;
  } else if (sweet.length) {
    group = "Món ngọt";
    why = sweet;
  } else {
    group = "Món mặn";
    why = ["mặc định"];
  }

  // Tiêu đề trước, rồi mô tả — cả hai đều là chữ người đọc thấy.
  const claim = `${title} • ${description}`;
  const matched = REGIONS.find(([re]) => re.test(claim));
  const override = OVERRIDES[slug];

  const region = override?.region ?? matched?.[1];
  const regionWhy = override
    ? override.why
    : matched
      ? (claim.match(matched[0])?.[0] ?? "").toLowerCase()
      : "";

  return { group, why, region, regionWhy };
}

const rows: string[][] = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".mdx"))) {
  const full = path.join(DIR, file);
  const parsed = matter(fs.readFileSync(full, "utf8"));
  const recipe = parsed.data.recipe as { ingredients?: string[] } | undefined;
  if (!recipe?.ingredients?.length) continue;

  const slug = file.replace(".mdx", "");
  const { group, why, region, regionWhy } = classify(
    slug,
    String(parsed.data.title ?? ""),
    String(parsed.data.description ?? ""),
    recipe.ingredients,
  );

  // Written above the recipe block so the file stays readable to edit by hand.
  const raw = fs.readFileSync(full, "utf8");
  const withoutOld = raw.replace(/^(group|region): .*\n/gm, "");
  const updated = withoutOld.replace(
    /^recipe:$/m,
    [`group: "${group}"`, ...(region ? [`region: "${region}"`] : []), "recipe:"].join("\n"),
  );
  fs.writeFileSync(full, updated);

  rows.push([
    slug,
    group,
    region ? `${region} (${regionWhy})` : "—",
    why.slice(0, 4).join(", "),
  ]);
}

const width = (i: number) => Math.max(...rows.map((r) => r[i].length));
for (const row of rows) {
  console.log(
    `${row[0].padEnd(width(0))}  ${row[1].padEnd(width(1))}  ${row[2].padEnd(width(2))}  ${row[3]}`,
  );
}
console.log(`\n${rows.length} bài đã phân loại. Soát lại cột cuối — đó là căn cứ.`);
