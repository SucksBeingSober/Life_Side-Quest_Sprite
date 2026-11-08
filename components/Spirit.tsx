"use client";

import { useId, useState } from "react";
import type { SpriteMood } from "@/lib/types";

interface SpiritProps {
  mood?: SpriteMood;
  size?: number;
  interactive?: boolean;
  onPoke?: () => void;
  talking?: boolean;
  className?: string;
}

function Eyes({ mood }: { mood: SpriteMood }) {
  if (mood === "smug") {
    return (
      <>
        <path d="M43 71 Q49 67 55 71" stroke="#2A2520" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <path d="M73 71 Q79 67 85 71" stroke="#2A2520" strokeWidth="3.6" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (mood === "bored") {
    return (
      <>
        <path d="M44 71 H54" stroke="#2A2520" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M74 71 H84" stroke="#2A2520" strokeWidth="3.6" strokeLinecap="round" />
      </>
    );
  }
  if (mood === "proud") {
    return (
      <>
        <path d="M43 73 Q49 63 55 73" stroke="#2A2520" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <path d="M73 73 Q79 63 85 73" stroke="#2A2520" strokeWidth="3.6" fill="none" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <ellipse cx="49" cy="70" rx="5.4" ry="6.6" fill="#2A2520" />
      <ellipse cx="79" cy="70" rx="5.4" ry="6.6" fill="#2A2520" />
      <circle cx="51.2" cy="67.4" r="1.8" fill="#FFFFFF" />
      <circle cx="81.2" cy="67.4" r="1.8" fill="#FFFFFF" />
    </>
  );
}

function Mouth({ mood }: { mood: SpriteMood }) {
  if (mood === "smug") {
    return <path d="M57 85 Q64 89 71 81" stroke="#2A2520" strokeWidth="3.2" fill="none" strokeLinecap="round" />;
  }
  if (mood === "bored") {
    return <path d="M59 85 H69" stroke="#2A2520" strokeWidth="3.2" strokeLinecap="round" />;
  }
  if (mood === "proud") {
    return (
      <>
        <path d="M56 83 Q64 94 72 83 Z" fill="#2A2520" />
        <path d="M61 88 Q64 92 67 88 Z" fill="#F0836A" />
      </>
    );
  }
  return <path d="M58 84 Q64 89 70 84" stroke="#2A2520" strokeWidth="3.2" fill="none" strokeLinecap="round" />;
}

export function Spirit({
  mood = "soft",
  size = 112,
  interactive = false,
  onPoke,
  talking = false,
  className = "",
}: SpiritProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const [bounce, setBounce] = useState(false);

  const handleClick = () => {
    setBounce(true);
    onPoke?.();
  };

  const inner = (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`spirit-svg ${talking ? "is-talking" : ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3DA" />
          <stop offset="100%" stopColor="#FFD49A" />
        </linearGradient>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F0653F" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F0653F" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="64" cy="114" rx="25" ry="5" fill="#2A2520" opacity="0.1" />

      <g className="spirit-body">
        <circle cx="64" cy="17" r="12" fill={`url(#glow-${uid})`} className="antenna-glow" />
        <path d="M64 38 L64 22" stroke="#2A2520" strokeWidth="3" strokeLinecap="round" />
        <circle cx="64" cy="18" r="4.6" fill="#F0653F" />

        <ellipse
          cx="25"
          cy="80"
          rx="6.5"
          ry="9"
          fill="#FFD49A"
          stroke="#2A2520"
          strokeWidth="3"
          transform="rotate(-16 25 80)"
        />
        <ellipse
          cx="103"
          cy="80"
          rx="6.5"
          ry="9"
          fill="#FFD49A"
          stroke="#2A2520"
          strokeWidth="3"
          transform="rotate(16 103 80)"
        />

        <path
          d="M64 36 C90 36 103 55 103 77 C103 97 88 109 64 109 C40 109 25 97 25 77 C25 55 38 36 64 36 Z"
          fill={`url(#body-${uid})`}
          stroke="#2A2520"
          strokeWidth="3"
        />

        <ellipse cx="39" cy="82" rx="6.5" ry="3.6" fill="#F0836A" opacity="0.45" />
        <ellipse cx="89" cy="82" rx="6.5" ry="3.6" fill="#F0836A" opacity="0.45" />

        <g className="spirit-eyes">
          <Eyes mood={mood} />
        </g>
        <g className="spirit-mouth">
          <Mouth mood={mood} />
        </g>
      </g>

      <g className="spirit-stars">
        <path
          d="M22 38 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 z"
          fill="#F0B24B"
        />
        <path
          d="M108 30 l1.2 3.2 3.2 1.2 -3.2 1.2 -1.2 3.2 -1.2 -3.2 -3.2 -1.2 3.2 -1.2 z"
          fill="#F0B24B"
          opacity="0.7"
        />
      </g>
    </svg>
  );

  const wrapperClass = `spirit ${bounce ? "is-bouncing" : ""} ${className}`;

  if (!interactive) {
    return <div className={wrapperClass}>{inner}</div>;
  }

  return (
    <button
      type="button"
      className={wrapperClass}
      onClick={handleClick}
      onAnimationEnd={() => setBounce(false)}
      aria-label="戳一下小精灵"
    >
      {inner}
    </button>
  );
}
