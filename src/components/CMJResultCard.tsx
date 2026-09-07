import React from 'react';
import { RotateCcw } from 'lucide-react';
import { CMJResult } from '../utils/jumpCalculations';
import { ConsultationCTA } from './ConsultationCTA';

interface CMJResultCardProps {
  result: CMJResult;
  onReset: () => void;
}

export const CMJResultCard: React.FC<CMJResultCardProps> = ({ result, onReset }) => {
  return (
    <div className="space-y-6 max-w-md mx-auto py-2">
      {/* スクリーンショット対象領域（無駄なカード枠を廃し、計測器そのもののような美しさ） */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 space-y-6 shadow-xs">
        {/* ヘッダー情報 */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <span className="text-xs font-black tracking-widest text-zinc-900 uppercase">
            CMJ TEST RESULT
          </span>
          <span className="font-mono text-xs font-bold text-zinc-500">
            {result.fps} FPS
          </span>
        </div>

        {/* メイン数値: ジャンプ高 */}
        <div className="py-2 text-center space-y-1">
          <div className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
            JUMP HEIGHT
          </div>
          <div className="flex items-baseline justify-center space-x-1">
            <span className="text-7xl font-black font-mono tracking-tighter text-zinc-950">
              {result.jumpHeightCm.toFixed(1)}
            </span>
            <span className="text-xl font-black font-mono text-zinc-400">cm</span>
          </div>
        </div>

        {/* 補助数値グリッド（繊細な仕切り線で整頓） */}
        <div className="grid grid-cols-2 gap-4 border-t border-b border-zinc-100 py-4">
          <div className="text-center space-y-0.5">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">
              FLIGHT TIME
            </span>
            <span className="text-xl font-black font-mono text-zinc-900">
              {result.flightTimeSeconds.toFixed(3)}
              <span className="text-xs font-normal text-zinc-400 ml-1">s</span>
            </span>
          </div>
          <div className="text-center space-y-0.5 border-l border-zinc-100">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">
              FRAMES
            </span>
            <span className="text-xl font-black font-mono text-zinc-900">
              {result.landingFrame - result.takeoffFrame}
              <span className="text-xs font-normal text-zinc-400 ml-1">F</span>
            </span>
          </div>
        </div>

        {/* 測定フレーム詳細 & 注記 */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono text-zinc-400 px-1">
            <span>TAKEOFF: {result.takeoffFrame}F</span>
            <span>LANDING: {result.landingFrame}F</span>
          </div>
          <p className="text-[10px] text-zinc-400 text-center pt-2">
            ※動画から算出した推定値です
          </p>
        </div>
      </div>

      {/* 無料相談CTA（結果と明確に区別し、控えめに配置） */}
      <ConsultationCTA />

      {/* アクションボタン */}
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
