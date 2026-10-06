/**
 * "bánh đúc" và "banh duc" phải khớp nhau: không ai gõ dấu khi đang vội.
 */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "").replace(/đ/g, "d");
}

/**
 * Bộ so khớp cho ô tìm kiếm công thức, dùng chung cho trình duyệt và cho bộ
 * đếm nguyên liệu chạy lúc build — nhãn "Lạc · 3" trên trang chủ phải dẫn tới
 * đúng 3 kết quả, nên hai bên buộc phải khớp chữ y hệt nhau.
 *
 * Khớp phải bắt đầu ở đầu một tiếng, không phải ở giữa. Bỏ dấu xong thì tiếng
 * Việt còn rất ít chữ cái, và "ngô" thành "ngo" — nằm lọt trong "ngon",
 * "ngoài", "nguội". So khớp lỏng theo kiểu chứa chuỗi làm nhãn "Ngô" ăn 21
 * trên 23 công thức, gần như bài nào cũng khớp và nhãn mất sạch ý nghĩa.
 */
export function matcher(query: string): (text: string) => boolean {
  const typed = query.trim().toLowerCase();
  if (!typed) return () => true;

  // Người gõ dấu là người biết mình tìm gì, nên giữ nguyên dấu của họ. Chỉ khi
  // ô tìm kiếm không có dấu nào thì mới bỏ dấu cả hai bên — lúc đó "banh duc"
  // mới ra "bánh đúc". Nếu bỏ dấu cả khi người ta đã gõ dấu thì "ngô" tụt
  // xuống thành "ngo" và khớp luôn với "ngon", "ngoài", "nguội": nhãn "Ngô"
  // ăn 21 trên 23 công thức và mất sạch ý nghĩa.
  const marked = fold(typed) !== typed;
  // Cùng một chữ có dấu viết được bằng hai chuỗi Unicode khác nhau; chuẩn hoá
  // về NFC cả hai phía, nếu không thì "ô" trong câu hỏi không khớp "ô" trong
  // bài dù nhìn y hệt nhau.
  const needle = marked ? typed.normalize("NFC") : fold(typed);
  const prepare = marked ? (text: string) => text.toLowerCase().normalize("NFC") : fold;

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Khớp phải bắt đầu ở đầu một tiếng: "lạc" là nguyên liệu, "lạc" trong
  // "thất lạc" thì không — và quan trọng hơn, nó chặn các mẩu chữ nằm lọt
  // giữa từ khác.
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}`, "u");
  return (text) => re.test(prepare(text));
}
