import type { Metadata } from "next";
import Link from "next/link";
import { getGuides, getPages, getPosts, type Doc } from "@/lib/content";
import { publishedCollections } from "@/lib/collections";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLdScript, pageLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

const url = "/so-do-trang/";
const title = "Sơ đồ trang";
const description =
  "Toàn bộ trang trên Bánh Đúc ở một chỗ: mọi công thức bánh đúc xếp theo nhóm món, các nhóm công thức, cẩm nang và trang thông tin.";

export const metadata: Metadata = pageMetadata({ title, description, url });

const trail = [
  { name: "Trang chủ", url: "/" },
  { name: title, url },
];

type Entry = { href: string; label: string };

const linkClass = "text-text hover:text-lam";

function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2
        id={id}
        className="section-title border-b border-line pb-2 text-lg sm:text-xl"
      >
        {heading}
      </h2>
      {children}
    </section>
  );
}

function Links({ items }: { items: Entry[] }) {
  return (
    <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className={linkClass}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const fromDocs = (docs: Doc[]): Entry[] =>
  docs.map((doc) => ({ href: doc.url, label: doc.title }));

/**
 * Sơ đồ trang dạng HTML — bản cho người đọc của /sitemap.xml, đặt ở chân trang
 * thay cho liên kết RSS. Nó cho mọi bài một đường vào cách trang chủ hai cú
 * nhấp, kể cả những bài không lọt vào nhóm nào.
 *
 * Công thức chia theo `group` chứ không theo `publishedCollections()`: mỗi bài
 * có đúng một nhóm món, nên mỗi bài hiện đúng một lần; còn các trang nhóm (có
 * thể giao nhau, và bỏ ngỏ nhóm dưới ngưỡng) chỉ được liệt kê như những trang.
 */
export default function SitemapPage() {
  const posts = getPosts();
  const groups = [...new Set(posts.map((post) => post.group ?? "Khác"))];
  const pages = getPages().filter(
    (doc) => !["home", "tin-tuc"].includes(doc.slug),
  );

  const main: Entry[] = [
    { href: "/", label: "Trang chủ" },
    { href: "/cong-thuc/", label: "Tất cả công thức" },
    ...publishedCollections().map((c) => ({
      href: `/cong-thuc/${c.slug}/`,
      label: c.title,
    })),
    { href: site.author.url, label: `Tác giả: ${site.author.name}` },
  ];

  return (
    <>
      <JsonLdScript data={pageLd({ url, name: title, description, trail })} />

      <div className="mx-auto max-w-6xl px-4 py-5">
        <Breadcrumb trail={trail} />

        <div className="mt-4">
          <h1 className="section-title border-b border-line pb-2 text-xl sm:text-2xl">
            {title}
          </h1>
          <p className="mt-3 text-muted">{description}</p>

          <Section id="so-do-chuyen-muc" heading="Chuyên mục">
            <Links items={main} />
          </Section>

          <Section id="so-do-cong-thuc" heading="Công thức">
            {groups.map((group, i) => {
              const inGroup = posts.filter(
                (post) => (post.group ?? "Khác") === group,
              );
              return (
                <section
                  key={group}
                  aria-labelledby={`so-do-nhom-${i}`}
                  className="mt-5"
                >
                  <div className="flex items-baseline gap-3">
                    <h3 id={`so-do-nhom-${i}`} className="font-bold">
                      {group}
                    </h3>
                    <p className="nums text-sm text-muted">
                      {inGroup.length} bài
                    </p>
                  </div>
                  <Links items={fromDocs(inGroup)} />
                </section>
              );
            })}
          </Section>

          <Section id="so-do-cam-nang" heading="Cẩm nang">
            <Links items={fromDocs(getGuides())} />
          </Section>

          <Section id="so-do-thong-tin" heading="Thông tin">
            <Links items={fromDocs(pages)} />
          </Section>
        </div>
      </div>
    </>
  );
}
