import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { isAcceptableVideoFile } from '../utils/videoSource';

interface VideoUploaderProps {
  type: 'cmj' | 'rj';
  onVideoSelected: (file: File, url: string) => void;
  onError: (msg: string) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  type,
  onVideoSelected,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じ動画をもう一度選んでも change が発火するようにしておく
    e.target.value = '';
    if (!file) return;

    // iPhone のフォトライブラリからは video/quicktime (.mov) が渡る。
    // 端末によっては type が空で来るため拡張子でも判定する。
    if (!isAcceptableVideoFile(file)) {
      onError('動画ファイルを選択してください。');
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      onVideoSelected(file, url);
    } catch {
      onError('動画を読み込めませんでした。別の動画を試してください。');
    }
  };

  return (
    <div className="space-y-6">
      {/* 最重要指示（大きなカードに囲まず、端正なタイポグラフィで伝える） */}
      <div className="space-y-1">
        <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">
          SHOOTING GUIDE
        </div>
        {type === 'cmj' ? (
          <h2 className="text-xl font-black tracking-tight text-zinc-950">
            1回のジャンプを撮影した動画を選択
          </h2>
        ) : (
          <div className="space-y-0.5">
            <h2 className="text-xl font-black tracking-tight text-zinc-950">
              10回連続でジャンプ
            </h2>
            <p className="text-sm font-bold text-blue-600">
              測定するのは最後の3回だけです
            </p>
          </div>
        )}
      </div>

      {/* 撮影条件（スリムなグリッドタグ） */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">
          CONDITIONS
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-zinc-100/80 px-3 py-2 rounded-lg font-medium text-zinc-800 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            <span>60fps以上（通常ビデオ）</span>
          </div>
          <div className="bg-zinc-100/80 px-3 py-2 rounded-lg font-medium text-zinc-800 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            <span>横から全身と足元を撮影</span>
          </div>
          <div className="bg-zinc-100/80 px-3 py-2 rounded-lg font-medium text-zinc-800 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            <span>スマートフォンを固定</span>
          </div>
          <div className="bg-zinc-100/80 px-3 py-2 rounded-lg font-medium text-zinc-800 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            <span>明るい場所で撮影</span>
          </div>
        </div>
      </div>

      {/* 動画選択ボタン */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-13 bg-zinc-950 hover:bg-black active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-base transition-all shadow-xs cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>動画を選ぶ</span>
        </button>

        {/* 補足注意事項（控えめな文字で過度な警告色を使わない） */}
        <div className="text-[11px] text-zinc-400 space-y-0.5 pt-1 px-1">
          <p>※通常のビデオモードで撮影してください（スローモーション非対応）。</p>
          <p>※暗い場所ではFPS自動調整により設定値より低く記録される場合があります。</p>
        </div>
      </div>
    </div>
  );
};
