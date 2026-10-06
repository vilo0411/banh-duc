"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDoc } from "@/lib/content";
import { getRating, hashIp, vote, type Rating } from "@/lib/ratings";

export type RateState =
  | { status: "idle" }
  | { status: "ok"; stars: number; rating: Rating }
  | { status: "error"; message: string };

const VOTER_COOKIE = "bd_voter";

/**
 * Nhận một lượt chấm sao từ form dưới phiếu bếp.
 *
 * Không cần đăng nhập — đây là site công thức, không phải nơi có tài khoản.
 * Thứ giữ cho điểm sạch là: chỉ bài là công thức thật mới nhận phiếu, mỗi
 * cookie một phiếu mỗi bài, giới hạn theo IP, và một ô bẫy bot ẩn.
 */
export async function rateRecipe(_prev: RateState, formData: FormData): Promise<RateState> {
  const slug = String(formData.get("slug") ?? "");
  const doc = getDoc(slug);
  if (!doc?.recipe?.ingredients?.length || !doc.recipe.steps?.length) {
    return { status: "error", message: "Bài này không nhận đánh giá." };
  }

  // Người thật không thấy ô này; bot điền mọi ô nó gặp.
  if (formData.get("website")) return { status: "error", message: "Không gửi được đánh giá." };

  const stars = Number(formData.get("stars"));
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { status: "error", message: "Hãy chọn từ 1 đến 5 sao." };
  }

  const jar = await cookies();
  let voter = jar.get(VOTER_COOKIE)?.value;
  if (!voter || !/^[0-9a-f-]{36}$/.test(voter)) {
    voter = randomUUID();
    jar.set(VOTER_COOKIE, voter, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365 * 2,
      path: "/",
    });
  }

  // Đường đi: Cloudflare → Nginx (FlashPanel) → next. Cloudflare ghi IP thật
  // vào CF-Connecting-IP và ghi đè header đó; còn X-Forwarded-For thì nó chỉ
  // nối thêm, nên phần tử đầu là thứ người gửi tự đặt được. XFF chỉ là dự
  // phòng khi chạy không qua Cloudflare.
  const head = await headers();
  const ip =
    head.get("cf-connecting-ip") ||
    head.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  if (vote(slug, voter, hashIp(ip), stars) === "limited") {
    return { status: "error", message: "Mạng của bạn đã gửi quá nhiều đánh giá hôm nay. Hãy thử lại sau." };
  }

  // Trang là HTML dựng sẵn: dựng lại để con số hiện ra và `aggregateRating`
  // trong JSON-LD cùng đổi, không bao giờ lệch nhau.
  revalidatePath(`/${slug}`);
  return { status: "ok", stars, rating: getRating(slug) };
}
