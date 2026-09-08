import { describe, it, expect } from 'vitest';
import { HELP_CONTENT, FORBIDDEN_HELP_TERMS, HelpScreenKey } from './helpContent';

const SCREEN_KEYS: HelpScreenKey[] = ['home', 'cmj', 'rj', 'sprint', 'squat'];

/** ある screenKey の全文言を1つの文字列に連結する（禁止用語チェック用） */
function flattenContent(key: HelpScreenKey): string {
  const c = HELP_CONTENT[key];
  return [
    c.title,
    c.lead,
    c.highlight,
    ...c.steps.flatMap((s) => [s.number, s.title, s.body]),
    c.notesTitle,
    ...(c.notes ?? []),
    c.cautionsTitle,
    ...(c.cautions ?? []),
    c.resultsTitle,
    ...(c.results ?? []),
    ...c.tips,
  ]
    .filter((v): v is string => Boolean(v))
    .join('\n');
}

describe('HELP_CONTENT - 各画面の内容が定義されている', () => {
  for (const key of SCREEN_KEYS) {
    it(`${key}: タイトルとステップを持つ`, () => {
      expect(HELP_CONTENT[key].title.length).toBeGreaterThan(0);
      expect(HELP_CONTENT[key].steps.length).toBeGreaterThan(0);
    });
  }

  it('CMJ/RJ/10m/SQUATは3〜5枚程度のステップ数（チュートリアルのスライド数に使う）', () => {
    for (const key of ['cmj', 'rj', 'sprint', 'squat'] as const) {
      const count = HELP_CONTENT[key].steps.length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);
    }
  });
});

describe('HELP_CONTENT - 専門用語をユーザー向け文言に含まない', () => {
  for (const key of SCREEN_KEYS) {
    for (const term of FORBIDDEN_HELP_TERMS) {
      it(`${key}: 「${term}」を含まない`, () => {
        expect(flattenContent(key)).not.toContain(term);
      });
    }
  }
});

describe('HELP_CONTENT - Home', () => {
  const home = HELP_CONTENT.home;

  it('基本の流れ4ステップ', () => {
    expect(home.steps.map((s) => s.title)).toEqual([
      '種目を選ぶ',
      '動画を選ぶ',
      '必要なフレームを選ぶ',
      '結果を見る',
    ]);
  });

  it('端末内処理・非保存の補足を含む', () => {
    expect(home.notes).toContain('動画は端末上で処理されます');
    expect(home.notes).toContain('測定結果は保存されません');
  });

  it('相談ページへの控えめな導線フラグを持つ', () => {
    expect(home.showConsultationLink).toBe(true);
  });

  it('コツセクションは持たない（撮影を伴わないため）', () => {
    expect(home.tips).toHaveLength(0);
  });
});

describe('HELP_CONTENT - RJ', () => {
  const rj = HELP_CONTENT.rj;

  it('「10回すべてを選ぶ必要はありません」を目立つ位置(highlight)に持つ', () => {
    expect(rj.highlight).toBe('10回すべてを選ぶ必要はありません');
  });

  it('7点の選択順が正しい', () => {
    const sevenPointsStep = rj.steps.find((s) => s.title.includes('7つのフレーム'));
    expect(sevenPointsStep?.body).toBe(
      '1. 1回目の着地\n2. 1回目の離地\n3. 2回目の着地\n4. 2回目の離地\n' +
        '5. 3回目の着地\n6. 3回目の離地\n7. 最後の着地'
    );
  });
});

describe('HELP_CONTENT - 10mスプリント', () => {
  const sprint = HELP_CONTENT.sprint;

  it('ライン跨ぎの接地は選ばなくてよいことを明記', () => {
    expect(sprint.cautions?.join('\n')).toContain('選ばなくてOKです');
  });

  it('結果項目（5項目）を持つ', () => {
    expect(sprint.results).toEqual([
      '10mタイム',
      '平均速度',
      '平均接地時間',
      '平均滞空時間',
      'ピッチ',
    ]);
  });

  it('撮影のコツに10m専用項目を含む', () => {
    expect(sprint.tips).toContain('0mと10mの目印を実際に置く');
  });
});

describe('HELP_CONTENT - SQUAT', () => {
  const squat = HELP_CONTENT.squat;

  it('横測定の6指標が実装済みであることを説明', () => {
    const analyzeStep = squat.steps.find((s) => s.title === 'この範囲で解析');
    expect(analyzeStep?.body).toContain('股関節角度');
    expect(analyzeStep?.body).toContain('体幹前傾');
    expect(analyzeStep?.body).toContain('膝角度');
    expect(analyzeStep?.body).toContain('下腿前傾');
    expect(analyzeStep?.body).toContain('足関節角度');
    expect(analyzeStep?.body).toContain('足部角度');
  });

  it('2D角度であり自動判定ではないという注意を持つ', () => {
    expect(squat.cautions?.join('\n')).toContain('2D角度');
    expect(squat.cautions?.join('\n')).toContain('自動でフォームの良し悪しを判定するものではありません');
  });

  it('撮影のコツにSQUAT専用項目を含む', () => {
    expect(squat.tips).toContain('縦向き撮影がおすすめ');
    expect(squat.tips).toContain('頭から足先まで映す');
  });
});

describe('HELP_CONTENT - 共通の撮影のコツ', () => {
  it('CMJ/RJ/10m/SQUATすべてに共通コツが含まれる', () => {
    const common = ['スマホを固定する', '身体全体を映す', '明るい場所で撮る'];
    for (const key of ['cmj', 'rj', 'sprint', 'squat'] as const) {
      for (const tip of common) {
        expect(HELP_CONTENT[key].tips).toContain(tip);
      }
    }
  });
});
