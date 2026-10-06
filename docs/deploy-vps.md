# Chuyển banhduc.vn từ WordPress sang Next.js (VPS + FlashPanel + pm2)

Site mới chạy **trên chính VPS đang chạy WordPress** (`103.161.172.111`), do pm2
giữ tiến trình, Nginx của FlashPanel đứng trước, Cloudflare (đám mây cam) đứng
trước nữa. Vì IP không đổi nên **không phải sửa DNS**: việc chuyển chỉ là đổi
khối `location` trong Nginx của site banhduc.vn, từ PHP sang `proxy_pass`. Muốn
quay lại WordPress thì dán lại cấu hình Nginx cũ.

```
Trình duyệt → Cloudflare → Nginx (FlashPanel, :443) → pm2: next start (127.0.0.1:3917)
```

| Thông số | Giá trị |
| --- | --- |
| Repo | `https://github.com/vilo0411/banh-duc.git` |
| Thư mục trên VPS | `~/banhduc/current` → một release trong `~/banhduc/releases/` (ngoài thư mục web của WordPress) |
| Tiến trình pm2 | `banhduc` — khai trong `ecosystem.config.cjs` |
| Cổng | `3917`, chỉ nghe trên `127.0.0.1` |
| Node | ≥ 22.13 (`node:sqlite` cho điểm đánh giá) |
| GTM | `GTM-MQ8HRJNG` — cùng container với bản WP, đặt ở `lib/site.ts` |

> Đổi cổng: sửa `-p 3917` trong `ecosystem.config.cjs` **và** `proxy_pass` ở
> bước 3.1, hai chỗ phải khớp nhau.

---

## 0. Chuẩn bị — WordPress vẫn chạy

- [ ] Code mới đã commit và push lên GitHub (`git status` sạch, `git push`).
- [ ] **FlashPanel → Backups**: backup site banhduc.vn (file + database), tải bản
      backup về máy. Đây là đường lùi cuối cùng.
- [ ] **FlashPanel → banhduc.vn → Nginx**: chép **toàn bộ** cấu hình hiện tại
      vào một file trên máy, đặt tên `nginx-banhduc-wordpress.conf`. Đây là bản
      để quay lại.
- [ ] Ngừng sửa bài trên WordPress. Nội dung đã migrate xong; bài sửa trên WP
      từ giờ sẽ không sang site mới.

## 1. Dựng site mới trên VPS — chưa ai thấy

Mở terminal của server trong FlashPanel (biểu tượng `>_` cạnh tên server), đăng
nhập đúng user sẽ chạy pm2.

```bash
node -v                          # phải ≥ v20.9
ss -ltnp | grep ':3917 '         # không in gì = cổng trống

cd ~ && git clone https://github.com/vilo0411/banh-duc.git banhduc-next
cd ~/banhduc-next
npm ci
npm run build && npm run check   # check phải in ✓, thoát mã 0

pm2 start ecosystem.config.cjs
pm2 save                         # để pm2 tự chạy lại sau khi VPS khởi động lại
pm2 status                       # banhduc: online
```

Kiểm tra ngay trên VPS:

```bash
curl -sI http://127.0.0.1:3917/ | head -1                                  # 200
curl -sI http://127.0.0.1:3917/banh-duc-hue/ | head -1                     # 200
curl -sI "http://127.0.0.1:3917/?p=2468" | grep -i location                # /banh-duc-hue/
curl -sI http://127.0.0.1:3917/wp-content/uploads/banh-duc-hue-2-1-768x480.jpg | grep -i location
```

Xem bằng trình duyệt trên máy của bạn (không cần subdomain tạm, nên Google
không có gì để index nhầm):

```bash
ssh -L 3917:127.0.0.1:3917 <user>@103.161.172.111
# rồi mở http://localhost:3917
```

## 2. Kiểm tra trước khi chuyển

- [ ] Trang chủ, `/cong-thuc/`, 3–4 bài bất kỳ hiển thị đủ ảnh, chữ, mục lục.
- [ ] `/sitemap.xml`, `/feed.xml`, `/robots.txt` mở được.
- [ ] Xem nguồn trang chủ có `GTM-MQ8HRJNG`.
- [ ] `pm2 logs banhduc --lines 50` không có lỗi.

## 3. Chuyển — khoảng 10 phút, chọn giờ ít người xem

### 3.1. Đổi Nginx

**FlashPanel → banhduc.vn → Nginx**, trong khối `server` nghe cổng `443`:

1. **Giữ nguyên** các dòng `listen`, `server_name`, `ssl_certificate`,
   `ssl_certificate_key` và mọi dòng `include` liên quan tới SSL.
2. **Xoá hết mọi khối `location`** của WordPress, không chỉ khối PHP. Cấu hình
   WP thường có `location ~* \.(jpg|png|css|js|…)$` phục vụ file tĩnh thẳng từ
   thư mục WP, và các rule của WP Rocket. Nếu còn sót, chúng chặn trước
   `/_next/static/*.js` (site mất CSS/JS) và `/wp-content/uploads/*` (ảnh cũ 404
   thay vì redirect).
3. Xoá luôn các dòng `root`, `index index.php`, `try_files` nằm ngoài `location`.
4. Thêm đúng một khối:

```nginx
location / {
    proxy_pass http://127.0.0.1:3917;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

`Host` và `X-Forwarded-Proto` không được bỏ: redirect shortlink `/?p=<id>`
(`proxy.ts`) dựng URL đích từ chúng, thiếu thì nó trỏ về `http://127.0.0.1:3917`.

5. Lưu. Nếu FlashPanel báo lỗi cú pháp thì **không** reload; dán lại bản cũ và
   xem lại bước 2–4.

### 3.2. Xoá cache Cloudflare

**Cloudflare → banhduc.vn → Caching → Configuration → Purge Everything.**
Cloudflare đang giữ ảnh, CSS và JS của bản WP.

### 3.3. Sửa `www` (đang lỗi 525)

**Cloudflare → Rules → Redirect Rules → Create rule**:

- When: `Hostname` equals `www.banhduc.vn`
- Then: Dynamic, `concat("https://banhduc.vn", http.request.uri)`, status `301`,
  bật *Preserve query string*.

Bản ghi DNS `www` phải đang bật proxy (đám mây cam); nếu chưa có thì tạo
`CNAME www → banhduc.vn`, proxied.

## 4. Kiểm tra ngay sau khi chuyển

Từ máy của bạn:

```bash
for u in / /banh-duc-hue/ /cong-thuc/ /sitemap.xml; do
  echo "$u $(curl -s -o /dev/null -w '%{http_code}' https://banhduc.vn$u)"; done   # 200 hết

for u in /feed/ /tin-tuc/ /author/nvloc0411/ /wp-admin/ "/?p=2468" \
         /wp-content/uploads/banh-duc-hue-2-1-768x480.jpg; do
  echo "$u -> $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "https://banhduc.vn$u")"; done

curl -sI https://www.banhduc.vn/banh-duc-hue/ | grep -iE '^HTTP|location'          # 301 → https://banhduc.vn/banh-duc-hue/
curl -sI https://banhduc.vn/ | grep -i x-powered-by                                 # Next.js, không còn PHP
```

- [ ] Mọi URL ở vòng thứ hai redirect về `https://banhduc.vn/…`, **không** về
      `127.0.0.1` hay `http://`.
- [ ] **GA4 → Reports → Realtime** có lượt xem khi bạn mở site.
- [ ] **Google Search Console** (property `banhduc.vn`):
  - Sitemaps: thêm `https://banhduc.vn/sitemap.xml`, xoá `sitemap_index.xml`.
  - URL Inspection 3–4 URL → *Test live URL* → *Request indexing*.

## Quay lại WordPress khi có sự cố

1. FlashPanel → banhduc.vn → Nginx: dán lại `nginx-banhduc-wordpress.conf`, lưu.
2. Cloudflare → Purge Everything.

WordPress vẫn nằm nguyên trên đĩa và database, nên chạy lại ngay. pm2 có thể để
nguyên.

## 5. Cập nhật nội dung về sau — auto deploy

Push lên `main` là site tự cập nhật. Script là `scripts/deploy-vps.sh`: mỗi lần
nó clone ra một release mới, `npm ci`, build, check, rồi mới đổi symlink
`~/banhduc/current` và `pm2 reload`. Build hay check lỗi thì bản đang chạy không
bị đụng tới. Bản mới không trả 200 trong 60 giây thì script tự quay về bản trước.

**Không dùng script mặc định của FlashPanel.** `FLASHPANEL_SITE_ROOT` trỏ vào thư
mục WordPress, còn script mặc định `git pull` ngay tại đó.

### 5.1. Chuyển sang cấu trúc release — làm một lần, qua terminal của server

```bash
node -v                    # ≥ v22.13; thấp hơn thì: nvm install 22 && nvm alias default 22
bash ~/banhduc-next/scripts/deploy-vps.sh   # sau khi đã git pull bản có file này
```

Lần chạy đầu, pm2 vẫn đang giữ `banhduc` cũ (cwd `~/banhduc-next`), nên reload
chưa chuyển sang release mới. Đổi hẳn một lần:

```bash
pm2 delete banhduc
pm2 start ~/banhduc/current/ecosystem.config.cjs
pm2 save
curl -sI http://127.0.0.1:3917/ | head -1   # 200
```

Từ giờ `~/banhduc-next` không còn được dùng. Xoá nó sau khi auto deploy chạy ổn.

### 5.2. Bật auto deploy trong FlashPanel

1. **banhduc.vn → Deployments → Deploy Script**: xoá script mặc định, dán toàn
   bộ nội dung `scripts/deploy-vps.sh`, bấm **Update**.
2. Bấm **Deploy Now** một lần, xem log trong *Deployment Histories* kết thúc
   bằng `✓ Đã deploy <commit>`.
3. Bật **Auto Deploy** (nhánh `main`). FlashPanel sẽ gắn webhook vào repo GitHub,
   nên site phải được nối với `vilo0411/banh-duc` qua **Git Integration**.
   Kiểm tra ở GitHub → repo → Settings → Webhooks: phải có một hook trả ✓.

Sửa script thì sửa `scripts/deploy-vps.sh` trong repo trước, rồi dán lại vào
FlashPanel. FlashPanel chạy bản đã dán, không phải bản trong repo.

### 5.3. Quay về bản trước bằng tay

```bash
ls -1t ~/banhduc/releases/                        # giữ 3 bản gần nhất
ln -sfn ~/banhduc/releases/<bản cũ> ~/banhduc/current
pm2 reload banhduc
```

Đổi cổng hay bất kỳ dòng nào trong `ecosystem.config.cjs` thì `pm2 reload` không
nhận. Phải `pm2 delete banhduc && pm2 start ~/banhduc/current/ecosystem.config.cjs && pm2 save`.

## 6. Dọn WordPress — sau 2–4 tuần ổn định

Chỉ làm khi GSC (*Pages*) không có 404 tăng bất thường và traffic không tụt so
với 4 tuần trước.

- [ ] **Không bấm xoá site banhduc.vn trong FlashPanel.** Thao tác đó nhiều khả
      năng xoá luôn vhost Nginx và chứng chỉ SSL mà site mới đang dùng.
- [ ] Xoá **database** WordPress của site (FlashPanel → banhduc.vn → WordPress /
      Database).
- [ ] Xoá **mã nguồn WordPress** trong thư mục web của site (`wp-admin/`,
      `wp-includes/`, `wp-content/`, `*.php`). Không đụng `~/banhduc`.
- [ ] Gỡ cron/backup tự động của WP trong FlashPanel nếu có.
- [ ] Sau lần FlashPanel gia hạn SSL đầu tiên, mở lại cấu hình Nginx xem khối
      `proxy_pass` còn nguyên không — chưa rõ FlashPanel có sinh lại cấu hình
      khi gia hạn hay không.
- [ ] Quét malware cả VPS: thư viện media WP từng có file `w2sxef3691.php*.jpg`,
      dấu hiệu thử upload webshell, và server đang chạy chung 11 site.

## Phụ lục: chặn Google index `n8n.banhduc.vn`

**FlashPanel → site n8n → Nginx**, thêm vào khối `server`:

```nginx
add_header X-Robots-Tag "noindex, nofollow" always;
```

Webhook không bị ảnh hưởng — header chỉ là lời dặn cho máy tìm kiếm. Kiểm tra:

```bash
curl -sI https://n8n.banhduc.vn/ | grep -i x-robots-tag
```

Rồi vào **GSC → Removals → New request**, gỡ tiền tố `https://n8n.banhduc.vn/`.
