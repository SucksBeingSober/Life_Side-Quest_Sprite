import type { CompletionRecord, Rarity } from "./types";

const SANS =
  '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",system-ui,-apple-system,sans-serif';
const SERIF = '"Songti SC","Noto Serif SC","Source Han Serif SC","SimSun",serif';

const RARITY: Record<Rarity, { main: string; soft: string; ink: string }> = {
  普通: { main: "#8B7E6C", soft: "rgba(139,126,108,0.16)", ink: "#6F6455" },
  稀有: { main: "#B9832A", soft: "rgba(185,131,42,0.18)", ink: "#8A5F16" },
  离谱: { main: "#7C63B8", soft: "rgba(124,99,184,0.18)", ink: "#5F4A96" },
};

const W = 750;
const H = 1000;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const noLineStart = "，。！？、；：」』）》…—";
  const lines: string[] = [];
  let line = "";
  for (const ch of Array.from(text)) {
    const next = line + ch;
    if (line && ctx.measureText(next).width > maxWidth) {
      if (noLineStart.includes(ch)) {
        lines.push(line + ch);
        line = "";
      } else {
        lines.push(line);
        line = ch;
      }
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fill();
  ctx.restore();
}

function drawMiniSpirit(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();

  ctx.strokeStyle = "#2A2520";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy - r - 14);
  ctx.stroke();

  ctx.fillStyle = "#F0653F";
  ctx.beginPath();
  ctx.arc(cx, cy - r - 19, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - r * 0.85, cy + r * 0.1, 6, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.85, cy + r * 0.1, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD59B";
  ctx.fill();
  ctx.stroke();

  const body = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  body.addColorStop(0, "#FFF0D2");
  body.addColorStop(1, "#FFD59B");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = "#2A2520";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#2A2520";
  ctx.beginPath();
  ctx.arc(cx - 13, cy - 2, 3.6, 0, Math.PI * 2);
  ctx.arc(cx + 13, cy - 2, 3.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2A2520";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 9, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "rgba(240,130,105,0.45)";
  ctx.beginPath();
  ctx.ellipse(cx - 24, cy + 8, 7, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 24, cy + 8, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function drawGrowthCard(canvas: HTMLCanvasElement, record: CompletionRecord): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = W;
  canvas.height = H;

  const theme = RARITY[record.rarity] ?? RARITY["普通"];

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#FFFBF2");
  bg.addColorStop(0.55, "#FBF1DD");
  bg.addColorStop(1, "#F2E2C6");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = theme.soft;
  ctx.beginPath();
  ctx.arc(700, 70, 210, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, 980, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = theme.main;
  for (let i = 0; i < 7; i += 1) {
    for (let j = 0; j < 7; j += 1) {
      ctx.beginPath();
      ctx.arc(70 + i * 22, 640 + j * 22, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  drawStar(ctx, 640, 210, 9, "rgba(185,131,42,0.45)");
  drawStar(ctx, 676, 258, 5, "rgba(185,131,42,0.35)");
  drawStar(ctx, 92, 560, 7, "rgba(240,101,63,0.28)");

  ctx.strokeStyle = "rgba(42,37,32,0.14)";
  ctx.lineWidth = 2;
  roundRect(ctx, 26, 26, W - 52, H - 52, 40);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#8B7E6C";
  ctx.font = `500 24px ${SANS}`;
  ctx.fillText(`人生支线 · 第 ${record.index} 条`, 64, 96);

  ctx.textAlign = "right";
  ctx.fillText(formatDate(record.at), W - 64, 96);

  ctx.strokeStyle = "rgba(42,37,32,0.12)";
  ctx.beginPath();
  ctx.moveTo(64, 124);
  ctx.lineTo(W - 64, 124);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = theme.main;
  ctx.font = `600 21px ${SANS}`;
  ctx.fillText("称 号", 64, 182);

  let size = 92;
  ctx.font = `700 ${size}px ${SERIF}`;
  while (size > 48 && ctx.measureText(record.award).width > W - 128) {
    size -= 4;
    ctx.font = `700 ${size}px ${SERIF}`;
  }
  ctx.fillStyle = "#26221D";
  ctx.fillText(record.award, 64, 292);

  ctx.fillStyle = theme.main;
  roundRect(ctx, 64, 314, 54, 5, 3);
  ctx.fill();

  ctx.fillStyle = "#6F6455";
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText(`「${record.missionTitle}」`, 64, 372);

  ctx.strokeStyle = "rgba(42,37,32,0.1)";
  ctx.beginPath();
  ctx.moveTo(64, 408);
  ctx.lineTo(W - 64, 408);
  ctx.stroke();

  ctx.font = `400 30px ${SANS}`;
  ctx.fillStyle = "#4E453A";
  const quote = record.reaction || record.shareText;
  const lines = wrapText(ctx, quote, W - 140).slice(0, 3);
  lines.forEach((line, index) => {
    ctx.fillText(line, 84, 464 + index * 46);
  });

  roundRect(ctx, 64, 632, W - 128, 150, 28);
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.fill();
  ctx.strokeStyle = "rgba(42,37,32,0.1)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const stats = [
    { label: "经验", value: `+${record.exp}` },
    { label: "等级", value: `Lv.${record.level}` },
    { label: "灵感", value: `${record.inspiration}/3` },
  ];
  const colWidth = (W - 128) / 3;
  stats.forEach((stat, index) => {
    const cx = 64 + colWidth * index + colWidth / 2;
    if (index > 0) {
      ctx.strokeStyle = "rgba(42,37,32,0.1)";
      ctx.beginPath();
      ctx.moveTo(64 + colWidth * index, 662);
      ctx.lineTo(64 + colWidth * index, 752);
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#26221D";
    ctx.font = `700 44px ${SANS}`;
    ctx.fillText(stat.value, cx, 706);
    ctx.fillStyle = "#8B7E6C";
    ctx.font = `400 21px ${SANS}`;
    ctx.fillText(stat.label, cx, 748);
  });

  ctx.strokeStyle = "rgba(42,37,32,0.12)";
  ctx.beginPath();
  ctx.moveTo(64, 828);
  ctx.lineTo(W - 64, 828);
  ctx.stroke();

  drawMiniSpirit(ctx, 110, 892, 38);

  ctx.textAlign = "left";
  ctx.fillStyle = "#26221D";
  ctx.font = `600 27px ${SANS}`;
  ctx.fillText("人生支线小精灵", 168, 886);

  ctx.fillStyle = "#8B7E6C";
  ctx.font = `400 21px ${SANS}`;
  ctx.fillText("一条支线，也是一天里的一点不一样。", 168, 922);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(139,126,108,0.8)";
  ctx.font = `500 17px ${SANS}`;
  ctx.fillText("LIFE SIDEQUEST", W - 64, 962);
}
