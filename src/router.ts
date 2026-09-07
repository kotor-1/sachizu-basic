/**
 * 最小構成のパスベースルーター。
 *
 * 本アプリは react-router を導入していないため、この2ページ（無料相談 /
 * オンラインパーソナル）のためだけにルーティングライブラリを追加せず、
 * History API の薄いラッパーだけで実装している。
 * 測定機能（CMJ / RJ / 10m / SQUAT）は従来どおり App 内の state で管理し、
 * URL は持たない。
 */
import { useEffect, useState } from 'react';

export type PageName = 'consultation' | 'online-personal';

export type Route =
  | { kind: 'app' }
  | { kind: 'page'; page: PageName };

/** ページ名 -> パス */
export const PAGE_PATHS: Record<PageName, string> = {
  consultation: '/consultation',
  'online-personal': '/online-personal',
};

/** アプリ本体（測定メニュー）のパス */
export const APP_PATH = '/';

/** ルート変更を App に伝えるためのカスタムイベント名 */
const NAVIGATE_EVENT = 'sachizu:navigate';

/**
 * pathname を比較可能な形に正規化する。
 * - クエリ / ハッシュを除去
 * - 先頭スラッシュを保証
 * - 末尾スラッシュを除去（ルートは '/' のまま）
 * - 大文字小文字を無視
 */
export function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split('?')[0].split('#')[0];
  const withLeadingSlash = withoutQuery.startsWith('/')
    ? withoutQuery
    : `/${withoutQuery}`;
  const trimmed = withLeadingSlash.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed.toLowerCase();
}

/** pathname から表示すべきルートを求める（純粋関数・テスト対象） */
export function parseRoute(pathname: string): Route {
  const path = normalizePath(pathname);
  for (const page of Object.keys(PAGE_PATHS) as PageName[]) {
    if (path === PAGE_PATHS[page]) {
      return { kind: 'page', page };
    }
  }
  return { kind: 'app' };
}

/** 現在の URL から算出したルート */
export function getCurrentRoute(): Route {
  if (typeof window === 'undefined') return { kind: 'app' };
  return parseRoute(window.location.pathname);
}

/**
 * このセッション内で pushState した回数。
 * 0 のとき（＝直接URLで開かれたとき）に history.back() すると
 * アプリ外へ出てしまうため、戻る操作の分岐に使う。
 */
let internalPushCount = 0;

/** テスト・デバッグ用 */
export function getInternalPushCount(): number {
  return internalPushCount;
}

/** アプリ内遷移。既に同じパスなら何もしない。 */
export function navigate(path: string): void {
  if (typeof window === 'undefined') return;
  if (normalizePath(path) === normalizePath(window.location.pathname)) return;

  window.history.pushState({ sachizu: true }, '', path);
  internalPushCount += 1;
  window.dispatchEvent(new Event(NAVIGATE_EVENT));

  // 遷移先は常に先頭から読み始められるようにする。
  // 描画後にもう一度戻すのは、旧ページの高さでスクロール位置が
  // 復元されてしまうブラウザ挙動への対策。
  window.scrollTo(0, 0);
  window.requestAnimationFrame(() => window.scrollTo(0, 0));
}

/**
 * 戻る操作。
 * アプリ内遷移で来た場合はブラウザ履歴を戻し（測定結果などの表示状態を保つ）、
 * 直接URLで開かれた場合はアプリ本体へ遷移する。
 */
export function goBack(): void {
  if (typeof window === 'undefined') return;
  if (internalPushCount > 0) {
    window.history.back();
    return;
  }
  navigate(APP_PATH);
}

/** 現在のルートを購読する */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(getCurrentRoute);

  useEffect(() => {
    const handlePopState = () => {
      internalPushCount = Math.max(0, internalPushCount - 1);
      setRoute(getCurrentRoute());
    };
    const handleNavigate = () => setRoute(getCurrentRoute());

    window.addEventListener('popstate', handlePopState);
    window.addEventListener(NAVIGATE_EVENT, handleNavigate);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener(NAVIGATE_EVENT, handleNavigate);
    };
  }, []);

  return route;
}
