import type { Heading } from "@/lib/toc";

/**
 * In-article table of contents. Recipe posts here run 2,000+ words, so a
 * jump list is the difference between a reader finding the steps and bouncing.
 */
export function Toc({ headings }: { headings: Heading[] }) {
  const sections = headings.filter((h) => h.level === 2);
  if (sections.length < 3) return null;

  return (
    <nav aria-labelledby="muc-luc" className="text-sm">
      {/* h2 như mọi khối khác ở cột phải: "Mục lục" là tiêu đề của một khối
          nội dung, không phải một nhãn trang trí. */}
      <h2 id="muc-luc" className="section-title border-b border-line pb-2 text-base">
        Mục lục
      </h2>
      <ol className="mt-1 divide-y divide-line">
        {sections.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className="block py-2.5 text-muted hover:text-lam">
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
