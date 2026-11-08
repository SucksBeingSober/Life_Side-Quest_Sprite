"use client";

import type { GameState, SpriteMood } from "@/lib/types";
import { levelProgress } from "@/lib/game";
import { Spirit } from "./Spirit";
import { SparkIcon, CheckIcon, CardIcon } from "./icons";
import { rarityKey } from "./CardsScreen";

interface HomeProps {
  state: GameState;
  bubble: { text: string; mood: SpriteMood; busy: boolean };
  onAsk: () => void;
  onComplete: () => void;
  onGrowth: () => void;
  onPoke: () => void;
}

function StatusBar({ state }: { state: GameState }) {
  const progress = levelProgress(state.exp);
  return (
    <header className="statusbar">
      <div className="status-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          人生支线小精灵
        </div>
        <div className="status-right">
          <span className="lv">Lv.{progress.level}</span>
          <span className="exp-track" aria-hidden="true">
            <i style={{ width: `${progress.percent}%` }} />
          </span>
          <span className="insp" aria-label={`灵感 ${state.inspiration} / 3`}>
            <span className="insp-label">灵感</span>
            {[0, 1, 2].map((i) => (
              <i key={i} className={i < state.inspiration ? "on" : ""} />
            ))}
          </span>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <p className="eyebrow">Life Sidequest</p>
      <h1>
        今天，
        <br />
        走条支线。
      </h1>
      <p className="hero-sub">
        挑个心情、时间和预算，精灵给你派一条现实里的小任务。完成有经验、有称号，还有一张能发出去的卡。
      </p>
      <div className="hero-meta">
        <span>无注册</span>
        <span>30 秒开始</span>
        <span>记录只在你本地</span>
      </div>
    </section>
  );
}

function ActiveMission({ state }: { state: GameState }) {
  const mission = state.activeMission;
  if (!mission) return null;
  return (
    <section className="active-card">
      <div className="active-head">
        <span className="live-dot" aria-hidden="true" />
        <span>进行中</span>
        <span className={`badge badge-${rarityKey(mission.rarity)}`}>{mission.rarity}</span>
      </div>

      <h1 className="active-title">{mission.title}</h1>
      <p className="active-summary">{mission.summary}</p>

      <ol className="steps">
        {mission.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="active-meta">
        <span className="meta-pill">{mission.duration_minutes} 分钟</span>
        <span className="meta-pill">{mission.estimated_cost === 0 ? "不花钱" : `约 ${mission.estimated_cost} 元`}</span>
        {mission.tags.map((tag) => (
          <span key={tag} className="meta-tag">
            #{tag}
          </span>
        ))}
      </div>

      <p className="active-fallback">做不到就这样：{mission.fallback}</p>
      <p className="active-hint">做完点下面的「我完成了」。</p>
    </section>
  );
}

function Dock({
  bubble,
  onPoke,
}: {
  bubble: { text: string; mood: SpriteMood; busy: boolean };
  onPoke: () => void;
}) {
  return (
    <div className="dock">
      <div className={`bubble ${bubble.busy ? "is-busy" : ""}`} role="status" aria-live="polite">
        {bubble.busy ? (
          <span className="typing" aria-label="精灵正在说话">
            <i />
            <i />
            <i />
          </span>
        ) : (
          <p>{bubble.text}</p>
        )}
        <span className="bubble-tail" aria-hidden="true" />
      </div>
      <Spirit mood={bubble.mood} interactive onPoke={onPoke} talking={bubble.busy} />
    </div>
  );
}

export function Home({ state, bubble, onAsk, onComplete, onGrowth, onPoke }: HomeProps) {
  return (
    <div className="home">
      <StatusBar state={state} />
      <main className="stage">{state.activeMission ? <ActiveMission state={state} /> : <Hero />}</main>

      <Dock bubble={bubble} onPoke={onPoke} />

      <nav className="actionbar" aria-label="主要操作">
        <button type="button" className="act act-primary" onClick={onAsk}>
          <SparkIcon />
          <span>派支线</span>
        </button>
        <button type="button" className="act" onClick={onComplete} disabled={!state.activeMission}>
          <CheckIcon />
          <span>我完成了</span>
        </button>
        <button type="button" className="act" onClick={onGrowth}>
          <CardIcon />
          <span>看看成长</span>
        </button>
      </nav>
    </div>
  );
}
