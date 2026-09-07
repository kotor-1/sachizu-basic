import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { CONSULTATION_URL } from '../config';

/**
 * 無料相談 / オンラインパーソナルページの内容に関する回帰チェック。
 *
 * 注記: 本プロジェクトには React コンポーネントをレンダリングするテスト基盤
 * (@testing-library/react 等) が導入されていないため、SquatFlow.sourceCheck.test.ts
 * と同様にソースレベルで検証する。表示・遷移の確認は実ブラウザで行った
 * （完了報告を参照）。
 */

const read = (file: string) =>
  readFileSync(new URL(file, import.meta.url), 'utf-8');

const consultation = read('./ConsultationPage.tsx');
const onlinePersonal = read('./OnlinePersonalPage.tsx');
const pageUI = read('./pageUI.tsx');
const consultationCTA = read('./ConsultationCTA.tsx');
const home = read('./HomeScreen.tsx');
const app = read('../App.tsx');
const redirects = readFileSync(
  new URL('../../public/_redirects', import.meta.url),
  'utf-8'
);

describe('ページの相互リンク導線', () => {
  it('無料相談ページからオンラインパーソナルへ遷移できる', () => {
    expect(consultation).toContain("PAGE_PATHS['online-personal']");
  });

  it('オンラインパーソナルページから無料相談へ遷移できる', () => {
    expect(onlinePersonal).toContain('PAGE_PATHS.consultation');
  });

  it('測定結果のCTAは外部URLではなく無料相談ページへ入る', () => {
    expect(consultationCTA).toContain('PAGE_PATHS.consultation');
    // 外部URLへの直リンク (target="_blank") を持たない
    expect(consultationCTA).not.toContain('_blank');
    expect(consultationCTA).not.toMatch(/import\s*\{[^}]*CONSULTATION_URL[^}]*\}/);
  });

  it('ホーム下部に2つの導線がある', () => {
    expect(home).toContain('PAGE_PATHS.consultation');
    expect(home).toContain("PAGE_PATHS['online-personal']");
  });

  it('App が両ページをルートに接続している', () => {
    expect(app).toContain('ConsultationPage');
    expect(app).toContain('OnlinePersonalPage');
    expect(app).toContain('useRoute');
  });
});

describe('CONSULTATION_URL 未設定時に壊れない', () => {
  it('外部リンクは URL 未設定なら描画しない', () => {
    expect(pageUI).toContain('if (!hasConsultationUrl()) return null;');
  });

  it('ページ本体は CONSULTATION_URL を直接埋め込まない', () => {
    expect(consultation).not.toContain('CONSULTATION_URL');
    expect(onlinePersonal).not.toContain('CONSULTATION_URL');
  });
});

describe('Cloudflare Pages で直接URLアクセスできる', () => {
  it('_redirects に SPA フォールバックがある', () => {
    expect(redirects).toMatch(/^\/\*\s+\/index\.html\s+200\s*$/m);
  });
});

describe('禁止表現を含まない', () => {
  const forbidden = [
    'AIが自動',
    '自動回答',
    '自動判定',
    '自動評価',
    '毎日返信',
    '24時間',
    '絶対速く',
    '必ず改善',
    'Before/After',
    '実績多数',
    '口コミ',
  ];

  for (const word of [consultation, onlinePersonal]) {
    for (const ng of forbidden) {
      it(`「${ng}」を含まない`, () => {
        expect(word).not.toContain(ng);
      });
    }
  }

});

describe('料金表示', () => {
  it('正式料金（月額9,900円）を明示している', () => {
    expect(onlinePersonal).toContain('月額');
    expect(onlinePersonal).toContain('9,900');
  });

  it('募集状況の案内は料金と分けて記載している', () => {
    expect(onlinePersonal).toContain(
      '募集状況については無料相談時にご確認ください。'
    );
  });

  it('「料金は相談時に案内」という旧文言が残っていない', () => {
    for (const source of [consultation, onlinePersonal]) {
      expect(source).not.toContain('料金・募集状況については無料相談時にご案内します。');
      expect(source).not.toMatch(/料金[^。]*(ご案内|お問い合わせ)します/);
    }
  });

  it('今回指定外のプラン（13,200円 / 6,600円）を追加していない', () => {
    for (const source of [consultation, onlinePersonal]) {
      expect(source).not.toContain('13,200');
      expect(source).not.toContain('6,600');
      expect(source).not.toContain('スポット解析');
    }
  });
});

describe('相談窓口URL', () => {
  it('CONSULTATION_URL が設定されている', () => {
    expect(CONSULTATION_URL.trim()).toBe('https://lin.ee/QRIkMfE');
  });
});
