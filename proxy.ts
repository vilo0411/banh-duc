import { NextResponse, type NextRequest } from "next/server";
import legacy from "./lib/legacy-redirects.json";

/**
 * Shortlink WordPress: `/?p=<id>`, `/?page_id=<id>`, `/?attachment_id=<id>`.
 * Không đặt trong `redirects()` của next.config vì ở đó query cũ luôn bị mang
 * sang đích — `/banh-duc-hue/?p=2468` thay vì URL sạch, và `/?attachment_id=…`
 * trỏ về `/` thì lặp vô hạn.
 */
const ids: Record<string, string> = legacy.ids;

export function proxy(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  for (const key of ["p", "page_id", "attachment_id"]) {
    const destination = ids[params.get(key) ?? ""];
    if (destination) return NextResponse.redirect(new URL(destination, request.url), 301);
  }
}

export const config = {
  matcher: [
    { source: "/", has: [{ type: "query", key: "p" }] },
    { source: "/", has: [{ type: "query", key: "page_id" }] },
    { source: "/", has: [{ type: "query", key: "attachment_id" }] },
  ],
};
