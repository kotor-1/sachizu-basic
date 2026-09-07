import React, { useRef, useState, useCallback } from 'react';

interface SprintLineOverlayProps {
  line0X: number; // 0〜100 (%)
  line10X: number; // 0〜100 (%)
  onChangeLine0X: (newX: number) => void;
  onChangeLine10X: (newX: number) => void;
}

export const SprintLineOverlay: React.FC<SprintLineOverlayProps> = ({
  line0X,
  line10X,
  onChangeLine0X,
  onChangeLine10X,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeDragging, setActiveDragging] = useState<'0m' | '10m' | null>(null);

  // ポインターダウン開始
  const handlePointerDown = (lineType: '0m' | '10m') => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setActiveDragging(lineType);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // ドラッグ中移動
  const handlePointerMove = useCallback(
    (lineType: '0m' | '10m') => (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeDragging !== lineType || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const clientX = e.clientX;
      const rawPercent = ((clientX - rect.left) / rect.width) * 100;
      const clampedPercent = Math.max(1, Math.min(99, Math.round(rawPercent * 10) / 10));

      if (lineType === '0m') {
        onChangeLine0X(clampedPercent);
      } else {
        onChangeLine10X(clampedPercent);
      }
    },
    [activeDragging, onChangeLine0X, onChangeLine10X]
  );

  // ポインター終了
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setActiveDragging(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // releasePointerCapture failure fallback
    }
  };

  const isLeftToRight = line0X <= line10X;

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none select-none">
      {/* 走行方向ミニインジケーター（動画上部中央） */}
      <div className="absolute top-2 right-2 pointer-events-none z-30">
        <span className="bg-black/70 backdrop-blur-xs text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-white/20">
          走行方向: {isLeftToRight ? '左 → 右' : '右 → 左'}
        </span>
      </div>

      {/* 0m ライン */}
      <div
        style={{ left: `${line0X}%` }}
        className="absolute top-0 bottom-0 pointer-events-auto cursor-ew-resize touch-none z-30"
      >
        {/* 幅40pxのタッチ判定領域（中心に配置） */}
        <div
          data-line-handle="true"
          onPointerDown={handlePointerDown('0m')}
          onPointerMove={handlePointerMove('0m')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute top-0 bottom-0 -left-5 w-10 flex flex-col items-center justify-between group"
        >
          {/* 上部ラベル */}
          <div className="mt-1 px-1.5 py-0.5 bg-amber-500 text-black font-mono font-black text-[10px] rounded shadow-sm">
            0m
          </div>

          {/* 中央の細い縦線（見た目2px） */}
          <div
            className={`w-0.5 h-full transition-colors ${
              activeDragging === '0m' ? 'bg-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-amber-400'
            }`}
          />

          {/* 下部ツマミ */}
          <div className="mb-1 w-3 h-3 rounded-full bg-amber-500 border border-white shadow-xs" />
        </div>
      </div>

      {/* 10m ライン */}
      <div
        style={{ left: `${line10X}%` }}
        className="absolute top-0 bottom-0 pointer-events-auto cursor-ew-resize touch-none z-30"
      >
        {/* 幅40pxのタッチ判定領域（中心に配置） */}
        <div
          data-line-handle="true"
          onPointerDown={handlePointerDown('10m')}
          onPointerMove={handlePointerMove('10m')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute top-0 bottom-0 -left-5 w-10 flex flex-col items-center justify-between group"
        >
          {/* 上部ラベル */}
          <div className="mt-1 px-1.5 py-0.5 bg-blue-500 text-white font-mono font-black text-[10px] rounded shadow-sm">
            10m
          </div>

          {/* 中央の細い縦線（見た目2px） */}
          <div
            className={`w-0.5 h-full transition-colors ${
              activeDragging === '10m' ? 'bg-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-blue-500'
            }`}
          />

          {/* 下部ツマミ */}
          <div className="mb-1 w-3 h-3 rounded-full bg-blue-500 border border-white shadow-xs" />
        </div>
      </div>
    </div>
  );
};
