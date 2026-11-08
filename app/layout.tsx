import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人生支线小精灵",
  description: "挑个心情、时间和预算，精灵给你派一条现实生活支线。完成有经验、有称号，还有一张能发出去的成长卡。",
  applicationName: "人生支线小精灵",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF4E8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
