import React from 'react';
import { CircleHelp } from 'lucide-react';

/**
 * 「？」ヘルプボタン。測定の主操作より目立たせないよう控えめな配色にする。
 * タップ領域は44px確保しつつ、見た目のアイコンは小さく保つ。
 */
export const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="使い方を見る"
    className="w-11 h-11 -mr-2.5 flex items-center justify-center text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-100 transition-colors shrink-0"
  >
    <CircleHelp className="w-[18px] h-[18px]" />
  </button>
);
