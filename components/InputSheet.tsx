"use client";

import { useEffect } from "react";
import {
  BUDGETS,
  CITIES,
  MOODS,
  TIMES,
  type BudgetLimit,
  type Mood,
  type TimeLimit,
  type WeatherInfo,
} from "@/lib/types";
import { CloseIcon } from "./icons";

export interface Params {
  mood: Mood;
  time: TimeLimit;
  budget: BudgetLimit;
  note: string;
  city: string;
}

interface InputSheetProps {
  params: Params;
  inspiration: number;
  hasActive: boolean;
  loading: boolean;
  weather: WeatherInfo | null;
  weatherLoading: boolean;
  weatherError: string;
  onChange: (patch: Partial<Params>) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code === 45 || code === 48) return "🌫️";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "❄️";
  if (code >= 95) return "⛈️";
  if (code >= 51) return "🌧️";
  return "🌤️";
}

export function InputSheet({
  params,
  inspiration,
  hasActive,
  loading,
  weather,
  weatherLoading,
  weatherError,
  onChange,
  onSubmit,
  onClose,
}: InputSheetProps) {
  const locked = inspiration <= 0 && hasActive;
  const free = inspiration <= 0 && !hasActive;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="scrim sheet-scrim" onClick={onClose} role="presentation">
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden="true" />

        <header className="sheet-head">
          <div>
            <p className="eyebrow">Sidequest Brief</p>
            <h2 id="sheet-title">给你派条支线</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
            <CloseIcon />
          </button>
        </header>

        <div className="field">
          <div className="field-label">
            <span>在哪个城市</span>
            <em>
              {weatherLoading
                ? "查天气…"
                : weather
                  ? `${weather.weather} ${weather.temperature}°C`
                  : weatherError
                    ? "天气暂不可用"
                    : "选填"}
            </em>
          </div>
          <input
            className="city-input"
            value={params.city}
            list="city-options"
            maxLength={20}
            placeholder="输入城市，如 上海"
            onChange={(event) => onChange({ city: event.target.value.slice(0, 20) })}
          />
          <datalist id="city-options">
            {CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          {weather ? (
            <div className={`weather-pill ${weather.isWet ? "is-wet" : ""}`}>
              <span className="weather-emoji" aria-hidden="true">
                {weatherEmoji(weather.code)}
              </span>
              <span className="weather-main">
                {weather.city} · {weather.weather} {weather.temperature}°C
              </span>
              <span className="weather-extra">
                降水 {weather.precipitation}% · 风 {weather.wind} km/h
              </span>
            </div>
          ) : (
            <p className="weather-note">
              {weatherLoading
                ? "正在查当天天气…"
                : weatherError
                  ? "天气暂时拿不到，仍可按城市派支线。"
                  : "填城市后自动查当天天气，拿到后会按天气挑支线。"}
            </p>
          )}
        </div>

        <div className="field">
          <div className="field-label">
            <span>现在心情</span>
            <em>{MOODS.find((m) => m.id === params.mood)?.note}</em>
          </div>
          <div className="chips chips-4">
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                type="button"
                className="chip"
                data-on={params.mood === mood.id}
                onClick={() => onChange({ mood: mood.id })}
              >
                <span className="chip-emoji" aria-hidden="true">
                  {mood.emoji}
                </span>
                <span className="chip-label">{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">
            <span>有多少时间</span>
            <em>{TIMES.find((t) => t.id === params.time)?.note}</em>
          </div>
          <div className="chips chips-3">
            {TIMES.map((time) => (
              <button
                key={time.id}
                type="button"
                className="chip chip-time"
                data-on={params.time === time.id}
                onClick={() => onChange({ time: time.id })}
              >
                <span className="chip-label">{time.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">
            <span>预算</span>
            <em>{BUDGETS.find((b) => b.id === params.budget)?.note}</em>
          </div>
          <div className="chips chips-4">
            {BUDGETS.map((budget) => (
              <button
                key={budget.id}
                type="button"
                className="chip chip-budget"
                data-on={params.budget === budget.id}
                onClick={() => onChange({ budget: budget.id })}
              >
                <span className="chip-label">{budget.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">
            <span>想顺便说点什么？</span>
            <em>{params.note.length}/40</em>
          </div>
          <textarea
            className="note-input"
            value={params.note}
            maxLength={40}
            rows={2}
            placeholder="选填，比如：不想跟人说话 / 想走远一点"
            onChange={(event) => onChange({ note: event.target.value.slice(0, 40) })}
          />
        </div>

        <div className="sheet-foot">
          <button
            type="button"
            className="btn btn-primary btn-big"
            onClick={onSubmit}
            disabled={loading || locked}
          >
            {locked ? "先完成手上这条" : free ? "领一条保底支线 · 免费" : "派一条 · 消耗 1 灵感"}
          </button>
          <p className="fine">
            {locked
              ? "灵感用完了，完成进行中的支线就能恢复。"
              : free
                ? "灵感用完了，这条不消耗灵感。"
                : `还剩 ${inspiration} 点灵感，完成支线会回复。`}
          </p>
        </div>
      </section>
    </div>
  );
}
