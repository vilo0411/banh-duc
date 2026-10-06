import Image from "next/image";
import Link from "next/link";
import { getGuides, getPosts } from "@/lib/content";
import { ingredientTags } from "@/lib/ingredients";
import { PostRow, PostRows } from "@/components/post-row";
import { Sidebar } from "@/components/sidebar";
import { recipeTimes } from "@/lib/recipe";
import { site } from "@/lib/site";
import { ID, JsonLdScript, listPageLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: site.title,
  description: site.description,
  url: "/",
});

export default function HomePage() {
  const posts = getPosts();
  const [featured, ...rest] = posts;
  const beside = rest.slice(0, 5);
  // Trang chủ chỉ trích một lát mỏng: nếu nó đổ hết danh mục ra thì nó chính là
  // trang /cong-thuc/ và người đọc không có lý do gì để đi tiếp. Danh sách đầy
  // đủ — kèm ô tìm và bộ lọc — sống ở đó.
  const list = rest.slice(5, 11);
  const tags = ingredientTags();
  const guides = getGuides();

  // ItemList phải kể đúng những gì trang này thật sự dẫn ra, không phải cả kho.
  const shown = posts.slice(0, 1 + beside.length + list.length);

  // "Tối nay nấu được gì" là câu một trang công thức bị hỏi nhiều nhất, nên
  // các công thức ngắn nhất được xếp riêng thay vì chìm theo ngày đăng.
  const quick = posts
    .map((post) => ({ post, minutes: recipeTimes(post.recipe).total }))
    .filter((item) => Boolean(item.minutes))
    .sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0))
    .slice(0, 5)
    .map((item) => item.post);

  return (
    <>
      {/* Trang chủ là gốc của cả graph: nó vừa là danh sách công thức, vừa là
          trang nói về chính tổ chức đứng sau site. Mọi trang khác neo `@id`
          của website và tổ chức về đúng hai nút được định nghĩa từ đây. */}
      <JsonLdScript
        data={listPageLd({
          url: "/",
          name: site.title,
          description: site.description,
          docs: shown,
          about: { "@id": ID.organization },
        })}
      />

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Trang chủ của một trang tin không có tiêu đề lớn nào của riêng nó —
            bài dẫn đầu chiếm chỗ đó. Nhưng trang vẫn cần một h1 nói nó là trang
            gì, nên h1 tồn tại cho trình đọc màn hình và cho công cụ tìm kiếm. */}
        <h1 className="sr-only">{site.title}</h1>

        {/* Bài dẫn đầu: một ảnh lớn, một tiêu đề lớn, và bốn bài kế bên. Đây là
            khối duy nhất trên trang được phép chiếm chỗ; mọi thứ dưới nó chạy
            theo mật độ của danh sách. */}
        {featured && (
          <section className="grid gap-6 border-b border-line pb-6 lg:grid-cols-[1.55fr_1fr] lg:gap-8">
            <article className="group">
              <Link href={featured.url} className="block">
                {featured.image && (
                  <div className="relative aspect-[16/9] overflow-hidden bg-surface-am">
                    <Image
                      src={featured.image}
                      alt={featured.imageAlt || featured.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 680px"
                      priority
                      className="object-cover"
                    />
                  </div>
                )}
                <h2 className="headline mt-3 text-2xl transition-colors group-hover:text-lam sm:text-3xl">
                  {featured.title}
                </h2>
              </Link>
              {featured.description && (
                <p className="mt-2 line-clamp-3 text-muted">{featured.description}</p>
              )}
              <Link
                href={featured.url}
                className="mt-3 inline-block text-sm font-semibold text-lam hover:underline"
              >
                Xem cách nấu →
              </Link>
            </article>

            {beside.length > 0 && (
              <div>
                <h2 className="section-title border-b border-line pb-2 text-base">Mới nhất</h2>
                <ul className="divide-y divide-line">
                  {beside.map((post) => (
                    <li key={post.slug} className="py-3 first:pt-3">
                      <PostRow doc={post} size="sm" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Không phải ai vào đây cũng đã chọn xong món. Người gõ "bánh đúc là
            gì" hay "bánh đúc miền Bắc khác miền Nam thế nào" không tìm một
            công thức nào cả — và một trang chỉ toàn danh sách bài thì không có
            gì trả lời họ. Ba trang cẩm nang là chỗ đó, và đây là cửa vào. */}
        {guides.length > 0 && (
          <section className="border-b border-line py-6">
            <h2 className="section-title text-base">Trước khi vào bếp</h2>
            <ul className="mt-3 grid gap-px bg-line sm:grid-cols-3">
              {guides.map((guide) => (
                <li key={guide.slug} className="bg-bg">
                  <Link href={guide.url} className="group block h-full p-4 transition-colors hover:bg-surface-am">
                    <h3 className="headline text-base group-hover:text-lam">{guide.shortTitle}</h3>
                    <p className="mt-1.5 line-clamp-3 text-sm text-muted">{guide.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Người mở tủ lạnh ra và thấy một bịch lạc không đi tìm "bánh đúc miền
            Bắc" — họ đi tìm "lạc". Mỗi nhãn dẫn thẳng vào ô tìm kiếm của trang
            công thức với từ khoá đã điền sẵn. */}
        {tags.length > 0 && (
          <section className="border-b border-line py-6">
            <h2 className="section-title text-base">Tìm món theo nguyên liệu</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag.label}>
                  <Link
                    href={`/cong-thuc/?q=${encodeURIComponent(tag.query)}`}
                    className="flex items-center gap-1.5 border border-line px-3 py-1.5 text-sm transition-colors hover:border-lam hover:text-lam"
                  >
                    {tag.label}
                    <span className="nums text-xs text-muted">{tag.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
          <section>
            <div className="flex items-center justify-between gap-4 border-b border-line pb-2">
              <h2 className="section-title">Công thức bánh đúc</h2>
              <Link href="/cong-thuc/" className="text-sm text-lam hover:underline">
                Xem tất cả
              </Link>
            </div>
            <div className="mt-1">
              <PostRows docs={list} />
            </div>
            <Link
              href="/cong-thuc/"
              className="mt-4 block border border-line py-2.5 text-center text-sm font-semibold text-lam transition-colors hover:border-lam"
            >
              <span className="nums">Xem cả {posts.length} công thức</span> →
            </Link>
          </section>

          <Sidebar docs={quick} title="Nấu nhanh tối nay" />
        </div>
      </div>
    </>
  );
}
