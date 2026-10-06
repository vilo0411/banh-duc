import { getPosts, type Doc } from "./content";
import { matcher } from "./text";

/**
 * "Tìm món theo nguyên liệu" — lối vào thứ hai của một trang nấu ăn, bên cạnh
 * lối vào theo nhóm món. Người mở tủ lạnh ra và thấy một bịch lạc không đi tìm
 * "bánh đúc miền Bắc", họ đi tìm "lạc".
 *
 * Danh sách dưới đây được chọn tay thay vì rút tự động từ nguyên liệu, vì thứ
 * rút tự động sẽ toàn "muối", "đường", "nước" — có trong mọi công thức nên
 * không chia được cái gì. Đây là những nguyên liệu quyết định ra món.
 *
 * Mỗi nhãn phải mang dấu. Từ khoá không dấu được so khớp lỏng (xem `matcher`),
 * và một nhãn không dấu sẽ ăn nhầm chữ khác: "Cua" khớp luôn với "của", ba
 * trên bốn kết quả là rác — nên nó được viết thành "Riêu cua".
 */
const CANDIDATES = [
  "Lạc",
  "Tôm",
  "Thịt băm",
  "Mộc nhĩ",
  "Nước cốt dừa",
  "Lá dứa",
  "Lá cẩm",
  "Mắm nêm",
  "Mật mía",
  "Khoai môn",
  "Ngô",
  "Riêu cua",
  "Đậu xanh",
  "Hành phi",
  "Nấm",
  "Gạo lứt",
  "Bột năng",
  "Bột gạo",
  "Đu đủ",
  "Nước vôi trong",
];

/** Chuỗi mà ô tìm kiếm ở trang công thức soi vào — tên bài cộng nguyên liệu. */
export function searchHaystack(doc: Doc): string {
  return [doc.title, ...(doc.recipe?.ingredients ?? [])].join(" ");
}

export type IngredientTag = { label: string; query: string; count: number };

/**
 * Một nhãn chỉ đáng tồn tại khi nó chia được tập công thức làm hai phần.
 *
 * Sàn là hai bài: nhãn dẫn tới đúng một bài thì không phải một lối vào, nó chỉ
 * là một cái tên khác của bài đó. Trần là một nửa số bài: bột gạo có trong gần
 * như mọi công thức bánh đúc, bấm vào nó thì được đúng trang danh mục vừa rời
 * đi — đó là "muối" và "đường" ở một cái tên sang hơn.
 */
const FLOOR = 2;
const CEILING = 0.5;

export function ingredientTags(limit = 12): IngredientTag[] {
  const haystacks = getPosts().map(searchHaystack);
  const ceiling = haystacks.length * CEILING;

  return CANDIDATES.map((label) => {
    const matches = matcher(label);
    return { label, query: label, count: haystacks.filter(matches).length };
  })
    .filter((tag) => tag.count >= FLOOR && tag.count <= ceiling)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"))
    .slice(0, limit);
}
