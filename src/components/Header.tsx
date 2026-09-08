import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { HelpButton } from './HelpButton';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  /** 右上の小さなラベル（測定画面以外では文脈に合わせて差し替える） */
  rightLabel?: string;
  /** 指定した画面のみ「？」ヘルプボタンを表示する（相談ページ等では渡さない） */
  onHelpClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'JUMP & SPRINT',
  onBack,
  showBack = false,
  rightLabel = 'MEASUREMENT',
  onHelpClick,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 h-12 flex items-center">
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {showBack && onBack ? (
            <button
              onClick={onBack}
              className="w-11 h-11 -ml-3.5 -mr-2 flex items-center justify-center text-zinc-600 hover:text-zinc-950 rounded-md hover:bg-zinc-100 transition-colors"
              aria-label="戻る"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : null}
          <span className="text-xs font-black tracking-wider text-zinc-900 uppercase">
            {title}
          </span>
        </div>

        <div className="flex items-center space-x-0.5">
          {onHelpClick && <HelpButton onClick={onHelpClick} />}
          {/* 右側は装飾を廃止し、不要なバッジを完全撤廃 */}
          <div className="text-[10px] font-mono tracking-wider text-zinc-400">
            {rightLabel}
          </div>
        </div>
      </div>
    </header>
  );
};
