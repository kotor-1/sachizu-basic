import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * HelpModal / TutorialModal が共有するモーダル基盤。
 * モバイルでは下からのシート、sm以上では中央モーダルとして表示する。
 *
 * アクセシビリティ:
 * - role="dialog" + aria-modal + aria-labelledby
 * - ESCキーで閉じる（PC対応）
 * - 背景クリックで閉じる（シート内クリックは伝播させない）
 * - 開いた瞬間に閉じるボタンへフォーカスし、閉じたら元の要素へ戻す
 * - 背景スクロールをロック
 */
export const BottomSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, children, footer }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useRef(`sheet-title-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[85svh] sm:max-h-[80vh] bg-white rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-100 shrink-0">
          <h2 id={titleId} className="text-sm font-black text-zinc-950 truncate pr-2">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="w-11 h-11 -mr-2.5 flex items-center justify-center text-zinc-500 hover:text-zinc-950 rounded-md hover:bg-zinc-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-5 overflow-y-auto overscroll-contain">{children}</div>

        {footer && <div className="px-4 py-3 border-t border-zinc-100 shrink-0">{footer}</div>}
      </div>
    </div>
  );
};
