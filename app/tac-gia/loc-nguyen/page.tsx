import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/content";
import { publishedCollections, collectionPosts } from "@/lib/collections";
import { PostRows } from "@/components/post-row";
import { Breadcrumb } from "@/components/breadcrumb";
import { Sidebar } from "@/components/sidebar";
import { JsonLdScript, pageMetadata, profilePageLd } from "@/lib/seo";
import { site } from "@/lib/site";

const { name, role, bio, url } = site.author;

// Trang vẫn hiển thị `bio` đầy đủ; meta description thì không — ghép `role` với
// cả đoạn tiểu sử ra 293 ký tự, mà Google cắt ở khoảng 155. Một câu viết riêng
// cho SERP nói được nhiều hơn nửa câu tiểu sử bị cắt.
const description = `${name} — ${role.toLowerCase()}, người biên soạn và thử lại toàn bộ công thức bánh đúc trên trang.`;

export const metadata: Metadata = pageMetadata({
  title: name,
  description,
  url,
  type: "profile",
});

const trail = [
  { name: "Trang chủ", url: "/" },
  { name: name, url },
];

function formatDate(iso: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(iso));
}

/**
 * Kho bài theo tác giả — bản dịch của /author/nvloc0411/ trên WordPress.
 *
 * Trang này chỉ có một tác giả, nên nó vừa là hồ sơ vừa là danh sách: phần đầu
 * trả lời "ai viết những công thức này", phần dưới là toàn bộ bài đã ký tên.
 * Đây cũng là đích của dòng ký tên đầu bài và khối tác giả cuối bài, nên nó
 * phải đứng được một mình chứ không chỉ là một trang trung gian.
 */
export default function AuthorPage() {
  const posts = getPosts();
  // Danh sách sắp theo ngày đăng, còn con số này nói về lần sửa gần nhất —
  // hai thứ tự khác nhau, nên phải lấy giá trị lớn nhất chứ không lấy bài đầu.
  const lastUpdated = posts
    .map((post) => post.updated || post.date)
    .filter(Boolean)
    .sort()
    .at(-1);
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .slice(-2)
    .join("");

  // Cột phải không lặp lại danh sách bên trái: nó đưa người đọc sang trục
  // phân loại theo nhóm, thứ mà một danh sách phẳng không nói ra được.
  const featured = publishedCollections()
    .map((collection) => collectionPosts(collection)[0])
    .filter((post): post is NonNullable<typeof post> => Boolean(post))
    .slice(0, 5);

  return (
    <>
      <JsonLdScript data={profilePageLd(posts, trail)} />

      <div className="mx-auto max-w-6xl px-4 py-5">
        <Breadcrumb trail={trail} />

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
          <div>
            <header className="border-b border-line pb-5">
              <div className="flex items-start gap-4 sm:gap-5">
                <span
                  aria-hidden
                  className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gach text-xl font-bold text-white sm:size-20 sm:text-2xl"
                >
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="eyebrow">Tác giả</p>
                  <h1 className="mt-1 text-2xl leading-tight font-bold sm:text-[2rem]">
                    {name}
                  </h1>
                  <p className="mt-1 text-sm text-muted">{role}</p>
                </div>
              </div>

              <p className="sapo mt-4">{bio}</p>

              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                <div className="flex items-center gap-2">
                  <dt>Bài đã đăng</dt>
                  <dd className="nums font-semibold text-text">{posts.length}</dd>
                </div>
                {lastUpdated && (
                  <div className="flex items-center gap-2">
                    <dt>Cập nhật gần nhất</dt>
                    <dd className="font-semibold text-text">
                      <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>
                    </dd>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <dt>Chuyên mục</dt>
                  <dd className="font-semibold text-text">Công thức bánh đúc</dd>
                </div>
              </dl>

              <nav aria-label="Liên kết tác giả" className="mt-4">
                <ul className="flex flex-wrap gap-2">
                  {[
                    ...site.nav.filter((item) => item.href !== "/cong-thuc/"),
                    {
                      href: "/quy-trinh-san-xuat-noi-dung/",
                      label: "Quy trình sản xuất nội dung",
                    },
                  ].map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block border border-line px-3 py-1.5 text-sm transition-colors hover:border-lam hover:text-lam"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </header>

            <div className="mt-6 flex items-center gap-3 border-b border-line pb-2">
              <h2 className="section-title min-w-0 text-lg sm:text-xl">
                Tất cả bài viết của {name}
              </h2>
              <p className="nums ml-auto shrink-0 text-sm text-muted">{posts.length} bài</p>
            </div>
            <div className="mt-5">
              <PostRows docs={posts} priority={3} />
            </div>
          </div>

          <Sidebar docs={featured} title="Mỗi nhóm một công thức" />
        </div>
      </div>
    </>
  );
}
