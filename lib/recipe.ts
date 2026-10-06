import type { Recipe } from "./content";

/* --- Durations -----------------------------------------------------------
   Frontmatter stores ISO 8601 because that is what schema.org requires. The
   page has to show "1 giờ 30 phút", so every duration round-trips through
   minutes. */

export function parseDuration(iso?: string): number | undefined {
  if (!iso) return undefined;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(iso.trim());
  if (!match) return undefined;
  const minutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
  return minutes > 0 ? minutes : undefined;
}

export function formatDuration(minutes?: number): string | undefined {
  if (!minutes) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} phút`;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}

export function toDuration(minutes?: number): string | undefined {
  if (!minutes) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}`;
}

export type RecipeTimes = {
  prep?: number;
  cook?: number;
  /** Declared total, or prep + cook when the author only gave the parts. */
  total?: number;
};

export function recipeTimes(recipe?: Recipe): RecipeTimes {
  const prep = parseDuration(recipe?.prepTime);
  const cook = parseDuration(recipe?.cookTime);
  const declared = parseDuration(recipe?.totalTime);
  const summed = prep || cook ? (prep ?? 0) + (cook ?? 0) : undefined;
  return { prep, cook, total: declared ?? summed };
}

/* --- Scaling -------------------------------------------------------------
   Halving or doubling a recipe means rewriting the amounts, and the amounts
   live inside free Vietnamese text ("1/2 muỗng cà phê muối", "300g bột gạo
   tẻ"). Rather than guess at every number in a sentence, only numbers that
   sit directly in front of a measuring word are scaled — those are the ones
   that are certainly quantities. */

// Longest first: "muỗng cà phê" must win over "muỗng".
const UNITS = [
  "muỗng cà phê",
  "muỗng canh",
  "muỗng cafe",
  "muỗng",
  "thìa cà phê",
  "thìa canh",
  "thìa",
  "gram",
  "gam",
  "gr",
  "kg",
  "lạng",
  "ml",
  "lít",
  "lit",
  "chén",
  "bát",
  "cốc",
  "ly",
  "củ",
  "quả",
  "trái",
  "tép",
  "nhánh",
  "bó",
  "lá",
  "cái",
  "miếng",
  "hộp",
  "gói",
  "phần",
  "g",
  "l",
].join("|");

const NUMBER = String.raw`\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?`;
const AMOUNT = new RegExp(
  String.raw`(${NUMBER})(\s*(?:[-–—]|đến|tới)\s*(${NUMBER}))?(\s*)(${UNITS})\b`,
  "gi",
);

function parseNumber(raw: string): number {
  const cleaned = raw.replace(/\s+/g, "");
  const fraction = /^(\d+(?:[.,]\d+)?)\/(\d+)$/.exec(cleaned);
  if (fraction) {
    return Number(fraction[1].replace(",", ".")) / Number(fraction[2]);
  }
  return Number(cleaned.replace(",", "."));
}

// Cooks read "1/2 muỗng", not "0.5 muỗng".
const FRACTIONS: [number, string][] = [
  [0.25, "1/4"],
  [1 / 3, "1/3"],
  [0.5, "1/2"],
  [2 / 3, "2/3"],
  [0.75, "3/4"],
];

// Grams and millilitres are measured on a scale, and "0,5 lít" is how a scale
// reads. Spoons, cups and fruit are counted, and those take fractions.
const METRIC = /^(g|gr|gam|gram|kg|ml|l|lít|lit|lạng)$/i;

function formatNumber(value: number, decimalComma: boolean, fractions = true): string {
  if (Math.abs(value - Math.round(value)) < 0.01) return String(Math.round(value));

  const whole = Math.floor(value);
  const rest = value - whole;
  const fraction = fractions && FRACTIONS.find(([v]) => Math.abs(rest - v) < 0.02);
  if (fraction) return whole ? `${whole} ${fraction[1]}` : fraction[1];

  const rounded = Math.round(value * 10) / 10;
  return decimalComma ? String(rounded).replace(".", ",") : String(rounded);
}

/** Rewrite the measured amounts inside an ingredient line by `factor`. */
export function scaleAmounts(text: string, factor: number): string {
  if (factor === 1) return text;

  let touched = false;
  const scaled = text.replace(
    AMOUNT,
    (_match, from: string, range: string | undefined, to: string, gap: string, unit: string) => {
      touched = true;
      const fractions = !METRIC.test(unit);
      const comma = from.includes(",");
      const head = formatNumber(parseNumber(from) * factor, comma, fractions);
      const tail = range
        ? ` – ${formatNumber(parseNumber(to) * factor, to.includes(","), fractions)}`
        : "";
      return `${head}${tail}${gap}${unit}`;
    },
  );
  if (touched) return scaled;

  // No measuring word anywhere ("3 lạc đỏ"). A leading number is still an
  // amount; a number in the middle of a sentence is not, so stop here.
  return text.replace(new RegExp(String.raw`^(\s*)(${NUMBER})\b`), (_m, space: string, n: string) =>
    `${space}${formatNumber(parseNumber(n) * factor, n.includes(","))}`,
  );
}

/** "3 – 4 người ăn" doubled is "6 – 8 người ăn". */
export function scaleYield(text: string, factor: number): string {
  if (factor === 1) return text;
  return text.replace(new RegExp(NUMBER, "g"), (n) =>
    formatNumber(parseNumber(n) * factor, n.includes(",")),
  );
}

/* --- Ingredient shape ----------------------------------------------------
   Some migrated posts write "Bột năng (50g): giúp bánh dẻo dai." — an amount,
   a name and a note in one line. Splitting off the note keeps the checklist
   scannable without throwing the author's explanation away. */

export type Ingredient = { text: string; note?: string };

export function splitIngredient(line: string): Ingredient {
  const match = /^([^:]{3,60}):\s+(.+)$/.exec(line.trim());
  if (!match) return { text: line.trim() };
  return { text: match[1].trim(), note: match[2].trim() };
}
