import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  collectionPosts,
  collectionSections,
  getCollection,
  publishedCollections,
} from "@/lib/collections";
import { PostRows } from "@/components/post-row";
import { Breadcrumb } from "@/components/breadcrumb";
import { Sidebar } from "@/components/sidebar";
import { getPosts } from "@/lib/content";
import { recipeTimes } from "@/lib/recipe";
import { JsonLdScript, listPageLd, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return publishedCollections().map((c) => ({ nhom: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/cong-thuc/[nhom]">): Promise<Metadata> {
  const { nhom } = await params;
  const collection = getCollection(nhom);
  if (!collection) return {};

  return pageMetadata({
    title: collection.title,
    description: collection.description,
    url: `/cong-thuc/${collection.slug}/`,
  });
}

export default async function CollectionPage({ params }: PageProps<"/cong-thuc/[nhom]">) {
  const { nhom } = await params;
  const collection = getCollection(nhom);
  if (!collection) notFound();

  const sections = collectionSections(collection, collectionPosts(collection));
  // ItemList theo đúng thứ tự người đọc thấy trên trang.
  const posts = sections.flatMap((section) => section.docs);
  const others = publishedCollections().filter((c) => c.slug !== collection.slug);

  const trail = [
    { name: "Trang chủ", url: "/" },
    { name: "Công thức", url: "/cong-thuc/" },
    { name: collection.title, url: `/cong-thuc/${collection.slug}/` },
  ];

  // Cột phải của một trang nhóm không nên lặp lại chính nhóm đó, nên nó lấy
  // những công thức ngắn nhất nằm ngoài nhóm này.
  const elsewhere = getPosts()
    .filter((post) => !collection.match(post))
    .map((post) => ({ post, minutes: recipeTimes(post.recipe).total }))
    .filter((item) => Boolean(item.minutes))
    .sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0))
    .slice(0, 5)
    .map((item) => item.post);

  return (
    <>
      <JsonLdScript
        data={listPageLd({
          url: `/cong-thuc/${collection.slug}/`,
          name: collection.title,
          description: collection.description,
          trail,
          docs: posts,
        })}
      />

      <div className="mx-auto max-w-6xl px-4 py-5">
        <Breadcrumb trail={trail} />

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
          <div>
            {/* Con số nằm ngoài h1: nội dung của h1 là tên nhóm và chỉ tên
                nhóm — nhét "12 công thức" vào trong biến tiêu đề mà Google đọc
                thành "Món mặn 12 công thức". */}
            <div className="flex items-center gap-3 border-b border-line pb-2">
              <h1 className="section-title min-w-0 text-xl sm:text-2xl">{collection.title}</h1>
              <p className="nums ml-auto shrink-0 text-sm text-muted">
                {posts.length} công thức
              </p>
            </div>
            <p className="mt-3 text-muted">{collection.intro}</p>

            {sections.length === 1 ? (
              <div className="mt-5">
                <PostRows docs={posts} priority={3} level={2} />
              </div>
            ) : (
              sections.map((section, i) => (
                <section key={section.title} className="mt-7">
                  {/* Số bài nằm ngoài h2, cùng lý do với h1 ở trên. */}
                  <div className="flex items-center gap-3 border-b border-line pb-2">
                    <h2 className="section-title min-w-0 text-lg">{section.title}</h2>
                    <p className="nums ml-auto shrink-0 text-sm text-muted">
                      {section.docs.length} công thức
                    </p>
                  </div>
                  <PostRows docs={section.docs} priority={i === 0 ? 3 : 0} level={3} />
                </section>
              ))
            )}

            <nav aria-label="Nhóm khác" className="mt-6">
              <p className="eyebrow">Nhóm khác</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {[...others.map((o) => ({ href: `/cong-thuc/${o.slug}/`, label: o.title })),
                  { href: "/cong-thuc/", label: "Tất cả công thức" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-lam hover:text-lam"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <Sidebar docs={elsewhere} title="Nấu nhanh tối nay" />
        </div>
      </div>
    </>
  );
}
