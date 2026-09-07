import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'JUMP & SPRINT',
  onBack,
  showBack = false,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 h-12 flex items-center">
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {showBack && onBack ? (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1.5 text-zinc-600 hover:text-zinc-950 rounded-md hover:bg-zinc-100 transition-colors"
              aria-label="戻る"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : null}
          <span className="text-xs font-black tracking-wider text-zinc-900 uppercase">
            {title}
          </span>
        </div>

        {/* 右側は装飾を廃止し、不要なバッジを完全撤廃 */}
        <div className="text-[10px] font-mono tracking-wider text-zinc-400">
          MEASUREMENT
        </div>
      </div>
    </header>
  );
};
