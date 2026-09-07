import React from 'react';
import { ChevronRight } from 'lucide-react';
import { PAGE_PATHS } from '../router';
import { AppLink } from './pageUI';

/**
 * 測定結果画面下部の相談導線。
 * 以前は外部URLへ直接飛ばしていたが、先に無料相談ページで内容を確認できる
 * ようにした（CONSULTATION_URL が未設定でもここが壊れない）。
 */
export const ConsultationCTA: React.FC = () => {
  return (
    <div className="pt-4 border-t border-zinc-200/80 space-y-2 text-center">
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold text-zinc-900">
          数値について相談する
        </h4>
        <p className="text-[11px] text-zinc-500">
          この画面をスクリーンショットして送ると、陸上競技コーチが内容を確認します。
        </p>
      </div>

      <AppLink
        to={PAGE_PATHS.consultation}
        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 border border-zinc-300 hover:border-zinc-900 text-zinc-800 font-bold rounded-lg text-xs transition-colors mt-1"
      >
        <span>無料相談について見る</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </AppLink>
    </div>
  );
};
