import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CONSULTATION_URL } from '../config';
import { navigate } from '../router';

/**
 * 無料相談 / オンラインパーソナル ページで共有する表示部品。
 * 既存 SACHIZU BASIC のトーン（白ベース・細い境界線・余白で区切る）に合わせ、
 * カードやグラデーションは使わない。
 */

/** CONSULTATION_URL が有効に設定されているか */
export function hasConsultationUrl(): boolean {
  return Boolean(CONSULTATION_URL && CONSULTATION_URL.trim().length > 0);
}

/** セクション上部の小さなモノスペースラベル */
export const PageLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
    {children}
  </div>
);

/** 細い境界線で区切られたセクション */
export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="pt-8 border-t border-zinc-200/80 space-y-4">
    <h2 className="text-lg font-black tracking-tight text-zinc-950 leading-snug">
      {title}
    </h2>
    {children}
  </section>
);

/** 本文段落 */
export const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
    {children}
  </p>
);

/** 箇条書き */
export const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="space-y-2.5">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-zinc-400"
        />
        <span className="text-sm text-zinc-700 leading-relaxed">{item}</span>
      </li>
    ))}
  </ul>
);

/** 番号付きステップ */
export const Step: React.FC<{
  number: string;
  title: string;
  children: React.ReactNode;
}> = ({ number, title, children }) => (
  <div className="flex gap-4 pt-4 border-t border-zinc-100 first:pt-0 first:border-t-0">
    <span className="font-mono text-sm font-black text-zinc-300 pt-0.5 shrink-0">
      {number}
    </span>
    <div className="space-y-1.5">
      <h3 className="text-sm font-black text-zinc-950">{title}</h3>
      <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
        {children}
      </p>
    </div>
  </div>
);

/**
 * アプリ内リンク。
 * 実体は <a href> なので直リンク・新規タブ・共有がそのまま機能し、
 * クリック時のみ History API での遷移に切り替える。
 */
export const AppLink: React.FC<{
  to: string;
  className?: string;
  children: React.ReactNode;
}> = ({ to, className, children }) => (
  <a
    href={to}
    className={className}
    onClick={(event) => {
      // 修飾キー付きクリック・中クリックはブラウザ標準の挙動に任せる
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      navigate(to);
    }}
  >
    {children}
  </a>
);

const PRIMARY_CLASS =
  'w-full min-h-[48px] px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-xs';

const SECONDARY_CLASS =
  'w-full min-h-[48px] px-5 py-3 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-800 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors';

/** アプリ内リンクの主ボタン */
export const PrimaryAppLink: React.FC<{ to: string; children: React.ReactNode }> = ({
  to,
  children,
}) => (
  <AppLink to={to} className={PRIMARY_CLASS}>
    {children}
  </AppLink>
);

/** アプリ内リンクの副ボタン */
export const SecondaryAppLink: React.FC<{ to: string; children: React.ReactNode }> = ({
  to,
  children,
}) => (
  <AppLink to={to} className={SECONDARY_CLASS}>
    {children}
  </AppLink>
);

/**
 * 外部の相談窓口（CONSULTATION_URL）へのボタン。
 * URL が未設定の場合は既存 ConsultationCTA と同様に何も描画しない
 * （壊れたリンクを出さない）。
 */
export const ConsultationLinkButton: React.FC<{
  label: string;
  variant?: 'primary' | 'secondary';
}> = ({ label, variant = 'primary' }) => {
  if (!hasConsultationUrl()) return null;

  return (
    <a
      href={CONSULTATION_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={variant === 'primary' ? PRIMARY_CLASS : SECONDARY_CLASS}
    >
      <span>{label}</span>
      <ArrowUpRight className="w-4 h-4" />
    </a>
  );
};
