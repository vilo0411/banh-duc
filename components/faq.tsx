/**
 * Khối câu hỏi thường gặp cuối bài.
 *
 * `dl`/`dt`/`dd` là thẻ đúng nghĩa cho một tập cặp hỏi–đáp: mỗi `dt` là một
 * thuật ngữ được hỏi, mỗi `dd` là lời giải cho nó. Đây cũng là thứ mà luật
 * FAQPage trong `scripts/check-html.ts` đếm — schema khai bao nhiêu câu thì
 * trang phải render ra bấy nhiêu `dt`, để không bao giờ có chuyện markup mô tả
 * nội dung không tồn tại.
 *
 * Không dùng `details`/`summary`: nội dung gập lại vẫn được index, nhưng câu
 * trả lời ở đây ngắn, và một danh sách mở sẵn thì đọc nhanh hơn là bốn lần bấm.
 */
export function Faq({
  items,
  /** Xem `PostRow` — cấp tiêu đề đi theo vị trí trong trang, không theo cỡ chữ. */
  level = 2,
}: {
  items: { q: string; a: string }[];
  level?: 2 | 3;
}) {
  if (items.length === 0) return null;
  const Heading = level === 2 ? "h2" : "h3";

  return (
    <section aria-labelledby="cau-hoi-thuong-gap" className="mt-10">
      <Heading id="cau-hoi-thuong-gap" className="section-title border-b border-line pb-2">
        Câu hỏi thường gặp
      </Heading>

      <dl className="divide-y divide-line">
        {items.map((item) => (
          <div key={item.q} className="py-4">
            <dt className="text-base font-bold">{item.q}</dt>
            <dd className="mt-1.5 text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
