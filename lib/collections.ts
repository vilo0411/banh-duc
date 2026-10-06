import { getPosts, type Doc } from "./content";

/**
 * Browsing groups for the recipe index.
 *
 * They live under /cong-thuc/ rather than at the root because the root is
 * where the migrated WordPress URLs live — /banh-duc-chay/ is already a post,
 * and a group page must never take a URL a recipe already answers to.
 *
 * A group is only published once it has enough recipes to be worth a page of
 * its own; three is the floor. Below that it is a thin page competing with the
 * full index for the same query, which costs more than it earns.
 */
export type Collection = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  /**
   * Trục xếp nhóm. Một bài có thể thuộc một nhóm `group` (loại món) và một nhóm
   * `region` (vùng) cùng lúc — hai trục giao nhau chứ không chứa nhau, nên
   * không nhóm nào là cha của nhóm kia.
   */
  facet: "group" | "region";
  match: (doc: Doc) => boolean;
};

const MINIMUM = 3;

export const collections: Collection[] = [
  {
    slug: "mon-man",
    title: "Bánh đúc mặn",
    description:
      "Công thức bánh đúc mặn: bánh đúc nóng chan thịt băm, bánh đúc tôm thịt, bánh đúc riêu cua, bánh đúc tàu — kèm cách pha nước chấm ăn cùng.",
    intro:
      "Bánh đúc mặn là phần bánh đúc được ăn như một bữa: bột đổ nóng hoặc cắt miếng, chan thịt băm mộc nhĩ, rắc hành phi, chan nước mắm pha. Mỗi vùng một kiểu — Hà Nội ăn nóng trong bát, Hải Phòng ăn bánh đúc tàu với tôm và đu đủ, miền Trung chan mắm nêm.",
    facet: "group",
    match: (doc) => doc.group === "Món mặn",
  },
  {
    slug: "mon-ngot",
    title: "Bánh đúc ngọt",
    description:
      "Công thức bánh đúc ngọt: bánh đúc lá dứa, bánh đúc lá cẩm, bánh đúc mật, bánh đúc ngô, bánh đúc rau câu — béo nước cốt dừa, thơm mùi lá.",
    intro:
      "Bánh đúc ngọt lấy vị từ nước cốt dừa, mật mía và màu từ lá — lá dứa cho xanh, lá cẩm cho tím. Đây là nhóm dễ làm nhất cho người mới: bột ít nguyên liệu phụ, hỏng thì cũng chỉ là bột chưa đủ dẻo, khuấy lại được.",
    facet: "group",
    match: (doc) => doc.group === "Món ngọt",
  },
  {
    slug: "mien-bac",
    title: "Bánh đúc miền Bắc",
    description:
      "Công thức bánh đúc miền Bắc: bánh đúc nóng Hà Nội, bánh đúc lạc chấm tương, bánh đúc riêu cua, bánh đúc tàu Hải Phòng, bánh đúc nộm, bánh đúc ngô Lào Cai.",
    intro:
      "Miền Bắc là nơi bánh đúc gắn với bát nóng và nước vôi trong: bột khuấy kỹ trên lửa nhỏ, ăn ngay khi còn bốc khói, hoặc để nguội cắt miếng chấm tương. Nhóm này gồm những công thức tự ghi vùng trong bài — Hà Nội, Hải Phòng, chợ vùng cao Lào Cai, hoặc chính tác giả ghi là chuẩn vị Bắc.",
    facet: "region",
    match: (doc) => doc.region === "Miền Bắc",
  },
  {
    slug: "mien-trung",
    title: "Bánh đúc miền Trung",
    description:
      "Công thức bánh đúc miền Trung: bánh đúc Huế chan mắm nêm, bánh đúc mắm nêm, bánh đúc mật xứ Huế, bánh đúc sốt xứ Thanh — đậm vị, cay và mặn hơn.",
    intro:
      "Bánh đúc miền Trung ăn kèm mắm nêm dứa băm, cay và mặn hơn hẳn ngoài Bắc. Bánh cũng được đổ mỏng hơn, cắt miếng nhỏ để chấm chứ không chan. Nhóm này tính cả Bắc Trung Bộ — bánh đúc sốt xứ Thanh là món Thanh Hóa, không phải kiểu Huế.",
    facet: "region",
    match: (doc) => doc.region === "Miền Trung",
  },
];

export function collectionPosts(collection: Collection): Doc[] {
  return getPosts().filter(collection.match);
}

/** Only the groups that have enough recipes to deserve their own page. */
export function publishedCollections(): Collection[] {
  return collections.filter((c) => collectionPosts(c).length >= MINIMUM);
}

/** The published groups a recipe belongs to, for linking out of an article. */
export function collectionsFor(doc: Doc): Collection[] {
  return publishedCollections().filter((c) => c.match(doc));
}

export function getCollection(slug: string): Collection | undefined {
  return publishedCollections().find((c) => c.slug === slug);
}

/**
 * Nhóm chính của một bài — nhóm đứng trong breadcrumb. Lấy theo loại món vì
 * bài nào cũng có `group`, còn `region` chỉ có khi bài tự ghi vùng. Bài thuộc
 * một nhóm chưa đủ ngưỡng để có trang (món chay, nước chấm) thì không có.
 */
export function primaryCollection(doc: Doc): Collection | undefined {
  return collectionsFor(doc).find((c) => c.facet === "group");
}

/** Tên hiển thị của từng giá trị `group`, theo thứ tự xếp mục. */
const GROUP_LABELS: Record<string, string> = {
  "Món mặn": "Bánh đúc mặn",
  "Món ngọt": "Bánh đúc ngọt",
  "Món chay": "Bánh đúc chay",
  "Nước chấm": "Nước chấm bánh đúc",
};

const REGIONS = ["Miền Bắc", "Miền Trung", "Miền Nam"];

/** "Miền Bắc" → "miền Bắc", để ghép giữa câu. */
const inline = (region: string) => region.charAt(0).toLowerCase() + region.slice(1);

export type Section = { title: string; docs: Doc[] };

/**
 * Chia danh sách của một trang nhóm theo trục còn lại: trang loại món chia theo
 * vùng, trang vùng chia theo loại món. Mỗi mục là một h2 mang đúng cụm người ta
 * tìm ("bánh đúc mặn miền Bắc"), nên trang nhóm có cấu trúc riêng thay vì là
 * một tập con của trang kia.
 *
 * Trả về một mục duy nhất không tiêu đề khi phân chia không thêm được gì — mọi
 * bài cùng một phía của trục kia.
 */
export function collectionSections(collection: Collection, docs: Doc[]): Section[] {
  const keys =
    collection.facet === "group"
      ? [...REGIONS, undefined]
      : [...Object.keys(GROUP_LABELS), undefined];
  const keyOf = (doc: Doc) => (collection.facet === "group" ? doc.region : doc.group);
  const known = new Set(keys.filter(Boolean));

  const sections = keys
    .map((key) => {
      const members = docs.filter((doc) =>
        key ? keyOf(doc) === key : !known.has(keyOf(doc)),
      );
      let title: string;
      if (collection.facet === "group") {
        title = key
          ? `${collection.title} ${inline(key)}`
          : `Công thức ${collection.title.charAt(0).toLowerCase()}${collection.title.slice(1)} khác`;
      } else {
        title = key ? `${GROUP_LABELS[key]} ${inline(collection.title.replace(/^Bánh đúc /, ""))}` : "Công thức khác";
      }
      return { title, docs: members };
    })
    .filter((section) => section.docs.length > 0);

  return sections.length > 1 ? sections : [{ title: "", docs }];
}
