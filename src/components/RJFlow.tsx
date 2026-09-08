import React, { useState } from 'react';
import { VideoUploader } from './VideoUploader';
import { VideoPlayer, VideoMarker } from './VideoPlayer';
import { FpsSelector } from './FpsSelector';
import { RJResultCard } from './RJResultCard';
import { calculateRJFrom7Points, RJResult, RJ7Points } from '../utils/jumpCalculations';
import { AlertCircle, ChevronLeft, RotateCcw, ArrowRight } from 'lucide-react';

type FlowPhase = 'upload' | 'wizard' | 'completed_selection' | 'result';

interface StepDefinition {
  key: keyof RJ7Points;
  stepNumber: number; // 1 to 7
  badge: string;
  /** 操作エリア上部に出す「いま何をするか」の指示文 */
  guidance: string;
  markerLabel: string;
}

const SEVEN_STEPS: StepDefinition[] = [
  {
    key: 'landing1',
    stepNumber: 1,
    badge: '1回目',
    guidance: '最後の3回のうち、1回目の着地を選んでください',
    markerLabel: '1着',
  },
  {
    key: 'takeoff1',
    stepNumber: 2,
    badge: '1回目',
    guidance: '1回目の離地を選んでください',
    markerLabel: '1離',
  },
  {
    key: 'landing2',
    stepNumber: 3,
    badge: '2回目',
    guidance: '2回目の着地を選んでください',
    markerLabel: '2着',
  },
  {
    key: 'takeoff2',
    stepNumber: 4,
    badge: '2回目',
    guidance: '2回目の離地を選んでください',
    markerLabel: '2離',
  },
  {
    key: 'landing3',
    stepNumber: 5,
    badge: '3回目',
    guidance: '3回目の着地を選んでください',
    markerLabel: '3着',
  },
  {
    key: 'takeoff3',
    stepNumber: 6,
    badge: '3回目',
    guidance: '3回目の離地を選んでください',
    markerLabel: '3離',
  },
  {
    key: 'landing4',
    stepNumber: 7,
    badge: '終了',
    guidance: '最後の着地を選んでください',
    markerLabel: '終着',
  },
];

export const RJFlow: React.FC = () => {
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('upload');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fps, setFps] = useState<number>(120);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const [points, setPoints] = useState<RJ7Points>({
    landing1: -1,
    takeoff1: -1,
    landing2: -1,
    takeoff2: -1,
    landing3: -1,
    takeoff3: -1,
    landing4: -1,
  });

  const [result, setResult] = useState<RJResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeStep = SEVEN_STEPS[currentStepIndex];

  const handleVideoSelected = (file: File, url: string) => {
    setVideoSrc(url);
    setVideoFile(file);
    setCurrentFrame(0);
    setCurrentStepIndex(0);
    setPoints({
      landing1: -1,
      takeoff1: -1,
      landing2: -1,
      takeoff2: -1,
      landing3: -1,
      takeoff3: -1,
      landing4: -1,
    });
    setErrorMessage(null);
    setFlowPhase('wizard');
  };

  const handleConfirmStep = () => {
    if (currentStepIndex > 0) {
      const prevStepKey = SEVEN_STEPS[currentStepIndex - 1].key;
      const prevFrame = points[prevStepKey];
      if (prevFrame !== -1 && currentFrame <= prevFrame) {
        setErrorMessage(`直前の指定（${prevFrame}F）より後のフレームを選んでください。`);
        return;
      }
    }

    const updatedPoints = {
      ...points,
      [activeStep.key]: currentFrame,
    };
    setPoints(updatedPoints);
    setErrorMessage(null);

    if (currentStepIndex < SEVEN_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      const nextKey = SEVEN_STEPS[nextIdx].key;
      if (updatedPoints[nextKey] !== -1) {
        setCurrentFrame(updatedPoints[nextKey]);
      }
    } else {
      setFlowPhase('completed_selection');
    }
  };

  const handleViewResult = () => {
    try {
      const finalResult = calculateRJFrom7Points(points, fps);
      setResult(finalResult);
      setErrorMessage(null);
      setFlowPhase('result');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('計算中にエラーが発生しました。');
      }
    }
  };

  const handleStepBack = () => {
    if (flowPhase === 'completed_selection') {
      setFlowPhase('wizard');
      setCurrentStepIndex(6);
      setErrorMessage(null);
      return;
    }

    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      setErrorMessage(null);
      const prevKey = SEVEN_STEPS[prevIdx].key;
      if (points[prevKey] !== -1) {
        setCurrentFrame(points[prevKey]);
      }
    }
  };

  const handleReset = () => {
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(null);
    setVideoFile(null);
    setCurrentFrame(0);
    setCurrentStepIndex(0);
    setPoints({
      landing1: -1,
      takeoff1: -1,
      landing2: -1,
      takeoff2: -1,
      landing3: -1,
      takeoff3: -1,
      landing4: -1,
    });
    setResult(null);
    setErrorMessage(null);
    setFlowPhase('upload');
  };

  const markers: VideoMarker[] = [];
  SEVEN_STEPS.forEach((step) => {
    const frameVal = points[step.key];
    if (frameVal !== -1) {
      markers.push({
        frame: frameVal,
        label: step.markerLabel,
      });
    }
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ステップ1: アップロード */}
      {flowPhase === 'upload' && (
        <div className="space-y-6">
          <VideoUploader
            type="rj"
            onVideoSelected={handleVideoSelected}
            onError={setErrorMessage}
          />
          <div className="pt-2 border-t border-zinc-100">
            <FpsSelector fps={fps} onChangeFps={setFps} />
          </div>
        </div>
      )}

      {/* ステップ2: 7点指定作業面 */}
      {flowPhase === 'wizard' && videoSrc && (
        <div className="space-y-4">
          {/* 7点ステップの目盛りインジケーター（プロ志向の精密なゲージ） */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono tracking-wider text-zinc-500 uppercase">
              7-POINT TRACKING
            </span>
            <div className="flex items-center space-x-1.5">
              {SEVEN_STEPS.map((s, idx) => (
                <div
                  key={s.key}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? 'w-5 bg-blue-600'
                      : points[s.key] !== -1
                      ? 'w-2 bg-zinc-900'
                      : 'w-2 bg-zinc-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <VideoPlayer
            videoSrc={videoSrc}
            videoFile={videoFile}
            fps={fps}
            currentFrame={currentFrame}
            onFrameChange={setCurrentFrame}
            markers={markers}
          >
            {/* コマ送り直下の登録エリア */}
            <div className="space-y-2.5 pt-2 border-t border-zinc-100">
              {/* 現在の登録対象と現在フレーム */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono tracking-wider text-blue-600 font-bold uppercase">
                      STEP {activeStep.stepNumber} / 7
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400">
                      （{activeStep.badge}）
                    </span>
                  </div>
                  <p className="text-sm font-black text-zinc-950">
                    {activeStep.guidance}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-400 block">CURRENT</span>
                  <span className="text-sm font-mono font-black text-zinc-900">
                    {currentFrame} F
                  </span>
                </div>
              </div>

              {/* 登録ボタン（文言をスッキリ洗練） */}
              <button
                type="button"
                onClick={handleConfirmStep}
                className="w-full h-12 bg-zinc-950 hover:bg-black active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs"
              >
                <span>このフレームを登録</span>
                <span className="font-mono text-xs opacity-70">({currentFrame}F)</span>
              </button>

              {/* 戻る / やり直し */}
              <div className="flex items-center justify-between pt-1 px-1">
                {currentStepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={handleStepBack}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-900 flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>1つ前に戻る</span>
                  </button>
                ) : <div />}

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-600 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>最初から</span>
                </button>
              </div>
            </div>
          </VideoPlayer>

          {/* fps確認 */}
          <div className="px-1 pt-1">
            <FpsSelector fps={fps} onChangeFps={setFps} />
          </div>
        </div>
      )}

      {/* ステップ3: 選択完了確認画面 */}
      {flowPhase === 'completed_selection' && videoSrc && (
        <div className="space-y-4">
          <div className="space-y-1 text-center py-2">
            <div className="text-[11px] font-mono tracking-wider text-blue-600 font-bold uppercase">
              TRACKING COMPLETE
            </div>
            <h2 className="text-xl font-black tracking-tight text-zinc-950">
              最後の3回を選択しました
            </h2>
            <p className="text-xs text-zinc-500">
              7つのフレーム指定が完了しました。「結果を見る」を押してください。
            </p>
          </div>

          <VideoPlayer
            videoSrc={videoSrc}
            videoFile={videoFile}
            fps={fps}
            currentFrame={currentFrame}
            onFrameChange={setCurrentFrame}
            markers={markers}
          >
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleViewResult}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs"
              >
                <span>結果を見る</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between pt-1 px-1">
                <button
                  type="button"
                  onClick={handleStepBack}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-900 flex items-center space-x-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>最後の着地を選び直す</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-600 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>最初からやり直す</span>
                </button>
              </div>
            </div>
          </VideoPlayer>
        </div>
      )}

      {/* ステップ4: 結果表示 */}
      {flowPhase === 'result' && result && (
        <RJResultCard result={result} onReset={handleReset} />
      )}
    </div>
  );
};
