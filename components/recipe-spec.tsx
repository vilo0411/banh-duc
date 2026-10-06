import type { Recipe } from "@/lib/content";
import { formatDuration, recipeTimes } from "@/lib/recipe";

/**
 * The four numbers a cook decides on before reading a word of the article:
 * how long the prep is, how long the cooking is, how long the whole thing
 * takes, and how many people it feeds. They sit directly under the title
 * because scrolling for them is the single biggest failure of a recipe page.
 */
export function RecipeSpec({ recipe }: { recipe: Recipe }) {
  const times = recipeTimes(recipe);

  const cells = [
    { label: "Chuẩn bị", value: formatDuration(times.prep) },
    { label: "Nấu", value: formatDuration(times.cook) },
    { label: "Tổng", value: formatDuration(times.total) },
    { label: "Độ khó", value: recipe.difficulty },
    { label: "Khẩu phần", value: recipe.yield },
  ].filter((cell): cell is { label: string; value: string } => Boolean(cell.value));

  if (cells.length < 2) return null;

  return (
    <div className="rim mt-5 border-line">
      {/* Khe một pixel trên nền màu kẻ tự vẽ ra các đường phân cách giữa các ô,
          dù có bao nhiêu ô và chúng xuống dòng thế nào. Dùng flex chứ không
          dùng grid để hàng cuối luôn được lấp đầy — một cột grid trống sẽ hiện
          ra thành một mảng màu kẻ. */}
      <dl className="flex flex-wrap gap-px bg-line">
        {cells.map((cell) => (
          <div key={cell.label} className="min-w-28 flex-1 bg-surface-am px-3 py-2.5">
            <dt className="text-[0.65rem] font-semibold tracking-wide text-muted uppercase">
              {cell.label}
            </dt>
            <dd className="nums mt-0.5 text-sm leading-snug font-bold text-text sm:text-base">
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
