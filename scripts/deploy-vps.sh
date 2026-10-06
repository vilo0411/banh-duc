#!/usr/bin/env bash
# Deploy banhduc.vn trên VPS — dán nguyên file này vào
# FlashPanel → banhduc.vn → Deployments → Deploy Script. Xem docs/deploy-vps.md.
#
# Mỗi lần deploy dựng một thư mục release mới, build + check ở đó, rồi mới đổi
# symlink `current` và reload pm2. Build hỏng hay check đỏ thì site đang chạy
# không bị đụng tới; site mới không trả 200 thì tự quay về release trước.
#
#   ~/banhduc/
#     releases/<thời điểm>-<commit>/
#     current -> releases/...        (pm2 chạy từ đây — ecosystem.config.cjs)
#     shared/ratings.db              (điểm đánh giá, sống qua mọi release)
set -euo pipefail

REPO="https://github.com/vilo0411/banh-duc.git"
BRANCH="${FLASHPANEL_CODE_BRANCH:-main}"
BASE="$HOME/banhduc"
PORT=3917   # phải khớp ecosystem.config.cjs và proxy_pass trong Nginx
KEEP=3      # số release giữ lại để quay về

export RATINGS_DB="$BASE/shared/ratings.db"

if [ -f "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.nvm/nvm.sh"
fi

# node:sqlite (lib/ratings.ts) chạy không cần cờ từ Node 22.13.
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)' \
  || { echo "✗ Cần Node ≥ 22.13, đang có $(node -v)"; exit 1; }
command -v pm2 >/dev/null || { echo "✗ Không thấy pm2 (npm i -g pm2)"; exit 1; }

mkdir -p "$BASE/releases" "$BASE/shared"

# Hai lần push sát nhau thì lần sau chờ lần trước xong, không build chồng lên nhau.
exec 9>"$BASE/deploy.lock"
flock 9

RELEASE="$BASE/releases/$(date +%Y%m%d-%H%M%S)"
echo "→ Clone $BRANCH vào $RELEASE"
git clone --quiet --depth 1 --branch "$BRANCH" "$REPO" "$RELEASE"
SHA=$(git -C "$RELEASE" rev-parse --short HEAD)
mv "$RELEASE" "$RELEASE-$SHA"
RELEASE="$RELEASE-$SHA"

cleanup_failed() {
  echo "✗ Deploy $SHA hỏng — site vẫn chạy bản cũ"
  rm -rf "$RELEASE"
}
trap cleanup_failed ERR

cd "$RELEASE"
echo "→ npm ci"
npm ci --no-audit --no-fund --prefer-offline

# Cache build của release trước làm next build nhanh hơn nhiều.
if [ -d "$BASE/current/.next/cache" ]; then
  mkdir -p .next && cp -a "$BASE/current/.next/cache" .next/cache
fi

echo "→ build + check"
npm run build
npm run check

PREVIOUS=$(readlink "$BASE/current" || true)
ln -sfn "$RELEASE" "$BASE/current.tmp" && mv -T "$BASE/current.tmp" "$BASE/current"

if pm2 describe banhduc >/dev/null 2>&1; then
  pm2 reload banhduc --update-env
else
  pm2 start "$BASE/current/ecosystem.config.cjs"
fi
pm2 save >/dev/null
trap - ERR

echo "→ Chờ site trả 200"
for _ in $(seq 1 30); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")" = "200" ]; then
    echo "✓ Đã deploy $SHA"
    # Xoá release cũ, giữ $KEEP bản mới nhất (gồm bản đang chạy).
    ls -1dt "$BASE"/releases/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
    exit 0
  fi
  sleep 2
done

echo "✗ $SHA không trả 200 sau 60 giây"
if [ -n "$PREVIOUS" ]; then
  echo "→ Quay về $PREVIOUS"
  ln -sfn "$PREVIOUS" "$BASE/current.tmp" && mv -T "$BASE/current.tmp" "$BASE/current"
  pm2 reload banhduc --update-env
fi
exit 1
