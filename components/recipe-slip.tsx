"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Recipe } from "@/lib/content";
import { scaleAmounts, scaleYield, splitIngredient } from "@/lib/recipe";

const FACTORS = [
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" },
];

/** First sentence of a step, as a hint — the full method stays in the article. */
function gist(text: string): string {
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return first.length > 150 ? `${first.slice(0, 147).trimEnd()}…` : first;
}

/**
 * The kitchen slip: what to buy, and in what order to do it. Everything a cook
 * needs while standing at the stove, in one block they can scale, tick off and
 * print. The prose method stays in the article; each step links into it.
 */
export function RecipeSlip({
  recipe,
  anchors,
}: {
  recipe: Recipe;
  anchors: (string | undefined)[];
}) {
  const [factor, setFactor] = useState(1);
  const [done, setDone] = useState<number[]>([]);

  const toggle = (i: number) =>
    setDone((prev) => (prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i]));

  return (
    <section
      id="phieu-bep"
      aria-labelledby="phieu-bep-tieu-de"
      data-print="slip"
      className="rim rim-am mt-10"
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div>
            <p className="eyebrow">Phiếu bếp</p>
            <h2 id="phieu-bep-tieu-de" className="mt-1 text-xl font-bold sm:text-2xl">
              Nguyên liệu &amp; các bước
            </h2>
          </div>

          {recipe.ingredients.length > 0 && (
            <div data-print="hide">
              <p className="mb-1.5 text-[0.65rem] font-semibold tracking-wide text-muted uppercase">
                Chia khẩu phần
              </p>
              <div className="flex gap-1" role="group" aria-label="Chia khẩu phần">
                {FACTORS.map((f) => {
                  const active = f.value === factor;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFactor(f.value)}
                      className={`nums min-w-11 border px-3 py-1.5 text-sm font-semibold transition-colors ${
                        active
                          ? "border-nghe bg-nghe text-white"
                          : "border-line text-muted hover:border-nghe hover:text-nghe"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {recipe.yield && (
          <p className="nums mt-4 text-sm text-muted">
            Thành phẩm:{" "}
            <strong className="font-semibold text-text">
              {scaleYield(recipe.yield, factor)}
            </strong>
          </p>
        )}

        <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
          {recipe.ingredients.length > 0 && (
            <div>
              <h3 className="section-title border-b border-line pb-2 text-base">Nguyên liệu</h3>
              <ul className="mt-4 space-y-3">
                {recipe.ingredients.map((line, i) => {
                  const item = splitIngredient(line);
                  const checked = done.includes(i);
                  return (
                    <li key={i}>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(i)}
                          className="accent-nghe mt-[0.4rem] size-4 shrink-0"
                        />
                        <span className={checked ? "opacity-45" : undefined}>
                          <span className={`nums ${checked ? "line-through" : ""}`}>
                            {scaleAmounts(item.text, factor)}
                          </span>
                          {item.note && (
                            <span className="mt-0.5 block text-sm text-muted">{item.note}</span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {recipe.steps.length > 0 && (
            <div>
              <h3 className="section-title border-b border-line pb-2 text-base">Các bước</h3>
              <ol className="mt-4 space-y-5">
                {recipe.steps.map((step, i) => {
                  const anchor = anchors[i];
                  return (
                    <li key={i} className="flex gap-3">
                      {/* Số bước là một ô vuông đặc — đọc được từ khoảng cách
                          của người đang đứng bếp, và in ra giấy vẫn rõ. */}
                      <span
                        data-step
                        className="nums grid size-6 shrink-0 place-items-center bg-nghe text-xs font-bold text-white"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {anchor ? (
                            <a
                              href={`#${anchor}`}
                              className="underline decoration-nghe/40 underline-offset-4 hover:decoration-nghe"
                            >
                              {step.name}
                            </a>
                          ) : (
                            step.name
                          )}
                        </p>
                        {/* On screen the first sentence is a hint and the link
                            leads to the method. On paper there is no link to
                            follow, so the whole step has to be there. */}
                        <p className="mt-1 text-sm text-muted print:hidden">{gist(step.text)}</p>
                        <p className="mt-1 hidden text-sm print:block">{step.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>

        <KitchenMode />
      </div>
    </section>
  );
}

/**
 * A phone propped against the flour tin locks its screen halfway through the
 * batter. Wake Lock keeps it awake; browsers without it simply never show
 * the toggle.
 */
function KitchenMode() {
  // Client-only capability: the server has no navigator, so it renders the
  // toggle away and the browser brings it back on hydration.
  const supported = useSyncExternalStore(
    () => () => {},
    () => "wakeLock" in navigator,
    () => false,
  );
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    if (!awake) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Denied (battery saver, background tab) — drop the toggle silently.
        if (!cancelled) setAwake(false);
      }
    };

    // The lock is released whenever the tab is hidden, so it has to be retaken
    // when the cook comes back to the page.
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [awake]);

  if (!supported) return null;

  return (
    <div data-print="hide" className="mt-10 border-t border-line pt-6">
      <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          checked={awake}
          onChange={(e) => setAwake(e.target.checked)}
          className="accent-nghe size-4"
        />
        Giữ màn hình sáng khi đang nấu
      </label>
    </div>
  );
}
