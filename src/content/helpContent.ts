/**
 * ヘルプ / 初回チュートリアルで表示する文言をまとめた設定データ。
 *
 * ここに集約する理由:
 * - HelpModal / TutorialModal から種目ごとの巨大な if 分岐を追い出すため
 * - 専門用語（ROI / SimCC / RTMPose）を含めないというルールを、
 *   表示コンポーネントではなくデータの時点で一箇所守ればよい形にするため
 */

export type HelpScreenKey = 'home' | 'cmj' | 'rj' | 'sprint' | 'squat';
export type TutorialScreenKey = 'cmj' | 'rj' | 'sprint' | 'squat';

export interface HelpStep {
  number: string;
  title: string;
  body?: string;
}

export interface HelpContent {
  title: string;
  lead?: string;
  /** 目立つ位置に出す一文（例: RJの「10回すべてを選ぶ必要はありません」） */
  highlight?: string;
  steps: HelpStep[];
  notesTitle?: string;
  notes?: string[];
  cautionsTitle?: string;
  cautions?: string[];
  resultsTitle?: string;
  results?: string[];
  /** 撮影のコツ（空配列なら非表示） */
  tips: string[];
  /** Home限定: 控えめな相談ページへの導線を出すか */
  showConsultationLink?: boolean;
}

const COMMON_TIPS = [
  'スマホを固定する',
  '身体全体を映す',
  '明るい場所で撮る',
  'できれば60fps以上',
  '細かい測定は120fps以上がおすすめ',
];

const SQUAT_ONLY_TIPS = ['縦向き撮影がおすすめ', '身体が小さくなりすぎない', '頭から足先まで映す'];

const SPRINT_ONLY_TIPS = [
  '0mと10mの目印を実際に置く',
  'できるだけ真横から撮影',
  '胸と足が見えるようにする',
];

export const HELP_CONTENT: Record<HelpScreenKey, HelpContent> = {
  home: {
    title: 'SACHIZU BASICの使い方',
    lead: 'スマホで撮った動画から、\nジャンプ・スプリント・スクワットの数値を測定できます。',
    steps: [
      { number: '01', title: '種目を選ぶ' },
      { number: '02', title: '動画を選ぶ' },
      { number: '03', title: '必要なフレームを選ぶ' },
      { number: '04', title: '結果を見る' },
    ],
    notes: [
      '動画は端末上で処理されます',
      '測定結果は保存されません',
      '結果画面はスクリーンショットして利用できます',
    ],
    tips: [],
    showConsultationLink: true,
  },
  cmj: {
    title: 'CMJの測り方',
    lead: 'ジャンプの「離地」と「着地」の\n2フレームを選ぶだけです。',
    steps: [
      {
        number: '01',
        title: '動画を選ぶ',
        body: 'できれば真横から撮影した、60fps以上の通常動画を使用してください。120fps以上がおすすめです。',
      },
      {
        number: '02',
        title: '離地を選ぶ',
        body: '足が地面から完全に離れた最初のフレームを選びます。',
      },
      {
        number: '03',
        title: '着地を選ぶ',
        body: '足が地面に触れた最初のフレームを選びます。',
      },
      {
        number: '04',
        title: '結果を見る',
        body: '滞空時間からジャンプ高を計算します。',
      },
    ],
    notesTitle: '操作',
    notes: ['±1 = 細かく調整', '±5 / ±10 = 大きく移動', '動画はピンチで拡大できます'],
    cautionsTitle: '注意',
    cautions: ['スローモーション動画ではなく、通常速度で撮影した動画を使用してください。'],
    tips: COMMON_TIPS,
  },
  rj: {
    title: 'RJの測り方',
    lead: '10回連続でジャンプし、\n最後の3回だけ測定します。',
    highlight: '10回すべてを選ぶ必要はありません',
    steps: [
      { number: '01', title: '10回連続でジャンプする' },
      { number: '02', title: '最後の3回を探す' },
      {
        number: '03',
        title: '7つのフレームを順番に選ぶ',
        body:
          '1. 1回目の着地\n2. 1回目の離地\n3. 2回目の着地\n4. 2回目の離地\n' +
          '5. 3回目の着地\n6. 3回目の離地\n7. 最後の着地',
      },
      {
        number: '04',
        title: '結果を見る',
        body: 'RJ-index・ジャンプ高・接地時間・滞空時間を表示します。',
      },
    ],
    notes: ['「着地 → 離地 → 次の着地」の順番で選びます。'],
    tips: COMMON_TIPS,
  },
  sprint: {
    title: '10mスプリントの測り方',
    lead: '0mと10mの位置を動画上で合わせ、\n胸がそれぞれのラインを通過したフレームを選びます。',
    steps: [
      {
        number: '01',
        title: '0m・10mラインを合わせる',
        body: '実際の0m地点と10m地点に\n2本の縦線をドラッグして合わせます。',
      },
      {
        number: '02',
        title: '0m通過を選ぶ',
        body: '胸が0mラインを通過した最初のフレームを選びます。\n反応時間は測りません。',
      },
      {
        number: '03',
        title: '10m通過を選ぶ',
        body: '胸が10mラインを通過した最初のフレームを選びます。',
      },
      {
        number: '04',
        title: '必要なら接地も選ぶ',
        body: '区間内で完全に入っている接地だけを、\n順番に選びます。',
      },
    ],
    cautionsTitle: '重要',
    cautions: [
      '0mラインをまたぐ接地・10mラインをまたぐ接地は選ばなくてOKです。',
      '途中の1歩を飛ばさないでください。',
    ],
    resultsTitle: '結果',
    results: ['10mタイム', '平均速度', '平均接地時間', '平均滞空時間', 'ピッチ'],
    tips: [...COMMON_TIPS, ...SPRINT_ONLY_TIPS],
  },
  squat: {
    title: 'スクワット角度の測り方',
    steps: [
      {
        number: '01',
        title: '撮影方向を選ぶ',
        body: '横から、または正面から選びます。',
      },
      {
        number: '02',
        title: '動画を選ぶ',
        body:
          'スマホは縦向きがおすすめです。\n横測定：身体の真横から撮影\n正面測定：身体の真正面から撮影\n' +
          '頭から足先まで映してください。',
      },
      {
        number: '03',
        title: '最も深い位置を選ぶ',
        body: 'スクワットの最下点を±1 / ±5 / ±10で合わせます。',
      },
      {
        number: '04',
        title: '解析範囲を合わせる',
        body: '身体全体が枠の中に入るように調整します。\n頭・肩・腰・膝・足首・つま先まで、必ず枠内へ入れてください。',
      },
      {
        number: '05',
        title: 'この範囲で解析',
        body:
          '骨格を推定し、動画上の2D角度を表示します。\n' +
          '横：股関節角度・体幹前傾・膝角度・下腿前傾・足関節角度・足部角度\n' +
          '正面：実装済みの6指標を表示します。',
      },
    ],
    cautionsTitle: '注意',
    cautions: ['これは動画上の2D角度です。自動でフォームの良し悪しを判定するものではありません。'],
    tips: [...COMMON_TIPS, ...SQUAT_ONLY_TIPS],
  },
};

/** 通常ユーザー向け操作説明には出してはいけない技術用語（回帰テストで使用） */
export const FORBIDDEN_HELP_TERMS = ['ROI', 'SimCC', 'RTMPose'];
