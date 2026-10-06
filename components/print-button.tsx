"use client";

/** Printing is how a recipe leaves the screen and gets stuck to a cupboard. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-lam hover:text-lam"
    >
      In công thức
    </button>
  );
}
