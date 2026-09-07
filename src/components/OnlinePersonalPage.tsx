import React from 'react';
import { PAGE_PATHS } from '../router';
import {
  Body,
  BulletList,
  ConsultationLinkButton,
  PageLabel,
  PrimaryAppLink,
  Section,
  SecondaryAppLink,
  Step,
} from './pageUI';

const TARGET_USERS = [
  '動画を見ても自分では原因がわからない',
  'アドバイスを受けても練習方法まで落とし込めない',
  '一度直して終わりではなく継続的に見てほしい',
  '近くに専門的に相談できる人がいない',
  '試合や練習の動画を定期的に確認してほしい',
  '動きだけでなく、練習内容まで相談したい',
];

const FREE_CONSULTATION_POINTS = [
  'まず悩みを相談したい',
  '測定結果を見てほしい',
  '一つの疑問について聞きたい',
  '自分に必要か確かめたい',
];

const ONLINE_PERSONAL_POINTS = [
  '継続的に動画を見てほしい',
  '原因から整理したい',
  '練習内容まで相談したい',
  '修正後の変化まで確認してほしい',
];

export const OnlinePersonalPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-5 py-8 space-y-8">
      {/* Hero */}
      <div className="space-y-4 pt-2">
        <PageLabel>ONLINE PERSONAL</PageLabel>
        <h1 className="text-[26px] font-black tracking-tight text-zinc-950 leading-[1.35]">
          一度のアドバイスではなく、
          <br />
          変化まで一緒に見る。
        </h1>
        <div className="space-y-3">
          <Body>
            {'動画を送る。\nフィードバックを受ける。\n練習する。\nもう一度動画を送る。'}
          </Body>
          <Body>
            {'この繰り返しで、\n動きの原因を整理しながら改善を進める\nLINEを使ったオンラインでの個別指導です。'}
          </Body>
        </div>
        <div className="pt-1">
          <PrimaryAppLink to={PAGE_PATHS.consultation}>
            まずは無料相談から
          </PrimaryAppLink>
        </div>
      </div>

      {/* 向いている人 */}
      <Section title="こんな人に向いています">
        <BulletList items={TARGET_USERS} />
      </Section>

      {/* 指導の流れ */}
      <Section title="指導の流れ">
        <div className="space-y-4">
          <Step number="01" title="動画を送る">
            {'練習・試合・トレーニングなど、\n確認してほしい動画を送ります。'}
          </Step>
          <Step number="02" title="動きを確認">
            {'見た目だけではなく、\nどこで動きが崩れているか、\n何が原因になっている可能性があるかを整理します。'}
          </Step>
          <Step number="03" title="フィードバック">
            {'文章や画像などを使いながら、\n改善ポイントを具体的に伝えます。'}
          </Step>
          <Step number="04" title="練習する">
            {'必要に応じて、\n改善につなげるための練習や考え方を提案します。'}
          </Step>
          <Step number="05" title="もう一度確認">
            {'修正後の動画を確認し、\n変化を見ながら次へ進めます。'}
          </Step>
        </div>
      </Section>

      {/* 無料相談との違い */}
      <Section title="無料相談との違い">
        <div className="space-y-5">
          <div className="space-y-3">
            <h3 className="text-sm font-black text-zinc-950">無料相談</h3>
            <BulletList items={FREE_CONSULTATION_POINTS} />
          </div>
          <div className="space-y-3 pt-5 border-t border-zinc-100">
            <h3 className="text-sm font-black text-zinc-950">
              オンラインパーソナル
            </h3>
            <BulletList items={ONLINE_PERSONAL_POINTS} />
          </div>
        </div>
      </Section>

      {/* SACHIZU BASICとの併用 */}
      <Section title="SACHIZU BASICも使えます">
        <Body>
          {'オンラインでのやり取りでは、\n動画だけでなくSACHIZU BASICで測定した数値も\n共通の材料として利用できます。'}
        </Body>
        <Body>
          {'「なんとなく良くなった」だけでなく、\n必要に応じて数値と動画の両方を見ながら変化を確認できます。'}
        </Body>
      </Section>

      {/* 料金 */}
      <Section title="料金">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-zinc-500">月額</span>
          <span className="text-4xl font-black font-mono tracking-tighter text-zinc-950">
            9,900
          </span>
          <span className="text-lg font-black font-mono text-zinc-400">円</span>
        </div>
        <Body>募集状況については無料相談時にご確認ください。</Body>
      </Section>

      {/* 最下部CTA */}
      <div className="pt-8 border-t border-zinc-200/80 space-y-4">
        <p className="text-base font-black text-zinc-950 leading-relaxed">
          まずは現在の悩みを教えてください。
        </p>
        <ConsultationLinkButton label="無料で相談する" />
        <SecondaryAppLink to={PAGE_PATHS.consultation}>
          無料相談について詳しく見る
        </SecondaryAppLink>
      </div>
    </div>
  );
};
