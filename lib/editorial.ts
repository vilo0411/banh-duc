/**
 * Lớp biên tập: những gì con người sửa tay đè lên dữ liệu máy migrate về.
 *
 * `npm run migrate` ghi đè từng file trong `content/posts/` và `content/pages/`
 * (scripts/migrate-wp.ts), nên mọi chỉnh tay trong MDX đều bị xoá ở lần migrate
 * sau. File này nằm ngoài `content/` nên nó sống sót — cùng kiểu dữ liệu tay
 * như `lib/collections.ts` và `lib/ingredients.ts`.
 *
 * Quy tắc: chỉ ghi ở đây những gì bản migrate làm SAI hoặc không có. Thứ nào
 * frontmatter đã đúng thì để nguyên, đừng chép lại — chép lại là tạo ra hai
 * nguồn sự thật cho cùng một trường.
 */

/** Giới hạn Google cắt snippet. Dài hơn là chắc chắn bị cắt giữa câu. */
export const DESCRIPTION_LIMIT = 155;

export type Editorial = {
  /**
   * Meta description viết tay, ≤ DESCRIPTION_LIMIT ký tự.
   *
   * Bản migrate lấy excerpt WordPress cắt cứng ở 300 ký tự, nên cả 23 bài đều
   * dài 330–360 ký tự và kết thúc bằng "…" — một câu cụt giữa chừng trên mọi
   * kết quả tìm kiếm. Mỗi câu dưới đây phải tự đứng được khi đọc rời khỏi
   * trang: nói món gì, làm từ gì, kết quả ra sao.
   */
  description?: string;
  /**
   * Vùng miền, chỉ khi bài viết tự nói ra. Xem `Doc.region` — bất biến của
   * trường này là "bài có nhắc thì mới gán", vì nó vừa chảy vào `keywords`
   * của Recipe schema vừa quyết định trang nhóm nào chứa bài.
   */
  region?: string;
  /** `schema.org/RestrictedDiet`, chỉ khi công thức thật sự đáp ứng. */
  diet?: string[];
  /** Alt cho ảnh đại diện, khi bản migrate không mang về. */
  imageAlt?: string;
  /**
   * Vá các trường `recipe` mà frontmatter thiếu. Chỉ điền được khi thân bài
   * nói ra con số — mỗi giá trị dưới đây phải kèm trích dẫn chỗ lấy ra.
   */
  recipe?: {
    prepTime?: string;
    cookTime?: string;
    yield?: string;
    difficulty?: string;
  };
  /** Câu hỏi thường gặp, render ra HTML và phát kèm FAQPage. */
  faq?: { q: string; a: string }[];
};

export const editorial: Record<string, Editorial> = {
  /* --- Công thức ---------------------------------------------------------- */

  "cach-lam-banh-duc-nong": {
    description:
      "Cách làm bánh đúc nóng Hà Nội: bột gạo pha bột năng khuấy đến trong, chan thịt băm mộc nhĩ và nước mắm chua ngọt, ăn nóng trong bát.",
    faq: [
      {
        q: "Bánh đúc nóng bị vón cục khi khuấy thì xử lý thế nào?",
        a: "Vón cục là do đổ bột vào nước đã nóng. Hoà bột với nước nguội cho tan hết rồi mới bắc lên bếp, khuấy liên tục ở lửa nhỏ. Nếu đã vón, lọc hỗn hợp qua rây rồi khuấy lại.",
      },
      {
        q: "Tỉ lệ bột gạo và bột năng thế nào cho bánh đúc nóng?",
        a: "Công thức trong bài dùng bột gạo làm nền và bột năng để tạo độ dẻo kéo sợi. Càng nhiều bột năng bánh càng dẻo dai; càng nhiều bột gạo bánh càng mềm và dễ tan trong miệng.",
      },
      {
        q: "Bánh đúc nóng để nguội có ăn được không?",
        a: "Được, nhưng bánh sẽ đặc lại và mất độ sánh. Hâm lại bằng cách cho thêm chút nước nóng rồi khuấy đều trên lửa nhỏ cho đến khi bánh sánh trở lại.",
      },
      {
        q: "Không có mộc nhĩ thì thay bằng gì?",
        a: "Nấm hương ngâm nở thái nhỏ cho vị đậm hơn, hoặc nấm mèo. Phần nhân cần một nguyên liệu giòn để cân với bột mềm, nên đừng bỏ hẳn.",
      },
    ],
  },

  "cach-lam-banh-duc-man": {
    description:
      "Cách làm bánh đúc mặn theo cả kiểu Bắc và Nam: bột gạo hấp mềm, nhân thịt tôm đậm đà, chan nước mắm pha chua ngọt ăn kèm rau sống.",
    faq: [
      {
        q: "Bánh đúc mặn miền Bắc và miền Nam khác nhau ở đâu?",
        a: "Bản miền Bắc thiên về bột gạo và nước mắm chua ngọt, ăn nóng. Bản miền Nam pha nước cốt dừa vào bột nên bánh béo và trắng ngà, nhân thường có tôm khô và củ sắn, ăn nguội. Bài này hướng dẫn cả hai.",
      },
      {
        q: "Bánh bị nhão không đông thì làm sao?",
        a: "Do tỉ lệ nước quá cao hoặc bột chưa chín tới. Khuấy đến khi bột trong và kéo được thành khối rời đáy nồi mới đổ khuôn, và để bánh nguội hẳn trước khi cắt.",
      },
      {
        q: "Làm trước được bao lâu?",
        a: "Bánh cắt miếng để ngăn mát dùng trong 2 ngày. Nhân và nước mắm để riêng, khi ăn mới chan, không bánh sẽ ỉu.",
      },
    ],
  },

  "banh-duc-lac": {
    description:
      "Cách làm bánh đúc lạc truyền thống với nước vôi trong: bánh giòn mát, lạc rang bùi, cắt miếng chấm tương bần hoặc nước mắm gừng.",
    faq: [
      {
        q: "Nước vôi trong có bắt buộc không, thay bằng gì được?",
        a: "Nước vôi trong là thứ tạo độ giòn và mùi đặc trưng của bánh đúc cổ truyền — bỏ đi thì bánh chỉ còn mềm, không giòn. Nếu không có, thay một phần bột gạo bằng bột năng để bù độ dai, nhưng kết cấu sẽ khác bản gốc.",
      },
      {
        q: "Pha nước vôi trong thế nào cho an toàn?",
        a: "Hoà vôi ăn trầu vào nước, để lắng 1–2 tiếng rồi chỉ chắt lấy phần nước trong phía trên, bỏ hết cặn dưới đáy. Chỉ dùng vôi ăn trầu, không dùng vôi xây dựng.",
      },
      {
        q: "Bánh đúc lạc chấm gì ngon nhất?",
        a: "Tương bần là bản cổ truyền miền Bắc. Nước mắm gừng hoặc mắm tôm chanh ớt cũng hợp; xem thêm bài nước chấm bánh đúc.",
      },
      {
        q: "Lạc nên rang hay luộc?",
        a: "Bài này ngâm rồi nấu cùng bột nên hạt lạc mềm bùi, hợp với bánh giòn. Lạc rang giã dập rắc lên trên khi ăn cho thêm mùi thơm cũng rất hợp.",
      },
    ],
  },

  "banh-duc-rieu-cua": {
    description:
      "Cách làm bánh đúc riêu cua chuẩn vị miền Bắc: bánh đúc mềm chan riêu cua đồng gạch béo, nước dùng chua thanh, ăn nóng kèm rau ghém.",
    faq: [
      {
        q: "Dùng cua đồng xay sẵn có được không?",
        a: "Được, nhưng phải chọn loại xay trong ngày và lọc lại qua rây cho hết vỏ. Cua tươi tự giã cho gạch nhiều và nước ngọt hơn hẳn.",
      },
      {
        q: "Làm sao để riêu cua đóng bánh, không tan ra nước?",
        a: "Đun lửa vừa và tuyệt đối không khuấy khi nước bắt đầu nóng — thịt cua sẽ tự nổi kết thành mảng. Khuấy lúc này là riêu vỡ vụn.",
      },
      {
        q: "Tạo vị chua bằng gì?",
        a: "Giấm bỗng cho vị chua dịu đúng kiểu Bắc. Không có thì dùng me hoặc quả dọc, tránh giấm gạo vì vị chua gắt và không thơm.",
      },
    ],
  },

  "cach-lam-banh-duc-nom": {
    description:
      "Cách làm bánh đúc nộm Hà Nội: bánh đúc thái sợi trộn giá chần, rau thơm và nước canh lạc vừng béo mát — món quà chiều mùa hè.",
    faq: [
      {
        q: "Bánh đúc nộm khác bánh đúc nóng thế nào?",
        a: "Bánh đúc nộm ăn nguội, bánh thái sợi và chan nước canh lạc vừng trắng đục, vị béo mát. Bánh đúc nóng ăn nóng trong bát với thịt băm và nước mắm chua ngọt.",
      },
      {
        q: "Nước canh lạc vừng pha thế nào cho không bị tách nước?",
        a: "Xay lạc và vừng đã rang với nước rồi lọc kỹ, đun ấm và khuấy đều tay. Để nguội hẳn mới chan; nếu tách lớp thì khuấy lại trước khi dùng.",
      },
      {
        q: "Ăn kèm rau gì?",
        a: "Giá chần, kinh giới, tía tô và rau mùi. Rau thơm là phần làm nên vị của món này chứ không phải trang trí.",
      },
    ],
  },

  "cach-lam-banh-duc-tau": {
    description:
      "Cách làm bánh đúc tàu Hải Phòng: bánh bột gạo cắt vuông ăn cùng tôm, thịt, đu đủ và su hào, chan nước mắm chua ngọt ấm.",
    faq: [
      {
        q: "Bánh đúc tàu có phải món của người Hoa không?",
        a: "Món này ở Hải Phòng có gốc từ cộng đồng người Hoa và đã thành đặc sản riêng của thành phố, khác với bánh đúc người Hoa kiểu Chợ Lớn.",
      },
      {
        q: "Đu đủ và su hào có thay được không?",
        a: "Hai thứ này cho độ giòn và vị ngọt nhẹ đặc trưng. Thiếu thì thay bằng củ đậu hoặc cà rốt, nhưng nên giữ ít nhất một loại củ giòn.",
      },
      {
        q: "Nước chấm ăn nóng hay nguội?",
        a: "Chan lúc còn ấm. Đây là điểm khác biệt của bánh đúc tàu so với các loại bánh đúc chấm nước mắm nguội.",
      },
    ],
  },

  "cach-lam-banh-duc-ngo": {
    description:
      "Cách làm bánh đúc ngô kiểu vùng cao: ngô nếp xay mịn nấu cùng bột gạo, bánh vàng thơm mùi ngô, ăn ngọt hoặc chấm mật đều hợp.",
    faq: [
      {
        q: "Dùng ngô tươi hay bột ngô khô?",
        a: "Ngô nếp tươi xay cho mùi thơm và vị ngọt tự nhiên rõ hơn hẳn. Bột ngô khô tiện hơn nhưng phải ngâm đủ lâu, và bánh sẽ nhạt mùi.",
      },
      {
        q: "Bánh bị lợn cợn hạt ngô thì sao?",
        a: "Lọc hỗn hợp ngô xay qua rây mắt nhỏ trước khi nấu. Phần xác giữ lại có thể trộn vào cuối nếu thích ăn có hạt.",
      },
      {
        q: "Ăn bánh đúc ngô với gì?",
        a: "Vùng cao thường ăn chay với mật mía hoặc mật ong. Chấm muối vừng cũng hợp nếu muốn vị mặn.",
      },
    ],
  },

  "banh-duc-mien-trung": {
    description:
      "Cách làm bánh đúc miền Trung: bột gạo hấp mịn, ăn cùng nhân tôm thịt đậm đà và nước mắm cay — vị mặn mà đặc trưng của miền Trung.",
    faq: [
      {
        q: "Bánh đúc miền Trung khác bánh đúc miền Bắc ở chỗ nào?",
        a: "Miền Trung nêm đậm và cay hơn, nhân thường mặn rõ vị, nước chấm nhiều ớt. Miền Bắc thiên về vị thanh, chấm tương bần hoặc nước mắm chua ngọt nhẹ.",
      },
      {
        q: "Hấp bánh bao lâu là chín?",
        a: "Tuỳ độ dày lớp bột. Bánh chín khi mặt bánh trong đều và xiên tăm vào rút ra không dính bột ướt.",
      },
      {
        q: "Làm sao để bánh không dính khuôn?",
        a: "Quét một lớp dầu mỏng lên khuôn trước khi đổ bột, và để bánh nguội hẳn rồi mới lấy ra.",
      },
    ],
  },

  "banh-duc-hue": {
    description:
      "Cách làm bánh đúc Huế dẻo mịn chuẩn vị cố đô: bột gạo pha bột năng khuấy trên lửa nhỏ, hấp chín tới, chấm mắm nêm dứa tỏi ớt.",
    // Bản migrate về không có trường thời gian, khẩu phần lẫn độ khó nào, nên
    // dải thông số dưới tiêu đề không hiện và Recipe schema thiếu hẳn bốn
    // trường Google đòi. Bốn giá trị dưới đây đọc ra từ chính thân bài:
    //   · nghỉ bột "khoảng 30 phút" + pha mắm nêm  → prepTime PT40M
    //   · khuấy bột trên bếp + hấp "15-20 phút"    → cookTime PT35M
    //   · 300g bột gạo + 1 lít nước                → 4 người ăn
    //   · khuấy bột liên tục, hấp canh giờ         → Trung bình
    recipe: {
      prepTime: "PT40M",
      cookTime: "PT35M",
      yield: "4 người ăn",
      difficulty: "Trung bình",
    },
    imageAlt: "Bánh đúc Huế dẻo mịn cắt miếng, chấm mắm nêm",
    faq: [
      {
        q: "Vì sao mặt bánh đúc Huế bị rỗ khi hấp?",
        a: "Do hơi nước đọng trên nắp nồi nhỏ xuống. Phủ một chiếc khăn khô lên miệng nồi trước khi đậy nắp là mặt bánh phẳng mịn.",
      },
      {
        q: "Bột đã nghỉ 30 phút rồi có bỏ qua bước khuấy trên bếp được không?",
        a: "Không. Nghỉ bột chỉ để bột ngậm nước; khuấy trên lửa nhỏ mới là bước làm bột đặc sệt và đều. Bỏ bước này bánh sẽ lắng thành hai lớp khi hấp.",
      },
      {
        q: "Có cần nước vôi trong không?",
        a: "Không bắt buộc. Bài dùng bột năng để tạo độ dẻo dai. Nếu muốn bánh dai hơn và để được lâu hơn, thay khoảng 200ml nước lọc bằng nước vôi trong.",
      },
      {
        q: "Bánh đúc Huế ăn nóng hay nguội?",
        a: "Để bánh nguội hẳn trong khuôn rồi mới lấy ra và cắt miếng — cắt lúc còn nóng là bánh nát. Ăn nguội cùng mắm nêm pha dứa tỏi ớt.",
      },
    ],
  },

  "banh-duc-mam-nem": {
    description:
      "Cách làm bánh đúc mắm nêm đậm vị miền Trung: bánh đúc cắt miếng chan mắm nêm pha dứa, tỏi ớt, ăn kèm rau sống và đậu phộng rang.",
    faq: [
      {
        q: "Pha mắm nêm thế nào cho bớt nặng mùi?",
        a: "Đun mắm nêm với chút nước cho sôi nhẹ rồi để nguội, thêm dứa băm nhuyễn, tỏi ớt và đường. Dứa là thứ khử mùi và tạo vị ngọt hậu.",
      },
      {
        q: "Mắm nêm loại nào dùng được?",
        a: "Loại nguyên con hoặc đã xay đều được. Nguyên con cần lọc lấy nước, đổi lại vị đậm và thơm hơn.",
      },
      {
        q: "Ăn kèm rau gì?",
        a: "Xà lách, húng quế, giá và dưa leo. Đậu phộng rang giã dập rắc trên cùng.",
      },
    ],
  },

  "cach-lam-banh-duc-sot": {
    description:
      "Cách làm bánh đúc sốt xứ Thanh: bánh đúc xanh nấu với rau ngót, chan sốt tóp mỡ hành phi nóng hổi — đặc sản Thanh Hoá ăn ngay khi nóng.",
    faq: [
      {
        q: "Màu xanh của bánh đúc sốt từ đâu?",
        a: "Từ nước rau ngót giã lọc, không phải phẩm màu. Cho nước rau vào lúc bột gần chín để giữ màu, đun lâu quá màu sẽ xỉn.",
      },
      {
        q: "Bánh đúc sốt ăn thế nào cho đúng?",
        a: "Ăn ngay lúc còn nóng, múc ra bát rồi chan sốt tóp mỡ và hành phi lên trên. Để nguội bánh đặc lại và mất hẳn cái ngon.",
      },
      {
        q: "Không có tóp mỡ thì sao?",
        a: "Có thể dùng thịt ba chỉ thái hạt lựu rán vàng. Phần mỡ nước rưới lên là thứ làm nên vị béo của món này.",
      },
    ],
  },

  "banh-duc-tom-thit": {
    description:
      "Cách làm bánh đúc tôm thịt nước cốt dừa: bánh béo thơm, nhân tôm thịt xào củ đậu và cà rốt, chan mắm tỏi ớt chua ngọt ăn kèm rau.",
    faq: [
      {
        q: "Nước cốt dừa làm bánh dễ thiu hơn phải không?",
        a: "Đúng. Bánh có nước cốt dừa nên để ngăn mát và dùng trong 2 ngày, không để ngoài quá vài tiếng ở thời tiết nóng.",
      },
      {
        q: "Bánh bị chảy nước sau khi để tủ lạnh?",
        a: "Do bột chưa khuấy đủ chín trước khi đổ khuôn. Khuấy đến khi hỗn hợp đặc kéo được thành khối rời đáy nồi rồi mới đổ.",
      },
      {
        q: "Thay tôm tươi bằng tôm khô được không?",
        a: "Được, ngâm mềm rồi băm nhỏ, vị sẽ đậm và mặn hơn nên giảm gia vị lại.",
      },
    ],
  },

  "banh-duc-khoai-mon": {
    description:
      "Cách làm bánh đúc khoai môn nhân mặn: khoai môn bùi hoà bột gạo và nước cốt dừa, nhân tép thịt củ sắn, cắt miếng chấm nước mắm.",
    faq: [
      {
        q: "Chọn khoai môn thế nào cho bùi?",
        a: "Chọn củ chắc tay, ruột trắng có vân tím rõ, không bị sượng. Khoai môn cao (củ nhỏ dài) bùi hơn khoai sọ.",
      },
      {
        q: "Sơ chế khoai môn bị ngứa tay thì làm sao?",
        a: "Đeo găng khi gọt, hoặc để khoai ráo hẳn rồi mới gọt. Nếu đã ngứa, hơ tay trên lửa hoặc rửa với giấm.",
      },
      {
        q: "Nên nghiền nhuyễn hay để khoai còn miếng?",
        a: "Nghiền phần lớn để bột mịn, giữ lại một ít thái hạt lựu cho có miếng bùi khi ăn.",
      },
    ],
  },

  "cach-lam-banh-duc-nguoi-hoa": {
    description:
      "Cách làm bánh đúc người Hoa: bột gạo pha bột tàn mì cho bánh dai mịn, ăn cùng củ cải muối, tôm khô, dầu hành và hắc xì dầu.",
    faq: [
      {
        q: "Bột tàn mì là gì, thay được không?",
        a: "Bột tàn mì (bột lúa mì đã lọc hết gluten) làm bánh trong và dai. Không có thì tăng bột năng, nhưng bánh sẽ đục và dẻo dính hơn.",
      },
      {
        q: "Dầu hành làm thế nào?",
        a: "Phi hành tím thái lát trong dầu ở lửa nhỏ đến khi vàng đều rồi vớt ra. Giữ cả dầu lẫn hành phi — cả hai đều dùng khi ăn.",
      },
      {
        q: "Hắc xì dầu khác nước tương thường thế nào?",
        a: "Hắc xì dầu đặc, ngọt và màu đậm, dùng để tạo màu và vị ngọt hậu cho phần nhân. Nước tương thường mặn và loãng hơn, không thay ngang được.",
      },
    ],
  },

  "cach-lam-banh-duc-tu-com-nguoi": {
    description:
      "Cách làm bánh đúc từ cơm nguội: xay cơm thừa với bột năng thành bánh dẻo mịn, ăn cùng nhân thịt băm nấm mèo và mắm chua ngọt.",
    faq: [
      {
        q: "Cơm nguội để mấy ngày còn dùng được?",
        a: "Chỉ dùng cơm nguội trong ngày, bảo quản ngăn mát. Cơm có mùi chua hoặc nhớt thì bỏ, không xay.",
      },
      {
        q: "Xay cơm thế nào cho mịn?",
        a: "Xay cơm với nước theo tỉ lệ trong bài rồi lọc qua rây. Lọc là bước quyết định bánh mịn hay lợn cợn.",
      },
      {
        q: "Bánh có bị nặng mùi cơm không?",
        a: "Không, sau khi xay lọc và nấu chín thì mùi cơm gần như mất hẳn, chỉ còn vị bột gạo.",
      },
    ],
  },

  "banh-duc-gao-lut": {
    description:
      "Cách làm bánh đúc gạo lứt: bột gạo lứt nấu cùng nước hầm xương, nhân thịt nấm hương mộc nhĩ — món ăn nhiều chất xơ, ít tinh bột trắng.",
    faq: [
      {
        q: "Bánh đúc gạo lứt có hợp với người ăn kiêng không?",
        a: "Gạo lứt giữ được lớp cám nên nhiều chất xơ và no lâu hơn gạo trắng. Nhưng bài này vẫn dùng bột năng và nước hầm xương, nên nó là lựa chọn lành hơn chứ không phải món ăn kiêng nghiêm ngặt.",
      },
      {
        q: "Bột gạo lứt làm bánh có bị thô không?",
        a: "Có, đó là đặc tính của cám gạo. Pha thêm bột năng theo tỉ lệ trong bài để bù độ dẻo và mịn.",
      },
      {
        q: "Làm chay được không?",
        a: "Được, thay nước hầm xương bằng nước luộc nấm và rau củ, bỏ thịt và tăng nấm hương lên.",
      },
    ],
  },

  "banh-duc-chay": {
    description:
      "Cách làm bánh đúc chay: bột gạo khuấy mềm, nhân ba loại nấm băm xào thơm, chan nước tương chua ngọt — món chay đủ vị, không đồ mặn.",
    diet: ["https://schema.org/VeganDiet", "https://schema.org/VegetarianDiet"],
    faq: [
      {
        q: "Bánh đúc chay này có thuần chay không?",
        a: "Có. Nguyên liệu chỉ gồm bột gạo, nấm, dầu ăn và hạt nêm chay — không dùng sản phẩm từ động vật. Khi pha nước chấm nhớ dùng nước tương thay nước mắm.",
      },
      {
        q: "Dùng loại nấm nào?",
        a: "Bài dùng nấm bào ngư, nấm đùi gà và nấm rơm băm nhỏ. Trộn nhiều loại cho nhân có cả vị ngọt lẫn độ dai; chỉ một loại thì nhân đơn điệu.",
      },
      {
        q: "Làm sao nhân nấm không bị ra nước?",
        a: "Xào nấm ở lửa lớn cho nước bay hết rồi mới nêm. Nêm sớm là nấm tiết nước và nhân bị nhão.",
      },
    ],
  },

  "banh-duc-la-dua": {
    description:
      "Cách làm bánh đúc lá dứa: bột năng pha nước lá dứa tươi cho bánh dẻo xanh thơm, phủ lớp nước cốt dừa béo ngậy bên trên.",
    faq: [
      {
        q: "Lấy nước lá dứa thế nào cho thơm và xanh?",
        a: "Xay lá dứa tươi với nước rồi lọc qua vải. Dùng ngay, để lâu nước lá dứa xuống màu và mất mùi.",
      },
      {
        q: "Bánh bị cứng sau khi để tủ lạnh?",
        a: "Bột năng cứng lại khi lạnh là bình thường. Để bánh ra ngoài khoảng 15–20 phút trước khi ăn là mềm trở lại.",
      },
      {
        q: "Lớp nước cốt dừa bị tách nước thì sao?",
        a: "Khuấy nước cốt dừa với chút bột năng và muối trên lửa nhỏ, khuấy liên tục đến khi sánh rồi mới rưới lên bánh.",
      },
    ],
  },

  "banh-duc-la-cam": {
    description:
      "Cách làm bánh đúc lá cẩm: nước lá cẩm cho màu tím tự nhiên, bột gạo pha nước vôi trong, ăn cùng nước cốt dừa và đường thốt nốt.",
    faq: [
      {
        q: "Màu tím của lá cẩm có bền không?",
        a: "Màu từ lá cẩm nhạt dần khi gặp nhiệt lâu và ánh sáng. Nấu nước lá cẩm vừa đủ rồi cho vào bột, đừng đun sôi kéo dài.",
      },
      {
        q: "Không có lá cẩm thì thay bằng gì?",
        a: "Lá cẩm khô ngâm nở dùng được, màu nhạt hơn. Không nên thay bằng phẩm màu nếu muốn giữ mùi thơm nhẹ đặc trưng của lá.",
      },
      {
        q: "Đường thốt nốt thay bằng đường gì?",
        a: "Đường cát trắng dùng được nhưng mất vị ngọt thanh và mùi khói nhẹ. Đường mía vàng là lựa chọn gần nhất.",
      },
    ],
  },

  "banh-duc-mat": {
    description:
      "Cách làm bánh đúc mật xứ Huế: bánh bột gạo mềm chan mật mía đun gừng, thơm ấm và ngọt thanh — món quà mùa lạnh của người Huế.",
    faq: [
      {
        q: "Mật mía và mật ong dùng loại nào?",
        a: "Mật mía là bản đúng vị: ngọt đậm, màu nâu sẫm và có mùi khói nhẹ. Mật ong ngọt thanh hơn nhưng làm mất chất Huế của món.",
      },
      {
        q: "Đun mật thế nào cho không bị đắng?",
        a: "Đun lửa nhỏ với vài lát gừng, chỉ đến khi mật ấm và dậy mùi. Đun sôi lâu là mật cháy và có vị đắng.",
      },
      {
        q: "Ăn nóng hay nguội?",
        a: "Ăn khi bánh còn ấm và mật vừa chan, đây là món của mùa lạnh.",
      },
    ],
  },

  "banh-duc-rau-cau": {
    description:
      "Cách làm bánh đúc rau câu dẻo dai ngọt thanh: bột rau câu nấu với nước cốt dừa, đổ khuôn nhiều lớp, mát lạnh và dễ làm cho người mới.",
    faq: [
      {
        q: "Bánh đúc rau câu có phải bánh đúc truyền thống không?",
        a: "Không. Đây là biến tấu hiện đại dùng bột rau câu thay bột gạo, nên kết cấu giòn dai chứ không mềm mịn như bánh đúc cổ truyền.",
      },
      {
        q: "Đổ nhiều lớp bị tách rời nhau thì sao?",
        a: "Đổ lớp sau khi lớp trước mới se mặt, còn hơi dính. Chờ lớp trước đông cứng hẳn là hai lớp không bám vào nhau.",
      },
      {
        q: "Bột rau câu dẻo và giòn khác nhau thế nào?",
        a: "Bột dẻo cho miếng mềm đàn hồi, bột giòn cho miếng cứng gãy. Bài này dùng bột dẻo để gần với bánh đúc nhất.",
      },
    ],
  },

  "banh-duc-keto": {
    description:
      "Cách làm bánh đúc keto: nước cốt dừa, dầu dừa và đường ăn kiêng thay bột gạo và đường — món tráng miệng ít tinh bột, hợp thực đơn low-carb.",
    diet: ["https://schema.org/LowCarbohydrateDiet"],
    faq: [
      {
        q: "Món này bao nhiêu carb?",
        a: "Bài không dùng bột gạo và đường thường — nguồn carb chính bị loại bỏ. Lượng carb còn lại đến từ bột rau câu và nước cốt dừa; hãy tự tính theo nhãn sản phẩm bạn dùng vì mỗi hãng một khác.",
      },
      {
        q: "Đường ăn kiêng loại nào hợp?",
        a: "Erythritol hoặc hỗn hợp erythritol–stevia không làm tăng đường huyết đáng kể. Tránh maltitol nếu bạn theo keto nghiêm ngặt.",
      },
      {
        q: "Có gọi đây là bánh đúc được không?",
        a: "Về nguyên liệu thì đã khác hẳn bánh đúc cổ truyền. Đây là món phỏng theo hình thức và cách ăn của bánh đúc, dành cho người phải hạn chế tinh bột.",
      },
    ],
  },

  "nuoc-cham-banh-duc": {
    description:
      "Ba cách pha nước chấm bánh đúc: mắm chua ngọt tỏi ớt, nước mắm gừng ấm và mắm tôm chanh — mỗi loại hợp với một kiểu bánh đúc.",
    faq: [
      {
        q: "Bánh đúc nào chấm với nước chấm nào?",
        a: "Bánh đúc lạc và bánh đúc nguội hợp tương bần hoặc mắm tôm chanh. Bánh đúc nóng và bánh đúc mặn chan mắm chua ngọt tỏi ớt. Bánh đúc nộm dùng nước canh lạc vừng riêng.",
      },
      {
        q: "Tỉ lệ pha mắm chua ngọt cơ bản là bao nhiêu?",
        a: "Bài dùng 3 mắm : 2 đường : 1 chanh : 2 nước, rồi nêm lại theo khẩu vị. Hoà tan đường trước, cho tỏi ớt băm vào sau cùng để nổi lên trên.",
      },
      {
        q: "Làm sao để tỏi ớt nổi lên mặt bát nước chấm?",
        a: "Băm tỏi ớt thật nhỏ và chỉ cho vào khi nước mắm đã nguội và đường tan hết. Cho vào lúc nước còn nóng là tỏi chìm.",
      },
      {
        q: "Pha sẵn để được bao lâu?",
        a: "Mắm chua ngọt để ngăn mát dùng trong khoảng một tuần, nhưng tỏi ớt sẽ ngả màu. Ngon nhất là pha trong ngày.",
      },
    ],
  },

  /* --- Cẩm nang ----------------------------------------------------------- */

  // Ba trang này viết tay tại `content/cam-nang/` nên description đã đúng ngay
  // trong frontmatter; ở đây chỉ thêm phần hỏi–đáp.
  "banh-duc-la-gi": {
    faq: [
      {
        q: "Bánh đúc làm từ gì?",
        a: "Bột gạo tẻ, nước và muối là ba thứ bắt buộc. Mọi biến thể còn lại là thêm vào: nước vôi trong cho giòn, bột năng cho dẻo, nước cốt dừa cho béo, lạc hoặc ngô cho vị bùi.",
      },
      {
        q: "Bánh đúc và bánh giò khác nhau thế nào?",
        a: "Bánh đúc là bột gạo quấy chín rồi để đông thành khối, ăn cắt miếng hoặc múc bát. Bánh giò gói lá chuối, hấp trong lá và có hình chóp, phần bột mềm ướt hơn hẳn.",
      },
      {
        q: "Bánh đúc bao nhiêu calo?",
        a: "Không có một con số đúng cho mọi loại. Lượng bột giữa các công thức chênh nhau tới ba lần, và phần quyết định thường là thứ chan lên trên chứ không phải bột. Bánh đúc trơn chấm tương nhẹ nhất, bánh đúc mặn có nước cốt dừa nặng nhất.",
      },
      {
        q: "Bánh đúc để được mấy ngày?",
        a: "Bánh không có nước cốt dừa để ngăn mát được 2–3 ngày; bánh có nước cốt dừa chỉ nên để 2 ngày. Không cấp đông — tinh bột gạo tách nước khi rã đông và bánh vụn ra.",
      },
      {
        q: "Người mới nên làm loại bánh đúc nào trước?",
        a: "Bánh đúc nóng: không cần nước vôi trong, không cần khuôn, và nếu bột đặc quá thì thêm nước khuấy lại là cứu được.",
      },
    ],
  },

  "banh-duc-ba-mien": {
    faq: [
      {
        q: "Bánh đúc miền Bắc và miền Nam khác nhau ở đâu?",
        a: "Miền Bắc dùng nước vôi trong nên bánh giòn mát và vị nền gần như nhạt, để nước chấm gánh phần vị. Miền Nam thay phần lớn nước bằng nước cốt dừa nên bánh béo, mềm và trắng ngà, nhân tôm thịt xào củ sắn.",
      },
      {
        q: "Vì sao bánh đúc miền Trung đậm và cay hơn?",
        a: "Miền Trung đổi hẳn hệ nước chấm sang mắm nêm và mắm ruốc, đồng thời nêm mặn ngay trong nhân thay vì để nhạt. Ớt là gia vị mặc định chứ không phải tuỳ chọn.",
      },
      {
        q: "Bánh đúc nào ăn nóng, bánh đúc nào ăn nguội?",
        a: "Ăn nóng trong bát là cách của miền Bắc — bánh đúc nóng và bánh đúc riêu cua, bột dừng ở độ sánh. Bánh đúc miền Trung và miền Nam đều để đông rồi cắt miếng, ăn nguội.",
      },
    ],
  },

  "nguyen-lieu-lam-banh-duc": {
    faq: [
      {
        q: "Nước vôi trong là gì và mua ở đâu?",
        a: "Là phần nước đã lắng trong của vôi ăn trầu — mua vôi ăn trầu ở hàng khô hoặc chợ, hoà vào nước, để lắng 1–2 tiếng rồi chắt lấy phần trong. Tuyệt đối không dùng vôi xây dựng.",
      },
      {
        q: "Không có bột năng thì thay bằng gì?",
        a: "Tinh bột ngô hoặc bột khoai tây, độ dai kém hơn một chút. Bột tàn mì cho bánh trong và dai hơn cả bột năng.",
      },
      {
        q: "Dùng bột gạo nếp làm bánh đúc được không?",
        a: "Không. Bột nếp cho ra thứ dẻo dính như bánh dày, không cắt miếng được. Bánh đúc phải dùng bột gạo tẻ.",
      },
      {
        q: "Bánh đúc không đông thì cứu thế nào?",
        a: "Gần như luôn là do nước quá nhiều. Hoà thêm bột vào một ít nước nguội rồi đổ vào nồi khuấy lại trên lửa nhỏ — đừng đun tiếp cho bay hơi, bánh sẽ khét đáy trước khi đặc.",
      },
      {
        q: "Tỉ lệ nước trên bột bao nhiêu là đúng?",
        a: "Tuỳ món: nước gấp 8–10 lần bột cho bánh đúc nóng múc bát, gấp 3–4 lần cho bánh đúc để đông cắt miếng. Đây là con số quyết định, không phải loại bột.",
      },
    ],
  },

  /* --- Trang tĩnh --------------------------------------------------------- */

  "ve-chung-toi": {
    description:
      "Banhduc.vn là nơi tập hợp và thử lại công thức bánh đúc các vùng miền Việt Nam, do Lộc Nguyễn biên soạn và cập nhật.",
  },
  "lien-he": {
    description:
      "Liên hệ với Banhduc.vn để góp ý công thức, báo lỗi nội dung hoặc đề xuất món bánh đúc bạn muốn chúng tôi thử và viết lại.",
  },
  "quy-trinh-san-xuat-noi-dung": {
    description:
      "Quy trình biên soạn nội dung của Banhduc.vn: cách chúng tôi thu thập, thử nghiệm, kiểm chứng và cập nhật từng công thức bánh đúc.",
  },
  "dieu-khoan-chinh-sach": {
    description:
      "Điều khoản sử dụng và chính sách quyền riêng tư của Banhduc.vn: dữ liệu chúng tôi thu thập, cách dùng cookie và quyền của bạn.",
  },
};

/**
 * Description an toàn cho một tài liệu.
 *
 * Ưu tiên bản viết tay. Không có thì cắt bản migrate ở ranh giới CÂU gần nhất
 * dưới ngưỡng — cắt giữa câu rồi thêm "…" chính là lỗi đang phải sửa, nên
 * fallback này thà trả về một câu ngắn còn hơn một câu cụt.
 */
export function safeDescription(slug: string, raw: string): string {
  const written = editorial[slug]?.description;
  if (written) return written;

  const clean = raw.replace(/\s*…\s*$/, "").trim();
  if (clean.length <= DESCRIPTION_LIMIT) return clean;

  // Cắt ở dấu chấm câu cuối cùng còn nằm trong ngưỡng.
  const window = clean.slice(0, DESCRIPTION_LIMIT + 1);
  const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (sentence > 60) return clean.slice(0, sentence + 1);

  // Không có câu nào đủ ngắn: lùi về ranh giới từ, không thêm dấu ba chấm.
  const word = window.lastIndexOf(" ");
  return clean.slice(0, word > 0 ? word : DESCRIPTION_LIMIT).trim();
}
