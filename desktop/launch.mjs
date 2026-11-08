import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const electron = path.join(root, "node_modules", "electron", "dist", "electron.exe");

if (!fs.existsSync(electron)) {
  console.error("Electron 未安装，请先在项目目录运行 npm install");
  process.exit(1);
}

if (!fs.existsSync(path.join(root, ".next", "BUILD_ID"))) {
  console.error("还没有构建面板，请先运行 npm run build");
  process.exit(1);
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = ["--no-sandbox", "."];

const child = spawn(electron, args, {
  cwd: root,
  env,
  detached: true,
  stdio: "ignore",
  windowsHide: false,
});

child.unref();
