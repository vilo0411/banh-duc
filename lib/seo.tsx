import type { Metadata } from "next";
import { absoluteUrl, site } from "./site";
import { localDimensions } from "./images";
import type { Doc } from "./content";
import { recipeTimes, toDuration } from "./recipe";
import { stepImages } from "./toc";
import { publicRating } from "./ratings";
import { getNutrition, perServing } from "./nutrition";

/** Ảnh chia sẻ mặc định — dùng cho mọi trang không có ảnh riêng. */
const ogFallback = [
  { url: absoluteUrl("/og.png"), width: 1200, height: 630, alt: site.name },
];

/**
 * Metadata cho một trang bất kỳ.
 *
 * Mọi trang phải đi qua đây vì `openGraph` và `twitter` **không** được Next
 * trộn giữa các segment: trang nào tự khai `openGraph` là thay sạch khối của
 * layout, nên một trang danh mục khai riêng `og:title` sẽ mất luôn `og:image`
 * của cả site. Gom vào một hàm là cách duy nhất để không trang nào lọt lưới.
 */
export function pageMetadata({
  title,
  description,
  url,
  type = "website",
  images = ogFallback,
  article,
}: {
  title: string;
  description?: string;
  /** Đường dẫn tương đối; nó vừa là canonical vừa là `og:url`. */
  url: string;
  type?: "website" | "article" | "profile";
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  article?: { publishedTime?: string; modifiedTime?: string };
}): Metadata {
  // Kích thước đọc từ file trong public/ khi trang không tự khai — mọi ảnh bài
  // đều là ảnh cục bộ, nên không trang nào phải nhớ tự đo.
  images = images.map((image) =>
    image.width && image.height
      ? image
      : { ...image, ...localDimensions(decodeURIComponent(new URL(image.url, site.url).pathname)) },
  );

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url: absoluteUrl(url),
      title,
      description,
      siteName: site.name,
      locale: site.locale,
      images,
      ...(type === "article" && article ? article : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

/**
 * Page metadata derived from a document. Every page gets a canonical URL —
 * without one, the trailing-slash and query-string variants of a URL compete
 * with each other in the index.
 */
export function docMetadata(doc: Doc): Metadata {
  const isPost = doc.collection === "posts";

  return pageMetadata({
    title: doc.title,
    description: doc.description,
    url: doc.url,
    type: isPost ? "article" : "website",
    images: doc.image
      ? [{ url: absoluteUrl(doc.image), alt: doc.imageAlt || doc.title }]
      : ogFallback,
    ...(isPost
      ? { article: { publishedTime: withZone(doc.date), modifiedTime: withZone(doc.updated) } }
      : {}),
  });
}

/* --- Cấu trúc dữ liệu ------------------------------------------------------

   Mỗi trang phát ra đúng một khối JSON-LD, và khối đó là một `@graph`: các nút
   rời (WebSite, Person, WebPage, BreadcrumbList, Recipe…) nối
   với nhau bằng `@id` thay vì lặp lại nội dung của nhau. Đây là điều kiện để
   Google gom cả trang về một thực thể duy nhất: nó đọc "bài này thuộc trang
   này, trang này thuộc website này, website này của người này, bài do người
   này viết" thành một đường liền mạch, chứ không phải bốn mẩu rời không biết
   có nói về cùng một thứ hay không.

   Quy ước `@id`: thực thể toàn site neo ở "/#…", thực thể của một trang neo ở
   "<url trang>#…". Một `@id` chỉ được định nghĩa đầy đủ ở đúng một chỗ; mọi
   nơi khác chỉ tham chiếu tới nó. */

type JsonLd = Record<string, unknown>;
type Node = JsonLd & { "@type": string | string[]; "@id": string };

export const ID = {
  website: absoluteUrl("/#website"),
  logo: absoluteUrl("/#logo"),
  person: absoluteUrl("/#tac-gia"),
} as const;

/** Tham chiếu tới một nút khác trong graph — chỉ `@id`, không lặp nội dung. */
const ref = (id: string) => ({ "@id": id });

const LANG = "vi-VN";

/**
 * Ngày của bài lấy từ trường `date`/`modified` của WordPress — giờ địa phương
 * của site (Asia/Ho_Chi_Minh), không kèm múi giờ. Thiếu múi giờ thì Google tự
 * đoán, và có thể lệch 7 tiếng sang ngày hôm trước. Ngày đã có múi thì giữ nguyên.
 */
export function withZone(date: string): string;
export function withZone(date: string | undefined): string | undefined;
export function withZone(date?: string) {
  if (!date) return date;
  return /(Z|[+-]\d\d:?\d\d)$/.test(date) || !date.includes("T") ? date : `${date}+07:00`;
}

/** Kích thước thật của ảnh trong public/ — Google đọc nó để chọn ảnh cho kết quả giàu thông tin. */
function dimensions(url: string) {
  const size = localDimensions(decodeURIComponent(new URL(url, site.url).pathname));
  return size ? { width: size.width, height: size.height } : {};
}

export const pageId = (url: string) => `${absoluteUrl(url)}#trang`;
const breadcrumbId = (url: string) => `${absoluteUrl(url)}#duong-dan`;
const imageId = (url: string) => `${absoluteUrl(url)}#anh-chinh`;
const listId = (url: string) => `${absoluteUrl(url)}#danh-sach`;
const faqId = (url: string) => `${absoluteUrl(url)}#cau-hoi`;

/**
 * `@id` của nội dung chính trên một trang bài. Hàm này là điểm duy nhất quyết
 * định danh tính của một bài, nên một công thức được nhắc ở trang tác giả và
 * chính nó ở trang bài luôn mang cùng một `@id`.
 */
const entityId = (doc: Doc) =>
  `${absoluteUrl(doc.url)}#${isRecipe(doc) ? "cong-thuc" : "bai-viet"}`;

/** Một bài chỉ được coi là công thức khi có đủ cả nguyên liệu lẫn các bước. */
function isRecipe(doc: Doc): boolean {
  return Boolean(doc.recipe?.ingredients?.length && doc.recipe.steps?.length);
}

/* --- Nút dùng chung toàn site --------------------------------------------- */

/**
 * WebSite + Person, đi kèm mọi trang.
 *
 * Đây là site cá nhân: người viết cũng là người đứng tên site, nên `publisher`
 * của website và của mọi bài là chính Person đó — không dựng ra một
 * Organization không có thật. Google chấp nhận Person làm publisher, và một
 * "tổ chức" chỉ có một người mà không ghi như vậy là thông tin sai về danh tính.
 *
 * Hai nút này lặp lại trên từng trang là cố ý: mỗi trang phải tự đứng được như
 * một graph đầy đủ, vì Google đọc từng URL một chứ không ghép graph giữa các
 * URL. Chi phí là vài trăm byte, đổi lại `author` và `publisher` của mọi bài
 * đều trỏ tới một thực thể có thật ngay trong cùng khối.
 */
function siteNodes(): Node[] {
  return [
    {
      "@type": "WebSite",
      "@id": ID.website,
      url: absoluteUrl("/"),
      name: site.name,
      alternateName: site.title,
      description: site.description,
      inLanguage: LANG,
      // Logo là nhận diện của website, không phải ảnh chân dung của người viết.
      image: ref(ID.logo),
      author: ref(ID.person),
      publisher: ref(ID.person),
      // Ô tìm kiếm của trang công thức đọc `?q=`; khai báo nó ở đây là cách
      // Google biết trang có tìm kiếm nội bộ và dẫn thẳng vào kết quả.
      potentialAction: [
        {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: absoluteUrl("/cong-thuc/?q={search_term_string}"),
          },
          "query-input": "required name=search_term_string",
        },
      ],
    },
    {
      "@type": "ImageObject",
      "@id": ID.logo,
      url: absoluteUrl(site.logo),
      contentUrl: absoluteUrl(site.logo),
      ...dimensions(site.logo),
      caption: site.name,
      inLanguage: LANG,
    },
    {
      "@type": "Person",
      "@id": ID.person,
      name: site.author.name,
      description: site.author.bio,
      jobTitle: site.author.role,
      url: absoluteUrl(site.author.url),
      // Trang hồ sơ là "trang chủ" của thực thể này; hai chiều liên kết
      // (Person → trang, ProfilePage → Person) khoá danh tính lại. URL thật,
      // không phải `@id`: nút ProfilePage chỉ có mặt trên chính trang hồ sơ,
      // nên ở 37 trang còn lại một tham chiếu `@id` sẽ treo lơ lửng.
      mainEntityOfPage: absoluteUrl(site.author.url),
      // Người đứng tên liên hệ được và nói rõ cách mình làm nội dung — tín hiệu
      // E-E-A-T rẻ nhất. Email lấy từ chính trang /lien-he/, nên hai nơi không
      // thể nói khác nhau.
      email: site.email,
      publishingPrinciples: absoluteUrl("/quy-trinh-san-xuat-noi-dung/"),
      knowsAbout: ["Bánh đúc", "Ẩm thực Việt Nam", "Công thức nấu ăn"],
    },
  ];
}

/* --- Nút cấp trang -------------------------------------------------------- */

function imageNode(pageUrl: string, image: { url: string; alt?: string }): Node {
  return {
    "@type": "ImageObject",
    "@id": imageId(pageUrl),
    url: absoluteUrl(image.url),
    contentUrl: absoluteUrl(image.url),
    ...dimensions(image.url),
    ...(image.alt ? { caption: image.alt } : {}),
    inLanguage: LANG,
  };
}

function breadcrumbNode(pageUrl: string, trail: { name: string; url: string }[]): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId(pageUrl),
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

/**
 * Danh sách công thức của một trang chuyên mục. Nó nói cho Google biết trang
 * là danh sách của cái gì — điều kiện để một trang danh mục được hiển thị dạng
 * băng chuyền thay vì một đoạn trích. Mỗi mục trỏ bằng URL tuyệt đối, tức là
 * trỏ thẳng tới trang có `Recipe` đầy đủ.
 */
export function itemListNode(pageUrl: string, docs: Doc[], name?: string): Node {
  return {
    "@type": "ItemList",
    "@id": listId(pageUrl),
    ...(name ? { name } : {}),
    numberOfItems: docs.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: docs.map((doc, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: doc.title,
      url: absoluteUrl(doc.url),
      // Băng chuyền công thức là băng chuyền ảnh: một mục không có ảnh thì
      // không được vẽ, dù cả danh sách hợp lệ.
      ...(doc.image ? { image: absoluteUrl(doc.image) } : {}),
    })),
  };
}

/**
 * Khối câu hỏi thường gặp của một trang.
 *
 * Một lưu ý để không kỳ vọng nhầm: từ 8/2023 Google chỉ còn hiển thị FAQ rich
 * result cho website chính phủ và y tế, nên khối này gần như chắc chắn **không**
 * tạo ra accordion trên SERP. Nó vẫn đáng phát vì hai lý do khác: nó nói rõ cho
 * máy đọc biết đâu là cặp hỏi–đáp trên trang, và chính phần nội dung ấy mới là
 * thứ bắt các truy vấn đuôi dài. Câu trả lời phải có thật trong HTML — xem luật
 * tương ứng trong `scripts/check-html.ts`.
 *
 * Nó là một nút riêng (`#cau-hoi`) chứ không phải kiểu của cả trang: trang này
 * là một công thức có kèm hỏi–đáp, không phải một trang hỏi–đáp.
 */
export function faqNode(url: string, faq: { q: string; a: string }[]): Node {
  return {
    "@type": "FAQPage",
    "@id": faqId(url),
    inLanguage: LANG,
    isPartOf: ref(pageId(url)),
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/**
 * Nội dung chính của một trang bài: `Recipe` khi frontmatter khai báo đủ một
 * công thức, còn lại là `Article`. Markup công thức là thứ mang lại kết quả
 * giàu thông tin (ảnh, thời gian nấu) trên SERP tiếng Việt, nên nó chỉ được
 * phát ra khi nguyên liệu và các bước thật sự có mặt — không bao giờ đoán.
 *
 * `full: false` dùng cho chỗ nhắc lại bài ở trang khác (danh sách bài của tác
 * giả): cùng `@id`, nhưng chỉ những trường đủ để nhận diện, vì phần thân của
 * bài thuộc về trang của chính nó.
 */
export function entityNode(
  doc: Doc,
  { stepAnchors = [], full = true }: { stepAnchors?: (string | undefined)[]; full?: boolean } = {},
): Node {
  // Trên chính trang của bài, ảnh là một nút ImageObject có `@id` nên bài và
  // trang dùng chung một ảnh. Khi bài chỉ được nhắc lại ở trang khác, nút đó
  // không có mặt trong graph, nên phải là URL thật chứ không phải tham chiếu
  // treo lơ lửng.
  const image = !doc.image
    ? absoluteUrl("/og.png")
    : full
      ? ref(imageId(doc.url))
      : absoluteUrl(doc.image);
  const base = {
    "@id": entityId(doc),
    url: absoluteUrl(doc.url),
    name: doc.title,
    ...(doc.description ? { description: doc.description } : {}),
    image,
    datePublished: withZone(doc.date),
    dateModified: withZone(doc.updated || doc.date),
    inLanguage: LANG,
    // Người thật, không phải tổ chức: Google đọc `author` của Article/Recipe
    // như người chịu trách nhiệm nội dung. Ở đây chỉ là một tham chiếu — nút
    // Person đầy đủ nằm cùng graph, phát ra bởi `siteNodes()`.
    author: ref(ID.person),
    publisher: ref(ID.person),
    // Neo bài vào đúng trang chứa nó, và trang vào website. Bản nhắc lại ở
    // trang khác không có nút WebPage của bài trong graph — cùng lý do với
    // `image` ở trên, nó trỏ bằng URL thật thay vì một `@id` treo.
    ...(full
      ? { mainEntityOfPage: ref(pageId(doc.url)), isPartOf: ref(pageId(doc.url)) }
      : { mainEntityOfPage: absoluteUrl(doc.url) }),
  };

  const r = doc.recipe;
  if (!isRecipe(doc) || !r) {
    return { "@type": "Article", ...base, headline: doc.title };
  }

  // Bản nhắc lại cố tình khai kiểu rộng `CreativeWork` thay vì `Recipe`:
  // `Recipe` đầy đủ chỉ được khai ở trang của chính công thức, còn ở đây một
  // `Recipe` thiếu nguyên liệu và các bước sẽ vừa là dữ liệu thiếu, vừa khiến
  // Google tưởng trang tác giả cũng là nơi đăng công thức. `@id` giữ nguyên
  // nên vẫn là cùng một thực thể — chỉ khác lượng thông tin nói ra ở mỗi nơi.
  if (!full) return { "@type": "CreativeWork", ...base };

  const totalTime = toDuration(recipeTimes(r).total);
  // Ảnh của mỗi bước là ảnh tác giả đặt ngay dưới tiêu đề bước đó trong bài —
  // không bước nào mượn ảnh đại diện hay ảnh của bước khác.
  const images = stepImages(doc.body, stepAnchors);
  // Từ khoá là các nhãn phân loại của bài, không phải tiêu đề nhồi lại: Google
  // đọc `keywords` như thẻ, và một câu dài ở đây chỉ là spam.
  const keywords = ["Bánh đúc", doc.group, doc.region, r.category]
    .filter((value, i, all) => Boolean(value) && all.indexOf(value) === i)
    .join(", ");

  return {
    "@type": "Recipe",
    ...base,
    recipeIngredient: r.ingredients,
    recipeInstructions: r.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
      // Trỏ tới đúng tiêu đề mà bước được rút ra, để URL dẫn tới cách làm chứ
      // không phải một mảnh neo không tồn tại.
      ...(stepAnchors[i] ? { url: `${absoluteUrl(doc.url)}#${stepAnchors[i]}` } : {}),
      ...(images[i] ? { image: absoluteUrl(images[i]) } : {}),
    })),
    ...(r.prepTime ? { prepTime: r.prepTime } : {}),
    ...(r.cookTime ? { cookTime: r.cookTime } : {}),
    // Google đọc totalTime; phần lớn bài chỉ khai báo hai nửa.
    ...(totalTime ? { totalTime } : {}),
    ...recipeYieldLd(r.yield),
    recipeCategory: r.category ?? "Món ăn vặt",
    recipeCuisine: r.cuisine ?? "Việt Nam",
    // Chỉ khai chế độ ăn khi công thức thật sự đáp ứng — dữ liệu tay ở
    // `lib/editorial.ts`, không suy ra từ tiêu đề.
    ...(doc.diet?.length ? { suitableForDiet: doc.diet } : {}),
    ...nutritionLd(doc),
    ...ratingLd(doc),
    keywords,
  };
}

/**
 * Google muốn `recipeYield` là số phần ăn dạng con số, và cần nó để hiểu
 * `nutrition` tính cho một phần. Bài ghi "4 – 6 người ăn": khai cả con số đầu
 * (khớp `servingSize` của khối dinh dưỡng, cũng lấy đầu ít người) lẫn nguyên
 * văn để không mất thông tin.
 */
function recipeYieldLd(text?: string): JsonLd {
  if (!text) return {};
  const servings = text.match(/\d+/)?.[0];
  if (!servings || servings === text.trim()) return { recipeYield: text };
  return { recipeYield: [servings, text] };
}

/**
 * `nutrition` của Recipe — chỉ cho bài có trong `lib/nutrition.ts`, và luôn là
 * đúng con số trang hiện ra. Khẩu phần ghi khoảng ("4 – 6 người") thì schema
 * lấy đầu ít người (phần to hơn): thà khai dư calo một phần còn hơn khai thiếu.
 */
function nutritionLd(doc: Doc): JsonLd {
  const nutrition = getNutrition(doc);
  if (!nutrition) return {};
  const servings = nutrition.servings[0];
  const each = perServing(nutrition.total, servings);
  return {
    nutrition: {
      "@type": "NutritionInformation",
      servingSize: `1 phần (1/${servings} công thức)`,
      calories: `${each.kcal} calories`,
      carbohydrateContent: `${each.carbs} g`,
      fatContent: `${each.fat} g`,
      proteinContent: `${each.protein} g`,
    },
  };
}

/**
 * `aggregateRating` — chỉ từ phiếu chấm thật của người đọc (`lib/ratings.ts`),
 * và chỉ khi đủ lượt. Con số là đúng con số khối "Đánh giá công thức" hiện ra.
 */
function ratingLd(doc: Doc): JsonLd {
  const rating = publicRating(doc.slug);
  if (!rating) return {};
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: rating.value,
      ratingCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    },
  };
}

/* --- Graph của một trang -------------------------------------------------- */

type PageInput = {
  /** WebPage, hoặc kiểu hẹp hơn khi trang có vai trò rõ ràng. */
  type?: string | string[];
  url: string;
  name: string;
  description?: string;
  image?: { url: string; alt?: string };
  datePublished?: string;
  dateModified?: string;
  trail?: { name: string; url: string }[];
  /** Nút chính của trang; WebPage sẽ trỏ `mainEntity` tới nó. */
  mainEntity?: Node | { "@id": string };
  /** Chủ đề của trang, khi nó nói về một thực thể đã có trong graph. */
  about?: { "@id": string };
  /** Các nội dung nằm trong trang này — dùng cho kho bài của tác giả. */
  hasPart?: JsonLd[];
  /** Nút phụ cần có mặt trong cùng graph. */
  nodes?: JsonLd[];
};

/**
 * Dựng graph hoàn chỉnh cho một trang: nút site + WebPage + đường dẫn + nội
 * dung chính, tất cả đã nối `@id`. Mọi route đều đi qua đây, nên không trang
 * nào còn phát ra một mảnh JSON-LD đứng rời.
 */
export function pageLd({
  type = "WebPage",
  url,
  name,
  description,
  image,
  datePublished,
  dateModified,
  trail,
  mainEntity,
  about,
  hasPart,
  nodes = [],
}: PageInput): JsonLd {
  const picture = image ? imageNode(url, image) : undefined;

  const webPage: Node = {
    "@type": type,
    "@id": pageId(url),
    url: absoluteUrl(url),
    name,
    ...(description ? { description } : {}),
    isPartOf: ref(ID.website),
    inLanguage: LANG,
    ...(picture
      ? { primaryImageOfPage: ref(picture["@id"]), image: ref(picture["@id"]) }
      : {}),
    ...(datePublished ? { datePublished: withZone(datePublished) } : {}),
    ...(dateModified ? { dateModified: withZone(dateModified) } : {}),
    ...(trail?.length ? { breadcrumb: ref(breadcrumbId(url)) } : {}),
    ...(mainEntity ? { mainEntity: ref(mainEntity["@id"] as string) } : {}),
    ...(about ? { about } : {}),
    ...(hasPart?.length ? { hasPart } : {}),
    potentialAction: [{ "@type": "ReadAction", target: [absoluteUrl(url)] }],
  };

  const main = mainEntity && "@type" in mainEntity ? [mainEntity as Node] : [];

  return {
    "@context": "https://schema.org",
    "@graph": [
      ...siteNodes(),
      webPage,
      ...(picture ? [picture] : []),
      ...(trail?.length ? [breadcrumbNode(url, trail)] : []),
      ...main,
      ...nodes,
    ],
  };
}

/** Graph cho một trang bài (bài viết hoặc công thức). */
export function docPageLd(
  doc: Doc,
  trail: { name: string; url: string }[],
  stepAnchors: (string | undefined)[] = [],
): JsonLd {
  // Những trang tĩnh có vai trò riêng: khai đúng kiểu thì Google hiểu đây là
  // trang giới thiệu / liên hệ của người đứng tên site, không phải một bài viết nữa.
  const STATIC_TYPES: Record<string, string> = {
    "ve-chung-toi": "AboutPage",
    "lien-he": "ContactPage",
    "quy-trinh-san-xuat-noi-dung": "AboutPage",
    "dieu-khoan-chinh-sach": "WebPage",
  };
  const staticType = doc.collection === "pages" ? STATIC_TYPES[doc.slug] : undefined;

  return pageLd({
    type: staticType ?? "WebPage",
    url: doc.url,
    name: doc.title,
    description: doc.description,
    image: doc.image ? { url: doc.image, alt: doc.imageAlt || doc.title } : undefined,
    datePublished: doc.date,
    dateModified: doc.updated || doc.date,
    trail,
    // Trang tĩnh không phải bài viết, nên nó không mang một Article nào cả —
    // nội dung chính của nó là chính nó. Nó chỉ nói mình nói về người đứng tên site.
    ...(staticType
      ? { about: ref(ID.person) }
      : { mainEntity: entityNode(doc, { stepAnchors }) }),
    ...(doc.faq?.length
      ? { hasPart: [ref(faqId(doc.url))], nodes: [faqNode(doc.url, doc.faq)] }
      : {}),
  });
}

/** Graph cho một trang danh sách công thức (trang chủ, /cong-thuc/, nhóm). */
export function listPageLd({
  url,
  name,
  description,
  trail,
  docs,
  type = "CollectionPage",
  about,
}: {
  url: string;
  name: string;
  description?: string;
  trail?: { name: string; url: string }[];
  docs: Doc[];
  type?: string;
  about?: { "@id": string };
}): JsonLd {
  return pageLd({
    type,
    url,
    name,
    description,
    trail,
    about,
    mainEntity: itemListNode(url, docs, name),
  });
}

/**
 * Trang tác giả. `ProfilePage` là kiểu Google đọc cho một hồ sơ người thật, và
 * `mainEntity` neo về đúng `@id` mà mọi bài viết đã trỏ tới ở `author` — ba
 * nơi (nút site, bài viết, trang hồ sơ) cùng nói về một thực thể. `hasPart`
 * nhắc lại các bài bằng chính `@id` của chúng, nên danh sách này và bản đầy đủ
 * ở trang bài là một, không phải hai bản sao.
 */
export function profilePageLd(docs: Doc[], trail: { name: string; url: string }[]): JsonLd {
  const dates = docs.map((doc) => doc.updated || doc.date).filter(Boolean).sort();

  return pageLd({
    type: "ProfilePage",
    url: site.author.url,
    name: site.author.name,
    description: `${site.author.role}. ${site.author.bio}`,
    trail,
    ...(dates.length ? { datePublished: dates[0], dateModified: dates.at(-1) } : {}),
    mainEntity: ref(ID.person),
    hasPart: docs.map((doc) => entityNode(doc, { full: false })),
  });
}

/** Renders a JSON-LD block. Content is our own data, never user input. */
export function JsonLdScript({ data }: { data: JsonLd }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
