"use client";

import { useEffect, useState } from "react";
import { Spirit } from "./Spirit";

interface ReflectModalProps {
  missionTitle: string;
  onSkip: () => void;
  onSubmit: (text: string) => void;
}

export function ReflectModal({ missionTitle, onSkip, onSubmit }: ReflectModalProps) {
  const [text, setText] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <div className="scrim center" role="presentation">
      <section className="mini-modal" role="dialog" aria-modal="true" aria-labelledby="reflect-title">
        <p className="eyebrow">One Line</p>
        <h2 id="reflect-title">做完了。写一句？</h2>
        <p className="mini-sub">「{missionTitle}」——不写也行，直接结算。</p>
        <textarea
          className="note-input"
          value={text}
          maxLength={40}
          rows={3}
          autoFocus
          placeholder="此刻最想记住的一点（选填）"
          onChange={(event) => setText(event.target.value.slice(0, 40))}
        />
        <p className="counter">{text.length}/40</p>
        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={onSkip}>
            跳过
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onSubmit(text)}>
            结算
          </button>
        </div>
      </section>
    </div>
  );
}

export function SettlingOverlay() {
  return (
    <div className="scrim center settling" role="status" aria-live="polite">
      <Spirit mood="soft" size={96} talking />
      <p>
        精灵在结算
        <span className="typing">
          <i />
          <i />
          <i />
        </span>
      </p>
    </div>
  );
}
