import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CONSULTATION_URL } from '../config';

export const ConsultationCTA: React.FC = () => {
  const hasUrl = Boolean(CONSULTATION_URL && CONSULTATION_URL.trim().length > 0);

  return (
    <div className="pt-4 border-t border-zinc-200/80 space-y-2 text-center">
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold text-zinc-900">
          数値について相談する
        </h4>
        <p className="text-[11px] text-zinc-500">
          この画面をスクリーンショットして送ると、アドバイスを受けられます。
        </p>
      </div>

      {hasUrl ? (
        <a
          href={CONSULTATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 border border-zinc-300 hover:border-zinc-900 text-zinc-800 font-bold rounded-lg text-xs transition-colors mt-1"
        >
          <span>アドバイスを受ける</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      ) : null}
    </div>
  );
};
