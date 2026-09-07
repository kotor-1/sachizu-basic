import React, { useState } from 'react';
import { RECOMMENDED_MIN_FPS } from '../config';

interface FpsSelectorProps {
  fps: number;
  onChangeFps: (newFps: number) => void;
  /** プリセット候補（未指定時は既存の 60 / 120 / 240） */
  options?: number[];
  /** 60fps未満の警告表示（時間計測を伴わない画面では false を渡す） */
  showLowFpsWarning?: boolean;
}

const COMMON_FPS_OPTIONS = [60, 120, 240];

// Tailwind のクラス名は静的に列挙する必要があるためマップで保持する
const GRID_COLS_CLASS: Record<number, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

export const FpsSelector: React.FC<FpsSelectorProps> = ({
  fps,
  onChangeFps,
  options = COMMON_FPS_OPTIONS,
  showLowFpsWarning = true,
}) => {
  const [isCustom, setIsCustom] = useState(!options.includes(fps));
  const [customInput, setCustomInput] = useState(String(fps));

  const handleSelectPreset = (val: number) => {
    setIsCustom(false);
    onChangeFps(val);
  };

  const handleCustomClick = () => {
    setIsCustom(true);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomInput(valStr);
    const num = parseInt(valStr, 10);
    if (!isNaN(num) && num > 0) {
      onChangeFps(num);
    }
  };

  const isLowFps = fps < RECOMMENDED_MIN_FPS;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          FRAME RATE
        </span>
        <span className="font-mono font-bold text-zinc-700">
          {fps} fps
        </span>
      </div>

      {/* スタイリッシュなセグメント切替コントロール */}
      <div
        className={`grid ${
          GRID_COLS_CLASS[options.length + 1] ?? 'grid-cols-4'
        } gap-1 p-1 bg-zinc-100 rounded-lg`}
      >
        {options.map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => handleSelectPreset(val)}
            className={`py-1.5 rounded-md font-mono text-xs font-bold transition-all ${
              !isCustom && fps === val
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {val}
          </button>
        ))}
        <button
          type="button"
          onClick={handleCustomClick}
          className={`py-1.5 rounded-md font-mono text-xs font-bold transition-all ${
            isCustom
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          その他
        </button>
      </div>

      {/* その他入力 */}
      {isCustom && (
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="number"
            min="1"
            max="1000"
            value={customInput}
            onChange={handleCustomChange}
            placeholder="数値を入力"
            className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-zinc-950"
          />
          <span className="font-mono text-xs text-zinc-500 font-bold shrink-0">fps</span>
        </div>
      )}

      {/* 警告表示（必要なときだけ控えめに表示） */}
      {showLowFpsWarning && isLowFps && (
        <p className="text-[11px] text-amber-700 font-medium">
          ※60fps未満の動画は測定誤差が大きくなる場合があります
        </p>
      )}
    </div>
  );
};
