import React from 'react';
import { ChevronRight } from 'lucide-react';

interface HomeScreenProps {
  onSelectCMJ: () => void;
  onSelectRJ: () => void;
  onSelectSprint: () => void;
  onSelectSquat: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectCMJ,
  onSelectRJ,
  onSelectSprint,
  onSelectSquat,
}) => {

  return (
    <div className="max-w-md mx-auto px-5 py-8 space-y-8">
      {/* ヒーローセクション（余計なカードで囲まずタイポグラフィで魅せる） */}
      <div className="space-y-2 pt-2">
        <div className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
          PERFORMANCE TRACKER
        </div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          動画から、すぐ測る。
        </h1>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-sm">
          撮影した動画からジャンプ高・接地時間・RJ-indexをブラウザ内で瞬時に算出します。
        </p>
      </div>

      {/* 測定メニュー一覧 */}
      <div className="space-y-3">
        <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase px-0.5">
          SELECT TEST
        </div>

        {/* CMJ項目 */}
        <button
          type="button"
          onClick={onSelectCMJ}
          className="w-full text-left bg-white border border-zinc-200/90 rounded-xl p-4 transition-all active:scale-[0.99] hover:border-zinc-400 hover:shadow-xs group flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-zinc-950 tracking-tight">
                CMJ
              </span>
              <span className="text-xs font-semibold text-zinc-500">
                ジャンプ高
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              1回のジャンプから跳躍高・滞空時間を測定
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-50 group-hover:bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-zinc-950 transition-colors shrink-0 ml-3">
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        {/* RJ項目 */}
        <button
          type="button"
          onClick={onSelectRJ}
          className="w-full text-left bg-white border border-zinc-200/90 rounded-xl p-4 transition-all active:scale-[0.99] hover:border-zinc-400 hover:shadow-xs group flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-zinc-950 tracking-tight">
                RJ
              </span>
              <span className="text-xs font-semibold text-zinc-500">
                リバウンド能力
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              連続ジャンプの最後の3回からRJ-indexを測定
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-50 group-hover:bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-zinc-950 transition-colors shrink-0 ml-3">
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        {/* 10mスプリント */}
        <button
          type="button"
          onClick={onSelectSprint}
          className="w-full text-left bg-white border border-zinc-200/90 rounded-xl p-4 transition-all active:scale-[0.99] hover:border-zinc-400 hover:shadow-xs group flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-zinc-950 tracking-tight">
                10m SPRINT
              </span>
              <span className="text-xs font-semibold text-zinc-500">
                タイム・速度
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              10m区間のタイム・平均速度・接地時間を測定
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-50 group-hover:bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-zinc-950 transition-colors shrink-0 ml-3">
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        {/* SQUATスクワット角度測定 */}
        <button
          type="button"
          onClick={onSelectSquat}
          className="w-full text-left bg-white border border-zinc-200/90 rounded-xl p-4 transition-all active:scale-[0.99] hover:border-zinc-400 hover:shadow-xs group flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-zinc-950 tracking-tight">
                SQUAT
              </span>
              <span className="text-xs font-semibold text-zinc-500">
                スクワット角度測定
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              動画からスクワットの角度を測る
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-50 group-hover:bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-zinc-950 transition-colors shrink-0 ml-3">
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* 端末内処理の控えめな注記 */}
      <div className="pt-4 border-t border-zinc-100">
        <p className="text-[11px] text-zinc-400 leading-relaxed text-center">
          動画は端末内のみで解析されます（外部サーバーへの送信・保存なし）
        </p>
      </div>
    </div>
  );
};
