import React from 'react';
import { PAGE_PATHS } from '../router';
import {
  Body,
  BulletList,
  ConsultationLinkButton,
  hasConsultationUrl,
  PageLabel,
  Section,
  SecondaryAppLink,
  Step,
} from './pageUI';

const CONSULT_TOPICS = [
  'CMJ / RJの数値をどう見ればいいか',
  '接地時間やピッチについて',
  'スプリント動作について',
  'ハードル動作について',
  'ジャンプ動作について',
  'スクワットの角度について',
  '練習動画を見て気になるところ',
  '何を練習すればいいかわからない',
];

const SEND_EXAMPLES = [
  '「接地時間を短くしたいです」',
  '「スクワットで膝の左右差が気になります」',
  '「ハードルで浮いてしまいます」',
];

export const ConsultationPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-5 py-8 space-y-8">
      {/* Hero */}
      <div className="space-y-4 pt-2">
        <PageLabel>FREE CONSULTATION</PageLabel>
        <h1 className="text-[26px] font-black tracking-tight text-zinc-950 leading-[1.35]">
          数字は出た。
          <br />
          次は、どう改善するか。
        </h1>
        <div className="space-y-3">
          <Body>
            {'SACHIZU BASICの測定結果や練習動画を送っていただければ、\n陸上競技コーチが内容を確認します。'}
          </Body>
          <Body>
            {'「この数値はどう見ればいい？」\n「どこを直せばいい？」\n\nといった相談でも大丈夫です。'}
          </Body>
        </div>
        {hasConsultationUrl() ? (
          <div className="pt-1">
            <ConsultationLinkButton label="無料で相談する" />
          </div>
        ) : null}
      </div>

      {/* 相談できる内容 */}
      <Section title="こんな内容を相談できます">
        <BulletList items={CONSULT_TOPICS} />
        <p className="text-sm text-zinc-500 leading-relaxed">
          「これを相談していいのかな」と迷う内容でも構いません。
        </p>
      </Section>

      {/* 相談のしかた */}
      <Section title="相談のしかた">
        <div className="space-y-4">
          <Step number="01" title="測定する / 動画を撮る">
            {'SACHIZU BASICの結果画面をスクリーンショットするか、\n相談したい動きの動画を用意してください。'}
          </Step>
          <Step number="02" title="送る">
            {'測定結果・動画と一緒に、\n気になっていることを送ってください。'}
          </Step>
          <Step number="03" title="フィードバック">
            {'内容を確認して、\n改善のための考え方やポイントをお伝えします。'}
          </Step>
        </div>
      </Section>

      {/* 何を送ればいいか */}
      <Section title="何を送ればいい？">
        <Body>最小限で構いません。</Body>
        <div className="space-y-2">
          <BulletList items={['測定結果のスクリーンショット']} />
          <p className="text-xs font-mono text-zinc-400 pl-3.5">または</p>
          <BulletList items={['実際の動きの動画']} />
        </div>
        <div className="pt-2 space-y-3">
          <p className="text-sm font-bold text-zinc-900">
            ＋「何が気になっているか」
          </p>
          <div className="space-y-1.5">
            <p className="text-xs font-mono tracking-wider text-zinc-400 uppercase">
              例
            </p>
            {SEND_EXAMPLES.map((example) => (
              <p key={example} className="text-sm text-zinc-600 leading-relaxed">
                {example}
              </p>
            ))}
          </div>
        </div>
      </Section>

      {/* オンラインパーソナルへの導線 */}
      <Section title="もっと継続して見てほしい場合">
        <p className="text-base font-black text-zinc-950 leading-relaxed">
          一度の相談ではなく、
          <br />
          変化まで一緒に見る方法もあります。
        </p>
        <Body>
          {'練習動画を継続的に確認しながら、\nフィードバック → 練習 → 再確認を繰り返す\nオンラインパーソナルも行っています。'}
        </Body>
        <div className="pt-1">
          <SecondaryAppLink to={PAGE_PATHS['online-personal']}>
            オンラインパーソナルを見る
          </SecondaryAppLink>
        </div>
      </Section>

      {/* 最下部CTA */}
      {hasConsultationUrl() ? (
        <div className="pt-8 border-t border-zinc-200/80">
          <ConsultationLinkButton label="測定結果を送って無料相談する" />
        </div>
      ) : null}
    </div>
  );
};
