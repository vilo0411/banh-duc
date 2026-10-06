import Link from "next/link";
import { site } from "@/lib/site";

/**
 * Khối tác giả ở cuối bài — bản WordPress có một thẻ tương tự ("Xin Chào! Tôi
 * là Lộc Nguyễn") kèm ảnh Gravatar, bốn nút mạng xã hội trỏ về "#" và một nút
 * "Xem Thêm" dẫn sang kho bài theo tác giả — nút đó ở đây trỏ về /tac-gia/. Ảnh
 * chỉ là ảnh mặc định của Gravatar và các liên kết chưa tồn tại, nên ở đây
 * dùng chữ lồng thay ảnh và bỏ hàng nút rỗng: một khối giới thiệu thật, không
 * có chỗ nào dẫn người đọc vào ngõ cụt.
 *
 * Không in ra giấy: người ta in công thức để mang xuống bếp.
 */
export function AuthorBox() {
  const { name, role, bio, url } = site.author;
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .slice(-2)
    .join("");

  return (
    // `footer` của chính bài viết: theo đúng nghĩa của thẻ — thông tin về người
    // viết bài đứng ngay trên nó, không phải một khối nội dung riêng.
    <footer
      data-print="hide"
      className="mt-10 border-t-2 border-text bg-surface-am px-4 py-5 sm:px-5"
    >
      <div className="flex gap-4">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gach text-base font-bold text-white"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Tác giả</p>
          <p className="mt-1 text-base font-bold">{name}</p>
          <p className="text-sm text-muted">{role}</p>
          <p className="mt-2 text-sm">{bio}</p>
          <Link
            href={url}
            className="mt-2 inline-block text-sm font-semibold text-lam hover:underline"
          >
            Xem tất cả bài của {name} →
          </Link>
        </div>
      </div>
    </footer>
  );
}
