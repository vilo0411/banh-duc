import type { Doc } from "./content";

/**
 * Giá trị dinh dưỡng ước tính cho mỗi phần ăn.
 *
 * Không bài nào mang số liệu dinh dưỡng, và cẩm nang "bánh đúc là gì" nói thẳng
 * rằng một con số calo duy nhất cho mọi loại bánh đúc là đoán. Nên ở đây không
 * có con số nào được viết tay: mỗi bài liệt kê từng dòng nguyên liệu của chính
 * nó, mỗi dòng trỏ vào một thực phẩm trong bảng thành phần có mã nguồn, kèm số
 * gram suy ra từ đúng chữ trong dòng đó. Tổng chia cho khẩu phần bài ghi.
 *
 * Dữ liệu tay, nằm ngoài `content/` để `npm run migrate` không xoá — cùng loại
 * với `lib/editorial.ts`. Khoá là nguyên văn dòng nguyên liệu: lần migrate sau
 * đổi chữ một dòng thì bản dựng dừng lại thay vì lặng lẽ tính sai.
 *
 * Chỉ bài có gần như toàn bộ nguyên liệu mang calo được ghi bằng gram/ml mới có
 * mặt ở đây. Bài ghi "2 bìa đậu phụ", "1 ít", "theo khẩu vị" cho phần chính thì
 * không — bảng số sai còn tệ hơn không có bảng.
 */

/** Giá trị trong 100 g phần ăn được. */
type Food = {
  name: string;
  source: "vn" | "usda";
  /** Mã thực phẩm trong bảng nguồn. */
  code: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

export const SOURCES = {
  vn: {
    name: "Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng, Bộ Y tế, 2007)",
    url: "https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf",
  },
  usda: {
    name: "USDA FoodData Central",
    url: "https://fdc.nal.usda.gov/",
  },
} as const;

/**
 * Ưu tiên bảng Việt Nam: nó đo đúng thứ người Việt mua ngoài chợ (bột gạo tẻ,
 * mộc nhĩ, tép gạo). USDA chỉ lấp chỗ bảng Việt Nam không có.
 */
const FOODS = {
  botGaoTe: { name: "Bột gạo tẻ", source: "vn", code: "1017", kcal: 359, protein: 6.6, fat: 0.4, carbs: 82.2 },
  gaoTe: { name: "Gạo tẻ máy", source: "vn", code: "1004", kcal: 344, protein: 7.9, fat: 1.0, carbs: 75.9 },
  // Bảng không có mục "bột năng"; trân châu sắn là cùng một thứ tinh bột sắn
  // đã vo viên, số liệu gần như tinh bột thuần.
  botNang: { name: "Tinh bột sắn (trân châu sắn)", source: "vn", code: "2026", kcal: 341, protein: 1.0, fat: 0, carbs: 84.3 },
  botDong: { name: "Bột dong lọc", source: "vn", code: "2016", kcal: 341, protein: 0.6, fat: 0, carbs: 84.7 },
  botKhoaiTay: { name: "Bột khoai tây lọc", source: "vn", code: "2019", kcal: 345, protein: 1.0, fat: 0.3, carbs: 84.4 },
  dauAn: { name: "Dầu thực vật", source: "vn", code: "6002", kcal: 897, protein: 0, fat: 99.7, carbs: 0 },
  mocNhi: { name: "Mộc nhĩ khô", source: "vn", code: "4121", kcal: 304, protein: 10.6, fat: 0.2, carbs: 65.0 },
  hanhCu: { name: "Hành củ tươi", source: "vn", code: "4037", kcal: 26, protein: 1.3, fat: 0.4, carbs: 4.4 },
  hanhTay: { name: "Hành tây", source: "vn", code: "4039", kcal: 41, protein: 1.8, fat: 0.1, carbs: 8.2 },
  // "Thịt heo xay" ngoài chợ là thịt vai/nạc dăm xay lẫn mỡ — gần mục nửa nạc
  // nửa mỡ hơn là nạc thuần.
  thitXay: { name: "Thịt lợn nửa nạc nửa mỡ", source: "vn", code: "7018", kcal: 260, protein: 16.5, fat: 21.5, carbs: 0 },
  thitNac: { name: "Thịt lợn nạc", source: "vn", code: "7017", kcal: 139, protein: 19.0, fat: 7.0, carbs: 0 },
  tomKho: { name: "Tôm khô", source: "vn", code: "8053", kcal: 347, protein: 75.6, fat: 3.8, carbs: 2.5 },
  tep: { name: "Tép gạo", source: "vn", code: "8049", kcal: 58, protein: 11.7, fat: 1.2, carbs: 0 },
  khoaiMon: { name: "Khoai môn", source: "vn", code: "2010", kcal: 109, protein: 1.5, fat: 0.2, carbs: 25.2 },
  cuDau: { name: "Củ đậu", source: "vn", code: "4023", kcal: 28, protein: 1.0, fat: 0, carbs: 6.0 },
  dauXanh: { name: "Đậu xanh hạt khô", source: "vn", code: "3010", kcal: 328, protein: 23.4, fat: 2.4, carbs: 53.1 },
  duongCat: { name: "Đường cát", source: "vn", code: "12013", kcal: 390, protein: 0, fat: 0, carbs: 97.4 },
  duongKinh: { name: "Đường kính", source: "vn", code: "12014", kcal: 397, protein: 0, fat: 0, carbs: 99.3 },
  nuocMam: { name: "Nước mắm cá loại I", source: "vn", code: "13015", kcal: 28, protein: 7.1, fat: 0, carbs: 0 },
  nuocCotDua: { name: "Nước cốt dừa", source: "usda", code: "170172", kcal: 230, protein: 2.29, fat: 23.84, carbs: 5.54 },
  // Cả hai bảng đều không có đường thốt nốt; đường nâu là thứ gần nhất —
  // cùng là đường mía/cọ chưa tinh luyện hết, chênh nhau vài phần trăm.
  duongThotNot: { name: "Đường thốt nốt (theo số của đường nâu)", source: "usda", code: "168833", kcal: 380, protein: 0.12, fat: 0, carbs: 98.09 },
} satisfies Record<string, Food>;

type FoodKey = keyof typeof FOODS;

/** Thìa canh = 15 ml, thìa cà phê = 5 ml; dầu nặng 0,91 g/ml. */
const OIL_TBSP = 13.7;

/**
 * Một dòng nguyên liệu được tính vào đâu.
 *
 * - `base`  — phần bánh và nhân, thứ ai ăn một phần cũng ăn.
 * - `extra` — thứ rưới, chấm, rắc khi ăn, mỗi người dùng một ít: tính riêng,
 *             hiện như phần cộng thêm nếu dùng hết, không gộp vào con số chính.
 * - `skip`  — không tính, kèm lý do hiện cho người đọc ở phần "Cách tính".
 */
type Line =
  | { food: FoodKey; grams: number; part?: "base" | "extra" }
  | { skip: string };

type Entry = {
  /** Mỗi dòng trong `recipe.ingredients`, nguyên văn. */
  lines: Record<string, Line>;
  /** Tên phần `extra`, cho câu "chưa gồm …". */
  extra?: string;
  /** Ghi chú về giả định đáng kể nhất, hiện dưới bảng. */
  note?: string;
};

const NEGLIGIBLE = "gia vị, lượng nhỏ";
const WATER = "nước, không có năng lượng";

const entries: Record<string, Entry> = {
  "cach-lam-banh-duc-nong": {
    extra: "nước mắm chua ngọt",
    lines: {
      "130g bột gạo tẻ hoặc gạo khô xốp": { food: "botGaoTe", grams: 130 },
      "20g tinh bột củ dong": { food: "botDong", grams: 20 },
      "800ml nước": { skip: WATER },
      "1/4 thìa cà phê muối": { skip: NEGLIGIBLE },
      "1 thìa cà phê bột nêm gà": { skip: NEGLIGIBLE },
      "1 thìa canh dầu ăn": { food: "dauAn", grams: OIL_TBSP },
      "15g nấm mèo": { food: "mocNhi", grams: 15 },
      "2 thìa canh dầu ăn": { food: "dauAn", grams: 2 * OIL_TBSP },
      "20g hành tím": { food: "hanhCu", grams: 20 },
      "400g thịt heo xay": { food: "thitXay", grams: 400 },
      "100ml nước": { skip: WATER },
      "10g dầu hào": { skip: NEGLIGIBLE },
      "1/2 thìa cà phê tiêu": { skip: NEGLIGIBLE },
      "300ml nước": { skip: WATER },
      "30g đường": { food: "duongKinh", grams: 30, part: "extra" },
      "35g nước mắm": { food: "nuocMam", grams: 35, part: "extra" },
      "12g giấm": { skip: NEGLIGIBLE },
      "Ngò": { skip: "rau thơm rắc mặt, không ghi lượng" },
      "Hành phi": { skip: "rắc mặt, không ghi lượng" },
    },
  },

  "cach-lam-banh-duc-tau": {
    extra: "nước mắm chua ngọt",
    note: "Tinh bột mì (bột tàn mì) tính theo số của bột khoai tây lọc — cả hai là tinh bột gần như thuần.",
    lines: {
      "225g bột gạo": { food: "botGaoTe", grams: 225 },
      "25g tinh bột mì": { food: "botKhoaiTay", grams: 25 },
      "50g tinh bột khoai tây": { food: "botKhoaiTay", grams: 50 },
      "5g muối": { skip: NEGLIGIBLE },
      "1200ml nước": { skip: WATER },
      "12g dầu": { food: "dauAn", grams: 12 },
      "Khuôn đường kính 22cm": { skip: "dụng cụ" },
      "10g nấm mèo": { food: "mocNhi", grams: 10 },
      "40g tôm khô": { food: "tomKho", grams: 40 },
      "400g thịt heo xay": { food: "thitXay", grams: 400 },
      "1/4 thìa cà phê muối": { skip: NEGLIGIBLE },
      "1 thìa cà phê đường": { food: "duongKinh", grams: 4 },
      "1 thìa cà phê bột nêm gà": { skip: NEGLIGIBLE },
      "1/3 thìa cà phê bột nổi": { skip: NEGLIGIBLE },
      "100ml nước": { skip: WATER },
      "400g củ hành tây": { food: "hanhTay", grams: 400 },
      "1 thìa canh dầu": { food: "dauAn", grams: OIL_TBSP },
      "4 thìa canh dầu": { skip: "dầu phi hành rắc mặt, phần lớn còn lại trong chảo" },
      "100g hành tím": { food: "hanhCu", grams: 100 },
      "1/2 thìa cà phê tiêu": { skip: NEGLIGIBLE },
      "Hành phi": { skip: "rắc mặt, không ghi lượng" },
      "Ngò": { skip: "rau thơm rắc mặt, không ghi lượng" },
      "90g đường": { food: "duongKinh", grams: 90, part: "extra" },
      "400ml nước sôi": { skip: WATER },
      "100g nước mắm": { food: "nuocMam", grams: 100, part: "extra" },
      "25g giấm": { skip: NEGLIGIBLE },
      "1 tép tỏi": { skip: NEGLIGIBLE },
    },
  },

  "banh-duc-la-cam": {
    extra: "nước cốt dừa và nước đường thốt nốt rưới khi ăn",
    lines: {
      "Bột gạo: 200g": { food: "botGaoTe", grams: 200 },
      "Bột năng: 200g": { food: "botNang", grams: 200 },
      "Nước vôi trong: 800ml": { skip: WATER },
      "Nước lá cẩm: 150ml": { skip: "nước lá để tạo màu, năng lượng không đáng kể" },
      "Nước cốt dừa: 200ml": { food: "nuocCotDua", grams: 200, part: "extra" },
      "Vani: 2 ống": { skip: NEGLIGIBLE },
      "Đường cát trắng: 200g": { food: "duongCat", grams: 200 },
      "Đường thốt nốt: 200g": { food: "duongThotNot", grams: 200, part: "extra" },
      "Muối: 0.5 muỗng cà phê": { skip: NEGLIGIBLE },
    },
  },

  "banh-duc-khoai-mon": {
    note: "“1 củ sắn (300g)” trong phần nhân tính là củ đậu (miền Nam gọi là củ sắn), không phải sắn mì. Bài không ghi lượng dầu xào nhân nên chưa tính dầu.",
    lines: {
      "300g khoai môn (đã sơ chế)": { food: "khoaiMon", grams: 300 },
      "300ml nước nấu khoai môn": { skip: WATER },
      "300g bột gạo": { food: "botGaoTe", grams: 300 },
      "100g bột năng": { food: "botNang", grams: 100 },
      "500ml nước": { skip: WATER },
      "300ml nước cốt dừa": { food: "nuocCotDua", grams: 300 },
      "1 muỗng cafe muối": { skip: NEGLIGIBLE },
      "200g tép": { food: "tep", grams: 200 },
      "200g thịt nạc": { food: "thitNac", grams: 200 },
      "1 muỗng tôm khô": { skip: "không ghi gram, lượng nhỏ" },
      "1 củ sắn (300g)": { food: "cuDau", grams: 300 },
      "Hành, tỏi, ngò thơm": { skip: NEGLIGIBLE },
      "Gia vị nêm": { skip: NEGLIGIBLE },
      "Dầu hào": { skip: NEGLIGIBLE },
    },
  },

  "cach-lam-banh-duc-sot": {
    lines: {
      "Gạo tẻ: 200g": { food: "gaoTe", grams: 200 },
      "Nước: 500ml": { skip: WATER },
      "Bột năng: 50g": { food: "botNang", grams: 50 },
      "Nước vôi: 100ml (nước vôi trong)": { skip: WATER },
      "Muối: 1/2 thìa cà phê": { skip: NEGLIGIBLE },
      "Dầu ăn: 1 thìa canh": { food: "dauAn", grams: OIL_TBSP },
      "Rau ngót hoặc rau cải: 50g (giã nhuyễn để tạo màu)": {
        skip: "chỉ lấy nước để tạo màu",
      },
      "Đậu xanh: 100g (hấp chín và đánh tơi)": { food: "dauXanh", grams: 100 },
      "Tóp mỡ: 50g (chiên giòn)": {
        skip: "tuỳ chọn, và cả hai bảng đều không có số liệu tóp mỡ",
      },
      "Hành phi: 1 thìa canh": { skip: "tuỳ chọn, rắc mặt" },
    },
  },
};

export type Macros = { kcal: number; protein: number; fat: number; carbs: number };

export type NutritionRow = {
  line: string;
  food?: Food;
  grams?: number;
  part?: "base" | "extra";
  kcal?: number;
  skip?: string;
};

export type Nutrition = {
  /** Số phần, nhỏ → lớn. Bằng nhau khi bài ghi một con số. */
  servings: [number, number];
  /** Toàn bộ công thức, phần chính. */
  total: Macros;
  /** Toàn bộ phần rưới/chấm, nếu dùng hết. */
  extraTotal?: Macros;
  extra?: string;
  note?: string;
  rows: NutritionRow[];
  sources: (keyof typeof SOURCES)[];
};

const ZERO: Macros = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

function add(sum: Macros, food: Food, grams: number): Macros {
  const k = grams / 100;
  return {
    kcal: sum.kcal + food.kcal * k,
    protein: sum.protein + food.protein * k,
    fat: sum.fat + food.fat * k,
    carbs: sum.carbs + food.carbs * k,
  };
}

/** "4 – 6 người ăn" → [4, 6]; "4 người ăn" → [4, 4]. */
function parseServings(yieldText?: string): [number, number] | undefined {
  const numbers = (yieldText?.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0);
  if (!numbers.length) return undefined;
  return [Math.min(...numbers), Math.max(...numbers)];
}

export function getNutrition(doc: Doc): Nutrition | undefined {
  const entry = entries[doc.slug];
  const recipe = doc.recipe;
  if (!entry || !recipe) return undefined;

  const servings = parseServings(recipe.yield);
  if (!servings) throw new Error(`nutrition: ${doc.slug} không có khẩu phần để chia`);

  // Mọi dòng phải được xét, và mọi khoá phải còn khớp một dòng có thật: bài bị
  // migrate lại với chữ khác thì dừng bản dựng, không tính trên dữ liệu cũ.
  const unknown = recipe.ingredients.filter((line) => !(line in entry.lines));
  const stale = Object.keys(entry.lines).filter((line) => !recipe.ingredients.includes(line));
  if (unknown.length || stale.length) {
    throw new Error(
      `nutrition: ${doc.slug} lệch với nguyên liệu của bài` +
        (unknown.length ? `\n  chưa xét: ${unknown.join(" | ")}` : "") +
        (stale.length ? `\n  không còn trong bài: ${stale.join(" | ")}` : ""),
    );
  }

  let total = ZERO;
  let extraTotal = ZERO;
  const sources = new Set<keyof typeof SOURCES>();

  const rows: NutritionRow[] = recipe.ingredients.map((line) => {
    const item = entry.lines[line];
    if ("skip" in item) return { line, skip: item.skip };
    const food: Food = FOODS[item.food];
    const part = item.part ?? "base";
    sources.add(food.source);
    if (part === "extra") extraTotal = add(extraTotal, food, item.grams);
    else total = add(total, food, item.grams);
    return { line, food, grams: item.grams, part, kcal: (food.kcal * item.grams) / 100 };
  });

  return {
    servings,
    total,
    extraTotal: entry.extra ? extraTotal : undefined,
    extra: entry.extra,
    note: entry.note,
    rows,
    sources: [...sources].sort(),
  };
}

/** Chia cho một phần. Làm tròn thô để không giả vờ chính xác hơn dữ liệu. */
export function perServing(macros: Macros, servings: number): Macros {
  return {
    kcal: Math.round(macros.kcal / servings / 10) * 10,
    protein: Math.round(macros.protein / servings),
    fat: Math.round(macros.fat / servings),
    carbs: Math.round(macros.carbs / servings),
  };
}
