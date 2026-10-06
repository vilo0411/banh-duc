import { SOURCES, perServing, type Macros, type Nutrition } from "@/lib/nutrition";

const nf = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** Một con số khi khẩu phần cố định, một khoảng "thấp–cao" khi bài ghi "4 – 6 người". */
function span(low: number, high: number, unit: string) {
  return low === high ? `${nf.format(low)} ${unit}` : `${nf.format(low)}–${nf.format(high)} ${unit}`;
}

/**
 * Giá trị dinh dưỡng ước tính cho một phần — đặt ở đầu bài, ngay dưới dải
 * thông số, vì calo là thứ người ta muốn biết trước khi quyết định nấu.
 *
 * Bảng nói rõ nó là ước tính và cho xem từng dòng đã tính ra sao: số liệu
 * dinh dưỡng của một trang công thức chỉ đáng tin khi người đọc kiểm lại được.
 * Con số trong JSON-LD (`nutrition` của Recipe) lấy từ đúng phép tính này, và
 * `npm run check` soát rằng nó có mặt trong khối dưới đây.
 */
export function NutritionFacts({ nutrition }: { nutrition: Nutrition }) {
  const [few, many] = nutrition.servings;
  // Nhiều người hơn → mỗi phần ít hơn: đầu thấp của khoảng ứng với `many`.
  const high = perServing(nutrition.total, few);
  const low = perServing(nutrition.total, many);

  const cells: { label: string; key: keyof Macros; unit: string }[] = [
    { label: "Năng lượng", key: "kcal", unit: "kcal" },
    { label: "Tinh bột", key: "carbs", unit: "g" },
    { label: "Chất béo", key: "fat", unit: "g" },
    { label: "Chất đạm", key: "protein", unit: "g" },
  ];

  const extraLow = nutrition.extraTotal && perServing(nutrition.extraTotal, many).kcal;
  const extraHigh = nutrition.extraTotal && perServing(nutrition.extraTotal, few).kcal;

  return (
    <section
      id="dinh-duong"
      aria-labelledby="dinh-duong-tieu-de"
      data-nutrition
      className="mt-6"
    >
      <p className="eyebrow">Ước tính cho mỗi phần</p>
      <h2 id="dinh-duong-tieu-de" className="mt-1 text-xl font-bold sm:text-2xl">
        Giá trị dinh dưỡng
      </h2>

      <div className="rim mt-4 border-line">
        {/* Bốn ô chia đều nên dùng grid được (khác thanh thông số, nơi số ô
            thay đổi): 2×2 trên điện thoại, một hàng từ sm trở lên. */}
        <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {cells.map((cell) => (
            <div key={cell.key} className="bg-surface-am px-3 py-2.5">
              <dt className="text-[0.65rem] font-semibold tracking-wide text-muted uppercase">
                {cell.label}
              </dt>
              <dd className="nums mt-0.5 text-base leading-snug font-bold text-text sm:text-lg">
                {span(low[cell.key], high[cell.key], cell.unit)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-3 text-sm text-muted">
        Mỗi phần là{" "}
        {few === many ? `1/${few}` : `từ 1/${many} đến 1/${few}`} công thức, theo khẩu phần{" "}
        {few === many ? `${few}` : `${few}–${many}`} người ăn của bài.
        {nutrition.extra && extraLow !== undefined && extraHigh !== undefined && (
          <>
            {" "}
            Chưa gồm {nutrition.extra}: dùng hết phần trong công thức thì mỗi phần thêm khoảng{" "}
            <span className="nums">{span(extraLow, extraHigh, "kcal")}</span>.
          </>
        )}
        {nutrition.note && <> {nutrition.note}</>}
      </p>

      <details className="mt-3 text-sm">
        <summary className="w-fit cursor-pointer font-semibold text-lam">Cách tính</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="nums w-full min-w-[32rem] border-collapse text-left">
            <caption className="sr-only">
              Từng nguyên liệu, thực phẩm dùng để tra và năng lượng của cả công thức
            </caption>
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="py-2 pr-3 font-semibold">Nguyên liệu trong bài</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Tra theo</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Gram</th>
                <th scope="col" className="py-2 text-right font-semibold">kcal</th>
              </tr>
            </thead>
            <tbody>
              {nutrition.rows.map((row, i) => (
                <tr key={i} className="border-b border-line/60 align-top">
                  <td className="py-1.5 pr-3">{row.line}</td>
                  <td className="py-1.5 pr-3 text-muted">
                    {row.food ? (
                      <>
                        {row.food.name}{" "}
                        <span className="text-xs">
                          ({row.food.source === "vn" ? "VN" : "USDA"} {row.food.code})
                        </span>
                        {row.part === "extra" && <span className="text-xs"> · ăn kèm</span>}
                      </>
                    ) : (
                      <>Không tính — {row.skip}</>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right">
                    {row.grams !== undefined ? nf.format(row.grams) : "—"}
                  </td>
                  <td className="py-1.5 text-right">
                    {row.kcal !== undefined ? nf.format(row.kcal) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Số liệu trong 100 g lấy từ{" "}
          {nutrition.sources.map((key, i) => (
            <span key={key}>
              {i > 0 && " và "}
              <a href={SOURCES[key].url} className="underline underline-offset-2 hover:text-lam">
                {SOURCES[key].name}
              </a>
            </span>
          ))}
          . Ml chất lỏng tính như gram; một thìa canh dầu tính 13,7 g. Con số thật còn tuỳ
          loại thịt, độ hút dầu và cỡ phần bạn múc — hãy xem đây là mức tham khảo, không
          phải nhãn dinh dưỡng.
        </p>
      </details>
    </section>
  );
}
