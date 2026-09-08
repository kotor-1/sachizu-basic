import React, { useState } from 'react';
import { VideoUploader } from './VideoUploader';
import { VideoPlayer, VideoMarker } from './VideoPlayer';
import { FpsSelector } from './FpsSelector';
import { CMJResultCard } from './CMJResultCard';
import { calculateCMJ, CMJResult } from '../utils/jumpCalculations';
import { AlertCircle, RotateCcw } from 'lucide-react';

type CMJStep = 'upload' | 'select_takeoff' | 'select_landing' | 'result';

export const CMJFlow: React.FC = () => {
  const [step, setStep] = useState<CMJStep>('upload');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fps, setFps] = useState<number>(120);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [takeoffFrame, setTakeoffFrame] = useState<number | null>(null);
  const [landingFrame, setLandingFrame] = useState<number | null>(null);
  const [result, setResult] = useState<CMJResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVideoSelected = (file: File, url: string) => {
    setVideoSrc(url);
    setVideoFile(file);
    setCurrentFrame(0);
    setTakeoffFrame(null);
    setLandingFrame(null);
    setErrorMessage(null);
    setStep('select_takeoff');
  };

  const handleConfirmTakeoff = () => {
    setTakeoffFrame(currentFrame);
    setErrorMessage(null);
    setStep('select_landing');
  };

  const handleConfirmLanding = () => {
    if (takeoffFrame === null) {
      setErrorMessage('離地フレームが選択されていません。');
      return;
    }
    if (currentFrame <= takeoffFrame) {
      setErrorMessage('離地より後のフレームを選んでください。');
      return;
    }

    try {
      const calcResult = calculateCMJ(takeoffFrame, currentFrame, fps);
      setLandingFrame(currentFrame);
      setResult(calcResult);
      setErrorMessage(null);
      setStep('result');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('計算中にエラーが発生しました。');
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
    setTakeoffFrame(null);
    setLandingFrame(null);
    setResult(null);
    setErrorMessage(null);
    setStep('upload');
  };

  const markers: VideoMarker[] = [];
  if (takeoffFrame !== null) {
    markers.push({ frame: takeoffFrame, label: '離地' });
  }
  if (landingFrame !== null) {
    markers.push({ frame: landingFrame, label: '着地' });
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ステップ1: アップロード */}
      {step === 'upload' && (
        <div className="space-y-6">
          <VideoUploader
            type="cmj"
            onVideoSelected={handleVideoSelected}
            onError={setErrorMessage}
          />
          <div className="pt-2 border-t border-zinc-100">
            <FpsSelector fps={fps} onChangeFps={setFps} />
          </div>
        </div>
      )}

      {/* ステップ2 & 3: フレーム指定作業面 */}
      {(step === 'select_takeoff' || step === 'select_landing') && videoSrc && (
        <div className="space-y-4">
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
              {/* 対象表示 */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-wider text-blue-600 font-bold uppercase block">
                    {step === 'select_takeoff' ? 'STEP 1 / 2' : 'STEP 2 / 2'}
                  </span>
                  <p className="text-sm font-black text-zinc-950">
                    {step === 'select_takeoff'
                      ? '① 離地する最初のフレームを選んでください'
                      : '② 着地する最初のフレームを選んでください'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-400 block">CURRENT</span>
                  <span className="text-sm font-mono font-black text-zinc-900">
                    {currentFrame} F
                  </span>
                </div>
              </div>

              {/* 登録ボタン */}
              {step === 'select_takeoff' ? (
                <button
                  type="button"
                  onClick={handleConfirmTakeoff}
                  className="w-full h-12 bg-zinc-950 hover:bg-black active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs"
                >
                  <span>このフレームを登録</span>
                  <span className="font-mono text-xs opacity-70">({currentFrame}F)</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleConfirmLanding}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs"
                  >
                    <span>このフレームを登録して結果を見る</span>
                    <span className="font-mono text-xs opacity-80">({currentFrame}F)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('select_takeoff');
                      setTakeoffFrame(null);
                      setLandingFrame(null);
                      setErrorMessage(null);
                    }}
                    className="w-full py-1.5 text-zinc-500 hover:text-zinc-800 font-bold text-xs flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>離地を選び直す</span>
                  </button>
                </div>
              )}
            </div>
          </VideoPlayer>

          {/* fps設定（画面下部にシンプルに） */}
          <div className="px-1 pt-1">
            <FpsSelector fps={fps} onChangeFps={setFps} />
          </div>
        </div>
      )}

      {/* ステップ4: 結果表示 */}
      {step === 'result' && result && (
        <CMJResultCard result={result} onReset={handleReset} />
      )}
    </div>
  );
};
