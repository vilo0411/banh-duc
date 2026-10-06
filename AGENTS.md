<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Semantics là bắt buộc, không phải điểm cộng

Đây là một trang nội dung sống bằng tìm kiếm: dàn tiêu đề là thứ Google đọc để
biết bài chia thành mấy phần, landmark là thứ trình đọc màn hình dùng để nhảy
qua phần lặp lại. Mọi thay đổi giao diện phải giữ nguyên các bất biến dưới đây.
Giải thích đầy đủ ở phần **SEO → Semantics** trong `README.md`.

## Trước khi viết JSX

- Chọn thẻ theo nghĩa, không theo hình: `article` cho một bài, `aside` cho cột
  phải, `nav` cho một khối liên kết, `footer` cho khối tác giả cuối bài,
  `<search>` cho ô tìm kiếm, `ul`/`li` cho mọi danh sách. `div` chỉ để bố cục.
- Tiêu đề chỉ chứa tiêu đề. Con số đếm, nhãn phụ, badge nằm ngoài `h1`–`h6` —
  chúng đi vào một phần tử anh em trong cùng flex wrapper.
- Cấp tiêu đề đi theo vị trí trong trang, không theo cỡ chữ muốn có. Cỡ chữ là
  việc của class Tailwind. `PostRow`/`PostRows` nhận `level={2 | 3}` — dùng nó
  thay vì để dàn tiêu đề nhảy cấp.
- Ảnh trang trí: `alt=""`. Ảnh mang nội dung: `alt` mô tả thật.

## Trước khi báo là xong

```bash
npm run build && npm run check
```

`npm run check` (`scripts/check-html.ts`) soát HTML **đã dựng**: mỗi trang đúng
một `h1`, không nhảy cấp tiêu đề, đủ `main`/`header`/`footer`/`nav`, `img` có
`alt`, có canonical + `og:image` + meta description, và đúng một khối JSON-LD
dạng `@graph`. Nó thoát với mã 1 khi có lỗi. Không được nới lỏng một luật trong
script để cho một trang đi qua — sửa trang.

Thêm một luật vào script khi phát hiện một lớp lỗi mới, đừng chỉ sửa chỗ hỏng.

## Metadata

Mọi trang lấy metadata từ `pageMetadata()` trong `lib/seo.tsx`, không tự khai
`openGraph` tại chỗ: Next thay sạch khối `openGraph` của layout khi một segment
con khai lại nó, nên một trang quên `images` là mất ảnh chia sẻ mà không có gì
báo lỗi. Mỗi trang phát đúng một khối JSON-LD và khối đó là một `@graph` — xem
`lib/seo.tsx`.

## Nội dung

`npm run migrate` **ghi đè** toàn bộ `content/`. Đừng sửa lỗi HTML của bài
migrate bằng cách sửa file MDX; vá ở tầng render (`components/mdx.tsx`) để lần
migrate sau không xoá mất.
