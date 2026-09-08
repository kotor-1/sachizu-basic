import React from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { Step, BulletList, Body, AppLink } from './pageUI';
import { PAGE_PATHS } from '../router';
import { HELP_CONTENT, HelpScreenKey } from '../content/helpContent';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  /** 現在開いている画面・種目。この内容だけを表示し、他種目の説明は出さない */
  screenKey: HelpScreenKey;
  /** cmj/rj/sprint/squat のみ: 初回チュートリアルを開き直す導線 */
  onReplayTutorial?: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  open,
  onClose,
  screenKey,
  onReplayTutorial,
}) => {
  const content = HELP_CONTENT[screenKey];

  return (
    <BottomSheet open={open} onClose={onClose} title={content.title}>
      {content.lead && <Body>{content.lead}</Body>}

      {content.highlight && (
        <div className="bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-bold rounded-lg px-3 py-2.5">
          {content.highlight}
        </div>
      )}

      {content.steps.length > 0 && (
        <div>
          {content.steps.map((step) => (
            <Step key={step.number} number={step.number} title={step.title}>
              {step.body ?? ''}
            </Step>
          ))}
        </div>
      )}

      {content.notes && content.notes.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-zinc-100">
          {content.notesTitle && (
            <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">
              {content.notesTitle}
            </div>
          )}
          <BulletList items={content.notes} />
        </div>
      )}

      {content.cautions && content.cautions.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-zinc-100">
          <div className="text-[11px] font-mono tracking-wider text-amber-600 uppercase">
            {content.cautionsTitle ?? '注意'}
          </div>
          <BulletList items={content.cautions} />
        </div>
      )}

      {content.results && content.results.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-zinc-100">
          <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">
            {content.resultsTitle ?? '結果'}
          </div>
          <BulletList items={content.results} />
        </div>
      )}

      {content.tips.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-zinc-100">
          <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">
            きれいに測るコツ
          </div>
          <BulletList items={content.tips} />
        </div>
      )}

      {onReplayTutorial && (
        <button
          type="button"
          onClick={onReplayTutorial}
          className="w-full flex items-center justify-center gap-1.5 min-h-[44px] text-xs font-bold text-zinc-500 hover:text-zinc-900 pt-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>はじめの案内をもう一度見る</span>
        </button>
      )}

      {content.showConsultationLink && (
        <div className="pt-4 border-t border-zinc-100">
          <AppLink
            to={PAGE_PATHS.consultation}
            className="flex items-center justify-between min-h-[44px] text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <span>無料相談について見る</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
          </AppLink>
        </div>
      )}
    </BottomSheet>
  );
};
