// pm2 cho banhduc.vn trên VPS — xem docs/deploy-vps.md.
// Cổng ở đây phải khớp `proxy_pass` trong cấu hình Nginx của site trên FlashPanel.
module.exports = {
  apps: [
    {
      name: "banhduc",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3917",
      env: { NODE_ENV: "production" },
      max_memory_restart: "512M",
    },
  ],
};
