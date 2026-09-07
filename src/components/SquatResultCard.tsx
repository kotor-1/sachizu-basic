import React from 'react';
import {
  SquatSideResult,
  SquatFrontResult,
} from '../utils/squatCalculations';
import { ConsultationCTA } from './ConsultationCTA';
import { RotateCcw, ArrowLeftRight, Crop } from 'lucide-react';

interface SquatResultCardProps {
  direction: 'side' | 'front';
  annotatedImageUrl: string | null;
  sideResult: SquatSideResult | null;
  frontResult: SquatFrontResult | null;
  onToggleSide?: () => void;
  /** 「解析範囲を調整して再解析」を開く。渡されない場合はUIごと非表示にする。 */
  onAdjustRoi?: () => void;
  onReset: () => void;
}

export const SquatResultCard: React.FC<SquatResultCardProps> = ({
  direction,
  annotatedImageUrl,
  sideResult,
  frontResult,
  onToggleSide,
  onAdjustRoi,
  onReset,
}) => {
  const renderAngleValue = (val: number | null) => {
    if (val === null) {
      return (
        <span className="text-xs text-zinc-400 font-medium">
          この角度は測定できませんでした
        </span>
      );
    }
    return (
      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-black font-mono tracking-tight text-zinc-950">
          {val.toFixed(1)}
        </span>
        <span className="text-sm font-bold text-zinc-500">°</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. 解析フレーム画像（骨格オーバーレイ合成） */}
      {annotatedImageUrl && (
        <div className="bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200/90 shadow-xs relative">
          <img
            src={annotatedImageUrl}
            alt="スクワット姿勢解析"
            className="w-full aspect-4/3 object-contain mx-auto"
          />
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-white/20">
            {direction === 'side' ? '横から撮影' : '正面から撮影'} (最下点)
          </div>
        </div>
      )}

      {/* 2. 横撮影の結果 */}
      {direction === 'side' && sideResult && (
        <div className="space-y-3">
          {/* 解析側表示 & 切替ボタン */}
          <div className="flex items-center justify-between px-1 gap-2">
            <div className="flex items-center space-x-1.5 min-w-0 flex-wrap gap-y-1">
              <span className="text-[11px] font-mono uppercase text-blue-600 font-bold">
                SQUAT / 横から
              </span>
              <span className="text-zinc-300">・</span>
              <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                {sideResult.sideUsed === 'right' ? '右側を使用' : '左側を使用'}
              </span>
            </div>

            {onToggleSide && (
              <button
                type="button"
                onClick={onToggleSide}
                className="text-[11px] font-bold text-zinc-600 hover:text-zinc-900 flex items-center space-x-1 px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>反対側を使う</span>
              </button>
            )}
          </div>

          {/* 6つの角度一覧（均等グリッド、股関節→膝→足部の順） */}
          <div className="grid grid-cols-2 gap-2">
            {/* 股関節角度 */}
            <div className="p-3 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-xs text-zinc-500 font-bold block">股関節角度</span>
              {renderAngleValue(sideResult.hipAngle)}
              <span className="text-[10px] text-zinc-400 font-medium block">
                肩 - 股関節 - 膝
              </span>
            </div>

            {/* 体幹前傾 */}
            <div className="p-3 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-xs text-zinc-500 font-bold block">体幹前傾</span>
              {renderAngleValue(sideResult.trunkAngle)}
              <span className="text-[10px] text-zinc-400 font-medium block">
                鉛直線からの傾き
              </span>
            </div>

            {/* 膝角度 */}
            <div className="p-3 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-xs text-zinc-500 font-bold block">膝角度</span>
              {renderAngleValue(sideResult.kneeAngle)}
              <span className="text-[10px] text-zinc-400 font-medium block">
                股関節 - 膝 - 足首
              </span>
            </div>

            {/* 下腿前傾 */}
            <div className="p-3 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-xs text-zinc-500 font-bold block">下腿前傾</span>
              {renderAngleValue(sideResult.shankAngle)}
              <span className="text-[10px] text-zinc-400 font-medium block">
                鉛直線からの傾き
              </span>
            </div>

            {/* 足関節角度（新規） */}
            <div className="p-3 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-xs text-zinc-500 font-bold block">足関節角度</span>
              {renderAngleValue(sideResult.ankleJointAngle)}
              <span className="text-[10px] text-zinc-400 font-medium block">
                膝 - 足首 - つま先
              </span>
            </div>

            {/* 足部角度（新規） */}
            <div className="p-3 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-xs text-zinc-500 font-bold block">足部角度</span>
              {renderAngleValue(sideResult.footAngle)}
              <span className="text-[10px] text-zinc-400 font-medium block">
                水平からの傾き
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. 正面撮影の結果 */}
      {direction === 'front' && frontResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 gap-2">
            <div className="flex items-center space-x-1.5 min-w-0 flex-wrap gap-y-1">
              <span className="text-[11px] font-mono uppercase text-blue-600 font-bold">
                SQUAT / 正面から
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium shrink-0">
              ※動画上の2D角度です
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 左膝角度 */}
            <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-xs text-zinc-500 font-bold block">左膝</span>
              {renderAngleValue(frontResult.leftKneeAngle)}
            </div>

            {/* 右膝角度 */}
            <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-xs text-zinc-500 font-bold block">右膝</span>
              {renderAngleValue(frontResult.rightKneeAngle)}
            </div>

            {/* 左右差 */}
            <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1 col-span-2">
              <span className="text-xs text-zinc-500 font-bold block">膝角度の左右差</span>
              {renderAngleValue(frontResult.kneeAngleDiff)}
            </div>

            {/* 肩の傾き */}
            <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-xs text-zinc-500 font-bold block">肩の傾き</span>
              {renderAngleValue(frontResult.shoulderTiltAngle)}
              <span className="text-[10px] text-zinc-400 font-medium block">水平からの傾斜</span>
            </div>

            {/* 骨盤の傾き */}
            <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-xs text-zinc-500 font-bold block">骨盤の傾き</span>
              {renderAngleValue(frontResult.pelvisTiltAngle)}
              <span className="text-[10px] text-zinc-400 font-medium block">水平からの傾斜</span>
            </div>

            {/* 体幹の左右傾き */}
            <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-1 col-span-2">
              <span className="text-xs text-zinc-500 font-bold block">体幹の左右傾き</span>
              {renderAngleValue(frontResult.trunkLateralTiltAngle)}
              <span className="text-[10px] text-zinc-400 font-medium block">鉛直線からの傾斜</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. アクションボタン */}
      <div className="pt-2 space-y-2">
        {onAdjustRoi && (
          <button
            type="button"
            onClick={onAdjustRoi}
            className="w-full text-[11px] font-bold text-zinc-400 hover:text-zinc-700 flex items-center justify-center space-x-1 py-1 transition-colors cursor-pointer"
          >
            <Crop className="w-3 h-3" />
            <span>解析範囲を調整して再解析</span>
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="w-full h-12 bg-zinc-950 hover:bg-black active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>もう一度測定する</span>
        </button>
      </div>

      {/* 5. 無料相談CTA */}
      <ConsultationCTA />
    </div>
  );
};
