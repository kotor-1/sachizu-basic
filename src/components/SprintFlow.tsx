import React, { useState } from 'react';
import { VideoPlayer, VideoMarker } from './VideoPlayer';
import { FpsSelector } from './FpsSelector';
import { SprintLineOverlay } from './SprintLineOverlay';
import { SprintResultCard } from './SprintResultCard';
import { calculateSprint, SprintResult, SprintContactInput } from '../utils/sprintCalculations';
import { AlertCircle, RotateCcw, ArrowRight, Upload, Plus, Check } from 'lucide-react';
import { isAcceptableVideoFile } from '../utils/videoSource';

type SprintPhase = 'upload' | 'step1_start' | 'step2_end' | 'step3_contacts' | 'result';

export const SprintFlow: React.FC = () => {
  const [phase, setPhase] = useState<SprintPhase>('upload');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fps, setFps] = useState<number>(120);
  const [currentFrame, setCurrentFrame] = useState<number>(0);

  // 0m・10mライン位置 (0〜100%)
  const [line0X, setLine0X] = useState<number>(25);
  const [line10X, setLine10X] = useState<number>(75);

  // 0m・10m通過フレーム
  const [startFrame, setStartFrame] = useState<number | null>(null);
  const [endFrame, setEndFrame] = useState<number | null>(null);

  // 接地登録ステート（可変個数）
  const [contacts, setContacts] = useState<SprintContactInput[]>([]);
  const [currentContactStep, setCurrentContactStep] = useState<{
    landingFrame: number | null;
  }>({ landingFrame: null });

  const [result, setResult] = useState<SprintResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 動画選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isAcceptableVideoFile(file)) {
      setErrorMessage('動画ファイルを選択してください。');
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoFile(file);
    setCurrentFrame(0);
    setStartFrame(null);
    setEndFrame(null);
    setContacts([]);
    setCurrentContactStep({ landingFrame: null });
    setErrorMessage(null);
    setPhase('step1_start');
  };

  // STEP 1: 0m通過確定
  const handleConfirmStart = () => {
    setStartFrame(currentFrame);
    setErrorMessage(null);
    setPhase('step2_end');
  };

  // STEP 2: 10m通過確定
  const handleConfirmEnd = () => {
    if (startFrame === null) {
      setErrorMessage('0m通過フレームが選択されていません。');
      return;
    }
    if (currentFrame <= startFrame) {
      setErrorMessage('10m通過フレームは0m通過より後のフレームを選んでください。');
      return;
    }
    setEndFrame(currentFrame);
    setErrorMessage(null);
    // 接地登録フェーズへ進む（0m通過フレームへ自動シーク）
    setCurrentFrame(startFrame);
    setPhase('step3_contacts');
  };

  // 接地登録: 着地確定（前回の離地より後かチェック）
  const handleConfirmContactLanding = () => {
    if (contacts.length > 0) {
      const lastTakeoff = contacts[contacts.length - 1].takeoffFrame;
      if (currentFrame <= lastTakeoff) {
        setErrorMessage('前のフレームより後を選んでください');
        return;
      }
    }
    setCurrentContactStep({ landingFrame: currentFrame });
    setErrorMessage(null);
  };

  // 接地登録: 離地確定して1歩追加（今回の着地より後かチェック）
  const handleConfirmContactTakeoff = () => {
    if (currentContactStep.landingFrame === null) {
      setErrorMessage('着地フレームが指定されていません。');
      return;
    }
    if (currentFrame <= currentContactStep.landingFrame) {
      setErrorMessage('前のフレームより後を選んでください');
      return;
    }

    const newContact: SprintContactInput = {
      landingFrame: currentContactStep.landingFrame,
      takeoffFrame: currentFrame,
    };
    setContacts([...contacts, newContact]);
    setCurrentContactStep({ landingFrame: null });
    setErrorMessage(null);
  };

  // 直前の1歩を取り消す
  const handleRemoveLastContact = () => {
    if (contacts.length > 0) {
      setContacts(contacts.slice(0, -1));
      setErrorMessage(null);
    }
  };

  // 結果計算して表示（未完了接地のチェック）
  const handleFinishCalculation = () => {
    if (startFrame === null || endFrame === null) return;
    if (currentContactStep.landingFrame !== null) {
      setErrorMessage('離地を選んでから結果を見てください');
      return;
    }

    try {
      const sprintRes = calculateSprint(startFrame, endFrame, fps, contacts, line0X, line10X);
      setResult(sprintRes);
      setErrorMessage(null);
      setPhase('result');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('計算中にエラーが発生しました。');
      }
    }
  };


  // 最初からやり直し
  const handleReset = () => {
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(null);
    setVideoFile(null);
    setCurrentFrame(0);
    setStartFrame(null);
    setEndFrame(null);
    setContacts([]);
    setCurrentContactStep({ landingFrame: null });
    setResult(null);
    setErrorMessage(null);
    setPhase('upload');
  };

  // マーカーピンの作成
  const markers: VideoMarker[] = [];
  if (startFrame !== null) {
    markers.push({ frame: startFrame, label: '0m', color: 'bg-amber-500' });
  }
  if (endFrame !== null) {
    markers.push({ frame: endFrame, label: '10m', color: 'bg-blue-600' });
  }
  contacts.forEach((c, idx) => {
    markers.push({ frame: c.landingFrame, label: `${idx + 1}着` });
    markers.push({ frame: c.takeoffFrame, label: `${idx + 1}離` });
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. アップロード画面 */}
      {phase === 'upload' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">
              10M SPRINT GUIDE
            </div>
            <h2 className="text-xl font-black tracking-tight text-zinc-950">
              10m区間を撮影した動画を選択
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              スタートから10m、または途中の任意の10m区間（10-20m等）のタイム・速度・接地時間を測定します。
            </p>
          </div>

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
                <span>0mと10mの両地点を撮影</span>
              </div>
              <div className="bg-zinc-100/80 px-3 py-2 rounded-lg font-medium text-zinc-800 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                <span>スマートフォンを固定</span>
              </div>
              <div className="bg-zinc-100/80 px-3 py-2 rounded-lg font-medium text-zinc-800 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                <span>胸と足元が明瞭に映る画角</span>
              </div>
            </div>
          </div>

          <label className="block">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-full h-13 bg-zinc-950 hover:bg-black active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-base transition-all shadow-xs cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>動画を選ぶ</span>
            </div>
          </label>

          <div className="pt-2 border-t border-zinc-100">
            <FpsSelector fps={fps} onChangeFps={setFps} />
          </div>
        </div>
      )}

      {/* 2. STEP 1 & 2: 0m/10m通過指定作業面 */}
      {(phase === 'step1_start' || phase === 'step2_end') && videoSrc && (
        <div className="space-y-4">
          {/* ライン操作ガイド */}
          <div className="bg-zinc-100/70 border border-zinc-200/70 rounded-xl px-3 py-2 text-xs flex items-center justify-between">
            <span className="font-bold text-zinc-800">
              画面の「0m」「10m」ラインを指でドラッグして位置を合わせてください
            </span>
          </div>

          <VideoPlayer
            videoSrc={videoSrc}
            videoFile={videoFile}
            fps={fps}
            currentFrame={currentFrame}
            onFrameChange={setCurrentFrame}
            markers={markers}
            overlay={
              <SprintLineOverlay
                line0X={line0X}
                line10X={line10X}
                onChangeLine0X={setLine0X}
                onChangeLine10X={setLine10X}
              />
            }
          >
            <div className="space-y-2.5 pt-2 border-t border-zinc-100">
              {/* STEP表示 */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-wider text-blue-600 font-bold uppercase block">
                    {phase === 'step1_start' ? 'STEP 1' : 'STEP 2'}
                  </span>
                  <p className="text-sm font-black text-zinc-950">
                    {phase === 'step1_start' ? '0m通過' : '10m通過'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {phase === 'step1_start'
                      ? '0mラインを胸が通過した最初のフレームを選んでください'
                      : '10mラインを胸が通過した最初のフレームを選んでください'}
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
              {phase === 'step1_start' ? (
                <button
                  type="button"
                  onClick={handleConfirmStart}
                  className="w-full h-12 bg-zinc-950 hover:bg-black active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs cursor-pointer"
                >
                  <span>このフレームを0m通過にする</span>
                  <span className="font-mono text-xs opacity-70">({currentFrame}F)</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleConfirmEnd}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs cursor-pointer"
                  >
                    <span>このフレームを10m通過にする</span>
                    <span className="font-mono text-xs opacity-80">({currentFrame}F)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPhase('step1_start');
                      setStartFrame(null);
                      setEndFrame(null);
                    }}
                    className="w-full py-1.5 text-zinc-500 hover:text-zinc-800 font-bold text-xs flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>0m通過を選び直す</span>
                  </button>
                </div>
              )}
            </div>
          </VideoPlayer>
        </div>
      )}

      {/* 3. STEP 3: 接地測定（可変個数） */}
      {phase === 'step3_contacts' && videoSrc && startFrame !== null && endFrame !== null && (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono tracking-wider text-blue-600 font-bold uppercase">
              STEP 3 / 接地を測る
            </div>
            {contacts.length === 0 && currentContactStep.landingFrame === null ? (
              <>
                <h2 className="text-base font-black text-zinc-950">
                  0mより後の最初の着地を選んでください
                </h2>
                <p className="text-[11px] text-zinc-400">
                  ※0mラインをまたいでいる接地は選ばなくてOKです
                </p>
              </>
            ) : (
              <>
                <h2 className="text-base font-black text-zinc-950">
                  区間内の接地を順番にすべて選んでください
                </h2>
                <p className="text-xs font-semibold text-zinc-700">
                  途中の1歩を飛ばさないでください
                </p>
                <p className="text-[11px] text-zinc-400">
                  ※0m・10mラインをまたぐ接地は選ばなくてOKです
                </p>
              </>
            )}
          </div>

          <VideoPlayer
            videoSrc={videoSrc}
            videoFile={videoFile}
            fps={fps}
            currentFrame={currentFrame}
            onFrameChange={setCurrentFrame}
            markers={markers}
          >
            <div className="space-y-2.5 pt-2 border-t border-zinc-100">
              {/* 現在の接地ステップ案内 */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">
                    CONTACT #{contacts.length + 1}
                  </span>
                  <p className="text-sm font-black text-zinc-950">
                    {currentContactStep.landingFrame === null
                      ? `${contacts.length + 1}歩目: 着地の瞬間を選ぶ`
                      : `${contacts.length + 1}歩目: 離地の瞬間を選ぶ`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-400 block">CURRENT</span>
                  <span className="text-sm font-mono font-black text-zinc-900">
                    {currentFrame} F
                  </span>
                </div>
              </div>

              {/* 着地/離地 決定ボタン */}
              {currentContactStep.landingFrame === null ? (
                <button
                  type="button"
                  onClick={handleConfirmContactLanding}
                  className="w-full h-12 bg-zinc-900 hover:bg-black active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>このフレームを着地にする（{currentFrame}F）</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleConfirmContactTakeoff}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>このフレームを離地にして歩を確定（{currentFrame}F）</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentContactStep({ landingFrame: null })}
                    className="w-full py-1 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                  >
                    着地を選び直す
                  </button>
                </div>
              )}

              {/* 登録済み接地リスト */}
              {contacts.length > 0 && (
                <div className="pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">
                      REGISTERED CONTACTS ({contacts.length}歩)
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveLastContact}
                      className="text-[11px] font-bold text-zinc-500 hover:text-red-600 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>直前の1歩を取り消す</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contacts.map((c, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[11px] bg-zinc-100 px-2 py-0.5 rounded text-zinc-700 font-bold"
                      >
                        #{idx + 1}: {c.landingFrame}F → {c.takeoffFrame}F (
                        {((c.takeoffFrame - c.landingFrame) / fps).toFixed(3)}s)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 終了またはスキップボタン */}
              <div className="pt-2 space-y-1.5">
                <button
                  type="button"
                  onClick={handleFinishCalculation}
                  className="w-full h-12 bg-zinc-950 hover:bg-black active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs cursor-pointer"
                >
                  <span>
                    {contacts.length > 0
                      ? '接地の登録を終えて結果を見る'
                      : '接地を登録せず結果を見る'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </VideoPlayer>
        </div>
      )}

      {/* 4. 結果画面 */}
      {phase === 'result' && result && (
        <SprintResultCard result={result} onReset={handleReset} />
      )}
    </div>
  );
};
