import { TutorialScreenKey } from '../content/helpContent';

/**
 * 初回チュートリアルを見たかどうかを localStorage で管理する。
 * キーは仕様どおり `sachizu:tutorial:<種目>` 固定。
 */
const KEY_PREFIX = 'sachizu:tutorial:';

export function tutorialStorageKey(key: TutorialScreenKey): string {
  return `${KEY_PREFIX}${key}`;
}

/**
 * localStorage が使えない環境（プライベートモード等）では、毎回表示して
 * ユーザーを妨げるより「見た扱い」にして機能を壊さない方を優先する。
 */
export function hasSeenTutorial(key: TutorialScreenKey): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(tutorialStorageKey(key)) === '1';
  } catch {
    return true;
  }
}

export function markTutorialSeen(key: TutorialScreenKey): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(tutorialStorageKey(key), '1');
  } catch {
    // 保存できなくても機能自体は継続させる
  }
}
