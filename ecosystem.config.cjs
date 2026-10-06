// pm2 cho banhduc.vn trên VPS — xem docs/deploy-vps.md.
// Cổng ở đây phải khớp `proxy_pass` trong cấu hình Nginx của site trên FlashPanel.
//
// `cwd` là symlink `current`, không phải `__dirname`: Node phân giải symlink nên
// `__dirname` là thư mục của một release cụ thể, và `pm2 reload` sẽ chạy lại
// đúng release cũ đó mãi. Qua symlink, mỗi lần reload đọc release mới nhất mà
// scripts/deploy-vps.sh vừa trỏ tới.
const { homedir } = require("node:os");
const { join } = require("node:path");

const base = join(homedir(), "banhduc");

module.exports = {
  apps: [
    {
      name: "banhduc",
      cwd: join(base, "current"),
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3917",
      env: {
        NODE_ENV: "production",
        // Ngoài thư mục release để lần deploy sau không xoá mất.
        RATINGS_DB: join(base, "shared", "ratings.db"),
      },
      max_memory_restart: "512M",
    },
  ],
};
