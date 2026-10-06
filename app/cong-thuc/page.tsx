import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/content";
import { publishedCollections } from "@/lib/collections";
import { PostRow } from "@/components/post-row";
import { RecipeFilter } from "@/components/recipe-filter";
import { Breadcrumb } from "@/components/breadcrumb";
import { Sidebar } from "@/components/sidebar";
import { searchHaystack } from "@/lib/ingredients";
import { JsonLdScript, listPageLd, pageMetadata } from "@/lib/seo";
import { recipeTimes } from "@/lib/recipe";

const title = "Tất cả công thức bánh đúc";
const description =
  "Danh sách đầy đủ công thức làm bánh đúc: bánh đúc nóng, bánh đúc lạc, bánh đúc Huế, bánh đúc tàu, bánh đúc lá dứa, bánh đúc chay và nước chấm ăn kèm.";

export const metadata: Metadata = pageMetadata({
  title,
  description,
  url: "/cong-thuc/",
});

const trail = [
  { name: "Trang chủ", url: "/" },
  { name: "Công thức", url: "/cong-thuc/" },
];

export default function RecipeIndex() {
  const posts = getPosts();

  const quick = posts
    .map((post) => ({ post, minutes: recipeTimes(post.recipe).total }))
    .filter((item) => Boolean(item.minutes))
    .sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0))
    .slice(0, 5)
    .map((item) => item.post);

  return (
    <>
      <JsonLdScript
        data={listPageLd({ url: "/cong-thuc/", name: title, description, trail, docs: posts })}
      />

      <div className="mx-auto max-w-6xl px-4 py-5">
        <Breadcrumb trail={trail} />

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
          <div>
            <h1 className="section-title border-b border-line pb-2 text-xl sm:text-2xl">
              {title}
            </h1>
            <p className="mt-3 text-muted">{description}</p>

            {/* Liên kết dựng sẵn chứ không phải nhãn lọc: đây là những trang
                riêng, và trình thu thập phải đi theo được. */}
            <nav aria-label="Nhóm công thức" className="mt-4">
              <ul className="flex flex-wrap gap-2">
                {publishedCollections().map((collection) => (
                  <li key={collection.slug}>
                    <Link
                      href={`/cong-thuc/${collection.slug}/`}
                      className="block border border-line px-3 py-1.5 text-sm transition-colors hover:border-lam hover:text-lam"
                    >
                      {collection.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <RecipeFilter
              items={posts.map((post, i) => ({
                slug: post.slug,
                haystack: searchHaystack(post),
                minutes: recipeTimes(post.recipe).total,
                difficulty: post.recipe?.difficulty,
                card: <PostRow doc={post} priority={i < 3} level={2} />,
              }))}
            />
          </div>

          <Sidebar docs={quick} title="Nấu nhanh tối nay" />
        </div>
      </div>
    </>
  );
}
