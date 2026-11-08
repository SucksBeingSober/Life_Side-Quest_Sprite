"use client";

import type { CompletionRecord, Settlement } from "@/lib/types";
import { Spirit } from "./Spirit";
import { rarityKey } from "./CardsScreen";

export interface ResultData {
  settlement: Settlement;
  expGain: number;
  levelBefore: number;
  levelAfter: number;
  record: CompletionRecord;
}

interface ResultModalProps {
  result: ResultData;
  onClose: () => void;
  onGrowth: () => void;
}

export function ResultModal({ result, onClose, onGrowth }: ResultModalProps) {
  const { settlement, expGain, levelBefore, levelAfter, record } = result;

  return (
    <div className="scrim center" role="presentation">
      <section
        className={`result result-${rarityKey(record.rarity)}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
      >
        <div className="result-band">
          <span>{record.rarity}</span>
          <span>第 {record.index} 条支线</span>
        </div>

        <div className="result-body">
          <p className="eyebrow">Sidequest Cleared</p>
          <h2 id="result-title">{settlement.title}</h2>
          <p className="result-mission">「{record.missionTitle}」</p>

          <div className="result-words">
            <Spirit mood="soft" size={68} />
            <p>{settlement.reaction}</p>
          </div>

          <div className="result-stats">
            <div>
              <b>+{expGain}</b>
              <span>经验</span>
            </div>
            <div>
              <b>Lv.{levelAfter}</b>
              <span>{levelAfter > levelBefore ? `从 Lv.${levelBefore} 升上来` : "当前等级"}</span>
            </div>
            <div>
              <b>
                {record.inspiration}
                <em>/3</em>
              </b>
              <span>灵感</span>
            </div>
          </div>

          <div className="result-actions">
            <button type="button" className="btn btn-primary btn-big" onClick={onGrowth}>
              看看成长卡
            </button>
            <button type="button" className="btn btn-ghost btn-big" onClick={onClose}>
              继续
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
