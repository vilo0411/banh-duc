import Link from "next/link";
import { getPosts } from "@/lib/content";
import { PostRows } from "@/components/post-row";

export const metadata = {
  title: "Không tìm thấy trang",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  const posts = getPosts().slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow">Lỗi 404</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Trang này không còn ở đây</h1>
      <p className="mt-3 max-w-xl text-muted">
        Đường dẫn có thể đã đổi hoặc bài viết đã được gộp vào công thức khác. Bắt đầu lại
        từ danh sách công thức nhé.
      </p>
      <Link
        href="/cong-thuc/"
        className="mt-5 inline-block bg-lam px-5 py-2.5 text-sm font-semibold text-white"
      >
        Xem tất cả công thức
      </Link>

      <div className="mt-10 max-w-3xl">
        <h2 className="section-title border-b border-line pb-2 text-base">Công thức mới nhất</h2>
        <div className="mt-1">
          <PostRows docs={posts} />
        </div>
      </div>
    </div>
  );
}
