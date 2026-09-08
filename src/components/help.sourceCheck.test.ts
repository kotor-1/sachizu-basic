import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

/**
 * ヘルプ / 初回チュートリアル機能の回帰チェック。
 *
 * 注記: 本プロジェクトには React コンポーネントをレンダリングするテスト基盤
 * (@testing-library/react 等) が導入されていない（SquatFlow.sourceCheck.test.ts
 * と同じ制約）。「？から開く」「閉じる」「種目に応じた内容が表示される」
 * 「初回のみチュートリアル表示」「測定フローへ影響しない」といった実際の
 * 動作確認は、390px相当のビューポートを含め実ブラウザで行った
 * （完了報告を参照）。ここではソースレベルで安定して検証できる範囲、
 * すなわち a11y 属性の有無・状態遷移の配線・禁止事項の不在を確認する。
 */

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf-8');

const bottomSheet = read('./BottomSheet.tsx');
const helpButton = read('./HelpButton.tsx');
const helpModal = read('./HelpModal.tsx');
const tutorialModal = read('./TutorialModal.tsx');
const header = read('./Header.tsx');
const app = read('../App.tsx');
const cmjFlow = read('./CMJFlow.tsx');
const rjFlow = read('./RJFlow.tsx');
const sprintFlow = read('./SprintFlow.tsx');
const squatFlow = read('./SquatFlow.tsx');
const roiAdjustPanel = read('./RoiAdjustPanel.tsx');

describe('BottomSheet - アクセシビリティ', () => {
  it('role="dialog" と aria-modal を持つ', () => {
    expect(bottomSheet).toContain('role="dialog"');
    expect(bottomSheet).toContain('aria-modal="true"');
  });

  it('aria-labelledby でタイトルと紐づく', () => {
    expect(bottomSheet).toContain('aria-labelledby={titleId}');
    expect(bottomSheet).toContain('id={titleId}');
  });

  it('Escapeキーで閉じる（PC対応）', () => {
    expect(bottomSheet).toMatch(/e\.key === 'Escape'/);
    expect(bottomSheet).toContain('onClose()');
  });

  it('閉じるボタンを持ち、aria-labelが付いている', () => {
    expect(bottomSheet).toContain('aria-label="閉じる"');
  });

  it('背景スクロールをロックし、閉じたら復元する', () => {
    expect(bottomSheet).toContain("document.body.style.overflow = 'hidden'");
    expect(bottomSheet).toContain('document.body.style.overflow = originalOverflow');
  });

  it('開いた時に閉じるボタンへフォーカスし、閉じたら元の要素へ戻す', () => {
    expect(bottomSheet).toContain('closeButtonRef.current?.focus()');
    expect(bottomSheet).toContain('previouslyFocused.current?.focus?.()');
  });

  it('タップ領域44px程度の閉じるボタン', () => {
    expect(bottomSheet).toContain('w-11 h-11');
  });
});

describe('HelpButton', () => {
  it('aria-label="使い方を見る"を持つ', () => {
    expect(helpButton).toContain('aria-label="使い方を見る"');
  });

  it('タップ領域44px(w-11 h-11)を確保する', () => {
    expect(helpButton).toContain('w-11 h-11');
  });

  it('CircleHelpアイコンを使う', () => {
    expect(helpButton).toContain('CircleHelp');
  });
});

describe('Header - ヘルプボタンの配置', () => {
  it('onHelpClickが渡された時だけHelpButtonを描画する', () => {
    expect(header).toContain('{onHelpClick && <HelpButton onClick={onHelpClick} />}');
  });
});

describe('App - ヘルプ/チュートリアルの配線', () => {
  it('相談ページ・オンラインパーソナルページではヘルプボタンを渡さない', () => {
    expect(app).toContain('onHelpClick={isPage ? undefined : () => setHelpOpen(true)}');
  });

  it('現在の screen をそのまま HelpModal に渡す（種目に応じた内容の切り替え）', () => {
    expect(app).toContain('screenKey={screen}');
  });

  it('Homeは初回チュートリアル対象に含まない', () => {
    expect(app).toContain("screen !== 'home'");
  });

  it('チュートリアルは最後まで進める/スキップで既読を保存する', () => {
    expect(app).toContain('markTutorialSeen(tutorialFor)');
  });

  it('初回チェックに hasSeenTutorial を使い、済みなら自動表示しない', () => {
    expect(app).toMatch(/if \(hasSeenTutorial\(screen\)\) return;/);
  });
});

describe('HelpModal - 種目ごとの内容切り替え', () => {
  it('HELP_CONTENT[screenKey] から現在の画面の内容だけを取り出す', () => {
    expect(helpModal).toContain('HELP_CONTENT[screenKey]');
  });

  it('チュートリアル再表示の導線を持てる（cmj/rj/sprint/squatのみ）', () => {
    expect(helpModal).toContain('onReplayTutorial');
  });
});

describe('TutorialModal - 初回チュートリアル', () => {
  it('大きな番号・短い見出し・1〜2行の説明のみで構成する（カード乱立/演出なし）', () => {
    expect(tutorialModal).toContain('step.number');
    expect(tutorialModal).toContain('step.title');
    expect(tutorialModal).toContain('step.body');
  });

  it('「次へ」「はじめる」「スキップ」の操作を持つ', () => {
    expect(tutorialModal).toContain("isLast ? 'はじめる' : '次へ'");
    expect(tutorialModal).toContain('スキップ');
  });

  it('閉じる操作(ESC/背景/スキップ/はじめる)はすべて onFinish 経由で既読化される', () => {
    expect(tutorialModal).toContain('onClose={onFinish}');
  });
});

describe('現在タスク表示（各測定フロー）', () => {
  it('CMJ: 離地/着地の指示文を表示する', () => {
    expect(cmjFlow).toContain('① 離地する最初のフレームを選んでください');
    expect(cmjFlow).toContain('② 着地する最初のフレームを選んでください');
  });

  it('RJ: 「最後の3回のうち、1回目の着地を選んでください」を表示する', () => {
    expect(rjFlow).toContain('最後の3回のうち、1回目の着地を選んでください');
  });

  it('10m: 0m/10mライン通過の指示文を表示する', () => {
    expect(sprintFlow).toContain('0mラインを胸が通過した最初のフレームを選んでください');
    expect(sprintFlow).toContain('10mラインを胸が通過した最初のフレームを選んでください');
  });

  it('SQUAT: 最下点選択の指示文を表示する', () => {
    expect(squatFlow).toContain('スクワットが最も深いフレームを選んでください');
  });

  it('ROI調整画面: 身体全体を枠に入れる指示文を表示する（既存文言のまま）', () => {
    expect(roiAdjustPanel).toContain('身体全体が枠の中に入るように合わせてください');
  });
});

describe('既存の測定ロジックへ影響しない（回帰ガード）', () => {
  it('SquatFlow は estimatePoseFromROI 以外の解析経路を追加していない', () => {
    expect(squatFlow).not.toMatch(/import\s*\{[^}]*estimatePoseFromMedia[^}]*\}/);
  });

  it('RoiAdjustPanel の座標変換関連コードは変更されていない', () => {
    expect(roiAdjustPanel).toContain('getBoundingClientRect()');
    expect(roiAdjustPanel).toContain('naturalWidth / rect.width');
  });
});
