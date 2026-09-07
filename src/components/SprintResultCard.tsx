import React, { useState } from 'react';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { SprintResult } from '../utils/sprintCalculations';
import { ConsultationCTA } from './ConsultationCTA';

interface SprintResultCardProps {
  result: SprintResult;
  onReset: () => void;
}

export const SprintResultCard: React.FC<SprintResultCardProps> = ({ result, onReset }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-6 max-w-md mx-auto py-2">
      {/* スクリーンショット対象領域 */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 space-y-6 shadow-xs">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <span className="text-xs font-black tracking-widest text-zinc-900 uppercase">
            10M SPRINT RESULT
          </span>
          <span className="font-mono text-xs font-bold text-zinc-500">
            {result.fps} FPS
          </span>
        </div>

        {/* メイン数値: 10mタイム */}
        <div className="py-2 text-center space-y-1">
          <div className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
            10M TIME
          </div>
          <div className="flex items-baseline justify-center space-x-1">
            <span className="text-7xl font-black font-mono tracking-tighter text-zinc-950">
              {result.timeSeconds.toFixed(2)}
            </span>
            <span className="text-xl font-black font-mono text-zinc-400">s</span>
          </div>
        </div>

        {/* 主要メトリクスグリッド（2x2：平均速度、平均接地時間、平均滞空時間、ピッチ） */}
        <div className="grid grid-cols-2 gap-4 border-t border-b border-zinc-100 py-4">
          {/* 1. 平均速度 */}
          <div className="text-center space-y-0.5">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">
              AVG SPEED
            </span>
            <span className="text-xl font-black font-mono text-zinc-900">
              {result.averageSpeedMps.toFixed(2)}
              <span className="text-xs font-normal text-zinc-400 ml-1">m/s</span>
            </span>
            <span className="text-[10px] text-zinc-400 block">平均速度</span>
          </div>

          {/* 2. 平均接地時間 */}
          <div className="text-center space-y-0.5 border-l border-zinc-100">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">
              CONTACT TIME
            </span>
            <span className="text-xl font-black font-mono text-zinc-900">
              {result.averageContactTimeSeconds !== null
                ? result.averageContactTimeSeconds.toFixed(3)
                : '—'}
              {result.averageContactTimeSeconds !== null && (
                <span className="text-xs font-normal text-zinc-400 ml-1">s</span>
              )}
            </span>
            <span className="text-[10px] text-zinc-400 block">平均接地時間</span>
          </div>

          {/* 3. 平均滞空時間 */}
          <div className="text-center space-y-0.5 border-t border-zinc-100 pt-3">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">
              FLIGHT TIME
            </span>
            <span className="text-xl font-black font-mono text-zinc-900">
              {result.averageFlightTimeSeconds !== null
                ? result.averageFlightTimeSeconds.toFixed(3)
                : '—'}
              {result.averageFlightTimeSeconds !== null && (
                <span className="text-xs font-normal text-zinc-400 ml-1">s</span>
              )}
            </span>
            <span className="text-[10px] text-zinc-400 block">平均滞空時間</span>
          </div>

          {/* 4. ピッチ */}
          <div className="text-center space-y-0.5 border-t border-l border-zinc-100 pt-3">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">
              PITCH
            </span>
            <span className="text-xl font-black font-mono text-zinc-900">
              {result.pitchStepsPerSecond !== null
                ? result.pitchStepsPerSecond.toFixed(2)
                : '—'}
              {result.pitchStepsPerSecond !== null && (
                <span className="text-xs font-normal text-zinc-400 ml-1">steps/s</span>
              )}
            </span>
            <span className="text-[10px] text-zinc-400 block">ピッチ (歩/秒)</span>
          </div>
        </div>

        {/* 測定区間詳細 */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-mono text-zinc-400 px-1">
            <span>0m通過: {result.startFrame}F</span>
            <span>10m通過: {result.endFrame}F</span>
            <span>区間: {result.endFrame - result.startFrame}F</span>
          </div>

          {/* 各接地時間の詳細展開（接地時間・滞空時間・ステップ時間） */}
          {result.validSteps.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full py-1.5 text-zinc-500 hover:text-zinc-800 font-mono text-xs font-bold flex items-center justify-center space-x-1"
              >
                <span>各接地を見る（{result.validSteps.length}歩）</span>
                {showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showDetails && (
                <div className="space-y-2 pt-2">
                  {result.validSteps.map((s, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-50 rounded-lg p-3 text-xs font-mono space-y-1 border border-zinc-100"
                    >
                      <div className="flex justify-between font-bold text-zinc-900">
                        <span>#{idx + 1} 歩目</span>
                        <span className="text-zinc-400 font-normal">
                          {s.landingFrame}F → {s.takeoffFrame}F
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[11px] text-zinc-600 pt-0.5">
                        <div>
                          <span className="text-zinc-400 block text-[10px]">接地時間</span>
                          <span className="font-bold">{s.contactTimeSeconds.toFixed(3)}s</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px]">滞空時間</span>
                          <span className="font-bold">
                            {s.flightTimeSeconds !== null
                              ? `${s.flightTimeSeconds.toFixed(3)}s`
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px]">ステップ時間</span>
                          <span className="font-bold">
                            {s.stepTimeSeconds !== null
                              ? `${s.stepTimeSeconds.toFixed(3)}s`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
