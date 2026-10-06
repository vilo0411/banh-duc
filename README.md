# banhduc.vn

Bánh đúc recipe site — Next.js App Router, content as MDX in the repo, no CMS
and no database. Every page is prerendered at build time.

## Chạy dự án

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # kiểm tra trước khi deploy
npm run check      # soát HTML đã dựng (chạy sau build)
```

## Nội dung

Bài viết là file MDX trong `content/`:

- `content/posts/<slug>.mdx` — công thức, hiển thị ở `/<slug>/`
- `content/pages/<slug>.mdx` — trang tĩnh (giới thiệu, liên hệ…)
- `content/pages/home.mdx` — nội dung trang chủ cũ từ WordPress, giữ lại để
  tham khảo (trang chủ hiện dựng từ `app/page.tsx`)

Ảnh nằm trong `public/images/` và được tham chiếu bằng đường dẫn tuyệt đối
(`/images/ten-anh.jpg`). Kích thước ảnh được đọc trực tiếp từ file lúc build
nên không bị nhảy layout khi tải.

### Viết bài mới

Tạo `content/posts/ten-bai.mdx`. Frontmatter tối thiểu:

```yaml
---
title: "Cách làm bánh đúc lá dứa"
description: "Mô tả 150–160 ký tự, dùng làm meta description."
date: "2026-08-13T09:00:00"
updated: "2026-08-13T09:00:00"
image: "/images/banh-duc-la-dua-1.jpg"
imageAlt: "Đĩa bánh đúc lá dứa cắt miếng"
---
```

Bài mới tự động xuất hiện ở trang chủ, `/cong-thuc/`, `sitemap.xml` và RSS.
Không cần đăng ký ở đâu khác.

`/tin-tuc/` (danh sách blog cũ từ WordPress) đã bỏ: nó liệt kê đúng tập bài mà
`/cong-thuc/` liệt kê, nên giờ 301 thẳng về đó. Chạy lại `npm run migrate` sẽ
kéo trang cũ về `content/pages/tin-tuc.mdx`, nhưng nó không được dựng thành
trang — xem `RESERVED` trong `app/[slug]/page.tsx`.

### Nhóm công thức

Hai dòng frontmatter quyết định bài xuất hiện ở trang nhóm nào:

```yaml
group: "Món mặn"    # Món mặn | Món ngọt | Món chay | Nước chấm
region: "Miền Bắc"  # tuỳ chọn: Miền Bắc | Miền Trung | Miền Nam
```

Trang nhóm nằm ở `/cong-thuc/<slug>/` và **chỉ được tạo khi nhóm có từ 3 công
thức trở lên** — dưới ngưỡng đó là trang mỏng, tự cạnh tranh với trang tổng.
Sửa danh sách nhóm và đoạn giới thiệu ở `lib/collections.ts`.

Hai trục giao nhau chứ không lồng nhau: một bài có thể vừa ở "Bánh đúc mặn"
vừa ở "Bánh đúc miền Bắc". Vì vậy:

- URL bài giữ nguyên `/<slug>/`. Phân cấp đi vào breadcrumb: `Trang chủ ›
  Công thức › <nhóm loại món> › Bài` (`primaryCollection()`).
- Trang nhóm chia danh sách theo trục còn lại (`collectionSections()`). Trang
  loại món chia theo vùng, trang vùng chia theo loại món, mỗi mục là một `h2`
  ("Bánh đúc mặn miền Bắc") và các bài bên dưới là `h3`.

### Recipe rich result

Nếu frontmatter có khối `recipe:` (nguyên liệu + các bước) thì bài đó xuất
`Recipe` JSON-LD và đủ điều kiện hiển thị rich result (ảnh, thời gian nấu)
trên Google. Không có thì bài vẫn hợp lệ, chỉ xuất `Article`.

```yaml
recipe:
  prepTime: "PT15M" # ISO 8601
  cookTime: "PT35M"
  yield: "3 – 4 người ăn"
  ingredients:
    - "100 gram bột gạo tẻ"
  steps:
    - name: "Trộn bột"
      text: "Cho bột gạo và bột năng vào tô…"
```

Nguyên liệu và các bước **phải khớp với nội dung hiển thị trong bài** — đó là
điều kiện của Google, và cũng là lý do script bên dưới trích từ chính bài viết
chứ không tự sinh.

## Migrate lại từ WordPress

Chỉ cần khi muốn kéo lại nội dung từ site WordPress cũ. Lệnh này **ghi đè**
toàn bộ `content/`, kể cả sửa tay:

```bash
npm run content        # = migrate rồi extract-recipes
```

- `npm run migrate` — kéo bài + trang qua WP REST API, tải ảnh về
  `public/images/`, chuyển HTML sang Markdown, giữ nguyên slug.
- `npm run extract-recipes` — đọc lại các file MDX, trích nguyên liệu và các
  bước ra frontmatter `recipe:`.
- `npm run classify` — xếp mỗi bài vào `group` và `region`, in ra bảng kèm
  **căn cứ** (những từ trong danh sách nguyên liệu dẫn tới kết luận). Đây là
  bản nháp để soát, không phải phán quyết — sai thì sửa thẳng trong frontmatter.

Thứ tự bắt buộc: `migrate` → `extract-recipes` → `classify`. `migrate` ghi đè
frontmatter, còn `classify` cần `recipe.ingredients` đã có sẵn.

## SEO

Những thứ đã có sẵn, không cần plugin:

| Hạng mục | Ở đâu |
| --- | --- |
| URL giữ nguyên như WordPress (có dấu `/` cuối) | `next.config.ts` |
| Redirect 301 các URL hạ tầng WordPress | `next.config.ts` |
| Redirect 301 trang đính kèm ảnh và shortlink `/?p=` (bảng sinh một lần từ WP: `npx tsx scripts/legacy-redirects.ts`) | `lib/legacy-redirects.json`, `next.config.ts`, `proxy.ts` |
| Title, description, canonical, Open Graph, Twitter card | `pageMetadata()` trong `lib/seo.tsx` |
| Metadata của một bài (ảnh bài, ngày đăng/sửa) | `docMetadata()` trong `lib/seo.tsx` |
| JSON-LD: một `@graph` duy nhất cho mỗi trang | `pageLd()` trong `lib/seo.tsx` |
| `Recipe` / `Article` cho trang bài | `docPageLd()`, `entityNode()` |
| `ItemList` cho trang chủ, trang tổng và trang nhóm | `listPageLd()`, `itemListNode()` |
| `ProfilePage` cho trang tác giả | `profilePageLd()` |
| `FAQPage` + khối hỏi–đáp cuối bài | `faqNode()`, `components/faq.tsx` |
| Description viết tay, `region`, `diet`, FAQ — lớp sửa tay không bị migrate ghi đè | `lib/editorial.ts` |
| Cẩm nang: nội dung chủ đề, không phải danh sách bài | `content/cam-nang/` |
| `sitemap.xml`, `robots.txt` | `app/sitemap.ts`, `app/robots.ts` |
| RSS | `app/feed.xml/route.ts` |
| Mục lục trong bài + liên kết nội bộ cuối bài | `components/toc.tsx`, `lib/content.ts` |
| Trang nhóm (`/cong-thuc/mon-man/`…) | `lib/collections.ts` |
| Soát HTML đã dựng (tiêu đề, landmark, thẻ bắt buộc, độ dài description, tính đầy đủ của `Recipe`, `FAQPage` khớp nội dung) | `scripts/check-html.ts` |

Hai quy tắc đứng sau bảng này, phá là hỏng ngay:

**Mọi trang phải lấy metadata từ `pageMetadata()`.** Next **không** trộn
`openGraph` và `twitter` giữa các segment — trang nào tự khai `openGraph` là
thay sạch khối của layout. Một trang khai riêng `og:title` mà quên `images` sẽ
mất luôn ảnh chia sẻ của cả site, và không có gì báo lỗi. Gom vào một hàm là
cách duy nhất để không trang nào lọt lưới; ảnh mặc định là `/og.png`
(1200×630).

**Mỗi trang phát đúng một khối JSON-LD, và khối đó là một `@graph`.** Các nút
(WebSite, Person, WebPage, BreadcrumbList, ItemList,
Recipe/Article) nối với nhau bằng `@id` thay vì lặp lại nội dung của nhau —
đó là điều kiện để Google gom cả trang về một thực thể duy nhất thay vì đọc ra
mấy mẩu rời không biết có nói về cùng một thứ hay không. Quy ước `@id`: thực
thể toàn site neo ở `/#…`, thực thể của một trang neo ở `<url trang>#…`, và
một `@id` chỉ được định nghĩa đầy đủ ở đúng một chỗ.

**Sửa lỗi của bài migrate ở `lib/editorial.ts`, không ở file MDX.**
`npm run migrate` ghi đè từng file trong `content/posts/` và `content/pages/`,
nên mọi chỉnh tay trong frontmatter biến mất ở lần migrate sau. `lib/editorial.ts`
nằm ngoài `content/` và được `parseFile()` trộn vào lúc đọc: description viết
tay, `region`, `diet`, các trường `recipe` còn thiếu, và toàn bộ FAQ. Chỉ ghi ở
đó những gì bản migrate làm sai hoặc không có — chép lại thứ frontmatter đã
đúng là tạo ra hai nguồn sự thật cho cùng một trường.

Riêng `content/cam-nang/` là nội dung viết tay, không do migrate sinh ra, nên
nó an toàn và là nơi đặt các bài giải thích chủ đề.

### Semantics

HTML ngữ nghĩa ở đây không phải chuyện thẩm mỹ mã nguồn: dàn tiêu đề là thứ
Google đọc để biết bài chia thành mấy phần, và landmark là thứ trình đọc màn
hình dùng để nhảy qua phần lặp lại trên mọi trang. Các bất biến:

| Bất biến | Vì sao |
| --- | --- |
| Mỗi trang đúng **một** `h1`, không nhảy cấp (h2 → h4 là lỗi) | Mất một tầng là mất quan hệ cha–con giữa các mục |
| Con số, nhãn phụ nằm **ngoài** thẻ tiêu đề | `h1` của trang nhóm phải là "Món mặn", không phải "Món mặn12 công thức" |
| Danh sách liên kết nằm trong `ul`/`li`, bọc bởi `nav` có nhãn | Một chuỗi `a` rời không nói được nó là bao nhiêu mục |
| `article` cho một bài, `aside` cho cột phải, `footer` cho khối tác giả cuối bài | Đúng nghĩa của thẻ, và là cách phân biệt nội dung với thứ bao quanh |
| Ô tìm kiếm bọc trong `<search>` | Landmark tìm kiếm, thay cho một `div` có `input` |
| Mục cuối của đường dẫn phân cấp mang `aria-current="page"` | Nói cho trình đọc màn hình biết đang đứng ở đâu |
| Ảnh trang trí để `alt=""`, ảnh mang nội dung phải có `alt` thật | `alt` rỗng là một tuyên bố, không phải một chỗ bỏ trống |

Cấp tiêu đề của một dòng danh sách là **tham số**, không phải hằng số:
`PostRow`/`PostRows` nhận `level` (2 hoặc 3). Danh sách nằm dưới một `h2`
("Mới nhất", "Công thức liên quan") dùng mặc định `3`; danh sách nằm thẳng
dưới `h1` của trang — trang tổng, trang nhóm — phải truyền `level={2}`.

Bài migrate từ WordPress dùng `####` như một nhãn nhỏ ngay dưới `##`. Nó được
vá lúc render bằng rehype plugin `rehypeHeadingLevels` trong
`components/mdx.tsx` chứ không sửa trong file MDX, vì `npm run migrate` ghi đè
toàn bộ `content/`.

Sau khi sửa giao diện, chạy:

```bash
npm run build && npm run check
```

`npm run check` đọc chính HTML đã prerender trong `.next/server/app` — một
`h3` sai cấp chỉ lộ ra sau khi mọi component đã ghép lại, và đó cũng là thứ
duy nhất trình thu thập nhìn thấy. Nó thoát với mã 1 nếu có lỗi, nên dùng
thẳng trong CI được.

## Giao diện

Trang dựng theo lối báo điện tử (tham khảo VnExpress Cooking): nền trắng, một
font sans cho cả trang, một màu xanh cho liên kết và một màu đỏ để đánh dấu
mục. Mật độ đến từ đường kẻ mảnh chứ không từ khoảng trắng.

| Thành phần | Ở đâu |
| --- | --- |
| Bảng màu, kiểu chữ, vạch đỏ đầu mục (`.section-title`) | `app/globals.css` |
| Đầu trang hai tầng: chuyên mục + nhóm công thức | `components/site-header.tsx` |
| Dòng danh sách ảnh-trái/chữ-phải (`PostRow`, `PostRows`) | `components/post-row.tsx` |
| Cột phải dùng chung mọi trang | `components/sidebar.tsx` |
| Đường dẫn phân cấp | `components/breadcrumb.tsx` |
| Khối "Tìm món theo nguyên liệu" ở trang chủ | `lib/ingredients.ts` |
| So khớp có/không dấu cho ô tìm kiếm | `lib/text.ts` |

Nhãn nguyên liệu ở trang chủ trỏ về `/cong-thuc/?q=<tên>`; con số trên nhãn
được đếm bằng đúng bộ so khớp mà ô tìm kiếm dùng, nên nhãn ghi 3 thì bấm vào
ra đúng 3. Nhãn **phải có dấu**: từ khoá không dấu được so khớp lỏng, và
"Cua" sẽ ăn nhầm cả chữ "của".

## Giao diện bếp

Những phần phục vụ người đang đứng nấu, không phải người đang đọc:

| Thành phần | Ở đâu |
| --- | --- |
| Thanh thông số dưới tiêu đề (chuẩn bị / nấu / tổng / độ khó / khẩu phần) | `components/recipe-spec.tsx` |
| Phiếu bếp: nguyên liệu tick được, các bước đánh số, chia khẩu phần ½–3× | `components/recipe-slip.tsx` |
| Đổi số lượng theo khẩu phần (`300g` → `600g`, `1/2 muỗng` → `1 muỗng`) | `lib/recipe.ts` |
| In ra giấy chỉ còn phiếu bếp | `@media print` trong `app/globals.css` |
| Giữ màn hình sáng khi nấu (Wake Lock) | `components/recipe-slip.tsx` |
| Lọc + tìm theo tên và nguyên liệu, không dấu cũng ra | `components/recipe-filter.tsx` |

Phần chia khẩu phần chỉ nhân những con số **đứng ngay trước đơn vị đo** (g, ml,
muỗng, củ, quả…). Số nằm giữa câu văn không bị đụng tới — đó là lý do nó không
làm hỏng những dòng nguyên liệu viết dài dòng.

Đổi tên site, mô tả, menu: `lib/site.ts`.
Đặt `NEXT_PUBLIC_SITE_URL` nếu deploy ở domain khác `https://banhduc.vn`.

## Deploy

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

Sau khi trỏ domain: khai báo lại sitemap trong Google Search Console
(`https://banhduc.vn/sitemap.xml`) và kiểm tra vài URL bằng URL Inspection để
xác nhận Google thấy bản mới.
