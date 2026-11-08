// 直接在当前进程内启动 Next 服务器，避免 CLI 的 fork（受限沙箱下 fork 会 EPERM）。
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());
const { startServer } = require("next/dist/server/lib/start-server");

const port = Number(process.env.PORT || 3100);
const hostname = process.env.HOST || "127.0.0.1";

startServer({ dir: process.cwd(), isDev: false, hostname, port, allowRetry: false })
  .then(() => {
    console.log(`READY http://${hostname}:${port}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
