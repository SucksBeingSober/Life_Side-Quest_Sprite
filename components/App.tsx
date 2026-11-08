"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Home } from "./Home";
import { InputSheet, type Params } from "./InputSheet";
import { CardsScreen } from "./CardsScreen";
import { ResultModal, type ResultData } from "./ResultModal";
import { ReflectModal, SettlingOverlay } from "./ReflectModal";
import { GrowthScreen } from "./GrowthScreen";
import { Toast } from "./Toast";
import { Spirit } from "./Spirit";
import {
  applyCompletion,
  defaultState,
  loadState,
  saveState,
} from "@/lib/game";
import { buildGuaranteedMissions, buildMockMissions, fallbackSettlement, fallbackTalk, spriteMoodFor } from "@/lib/mock";
import type {
  CompletionRecord,
  GameState,
  Mission,
  Mood,
  Scene,
  Settlement,
  SpriteMood,
  WeatherInfo,
} from "@/lib/types";

type Screen = "home" | "cards" | "growth";

interface Bubble {
  text: string;
  mood: SpriteMood;
  busy: boolean;
}

export default function App() {
  const [state, setState] = useState<GameState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [bubble, setBubble] = useState<Bubble>({ text: "", mood: "soft", busy: true });
  const [inputOpen, setInputOpen] = useState(false);
  const [params, setParams] = useState<Params>({
    mood: "normal",
    time: 30,
    budget: 0,
    note: "",
    city: "上海",
  });
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reflectOpen, setReflectOpen] = useState(false);
  const [settling, setSettling] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [growth, setGrowth] = useState<CompletionRecord | null>(null);
  const [toast, setToast] = useState("");

  const stateRef = useRef(state);
  const talkSeq = useRef(0);
  const toastTimer = useRef<number | null>(null);
  const launchHandled = useRef(false);
  const weatherSeq = useRef(0);

  const patch = useCallback((fn: (current: GameState) => GameState) => {
    setState((prev) => {
      const next = fn(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const say = useCallback(async (scene: Scene, moodOverride?: Mood, inspOverride?: number) => {
    const current = stateRef.current;
    const mood = moodOverride ?? current.mood;
    const inspiration = inspOverride ?? current.inspiration;
    const seq = (talkSeq.current += 1);

    setBubble((prev) => ({ ...prev, busy: true, mood: spriteMoodFor(mood) }));

    let next = fallbackTalk(scene, mood, current.completions);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 1800);
      const response = await fetch("/api/talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, mood, inspiration, completions: current.completions }),
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (response.ok) {
        const data = (await response.json()) as { mood?: SpriteMood; text?: string };
        if (data?.text) {
          next = {
            mood: data.mood ?? spriteMoodFor(mood),
            text: data.text,
            source: "ai",
          };
        }
      }
    } catch {
      /* 用本地台词兜底 */
    }

    if (seq === talkSeq.current) {
      setBubble({ text: next.text, mood: next.mood, busy: false });
    }
  }, []);

  useEffect(() => {
    const loaded = loadState();
    stateRef.current = loaded;
    setState(loaded);
    setParams((prev) => ({ ...prev, mood: loaded.mood, city: loaded.city }));
    setHydrated(true);
    void say("opening", loaded.mood, loaded.inspiration);
  }, [say]);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  useEffect(() => {
    const city = params.city.trim();
    const seq = (weatherSeq.current += 1);

    if (!city) {
      setWeather(null);
      setWeatherError("");
      setWeatherLoading(false);
      return;
    }

    const controller = new AbortController();
    setWeatherLoading(true);
    setWeatherError("");

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as
          | (WeatherInfo & { ok: true })
          | { ok: false; error?: string; city?: string };
        if (seq !== weatherSeq.current) return;
        if (data.ok) {
          setWeather(data);
        } else {
          setWeather(null);
          setWeatherError(
            data.error === "city_not_found" ? "没找到这个城市" : "天气暂时拿不到",
          );
        }
      } catch (error) {
        if (seq === weatherSeq.current && (error as Error).name !== "AbortError") {
          setWeather(null);
          setWeatherError("天气暂时拿不到");
        }
      } finally {
        if (seq === weatherSeq.current) setWeatherLoading(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [params.city]);

  const updateParams = useCallback(
    (partial: Partial<Params>) => {
      setParams((prev) => ({ ...prev, ...partial }));
      if (partial.city !== undefined) {
        const city = partial.city.slice(0, 20);
        patch((current) => ({ ...current, city }));
      }
    },
    [patch],
  );

  const startBatch = useCallback(
    async (free: boolean) => {
      if (loadingBatch) return;
      if (stateRef.current.inspiration <= 0 && stateRef.current.activeMission) {
        setInputOpen(false);
        showToast("先完成手上这条，灵感就回来了");
        return;
      }
      const isFree = free || stateRef.current.inspiration <= 0;

      setInputOpen(false);
      setScreen("cards");
      setLoadingBatch(true);
      setMissions(null);
      setSelectedId(null);

      patch((current) => ({
        ...current,
        mood: params.mood,
        inspiration: isFree ? current.inspiration : Math.max(0, current.inspiration - 1),
      }));

      const request = {
        mood: params.mood,
        time: params.time,
        budget: params.budget,
        note: params.note.trim(),
        free: isFree,
        exclude: stateRef.current.recentTitles,
        city: params.city.trim() || undefined,
        weather: weather
          ? `${weather.weather} ${weather.temperature}°C，降水 ${weather.precipitation}%`
          : undefined,
        weather_code: weather?.code,
        temperature: weather?.temperature,
        precipitation: weather?.precipitation,
      };

      try {
        const response = await fetch("/api/missions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error("bad_status");
        const data = (await response.json()) as { missions?: Mission[]; source?: string };
        const list = Array.isArray(data.missions) ? data.missions : [];
        if (list.length !== 3) throw new Error("bad_list");
        setMissions(list);
        setSelectedId(list[0].id);
      } catch {
        const list = isFree ? buildGuaranteedMissions() : buildMockMissions(request);
        setMissions(list);
        setSelectedId(list[0].id);
        showToast("网络不太顺，先给你几条稳的");
      } finally {
        setLoadingBatch(false);
      }
    },
    [loadingBatch, params, patch, showToast, weather],
  );

  const reroll = useCallback(async () => {
    if (loadingBatch) return;
    if (stateRef.current.inspiration <= 0) {
      showToast("灵感不够了，先做一条");
      return;
    }

    patch((current) => ({
      ...current,
      inspiration: Math.max(0, current.inspiration - 1),
      mood: params.mood,
    }));

    setLoadingBatch(true);
    setSelectedId(null);

    const exclude = [
      ...(missions ?? []).map((mission) => mission.title),
      ...stateRef.current.recentTitles,
    ];

    const request = {
      mood: params.mood,
      time: params.time,
      budget: params.budget,
      note: params.note.trim(),
      exclude,
      city: params.city.trim() || undefined,
      weather: weather
        ? `${weather.weather} ${weather.temperature}°C，降水 ${weather.precipitation}%`
        : undefined,
      weather_code: weather?.code,
      temperature: weather?.temperature,
      precipitation: weather?.precipitation,
    };

    try {
      const response = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error("bad_status");
      const data = (await response.json()) as { missions?: Mission[] };
      const list = Array.isArray(data.missions) ? data.missions : [];
      if (list.length !== 3) throw new Error("bad_list");
      setMissions(list);
      setSelectedId(list[0].id);
    } catch {
      const list = buildMockMissions(request);
      setMissions(list);
      setSelectedId(list[0].id);
      showToast("没换成，先拿这几条顶着");
    } finally {
      setLoadingBatch(false);
    }
  }, [loadingBatch, missions, params, patch, showToast, weather]);

  const confirmPick = useCallback(() => {
    const mission = missions?.find((item) => item.id === selectedId);
    if (!mission) return;
    patch((current) => ({ ...current, activeMission: mission, mood: params.mood }));
    setMissions(null);
    setSelectedId(null);
    setScreen("home");
    void say("mission", params.mood, stateRef.current.inspiration);
  }, [missions, selectedId, params.mood, patch, say]);

  const backFromCards = useCallback(() => {
    setMissions(null);
    setSelectedId(null);
    setScreen("home");
  }, []);

  const openInput = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      mood: stateRef.current.mood,
      city: stateRef.current.city,
    }));
    setInputOpen(true);
  }, []);

  const openReflect = useCallback(() => {
    if (!stateRef.current.activeMission) {
      showToast("还没有进行中的支线");
      return;
    }
    setReflectOpen(true);
  }, [showToast]);

  const submitReflection = useCallback(
    async (text: string) => {
      const mission = stateRef.current.activeMission;
      if (!mission || settling) return;

      setReflectOpen(false);
      setSettling(true);

      const reflection = text.trim().slice(0, 40);
      const startedAt = Date.now();

      let settlement: Settlement;
      try {
        const response = await fetch("/api/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            missionTitle: mission.title,
            rarity: mission.rarity,
            reflection,
            tags: mission.tags,
          }),
        });
        if (!response.ok) throw new Error("bad_status");
        const data = (await response.json()) as Partial<Settlement>;
        if (!data?.title || !data?.reaction || !data?.share_text) throw new Error("bad_body");
        settlement = {
          title: data.title,
          reaction: data.reaction,
          share_text: data.share_text,
        };
      } catch {
        settlement = fallbackSettlement({
          missionTitle: mission.title,
          rarity: mission.rarity,
          reflection,
          tags: mission.tags,
        });
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed < 1200) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200 - elapsed));
      }

      if (stateRef.current.settledIds.includes(mission.id)) {
        setSettling(false);
        return;
      }

      const outcome = applyCompletion(stateRef.current, {
        mission,
        award: settlement.title,
        shareText: settlement.share_text,
        reaction: settlement.reaction,
        reflection,
      });

      patch(() => outcome.state);
      setResult({
        settlement,
        expGain: outcome.expGain,
        levelBefore: outcome.levelBefore,
        levelAfter: outcome.levelAfter,
        record: outcome.record,
      });
      setSettling(false);
    },
    [patch, settling],
  );

  const skipReflection = useCallback(() => {
    void submitReflection("");
  }, [submitReflection]);

  const closeResult = useCallback(() => {
    setResult(null);
    void say("complete", stateRef.current.mood, stateRef.current.inspiration);
  }, [say]);

  const openGrowthFromResult = useCallback(() => {
    const record = result?.record;
    setResult(null);
    if (record) {
      setGrowth(record);
      setScreen("growth");
    }
  }, [result]);

  const viewGrowth = useCallback(() => {
    const latest = stateRef.current.history[0];
    if (!latest) {
      showToast("先完成一条支线，才有卡可看");
      void say("idle");
      return;
    }
    setGrowth(latest);
    setScreen("growth");
  }, [say, showToast]);

  const backHome = useCallback(() => {
    setScreen("home");
  }, []);

  const poke = useCallback(() => {
    void say("idle");
  }, [say]);

  useEffect(() => {
    if (!hydrated || launchHandled.current) return;
    launchHandled.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get("desktop") === "1") {
      document.body.classList.add("desktop-panel");
    }

    const action = params.get("action");
    if (!action) return;

    const timer = window.setTimeout(() => {
      if (action === "input") setInputOpen(true);
      else if (action === "complete") openReflect();
      else if (action === "growth") viewGrowth();
    }, 240);

    return () => window.clearTimeout(timer);
  }, [hydrated, openReflect, viewGrowth]);

  if (!hydrated) {
    return (
      <div className="boot">
        <Spirit mood="soft" size={104} />
        <p>正在醒来</p>
      </div>
    );
  }

  return (
    <>
      {screen === "home" && (
        <Home
          state={state}
          bubble={bubble}
          onAsk={openInput}
          onComplete={openReflect}
          onGrowth={viewGrowth}
          onPoke={poke}
        />
      )}

      {screen === "cards" && (
        <CardsScreen
          missions={missions}
          loading={loadingBatch}
          inspiration={state.inspiration}
          selectedId={selectedId}
          weatherLabel={
            weather
              ? `${weather.city} · ${weather.weather} ${weather.temperature}°C`
              : params.city.trim() || undefined
          }
          onSelect={setSelectedId}
          onConfirm={confirmPick}
          onReroll={reroll}
          onBack={backFromCards}
        />
      )}

      {screen === "growth" && growth && (
        <GrowthScreen record={growth} onBack={backHome} onToast={showToast} />
      )}

      {inputOpen && (
        <InputSheet
          params={params}
          inspiration={state.inspiration}
          hasActive={Boolean(state.activeMission)}
          loading={loadingBatch}
          weather={weather}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          onChange={updateParams}
          onSubmit={() => void startBatch(false)}
          onClose={() => setInputOpen(false)}
        />
      )}

      {reflectOpen && state.activeMission && (
        <ReflectModal
          missionTitle={state.activeMission.title}
          onSkip={skipReflection}
          onSubmit={submitReflection}
        />
      )}

      {settling && <SettlingOverlay />}

      {result && (
        <ResultModal result={result} onClose={closeResult} onGrowth={openGrowthFromResult} />
      )}

      <Toast message={toast} />
    </>
  );
}
