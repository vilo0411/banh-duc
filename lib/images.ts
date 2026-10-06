import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";

/**
 * Intrinsic dimensions for a local image, read from the file itself.
 * Markdown has no way to express width/height, and next/image needs both to
 * reserve space — without it every article shifts layout as images load (CLS).
 * `og:image` cần chúng vì lý do khác: thiếu kích thước, Facebook phải tải ảnh
 * về rồi mới dựng được thẻ xem trước, nên lượt chia sẻ đầu tiên ra không ảnh.
 */
const dimensionCache = new Map<string, { width: number; height: number } | null>();

export function localDimensions(src: string) {
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
