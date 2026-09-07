import React, { useState } from 'react';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { RJResult } from '../utils/jumpCalculations';
import { ConsultationCTA } from './ConsultationCTA';

interface RJResultCardProps {
  result: RJResult;
  onReset: () => void;
}

export const RJResultCard: React.FC<RJResultCardProps> = ({ result, onReset }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-6 max-w-md mx-auto py-2">
      {/* スクリーンショット対象領域 */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 space-y-6 shadow-xs">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <span className="text-xs font-black tracking-widest text-zinc-900 uppercase">
            RJ TEST RESULT（3回平均）
          </span>
          <span className="font-mono text-xs font-bold text-zinc-500">
            {result.fps} FPS
          </span>
        </div>

        {/* メイン数値: RJ-index */}
        <div className="py-2 text-center space-y-1">
          <div className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
            RJ-INDEX
          </div>
          <div className="flex items-baseline justify-center">
            <span className="text-7xl font-black font-mono tracking-tighter text-zinc-950">
              {result.averageRjIndex.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 3項目の平均値 */}
        <div className="grid grid-cols-3 gap-2 border-t border-b border-zinc-100 py-4">
          <div className="text-center space-y-0.5">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">
              HEIGHT
            </span>
            <span className="text-base font-black font-mono text-zinc-900">
              {result.averageJumpHeightCm.toFixed(1)}
              <span className="text-[10px] font-normal text-zinc-400 ml-0.5">cm</span>
            </span>
          </div>

          <div className="text-center space-y-0.5 border-l border-zinc-100">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">
              CONTACT
            </span>
            <span className="text-base font-black font-mono text-zinc-900">
              {result.averageContactTimeSeconds.toFixed(3)}
              <span className="text-[10px] font-normal text-zinc-400 ml-0.5">s</span>
            </span>
          </div>

          <div className="text-center space-y-0.5 border-l border-zinc-100">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">
              FLIGHT
            </span>
            <span className="text-base font-black font-mono text-zinc-900">
              {result.averageFlightTimeSeconds.toFixed(3)}
              <span className="text-[10px] font-normal text-zinc-400 ml-0.5">s</span>
            </span>
          </div>
        </div>

        {/* 3回の内訳（タップで開閉） */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full py-1.5 text-zinc-500 hover:text-zinc-800 font-mono text-xs font-bold flex items-center justify-center space-x-1"
          >
            <span>3回の内訳</span>
            {showDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showDetails && (
            <div className="space-y-2 pt-1">
              {result.jumps.map((j) => (
                <div
                  key={j.jumpNumber}
                  className="bg-zinc-50 rounded-lg p-3 text-xs font-mono space-y-1 border border-zinc-100"
                >
                  <div className="flex justify-between font-bold text-zinc-900">
                    <span>#{j.jumpNumber} JUMP</span>
                    <span className="text-blue-600 font-black">RJ: {j.rjIndex.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-zinc-500 pt-1">
                    <div>高: {j.jumpHeightCm.toFixed(1)}cm</div>
                    <div>接地: {j.contactTimeSeconds.toFixed(3)}s</div>
                    <div>滞空: {j.flightTimeSeconds.toFixed(3)}s</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-zinc-400 text-center pt-1">
            ※動画から算出した推定値です
          </p>
        </div>
      </div>

      {/* 無料相談CTA */}
      <ConsultationCTA />

      {/* もう一度測るボタン */}
      <button
        type="button"
        onClick={onReset}
        className="w-full h-12 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 font-bold rounded-xl flex items-center justify-center space-x-2 text-xs transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>もう一度測る</span>
      </button>
    </div>
  );
};
