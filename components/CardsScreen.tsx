"use client";

import type { KeyboardEvent } from "react";
import type { Mission, Rarity } from "@/lib/types";
import { ArrowLeftIcon } from "./icons";

export function rarityKey(rarity: Rarity): string {
  if (rarity === "稀有") return "rare";
  if (rarity === "离谱") return "wild";
  return "common";
}

interface CardsScreenProps {
  missions: Mission[] | null;
  loading: boolean;
  inspiration: number;
  selectedId: string | null;
  weatherLabel?: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onReroll: () => void;
  onBack: () => void;
}

function MissionCard({
  mission,
  primary,
  selected,
  index,
  onSelect,
}: {
  mission: Mission;
  primary: boolean;
  selected: boolean;
  index: number;
  onSelect: () => void;
}) {
  const open = primary || selected;

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <article
      className={`mcard ${primary ? "is-primary" : ""} ${selected ? "is-selected" : ""}`}
      data-rarity={rarityKey(mission.rarity)}
      style={{ animationDelay: `${index * 70}ms` }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <div className="mcard-top">
        {primary && <span className="badge badge-main">主推</span>}
        <span className={`badge badge-${rarityKey(mission.rarity)}`}>{mission.rarity}</span>
        <span className="mcard-time">{mission.duration_minutes} 分钟</span>
      </div>

      <h3 className="mcard-title">{mission.title}</h3>
      <p className="mcard-summary">{mission.summary}</p>

      <div className="mcard-meta">
        {mission.tags.map((tag) => (
          <span key={tag} className="meta-tag">
            #{tag}
          </span>
        ))}
        <span className="mcard-cost">
          {mission.estimated_cost === 0 ? "不花钱" : `约 ${mission.estimated_cost} 元`}
        </span>
      </div>

      {open ? (
        <div className="mcard-detail">
          <ol className="steps steps-small">
            {mission.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mcard-fallback">做不到就这样：{mission.fallback}</p>
        </div>
      ) : (
        <p className="mcard-hint">点开看步骤 →</p>
      )}
    </article>
  );
}

function SkeletonCard({ primary }: { primary: boolean }) {
  return (
    <div className={`mcard skeleton ${primary ? "is-primary" : ""}`} aria-hidden="true">
      <div className="sk-line sk-sm" />
      <div className="sk-line sk-lg" />
      <div className="sk-line sk-md" />
      <div className="sk-line sk-xs" />
    </div>
  );
}

export function CardsScreen({
  missions,
  loading,
  inspiration,
  selectedId,
  weatherLabel,
  onSelect,
  onConfirm,
  onReroll,
  onBack,
}: CardsScreenProps) {
  return (
    <div className="screen cards-screen">
      <header className="screen-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="返回">
          <ArrowLeftIcon />
        </button>
        <div className="screen-title">
          <h2>{loading ? "精灵在翻口袋……" : "挑了三条，选一条"}</h2>
          <p>
            {loading
              ? "别催，快了"
              : `${weatherLabel ? `${weatherLabel} · ` : ""}第 1 条是主推，剩下两条备选`}
          </p>
        </div>
        <div className="insp insp-static" aria-label={`灵感 ${inspiration} / 3`}>
          {[0, 1, 2].map((i) => (
            <i key={i} className={i < inspiration ? "on" : ""} />
          ))}
        </div>
      </header>

      <div className="cards-body">
        {loading || !missions ? (
          <div className="cards-list">
            <SkeletonCard primary />
            <SkeletonCard primary={false} />
            <SkeletonCard primary={false} />
          </div>
        ) : (
          <div className="cards-list">
            {missions.map((mission, index) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                primary={index === 0}
                selected={selectedId === mission.id}
                index={index}
                onSelect={() => onSelect(mission.id)}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="cards-foot">
        <button
          type="button"
          className="btn btn-primary btn-big"
          onClick={onConfirm}
          disabled={loading || !missions || !selectedId}
        >
          就这条
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-big"
          onClick={onReroll}
          disabled={loading || inspiration <= 0}
        >
          换一批 · 1 灵感
        </button>
      </footer>
    </div>
  );
}
