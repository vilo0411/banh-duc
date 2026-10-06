import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllDocs, getDoc, getPosts, getRelatedPosts } from "@/lib/content";
import { collectionsFor } from "@/lib/collections";
import { getHeadings, stepAnchors } from "@/lib/toc";
import { docMetadata, docPageLd, JsonLdScript } from "@/lib/seo";
import { Mdx } from "@/components/mdx";
import { Toc } from "@/components/toc";
import { Breadcrumb } from "@/components/breadcrumb";
import { Sidebar } from "@/components/sidebar";
import { RecipeSpec } from "@/components/recipe-spec";
import { RecipeSlip } from "@/components/recipe-slip";
import { PrintButton } from "@/components/print-button";
import { AuthorBox } from "@/components/author-box";
import { Faq } from "@/components/faq";
import { site } from "@/lib/site";

// `home` is the front page, rendered by app/page.tsx. `tin-tuc` is a 301 to
// /cong-thuc/ (next.config.ts) — the entry stays because `npm run migrate`
// pulls the old WordPress page back down, and a generated page for a redirected
// URL is dead weight.
const RESERVED = new Set(["home", "tin-tuc"]);

export function generateStaticParams() {
  return getAllDocs()
    .filter((doc) => !RESERVED.has(doc.slug))
    .map((doc) => ({ slug: doc.slug }));
}

// Anything outside generateStaticParams is not a real page — 404 instead of
// letting crawlers discover an endless space of soft-404 URLs.
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const doc = getDoc(slug);
  return doc ? docMetadata(doc) : {};
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(iso));
}

export default async function DocPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc || RESERVED.has(slug)) notFound();

  const isPost = doc.collection === "posts";
  // Cẩm nang cũng là bài viết có tác giả và ngày cập nhật, chỉ khác là nó
  // không phải công thức — nên nó lấy byline và khối tác giả, không lấy dải
  // thông số lẫn phiếu bếp.
  const isArticle = doc.collection !== "pages";
  const headings = getHeadings(doc.body);
  // Sáu thay vì ba: danh sách này giờ nằm ở cột phải, ngang tầm mắt suốt bài,
  // nên nó phải đủ dài để còn gì đó để chọn khi đọc đến cuối.
  // Cẩm nang không có "bài liên quan" theo nhóm vì nó không thuộc nhóm nào —
  // nhưng nó phải dẫn được người đọc sang công thức, đó là lý do nó tồn tại.
  const related = isPost
    ? getRelatedPosts(doc.slug, 6)
    : doc.collection === "guides"
      ? getPosts().slice(0, 6)
      : [];

  // A recipe is only shown as one when it has both halves; a post with just
  // ingredients is an article about ingredients.
  const recipe =
    doc.recipe?.ingredients?.length && doc.recipe.steps?.length ? doc.recipe : undefined;
  const anchors = recipe ? stepAnchors(doc.body, recipe.steps) : [];

  const trail = [
    { name: "Trang chủ", url: "/" },
    ...(isPost ? [{ name: "Công thức", url: "/cong-thuc/" }] : []),
    { name: doc.title, url: doc.url },
  ];

  return (
    <>
      <JsonLdScript data={docPageLd(doc, trail, anchors)} />

      <div className="mx-auto max-w-6xl px-4 py-5">
        <Breadcrumb trail={trail} />

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
          <article>
            <header>
              <h1 className="text-2xl leading-tight font-bold text-balance sm:text-[2rem]">
                {doc.title}
              </h1>
              {isArticle && (
                <p
                  data-print="hide"
                  className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted"
                >
                  <Link
                    href={site.author.url}
                    className="font-semibold text-text hover:text-lam"
                    rel="author"
                  >
                    {site.author.name}
                  </Link>
                  <span className="diamond" aria-hidden />
                  <time dateTime={doc.updated || doc.date}>
                    Cập nhật {formatDate(doc.updated || doc.date)}
                  </time>
                  {collectionsFor(doc).map((collection) => (
                    <span key={collection.slug} className="flex items-center gap-2">
                      <span className="diamond" aria-hidden />
                      <Link
                        href={`/cong-thuc/${collection.slug}/`}
                        className="font-semibold text-gach hover:underline"
                      >
                        {collection.title}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              {/* Sapo: in đậm, ngay dưới tiêu đề — quy ước của một trang tin,
                  và cũng là đoạn Google lấy làm mô tả. */}
              {doc.description && (
                <p data-print="hide" className="sapo mt-4">
                  {doc.description}
                </p>
              )}
            </header>

            {doc.image && (
              <figure data-print="hide" className="mt-4">
                <div className="relative aspect-[16/9] overflow-hidden bg-surface-am">
                  <Image
                    src={doc.image}
                    alt={doc.imageAlt || doc.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 760px"
                    priority
                    className="object-cover"
                  />
                </div>
                {doc.imageAlt && (
                  <figcaption className="mt-2 text-center text-sm text-muted">
                    {doc.imageAlt}
                  </figcaption>
                )}
              </figure>
            )}

            {recipe && (
              <>
                <RecipeSpec recipe={recipe} />
                <div data-print="hide" className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="#phieu-bep"
                    className="bg-lam px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Xem công thức ↓
                  </a>
                  <PrintButton />
                </div>
              </>
            )}

            <div data-print="hide" className="prose mt-6">
              <Mdx source={doc.body} />
            </div>

            {recipe && <RecipeSlip recipe={recipe} anchors={anchors} />}

            {/* Hỏi–đáp đứng sau phiếu bếp: người vào bếp cần các bước trước,
                người còn đang cân nhắc mới đọc tới đây. */}
            {doc.faq && <Faq items={doc.faq} />}

            {isArticle && <AuthorBox />}
          </article>

          {/* Cột phải bám theo bài: mục lục để nhảy trong bài, công thức liên
              quan để đi tiếp. Trên điện thoại nó rơi xuống dưới bài — đúng
              thứ tự cần đọc. */}
          {/* Không dán cột này theo màn hình: mục lục cộng sáu bài liên quan
              cộng danh sách nhóm đã cao hơn một khung nhìn, dán lại thì phần
              cuối không bao giờ cuộn tới được. */}
          <Sidebar docs={related} title={isPost ? "Công thức liên quan" : "Công thức mới nhất"}>
            {headings.length > 0 && <Toc headings={headings} />}
          </Sidebar>
        </div>
      </div>
    </>
  );
}
