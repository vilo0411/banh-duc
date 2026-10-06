import Link from "next/link";
import type { ReactNode } from "react";
import { collectionPosts, publishedCollections } from "@/lib/collections";
import type { Doc } from "@/lib/content";
import { PostRow } from "@/components/post-row";

/** Một khối trong cột phải: tiêu đề có vạch đỏ, nội dung nằm dưới. */
export function SidebarBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="section-title border-b border-line pb-2 text-base">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Cột phải, dùng chung cho mọi trang có nội dung chính ở cột trái.
 *
 * Nó tồn tại để trả lời câu hỏi "đọc gì tiếp" ngay trong tầm mắt, thay vì bắt
 * người đọc cuộn hết bài rồi mới gặp một lưới bài liên quan. Trên điện thoại
 * cột này rơi xuống dưới nội dung chính — đúng thứ tự cần đọc.
 */
export function Sidebar({
  docs,
  title = "Công thức nổi bật",
  children,
}: {
  docs: Doc[];
  title?: string;
  children?: ReactNode;
}) {
  const collections = publishedCollections();

  return (
    <aside data-print="hide" className="space-y-8">
      {children}

      {docs.length > 0 && (
        <SidebarBox title={title}>
          <ul className="divide-y divide-line">
            {docs.map((doc) => (
              <li key={doc.slug} className="py-3 first:pt-0">
                <PostRow doc={doc} size="sm" />
              </li>
            ))}
          </ul>
        </SidebarBox>
      )}

      {collections.length > 0 && (
        <SidebarBox title="Nhóm công thức">
          <ul className="divide-y divide-line text-sm">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={`/cong-thuc/${collection.slug}/`}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-lam"
                >
                  <span>{collection.title}</span>
                  <span className="nums text-xs text-muted">
                    {collectionPosts(collection).length}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SidebarBox>
      )}
    </aside>
  );
}
