"use client";

import { useEffect, useRef, useState } from "react";
import type { CompletionRecord } from "@/lib/types";
import { drawGrowthCard } from "@/lib/card";
import { copyText, downloadCanvas } from "@/lib/share";
import { ArrowLeftIcon, CopyIcon, DownloadIcon } from "./icons";

interface GrowthScreenProps {
  record: CompletionRecord;
  onBack: () => void;
  onToast: (message: string) => void;
}

export function GrowthScreen({ record, onBack, onToast }: GrowthScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) drawGrowthCard(canvasRef.current, record);
  }, [record]);

  const handleSave = async () => {
    if (!canvasRef.current || saving) return;
    setSaving(true);
    const ok = await downloadCanvas(canvasRef.current, `人生支线-${record.award}.png`);
    setSaving(false);
    if (ok) onToast("图片已保存，去发吧");
    else onToast("保存失败，长按卡片截图也行");
  };

  const handleCopy = async () => {
    const ok = await copyText(`${record.shareText}\n—— 人生支线小精灵`);
    if (ok) {
      setCopied(true);
      onToast("文案已复制");
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      onToast("复制失败，长按选中上面的文字也行");
    }
  };

  return (
    <div className="screen growth-screen">
      <header className="screen-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="返回">
          <ArrowLeftIcon />
        </button>
        <div className="screen-title">
          <h2>成长卡</h2>
          <p>保存图片或复制文案，直接发出去</p>
        </div>
        <span className="head-spacer" aria-hidden="true" />
      </header>

      <div className="growth-body">
        <div className="card-frame">
          <canvas ref={canvasRef} aria-label={`成长卡：${record.award}`} role="img" />
        </div>

        <div className="growth-actions">
          <button type="button" className="btn btn-primary btn-big" onClick={handleSave} disabled={saving}>
            <DownloadIcon />
            {saving ? "正在导出…" : "保存图片"}
          </button>
          <button type="button" className="btn btn-ghost btn-big" onClick={handleCopy}>
            <CopyIcon />
            {copied ? "已复制" : "复制文案"}
          </button>
        </div>

        <p className="fine growth-fine">
          发朋友圈：先保存图片，再打开微信手动发布。保存失败就长按卡片截图。
        </p>
      </div>
    </div>
  );
}
