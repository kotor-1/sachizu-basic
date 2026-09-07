import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

/**
 * SquatFlow.tsx のフロー変更に関する回帰チェック。
 *
 * 注記: このプロジェクトには React コンポーネントのレンダリング/操作を
 * シミュレートするテスト基盤（@testing-library/react 等）が導入されていない。
 * 「最下点確定後にRTMPoseが即実行されない」「ROI確定後にのみ推論される」
 * 「前回ROIが保持される」「新動画でROIがリセットされる」といった状態遷移の
 * 検証は、実ブラウザでコンポーネントを実際にマウントして手動検証した
 * （完了報告を参照）。ここでは自動テストとして安定して書ける範囲、すなわち
 * 「通常フローの解析ソースコードに全画面解析(estimatePoseFromMedia)の
 * 呼び出しが含まれていないこと」をソースレベルの回帰ガードとして検証する。
 */
describe('SquatFlow - スクワット標準フローは全画面解析を行わない', () => {
  const source = readFileSync(
    new URL('./SquatFlow.tsx', import.meta.url),
    'utf-8'
  );

  it('estimatePoseFromMedia を import していない', () => {
    expect(source).not.toMatch(/import\s*\{[^}]*estimatePoseFromMedia[^}]*\}/);
  });

  it('estimatePoseFromMedia(...) の呼び出し箇所が存在しない', () => {
    expect(source).not.toMatch(/estimatePoseFromMedia\s*\(/);
  });

  it('estimatePoseFromROI(...) が解析の唯一の呼び出し経路として存在する', () => {
    const matches = source.match(/estimatePoseFromROI\s*\(/g) ?? [];
    // import 文 + 実呼び出し1箇所 (handleConfirmRoi 内) を想定
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
