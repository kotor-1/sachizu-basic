import React, { useCallback, useRef, useState } from 'react';

/**
 * 解析範囲（人物ROI）調整パネル。
 * - 静止画像の上に矩形を重ね、ユーザーが指(タッチ)またはマウスで
 *   移動・幅調整・高さ調整できる。
 * - 専門用語（ROI / Bounding Box / Crop）はUIに一切表示しない。
 * - 既存VideoPlayerのピンチズームとは完全に独立した画面（操作競合を避ける）。
 */

export interface RoiRectPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RoiAdjustPanelProps {
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  /** 前回指定した範囲。指定がない場合は中央の既定サイズを使用する。 */
  initialRoi?: RoiRectPixels | null;
  onConfirm: (roi: RoiRectPixels) => void;
  onCancel: () => void;
  /** 再解析中はボタンを無効化し、進行中であることを示す */
  isSubmitting?: boolean;
}

type HandleId = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

// 矩形の最小サイズ（動画寸法に対する比率）。極端に小さくして操作不能になるのを防ぐ。
const MIN_SIZE_RATIO = 0.15;

function clampRoi(roi: RoiRectPixels, maxW: number, maxH: number): RoiRectPixels {
  const width = Math.min(maxW, Math.max(1, roi.width));
  const height = Math.min(maxH, Math.max(1, roi.height));
  const x = Math.min(Math.max(0, roi.x), Math.max(0, maxW - width));
  const y = Math.min(Math.max(0, roi.y), Math.max(0, maxH - height));
  return { x, y, width, height };
}

/**
 * 初期の矩形位置。動画幅の約65%・動画高の約87%（60〜70% / 85〜90%の中庸）を
 * 中央に配置し、ユーザーは枠を少し動かすだけで済む状態を狙う。
 */
function defaultRoi(naturalWidth: number, naturalHeight: number): RoiRectPixels {
  const width = naturalWidth * 0.65;
  const height = naturalHeight * 0.87;
  return {
    x: (naturalWidth - width) / 2,
    y: (naturalHeight - height) / 2,
    width,
    height,
  };
}

const CORNER_POSITION_STYLE: Record<'nw' | 'ne' | 'sw' | 'se', React.CSSProperties> = {
  nw: { top: 0, left: 0, transform: 'translate(-50%, -50%)', cursor: 'nwse-resize' },
  ne: { top: 0, right: 0, transform: 'translate(50%, -50%)', cursor: 'nesw-resize' },
  sw: { bottom: 0, left: 0, transform: 'translate(-50%, 50%)', cursor: 'nesw-resize' },
  se: { bottom: 0, right: 0, transform: 'translate(50%, 50%)', cursor: 'nwse-resize' },
};

const EDGE_POSITION_STYLE: Record<'top' | 'bottom' | 'left' | 'right', React.CSSProperties> = {
  top: { top: 0, left: '50%', transform: 'translate(-50%, -50%)', cursor: 'ns-resize' },
  bottom: { bottom: 0, left: '50%', transform: 'translate(-50%, 50%)', cursor: 'ns-resize' },
  left: { left: 0, top: '50%', transform: 'translate(-50%, -50%)', cursor: 'ew-resize' },
  right: { right: 0, top: '50%', transform: 'translate(50%, -50%)', cursor: 'ew-resize' },
};

// タッチ操作を最優先: 見た目のつまみは小さくても、当たり判定は44px前後を確保する
const HANDLE_HIT_SIZE = 44;

const CornerHandle: React.FC<{
  position: 'nw' | 'ne' | 'sw' | 'se';
  onPointerDown: (e: React.PointerEvent) => void;
}> = ({ position, onPointerDown }) => (
  <div
    className="absolute flex items-center justify-center touch-none"
    style={{ ...CORNER_POSITION_STYLE[position], width: HANDLE_HIT_SIZE, height: HANDLE_HIT_SIZE }}
    onPointerDown={onPointerDown}
  >
    <div className="w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-sm" />
  </div>
);

const EdgeHandle: React.FC<{
  position: 'top' | 'bottom' | 'left' | 'right';
  onPointerDown: (e: React.PointerEvent) => void;
}> = ({ position, onPointerDown }) => {
  const isVertical = position === 'top' || position === 'bottom';
  return (
    <div
      className="absolute flex items-center justify-center touch-none"
      style={{
        ...EDGE_POSITION_STYLE[position],
        width: isVertical ? HANDLE_HIT_SIZE : 28,
        height: isVertical ? 28 : HANDLE_HIT_SIZE,
      }}
      onPointerDown={onPointerDown}
    >
      <div
        className={
          isVertical
            ? 'w-8 h-1.5 rounded-full bg-white border border-blue-600 shadow-sm'
            : 'h-8 w-1.5 rounded-full bg-white border border-blue-600 shadow-sm'
        }
      />
    </div>
  );
};

export const RoiAdjustPanel: React.FC<RoiAdjustPanelProps> = ({
  imageUrl,
  naturalWidth,
  naturalHeight,
  initialRoi,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [roi, setRoi] = useState<RoiRectPixels>(() =>
    initialRoi
      ? clampRoi(initialRoi, naturalWidth, naturalHeight)
      : defaultRoi(naturalWidth, naturalHeight)
  );

  const dragState = useRef<{
    handle: HandleId;
    startClientX: number;
    startClientY: number;
    startRoi: RoiRectPixels;
  } | null>(null);

  const minWidth = naturalWidth * MIN_SIZE_RATIO;
  const minHeight = naturalHeight * MIN_SIZE_RATIO;

  const beginDrag = useCallback(
    (handle: HandleId) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // ドラッグ状態は先に確定させる。setPointerCapture は「指がパネル外に
      // はみ出しても追従させる」ための保険であり、失敗してもドラッグ自体は
      // 通常のイベントバブリングで機能するため、ここで例外が伝播して
      // ドラッグ開始そのものを妨げないようにする。
      dragState.current = {
        handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startRoi: roi,
      };
      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // 一部の環境ではcaptureが取得できない場合があるが、握り続けても実害はない
      }
    },
    [roi]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragState.current;
      if (!drag || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const scaleX = naturalWidth / rect.width;
      const scaleY = naturalHeight / rect.height;
      const dx = (e.clientX - drag.startClientX) * scaleX;
      const dy = (e.clientY - drag.startClientY) * scaleY;

      let { x, y, width, height } = drag.startRoi;

      if (drag.handle === 'move') {
        x = drag.startRoi.x + dx;
        y = drag.startRoi.y + dy;
      } else {
        if (drag.handle.includes('e')) {
          width = Math.max(minWidth, drag.startRoi.width + dx);
        }
        if (drag.handle.includes('w')) {
          const newWidth = Math.max(minWidth, drag.startRoi.width - dx);
          x = drag.startRoi.x + (drag.startRoi.width - newWidth);
          width = newWidth;
        }
        if (drag.handle.includes('s')) {
          height = Math.max(minHeight, drag.startRoi.height + dy);
        }
        if (drag.handle.includes('n')) {
          const newHeight = Math.max(minHeight, drag.startRoi.height - dy);
          y = drag.startRoi.y + (drag.startRoi.height - newHeight);
          height = newHeight;
        }
      }

      setRoi(clampRoi({ x, y, width, height }, naturalWidth, naturalHeight));
    },
    [naturalWidth, naturalHeight, minWidth, minHeight]
  );

  const endDrag = useCallback((e: React.PointerEvent) => {
    dragState.current = null;
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // すでに解放済みの場合は無視
    }
  }, []);

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-[11px] font-mono tracking-wider text-blue-600 font-bold uppercase">
          解析範囲の調整
        </div>
        <h2 className="text-base font-black text-zinc-950">
          身体全体が枠の中に入るように合わせてください
        </h2>
        <p className="text-xs text-zinc-500">頭から足先まで入れてください。</p>
      </div>

      <div
        ref={containerRef}
        className="relative w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200/90 select-none touch-none"
        style={{ aspectRatio: `${naturalWidth} / ${naturalHeight}` }}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          src={imageUrl}
          alt="解析対象フレーム"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />

        {/* 人物範囲の矩形（枠内をドラッグで移動） */}
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 cursor-move touch-none"
          style={{
            left: pct(roi.x, naturalWidth),
            top: pct(roi.y, naturalHeight),
            width: pct(roi.width, naturalWidth),
            height: pct(roi.height, naturalHeight),
          }}
          onPointerDown={beginDrag('move')}
        >
          <EdgeHandle position="top" onPointerDown={beginDrag('n')} />
          <EdgeHandle position="bottom" onPointerDown={beginDrag('s')} />
          <EdgeHandle position="left" onPointerDown={beginDrag('w')} />
          <EdgeHandle position="right" onPointerDown={beginDrag('e')} />
          <CornerHandle position="nw" onPointerDown={beginDrag('nw')} />
          <CornerHandle position="ne" onPointerDown={beginDrag('ne')} />
          <CornerHandle position="sw" onPointerDown={beginDrag('sw')} />
          <CornerHandle position="se" onPointerDown={beginDrag('se')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-12 bg-zinc-100 hover:bg-zinc-200 active:scale-[0.99] disabled:opacity-50 text-zinc-700 font-black rounded-xl text-sm transition-all cursor-pointer"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => onConfirm(roi)}
          disabled={isSubmitting}
          className="h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:bg-blue-400 text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>解析しています…</span>
            </>
          ) : (
            <span>この範囲で解析</span>
          )}
        </button>
      </div>
    </div>
  );
};
