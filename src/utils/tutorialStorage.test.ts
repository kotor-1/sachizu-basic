import { describe, it, expect } from 'vitest';
import { tutorialStorageKey, hasSeenTutorial, markTutorialSeen } from './tutorialStorage';

/**
 * 注記: このテスト環境には window/localStorage が存在しない（jsdom 未導入、
 * router.test.ts と同様の制約）。そのため実際のブラウザでの
 * 「初回のみ表示・既読後は自動表示しない」という統合的な確認は
 * 実ブラウザで行った（完了報告を参照）。ここでは
 * - キー名が仕様どおりであること
 * - window が無い環境（SSR・ビルド時等）でも例外を投げず安全に動くこと
 * を自動テストとして保証する。
 */
describe('tutorialStorageKey', () => {
  it('仕様どおりの固定キーを生成する', () => {
    expect(tutorialStorageKey('cmj')).toBe('sachizu:tutorial:cmj');
    expect(tutorialStorageKey('rj')).toBe('sachizu:tutorial:rj');
    expect(tutorialStorageKey('sprint')).toBe('sachizu:tutorial:sprint');
    expect(tutorialStorageKey('squat')).toBe('sachizu:tutorial:squat');
  });
});

describe('window が存在しない環境でも安全', () => {
  it('hasSeenTutorial は例外を投げず true を返す（強制表示で機能を止めない）', () => {
    expect(() => hasSeenTutorial('cmj')).not.toThrow();
    expect(hasSeenTutorial('cmj')).toBe(true);
  });

  it('markTutorialSeen は例外を投げない', () => {
    expect(() => markTutorialSeen('cmj')).not.toThrow();
  });
});
