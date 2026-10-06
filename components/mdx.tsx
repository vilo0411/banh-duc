import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { imageSize } from "image-size";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Intrinsic dimensions for a local image, read from the file itself.
 * Markdown has no way to express width/height, and next/image needs both to
 * reserve space — without it every article shifts layout as images load (CLS).
 */
const dimensionCache = new Map<string, { width: number; height: number } | null>();

function localDimensions(src: string) {
  if (dimensionCache.has(src)) return dimensionCache.get(src)!;
  let result: { width: number; height: number } | null = null;
  try {
    const file = fs.readFileSync(path.join(process.cwd(), "public", src));
    const { width, height } = imageSize(file);
    if (width && height) result = { width, height };
  } catch {
    result = null;
  }
  dimensionCache.set(src, result);
  return result;
}

function MdxImage({ src, alt }: ComponentPropsWithoutRef<"img">) {
  if (typeof src !== "string" || !src.startsWith("/")) return null;
  const size = localDimensions(src);
  if (!size) return null;

  return (
    <Image
      src={src}
      alt={alt ?? ""}
      width={size.width}
      height={size.height}
      sizes="(max-width: 768px) 100vw, 720px"
      className="my-6 h-auto w-full"
    />
  );
}

function MdxLink({ href = "", children, ...rest }: ComponentPropsWithoutRef<"a">) {
  const internal = href.startsWith("/") || href.startsWith("#");
  if (internal) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

// Tables get their own scroll container so a wide table never scrolls the page.
function MdxTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="table-wrap">
      <table {...props} />
    </div>
  );
}

const components = {
  img: MdxImage,
  a: MdxLink,
  table: MdxTable,
};

type HastNode = { type: string; tagName?: string; children?: HastNode[] };

/**
 * Vá những chỗ dàn tiêu đề nhảy cấp: `##` rồi thẳng tới `####`.
 *
 * Bài migrate từ WordPress dùng `####` như một nhãn nhỏ ("Phần bột", "Phần
 * nhân") ngay dưới một `##`, nên HTML nhảy h2 → h4 và mất hẳn một tầng — thứ
 * cả trình đọc màn hình lẫn công cụ tìm kiếm đọc để hiểu bài chia thành mấy
 * phần. Sửa ở đây chứ không sửa trong file MDX vì `npm run migrate` ghi đè
 * `content/`; một lần chạy lại là mọi lần sửa tay biến mất.
 *
 * Chỉ hạ cấp, không bao giờ nâng: một tiêu đề không tự nhảy lên tầng cao hơn
 * tầng nó đang thuộc về. Id do `rehype-slug` sinh từ chữ chứ không từ cấp, nên
 * mục lục và các mỏ neo của phiếu bếp không đổi.
 */
function rehypeHeadingLevels() {
  return (tree: HastNode) => {
    let previous = 1;
    for (const node of tree.children ?? []) {
      const level = node.type === "element" ? Number(/^h([1-6])$/.exec(node.tagName ?? "")?.[1]) : 0;
      if (!level) continue;
      const fixed = level > previous + 1 ? previous + 1 : level;
      node.tagName = `h${fixed}`;
      previous = fixed;
    }
  };
}

export function Mdx({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          // Stable heading ids make the table of contents and the HowToStep
          // anchors in the Recipe JSON-LD resolve to real positions.
          rehypePlugins: [
            rehypeHeadingLevels,
            rehypeSlug,
            [
              rehypeAutolinkHeadings,
              { behavior: "wrap", properties: { className: "no-underline" } },
            ],
          ],
        },
      }}
    />
  );
}
