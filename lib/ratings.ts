import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

/**
 * Điểm đánh giá công thức do chính người đọc chấm.
 *
 * Đây là nguồn duy nhất của `aggregateRating` trong JSON-LD: không có con số
 * nào nhập tay, không lấy điểm từ site khác. Google coi điểm bịa là spam dữ
 * liệu có cấu trúc và phạt thủ công — nặng hơn nhiều so với một cảnh báo
 * "thiếu aggregateRating".
 *
 * Lưu bằng SQLite trong một file trên VPS (`RATINGS_DB`), vì site chạy một
 * tiến trình `next start` duy nhất: không cần dịch vụ ngoài. File phải nằm
 * ngoài thư mục release để lần deploy sau không xoá mất.
 */

/** Dưới ngưỡng này trang vẫn hiện điểm, nhưng schema không khai — "5★ (1)" chỉ làm giảm tin cậy. */
export const MIN_PUBLIC_RATINGS = 3;

/** Một địa chỉ IP chấm tối đa bấy nhiêu lần trong 24 giờ, trên mọi bài cộng lại. */
const IP_DAILY_LIMIT = 30;

export type Rating = {
  count: number;
  /** Trung bình, làm tròn một chữ số thập phân — đúng con số trang hiện ra. */
  value: number;
};

let db: DatabaseSync | undefined;

function open(): DatabaseSync {
  if (db) return db;
  const file = process.env.RATINGS_DB || join(process.cwd(), "data", "ratings.db");
  mkdirSync(dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  // WAL: bản dựng đọc song song nhiều worker trong lúc server vẫn ghi.
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS votes (
      slug       TEXT    NOT NULL,
      voter      TEXT    NOT NULL,
      ip_hash    TEXT    NOT NULL,
      stars      INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (slug, voter)
    );
    CREATE INDEX IF NOT EXISTS votes_ip ON votes (ip_hash, updated_at);
  `);
  return db;
}

export function getRating(slug: string): Rating {
  const row = open()
    .prepare("SELECT COUNT(*) AS count, AVG(stars) AS avg FROM votes WHERE slug = ?")
    .get(slug) as { count: number; avg: number | null };
  return { count: row.count, value: row.avg ? Math.round(row.avg * 10) / 10 : 0 };
}

/** Điểm đủ lượt để khai trong schema, hoặc `undefined`. */
export function publicRating(slug: string): Rating | undefined {
  const rating = getRating(slug);
  return rating.count >= MIN_PUBLIC_RATINGS ? rating : undefined;
}

/**
 * IP không lưu thô. Muối cố định theo site để cùng một IP luôn ra cùng một mã
 * (cần cho giới hạn theo ngày), nhưng không dò ngược được từ file dữ liệu.
 */
export function hashIp(ip: string): string {
  const salt = process.env.RATINGS_SALT || "banh-duc";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Ghi một lượt chấm. Mỗi người (cookie) một phiếu cho mỗi bài — chấm lại là
 * sửa phiếu cũ, không cộng thêm lượt. Cookie xoá được, nên giới hạn theo IP là
 * chốt thứ hai; nó rộng tay vì mạng di động ở Việt Nam dồn nhiều người vào một IP.
 */
export function vote(
  slug: string,
  voter: string,
  ipHash: string,
  stars: number,
): "ok" | "limited" {
  const conn = open();
  const now = Date.now();
  const existing = conn
    .prepare("SELECT 1 FROM votes WHERE slug = ? AND voter = ?")
    .get(slug, voter);

  if (!existing) {
    const { recent } = conn
      .prepare("SELECT COUNT(*) AS recent FROM votes WHERE ip_hash = ? AND updated_at > ?")
      .get(ipHash, now - 24 * 60 * 60 * 1000) as { recent: number };
    if (recent >= IP_DAILY_LIMIT) return "limited";
  }

  conn
    .prepare(
      `INSERT INTO votes (slug, voter, ip_hash, stars, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (slug, voter) DO UPDATE SET stars = excluded.stars, updated_at = excluded.updated_at`,
    )
    .run(slug, voter, ipHash, stars, now, now);
  return "ok";
}
