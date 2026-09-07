import React, { useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { FpsSelector } from './FpsSelector';
import {
  estimatePoseFromROI,
  getOrLoadRtmPoseSession,
  DetectedKeypoint,
} from '../utils/rtmposeDetector';
import {
  calculateSquatSideAngles,
  calculateSquatFrontAngles,
  applyRoiPadding,
  SquatSideResult,
  SquatFrontResult,
  RoiRect,
  COCO_KEYPOINTS,
  SKELETON_CONNECTIONS,
  FOOT_SKELETON_CONNECTIONS,
  POSE_CONFIDENCE_THRESHOLD,
  Keypoint,
} from '../utils/squatCalculations';
import { SquatResultCard } from './SquatResultCard';
import { SquatSkeletonOverlay } from './SquatSkeletonOverlay';
import { RoiAdjustPanel, RoiRectPixels } from './RoiAdjustPanel';
import {
  Upload,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { isAcceptableVideoFile } from '../utils/videoSource';

type SquatDirection = 'side' | 'front';
type SquatPhase = 'direction' | 'upload' | 'select_frame' | 'result' | 'roi_adjust';

// スクワットは時間計測を伴わないため 30fps も正規の選択肢として扱う
const SQUAT_FPS_OPTIONS = [30, 60, 120, 240];
const DEFAULT_SQUAT_FPS = 60;

/**
 * 角度計算用にキーポイントを「元動画のピクセル座標」へ変換する。
 * DetectedKeypoint の x / y は幅・高さそれぞれに対する 0〜100% の値なので、
 * 動画の縦横比が 1:1 でない限り、そのまま角度計算に使うと角度が歪む。
 * （例: 1080x1920 の縦動画では膝角度が約 20 度ずれる）
 * estimatePoseFromROI() が返す pixelX / pixelY は、ROIローカル座標ではなく
 * 既に元動画座標系へ変換済みのため、この関数でそのまま使える。
 */
const toPixelKeypoints = (kps: DetectedKeypoint[]): Keypoint[] =>
  kps.map((kp) => ({ x: kp.pixelX, y: kp.pixelY, score: kp.score }));

// 骨格描画で「主要ライン」として太く強調する接続（体幹・下肢・足部）
const CORE_CONNECTION_KEYS = new Set([
  `${COCO_KEYPOINTS.LEFT_SHOULDER}-${COCO_KEYPOINTS.RIGHT_SHOULDER}`,
  `${COCO_KEYPOINTS.LEFT_HIP}-${COCO_KEYPOINTS.RIGHT_HIP}`,
  `${COCO_KEYPOINTS.LEFT_SHOULDER}-${COCO_KEYPOINTS.LEFT_HIP}`,
  `${COCO_KEYPOINTS.RIGHT_SHOULDER}-${COCO_KEYPOINTS.RIGHT_HIP}`,
  `${COCO_KEYPOINTS.LEFT_HIP}-${COCO_KEYPOINTS.LEFT_KNEE}`,
  `${COCO_KEYPOINTS.LEFT_KNEE}-${COCO_KEYPOINTS.LEFT_ANKLE}`,
  `${COCO_KEYPOINTS.RIGHT_HIP}-${COCO_KEYPOINTS.RIGHT_KNEE}`,
  `${COCO_KEYPOINTS.RIGHT_KNEE}-${COCO_KEYPOINTS.RIGHT_ANKLE}`,
  `${COCO_KEYPOINTS.LEFT_ANKLE}-${COCO_KEYPOINTS.LEFT_BIG_TOE}`,
  `${COCO_KEYPOINTS.LEFT_ANKLE}-${COCO_KEYPOINTS.LEFT_SMALL_TOE}`,
  `${COCO_KEYPOINTS.LEFT_ANKLE}-${COCO_KEYPOINTS.LEFT_HEEL}`,
  `${COCO_KEYPOINTS.RIGHT_ANKLE}-${COCO_KEYPOINTS.RIGHT_BIG_TOE}`,
  `${COCO_KEYPOINTS.RIGHT_ANKLE}-${COCO_KEYPOINTS.RIGHT_SMALL_TOE}`,
  `${COCO_KEYPOINTS.RIGHT_ANKLE}-${COCO_KEYPOINTS.RIGHT_HEEL}`,
]);

// 骨格描画で点を打つキーポイント（肩・肘・手首・股関節・膝・足首・足部）
const RELEVANT_KEYPOINT_INDICES = new Set<number>([
  COCO_KEYPOINTS.LEFT_SHOULDER,
  COCO_KEYPOINTS.RIGHT_SHOULDER,
  COCO_KEYPOINTS.LEFT_ELBOW,
  COCO_KEYPOINTS.RIGHT_ELBOW,
  COCO_KEYPOINTS.LEFT_WRIST,
  COCO_KEYPOINTS.RIGHT_WRIST,
  COCO_KEYPOINTS.LEFT_HIP,
  COCO_KEYPOINTS.RIGHT_HIP,
  COCO_KEYPOINTS.LEFT_KNEE,
  COCO_KEYPOINTS.RIGHT_KNEE,
  COCO_KEYPOINTS.LEFT_ANKLE,
  COCO_KEYPOINTS.RIGHT_ANKLE,
  COCO_KEYPOINTS.LEFT_BIG_TOE,
  COCO_KEYPOINTS.RIGHT_BIG_TOE,
  COCO_KEYPOINTS.LEFT_SMALL_TOE,
  COCO_KEYPOINTS.RIGHT_SMALL_TOE,
  COCO_KEYPOINTS.LEFT_HEEL,
  COCO_KEYPOINTS.RIGHT_HEEL,
]);

/** データURLから HTMLImageElement を読み込む（ROI再解析でクロップ元として使う） */
const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
    img.src = url;
  });

/**
 * 元の動画フレーム画像（骨格なし）へ骨格を描画し、結果画像として合成する。
 * ROI解析（初回・再調整とも）で得たキーポイントは常に元動画pixel座標のため、
 * 常に「元動画フレーム全体」の上へ描画する（ROIで切り出した画像だけを表示しない）。
 */
async function buildAnnotatedImage(
  keypoints: DetectedKeypoint[],
  rawFrameDataUrl: string,
  vw: number,
  vh: number
): Promise<string> {
  const rawImage = await loadImage(rawFrameDataUrl);

  const synthCanvas = document.createElement('canvas');
  synthCanvas.width = vw;
  synthCanvas.height = vh;
  const ctx = synthCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D コンテキストの取得に失敗しました。');
  }

  // 元フレーム描画
  ctx.drawImage(rawImage, 0, 0, vw, vh);

  const drawConnection = (idxA: number, idxB: number) => {
    const ptA = keypoints[idxA];
    const ptB = keypoints[idxB];
    if (
      ptA &&
      ptB &&
      ptA.score >= POSE_CONFIDENCE_THRESHOLD &&
      ptB.score >= POSE_CONFIDENCE_THRESHOLD
    ) {
      const isCore = CORE_CONNECTION_KEYS.has(`${idxA}-${idxB}`);
      ctx.beginPath();
      ctx.moveTo(ptA.pixelX, ptA.pixelY);
      ctx.lineTo(ptB.pixelX, ptB.pixelY);
      ctx.strokeStyle = isCore ? '#3b82f6' : '#94a3b8';
      ctx.lineWidth = Math.max(3, vw * 0.005);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  SKELETON_CONNECTIONS.forEach(([idxA, idxB]) => drawConnection(idxA, idxB));
  // 足部（ankle → big toe / small toe / heel）を結果画像にのみ追加描画。
  // 既存デザイン（同じ色・同じ太さの主要ライン）をそのまま流用し、目立たせすぎない。
  FOOT_SKELETON_CONNECTIONS.forEach(([idxA, idxB]) => drawConnection(idxA, idxB));

  // 関節点描画
  keypoints.forEach((kp, idx) => {
    if (RELEVANT_KEYPOINT_INDICES.has(idx) && kp.score >= POSE_CONFIDENCE_THRESHOLD) {
      const r = Math.max(5, vw * 0.008);
      ctx.beginPath();
      ctx.arc(kp.pixelX, kp.pixelY, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = Math.max(2, vw * 0.003);
      ctx.stroke();
    }
  });

  return synthCanvas.toDataURL('image/jpeg', 0.92);
}

export const SquatFlow: React.FC = () => {
  const [direction, setDirection] = useState<SquatDirection>('side');
  const [phase, setPhase] = useState<SquatPhase>('direction');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fps, setFps] = useState<number>(DEFAULT_SQUAT_FPS);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 解析結果
  const [detectedKeypoints, setDetectedKeypoints] = useState<DetectedKeypoint[] | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [sideResult, setSideResult] = useState<SquatSideResult | null>(null);
  const [frontResult, setFrontResult] = useState<SquatFrontResult | null>(null);

  // 解析範囲（人物ROI）関連
  // rawFrameDataUrl: 骨格を描画する前の、解析対象フレームそのもの（ROI調整画面の背景にも使う）
  const [rawFrameDataUrl, setRawFrameDataUrl] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [roiRect, setRoiRect] = useState<RoiRectPixels | null>(null);

  const resetRoiState = () => {
    setRoiRect(null);
  };

  // 1. 撮影方向を選択
  const handleSelectDirection = (dir: SquatDirection) => {
    setDirection(dir);
    setPhase('upload');
  };

  // 2. 動画選択
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
    setDetectedKeypoints(null);
    setAnnotatedImageUrl(null);
    setSideResult(null);
    setFrontResult(null);
    setRawFrameDataUrl(null);
    setVideoDimensions(null);
    resetRoiState();
    setErrorMessage(null);
    setPhase('select_frame');

    // バックグラウンドでモデルを先行ロード
    getOrLoadRtmPoseSession().catch(() => {
      // 実際の推論時にエラーハンドリングするためここでは無視
    });
  };

  // 3. 「解析範囲を合わせる」→ 解析範囲(ROI)調整画面へ進む。
  //    スクワットは必ずROIを指定してから解析するため、ここではRTMPose推論を行わない。
  //    現在選択中の最下点フレームを静止画として切り出し、ROI調整画面へ渡すだけ。
  const handleGoToRoiAdjust = () => {
    if (!videoSrc) return;
    setErrorMessage(null);

    const videoEl = document.querySelector('video') as HTMLVideoElement | null;
    if (!videoEl || videoEl.videoWidth <= 0 || videoEl.videoHeight <= 0) {
      setErrorMessage('動画フレームの読み込みが完了していません。');
      return;
    }

    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;

    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = vw;
    rawCanvas.height = vh;
    const rawCtx = rawCanvas.getContext('2d');
    if (!rawCtx) {
      setErrorMessage('Canvas 2D コンテキストの取得に失敗しました。');
      return;
    }
    rawCtx.drawImage(videoEl, 0, 0, vw, vh);

    setRawFrameDataUrl(rawCanvas.toDataURL('image/jpeg', 0.92));
    setVideoDimensions({ width: vw, height: vh });
    setPhase('roi_adjust');
  };

  // 横撮影時の左右切替
  const handleToggleSide = () => {
    if (!detectedKeypoints || !sideResult) return;
    const nextSide = sideResult.sideUsed === 'right' ? 'left' : 'right';
    const newRes = calculateSquatSideAngles(toPixelKeypoints(detectedKeypoints), nextSide);
    setSideResult(newRes);
  };

  // 「解析範囲を調整」を開く（結果画面から再度開く場合。既存の解析結果・前回ROIはそのまま保持）
  const handleOpenRoiAdjust = () => {
    if (!rawFrameDataUrl || !videoDimensions) return;
    setErrorMessage(null);
    setPhase('roi_adjust');
  };

  // ROI調整をキャンセル: まだ一度も解析していなければフレーム選択へ、
  // 結果画面からの再調整であれば結果画面へ戻る。
  const handleCancelRoiAdjust = () => {
    setPhase(annotatedImageUrl ? 'result' : 'select_frame');
  };

  // ユーザーが指定した範囲でRTMPose解析する（唯一の推論エントリーポイント）。
  // 既存のRTMPoseセッションをそのまま再利用し、再ロードは発生しない。
  const handleConfirmRoi = async (rawRoi: RoiRectPixels) => {
    if (!rawFrameDataUrl || !videoDimensions) return;

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const { width: vw, height: vh } = videoDimensions;

      // 1. ユーザー指定の矩形へ安全マージンを追加（内部処理のみ、UIには見せない）
      const paddedRoi: RoiRect = applyRoiPadding(rawRoi, vw, vh);

      // 2. 元フレーム画像をROIのクロップ元として読み込む（video要素は既に破棄されているため）
      const rawImage = await loadImage(rawFrameDataUrl);

      // 3. ROI解析（クロップ→letterbox→RTMPose-s Halpe26→SimCCデコード→元動画pixel座標へ逆変換 まで内部で実施）
      const { keypoints } = await estimatePoseFromROI(rawImage, vw, vh, paddedRoi);

      const validPointsCount = keypoints.filter(
        (kp) => kp.score >= POSE_CONFIDENCE_THRESHOLD
      ).length;
      if (validPointsCount < 4) {
        throw new Error(
          '指定した範囲では姿勢を読み取れませんでした。範囲を調整してもう一度お試しください。'
        );
      }

      // 4. 元動画フレーム全体の上へ骨格を描画（ROI画像だけを表示しない）
      const annotated = await buildAnnotatedImage(keypoints, rawFrameDataUrl, vw, vh);

      setAnnotatedImageUrl(annotated);
      setDetectedKeypoints(keypoints);
      setRoiRect(rawRoi); // 次回の調整時の初期値として保持（中央位置へは戻さない）

      const anglePoints = toPixelKeypoints(keypoints);
      if (direction === 'side') {
        setSideResult(calculateSquatSideAngles(anglePoints));
      } else {
        setFrontResult(calculateSquatFrontAngles(anglePoints));
      }

      setPhase('result');
    } catch (err: unknown) {
      // 失敗時はROI調整画面に留まり、範囲を直して再試行できるようにする
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('姿勢の解析中にエラーが発生しました。');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 最初からやり直す
  const handleReset = () => {
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(null);
    setVideoFile(null);
    setCurrentFrame(0);
    setDetectedKeypoints(null);
    setAnnotatedImageUrl(null);
    setSideResult(null);
    setFrontResult(null);
    setRawFrameDataUrl(null);
    setVideoDimensions(null);
    resetRoiState();
    setErrorMessage(null);
    setPhase('direction');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. 撮影方向選択（大きな2択） */}
      {phase === 'direction' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="text-[11px] font-mono tracking-wider text-blue-600 font-bold uppercase">
              SQUAT ANGLE / STEP 1
            </div>
            <h2 className="text-xl font-black tracking-tight text-zinc-950">
              どこから撮影しましたか？
            </h2>
            <p className="text-xs text-zinc-500">
              撮影したアングルに合わせて適切な関節角度を算出します。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSelectDirection('side')}
              className="p-5 rounded-2xl border-2 border-zinc-200 hover:border-blue-600 bg-white hover:bg-blue-50/40 active:scale-[0.98] transition-all text-left space-y-3 cursor-pointer group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-base group-hover:bg-blue-600 group-hover:text-white transition-colors">
                横
              </div>
              <div className="space-y-1">
                <span className="text-base font-black text-zinc-950 block">
                  横から
                </span>
                <span className="text-xs text-zinc-500 block leading-tight">
                  膝・股関節の深さ、体幹・下腿の前傾を測定
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDirection('front')}
              className="p-5 rounded-2xl border-2 border-zinc-200 hover:border-blue-600 bg-white hover:bg-blue-50/40 active:scale-[0.98] transition-all text-left space-y-3 cursor-pointer group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-base group-hover:bg-blue-600 group-hover:text-white transition-colors">
                正面
              </div>
              <div className="space-y-1">
                <span className="text-base font-black text-zinc-950 block">
                  正面から
                </span>
                <span className="text-xs text-zinc-500 block leading-tight">
                  左右の膝角度差、肩・骨盤・体幹の傾きを測定
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 2. 撮影条件案内 & 動画アップロード */}
      {phase === 'upload' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-mono tracking-wider text-blue-600 font-bold uppercase">
                {direction === 'side' ? 'SQUAT / 横から撮影' : 'SQUAT / 正面から撮影'}
              </div>
              <h2 className="text-xl font-black tracking-tight text-zinc-950">
                スクワット動画を選択
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                resetRoiState();
                setPhase('direction');
              }}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-700 flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>アングル変更</span>
            </button>
          </div>

          {/* 撮影条件案内 */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">
              CONDITIONS / {direction === 'side' ? '真横から撮影' : '真正面から撮影'}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-100/80 px-3 py-2 rounded-lg font-medium text-zinc-800 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                <span>全身と足元を入れる</span>
              </div>
              <div className="bg-zinc-100/80 px-3 py-2 rounded-lg font-medium text-zinc-800 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                <span>カメラを固定（水平）</span>
              </div>
              <div className="bg-zinc-100/80 px-3 py-2 rounded-lg font-medium text-zinc-800 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                <span>選手を大きく1人だけ映す</span>
              </div>
              <div className="bg-zinc-100/80 px-3 py-2 rounded-lg font-medium text-zinc-800 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                <span>最下点がはっきり映る</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 px-1">
              30fps以上で使用できます。細かくコマを選ぶなら60fps以上がおすすめです。
            </p>

            {direction === 'front' && (
              <p className="text-[11px] text-zinc-400 px-1">
                ※左右の足を両方入れ、斜め前からの撮影は避けてください。
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-100">
            <FpsSelector
              fps={fps}
              onChangeFps={setFps}
              options={SQUAT_FPS_OPTIONS}
              showLowFpsWarning={false}
            />
            <p className="text-[11px] text-zinc-400 pt-1.5">
              ※撮影した動画のfpsを選ぶと、コマ送りが実際の1フレーム単位になります。
            </p>
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
        </div>
      )}

      {/* 3. 最下点フレーム選択画面 */}
      {phase === 'select_frame' && videoSrc && (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono tracking-wider text-blue-600 font-bold uppercase">
              STEP 2 / 最下点を選ぶ
            </div>
            <h2 className="text-base font-black text-zinc-950">
              一番深い位置を選んでください
            </h2>
            <p className="text-xs text-zinc-500">
              しゃがみが最も深くなったフレームをコマ送りで合わせます。
            </p>
          </div>

          <VideoPlayer
            videoSrc={videoSrc}
            videoFile={videoFile}
            fps={fps}
            currentFrame={currentFrame}
            onFrameChange={setCurrentFrame}
            overlay={
              detectedKeypoints ? (
                <SquatSkeletonOverlay keypoints={detectedKeypoints} />
              ) : undefined
            }
          >
            <div className="space-y-2.5 pt-2 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">
                    BOTTOM POSITION
                  </span>
                  <p className="text-sm font-black text-zinc-950">
                    最下点のフレーム
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    CURRENT
                  </span>
                  <span className="text-sm font-mono font-black text-zinc-900">
                    {currentFrame} F
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoToRoiAdjust}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>解析範囲を合わせる</span>
              </button>
            </div>
          </VideoPlayer>

          {/* fps設定（コマ送り量を撮影fpsへ追従させる） */}
          <div className="px-1 pt-1">
            <FpsSelector
              fps={fps}
              onChangeFps={setFps}
              options={SQUAT_FPS_OPTIONS}
              showLowFpsWarning={false}
            />
          </div>
        </div>
      )}

      {/* 4. 結果画面 */}
      {phase === 'result' && (
        <SquatResultCard
          direction={direction}
          annotatedImageUrl={annotatedImageUrl}
          sideResult={sideResult}
          frontResult={frontResult}
          onToggleSide={direction === 'side' ? handleToggleSide : undefined}
          onAdjustRoi={rawFrameDataUrl ? handleOpenRoiAdjust : undefined}
          onReset={handleReset}
        />
      )}

      {/* 5. 解析範囲の調整画面（静止画 + 人物範囲の枠のみのシンプルな構成）
          スクワットでは必ずこの画面を経てから解析する。結果画面からの再調整にも使う。 */}
      {phase === 'roi_adjust' && rawFrameDataUrl && videoDimensions && (
        <RoiAdjustPanel
          imageUrl={rawFrameDataUrl}
          naturalWidth={videoDimensions.width}
          naturalHeight={videoDimensions.height}
          initialRoi={roiRect}
          onConfirm={handleConfirmRoi}
          onCancel={handleCancelRoiAdjust}
          isSubmitting={isAnalyzing}
        />
      )}
    </div>
  );
};
