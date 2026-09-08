import React, { useEffect, useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { HELP_CONTENT, TutorialScreenKey } from '../content/helpContent';

interface TutorialModalProps {
  open: boolean;
  screenKey: TutorialScreenKey;
  /** 「はじめる」「スキップ」、ESC/背景クリックいずれでも呼ばれる（＝見た扱いにする） */
  onFinish: () => void;
}

/**
 * 各種目を初めて開いた時だけ出す簡易チュートリアル。
 * 大きな番号・短い見出し・1〜2行の説明だけで構成し、カードを積んだり
 * 派手な演出は行わない（見た目はHelpModalと同じ現在のUIトーンを流用）。
 */
export const TutorialModal: React.FC<TutorialModalProps> = ({ open, screenKey, onFinish }) => {
  const [index, setIndex] = useState(0);
  const steps = HELP_CONTENT[screenKey].steps;

  // 開くたびに1枚目から表示する
  useEffect(() => {
    if (open) setIndex(0);
  }, [open, screenKey]);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const footer = (
    <div className="space-y-2.5">
      <div className="flex items-center justify-center gap-1.5">
        {steps.map((s, i) => (
          <span
            key={s.number}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-5 bg-blue-600' : 'w-1.5 bg-zinc-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onFinish}
          className="min-h-[44px] px-2 text-xs font-bold text-zinc-400 hover:text-zinc-700"
        >
          スキップ
        </button>
        <button
          type="button"
          onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
          className="min-h-[44px] px-6 bg-zinc-950 hover:bg-black active:scale-[0.99] text-white font-black rounded-xl text-sm transition-all"
        >
          {isLast ? 'はじめる' : '次へ'}
        </button>
      </div>
    </div>
  );

  if (!step) return null;

  return (
    <BottomSheet open={open} onClose={onFinish} title={HELP_CONTENT[screenKey].title} footer={footer}>
      <div className="py-6 text-center space-y-3">
        <div className="font-mono text-4xl font-black text-blue-600">{step.number}</div>
        <h3 className="text-lg font-black text-zinc-950">{step.title}</h3>
        {step.body && (
          <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line max-w-xs mx-auto">
            {step.body}
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
