/**
 * RTMPose 推論サービス (onnxruntime-web)
 * - モデル: RTMPose-s / Halpe26 (26 keypoints) / 256x192 / SimCC (OpenMMLab公式)
 * - 完全クライアントサイド推論
 * - シングルスレッド WASM で iPhone Safari を含む全ブラウザに確実対応
 * - アスペクト比維持のレターボックス前処理
 * - SimCC デコードによる高精度キーポイント抽出
 * - 通常解析（動画フレーム全体）に加え、人物ROI（範囲指定）による再解析にも対応
 */

// WASM 専用ビルドを明示的に使用する。
// 既定の 'onnxruntime-web' は WebGPU/WebNN を含む JSEP 版 WASM (約26.5MB) を要求し、
// Cloudflare Pages の単一ファイル 25MiB 制限を超えるため。本アプリは WASM EP のみを使用する。
import * as ort from 'onnxruntime-web/wasm';
import { Keypoint, RoiRect, roiLocalToVideoPixel } from './squatCalculations';

// WASM の設定（ローカルの同一オリジンからロード & シングルスレッド）
ort.env.wasm.numThreads = 1;
// wasmPaths は "prefix文字列" ではなく .wasm バイナリのみを明示的に override する。
// prefix文字列（例: '/ort-wasm/'）を指定すると、onnxruntime-web は .mjs も
// 同じ prefix から dynamic import しようとする。この .mjs は public/ 配下の
// 静的ファイルであり、Vite dev server は「public 配下は source import 禁止」
// のためこれを弾く（本番ビルドでは静的コピーなので問題は顕在化しない）。
// .wasm のみを override すると、onnxruntime-web は .mjs 側を自身のバンドルに
// 埋め込まれたモジュール（同一オリジンの index-*.js 内）から読み込み、
// public 配下の .mjs は一切要求しなくなる（onnxruntime-web 1.29.0 の
// importWasmModule() 実装に基づく挙動）。
ort.env.wasm.wasmPaths = {
  wasm: new URL('/ort-wasm/ort-wasm-simd-threaded.wasm', window.location.origin).href,
};

const MODEL_PATH = '/models/rtmpose-s.onnx';
const INPUT_WIDTH = 192;
const INPUT_HEIGHT = 256;
const SIMCC_SPLIT_RATIO = 2.0;

// ImageNet RGB 正規化パラメータ
const MEAN = [123.675, 116.28, 103.53];
const STD = [58.395, 57.12, 57.375];

export interface DetectedKeypoint extends Keypoint {
  pixelX: number; // 元画像ピクセル座標 X
  pixelY: number; // 元画像ピクセル座標 Y
}

export interface PoseEstimationResult {
  keypoints: DetectedKeypoint[];
  inferenceTimeMs: number;
}

// estimatePoseFromMedia / estimatePoseFromROI どちらの入力にもなり得るソース種別
type PoseSource = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;

// RoiRect / ROI_PADDING_* / applyRoiPadding / roiLocalToVideoPixel は
// DOM非依存の純粋な幾何計算のため squatCalculations.ts 側で定義・エクスポートする
// （テスト実行環境に window が存在せず、onnxruntime-web を読み込む本ファイルを
//   直接importできないため。呼び出し側は '../utils/squatCalculations' から
//   RoiRect / applyRoiPadding を import すること）。
export type { RoiRect } from './squatCalculations';

// セッションのシングルトンキャッシュと推論統計
let cachedSession: ort.InferenceSession | null = null;
let isInitializing = false;
let initPromise: Promise<ort.InferenceSession> | null = null;
let inferenceCount = 0;

/**
 * RTMPose モデルの事前初期化
 */
export async function getOrLoadRtmPoseSession(): Promise<ort.InferenceSession> {
  if (cachedSession) {
    return cachedSession;
  }
  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      const loadStart = performance.now();
      const session = await ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      const loadDuration = Math.round(performance.now() - loadStart);
      cachedSession = session;
      console.log(`[RTMPose] モデル初回ロード完了: ${loadDuration} ms`);
      return session;
    } catch (err) {
      console.error('[RTMPose] モデルロード失敗:', err);
      throw err;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * 前処理（letterbox）・推論・SimCCデコードの共通コア。
 * 戻り値のキーポイントは source のローカル座標系（0..srcWidth, 0..srcHeight）。
 * - 通常解析: source = 動画フレーム全体 → ローカル座標がそのまま元動画座標
 * - ROI解析: source = ROIクロップ画像 → 呼び出し側で元動画座標へ変換が必要
 */
async function runInference(
  source: PoseSource,
  srcWidth: number,
  srcHeight: number
): Promise<PoseEstimationResult> {
  const session = await getOrLoadRtmPoseSession();
  const startTime = performance.now();

  // 1. 前処理用の一時Canvas（192x256）を作成
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_WIDTH;
  canvas.height = INPUT_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D コンテキストの取得に失敗しました。');
  }

  // 背景を黒でクリア
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, INPUT_WIDTH, INPUT_HEIGHT);

  // アスペクト比を維持したレターボックス計算
  const scale = Math.min(INPUT_WIDTH / srcWidth, INPUT_HEIGHT / srcHeight);
  const scaledW = srcWidth * scale;
  const scaledH = srcHeight * scale;
  const padX = (INPUT_WIDTH - scaledW) / 2;
  const padY = (INPUT_HEIGHT - scaledH) / 2;

  // 中央に配置して描画
  ctx.drawImage(source, padX, padY, scaledW, scaledH);

  // 2. ピクセルデータの取得と正規化
  const imageData = ctx.getImageData(0, 0, INPUT_WIDTH, INPUT_HEIGHT);
  const { data } = imageData; // RGBA 配列

  // NCHW 形式の Float32Array: [1, 3, 256, 192]
  const float32Data = new Float32Array(1 * 3 * INPUT_HEIGHT * INPUT_WIDTH);
  const planeSize = INPUT_HEIGHT * INPUT_WIDTH;

  for (let y = 0; y < INPUT_HEIGHT; y++) {
    for (let x = 0; x < INPUT_WIDTH; x++) {
      const srcIdx = (y * INPUT_WIDTH + x) * 4;
      const dstIdx = y * INPUT_WIDTH + x;

      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      // RGB 順で (pixel - mean) / std
      float32Data[dstIdx] = (r - MEAN[0]) / STD[0];
      float32Data[planeSize + dstIdx] = (g - MEAN[1]) / STD[1];
      float32Data[planeSize * 2 + dstIdx] = (b - MEAN[2]) / STD[2];
    }
  }

  // 3. ONNX テンソルの構築
  const inputTensor = new ort.Tensor('float32', float32Data, [
    1,
    3,
    INPUT_HEIGHT,
    INPUT_WIDTH,
  ]);

  // 4. 推論実行
  const outputMap = await session.run({ input: inputTensor });
  const simccX = outputMap.simcc_x;
  const simccY = outputMap.simcc_y;

  if (!simccX || !simccY) {
    throw new Error('モデルの出力テンソルを取得できませんでした。');
  }

  const xData = simccX.data as Float32Array;
  const yData = simccY.data as Float32Array;

  // simcc_x: [1, 26, 384], simcc_y: [1, 26, 512] (Halpe26)
  const numKeypoints = 26;
  const xDim = simccX.dims[2]; // 384
  const yDim = simccY.dims[2]; // 512

  // 5. SimCC デコードと source ローカル座標への逆変換
  const keypoints: DetectedKeypoint[] = [];

  for (let k = 0; k < numKeypoints; k++) {
    const xOffset = k * xDim;
    let maxXVal = -Infinity;
    let maxXIdx = 0;
    for (let i = 0; i < xDim; i++) {
      const val = xData[xOffset + i];
      if (val > maxXVal) {
        maxXVal = val;
        maxXIdx = i;
      }
    }

    const yOffset = k * yDim;
    let maxYVal = -Infinity;
    let maxYIdx = 0;
    for (let i = 0; i < yDim; i++) {
      const val = yData[yOffset + i];
      if (val > maxYVal) {
        maxYVal = val;
        maxYIdx = i;
      }
    }

    // 信頼度スコア (X と Y の最大値の平均)
    const score = Math.max(0, Math.min(1, (maxXVal + maxYVal) / 2));

    // 192x256 座標系におけるキーポイント
    const kptX192 = maxXIdx / SIMCC_SPLIT_RATIO;
    const kptY256 = maxYIdx / SIMCC_SPLIT_RATIO;

    // レターボックスの逆変換で source のローカルピクセル座標へ
    const pixelX = Math.max(0, Math.min(srcWidth, (kptX192 - padX) / scale));
    const pixelY = Math.max(0, Math.min(srcHeight, (kptY256 - padY) / scale));

    // 0〜100 (%) の正規化座標（source ローカル基準）
    const normX = (pixelX / srcWidth) * 100;
    const normY = (pixelY / srcHeight) * 100;

    keypoints.push({
      x: normX,
      y: normY,
      score: Math.round(score * 1000) / 1000,
      pixelX: Math.round(pixelX * 10) / 10,
      pixelY: Math.round(pixelY * 10) / 10,
    });
  }

  inferenceCount++;
  const inferenceTimeMs = Math.round(performance.now() - startTime);

  return { keypoints, inferenceTimeMs };
}

/**
 * 骨格が元動画の身体と一致しているかを目視 + 数値で照合するためのデバッグ出力。
 * 本番UIには出さず開発者ツールで確認可能。
 */
function logKeypointDebugTable(
  keypoints: DetectedKeypoint[],
  videoWidth: number,
  videoHeight: number
): void {
  const debugRows: Record<string, { conf: number; x: number; y: number }> = {};
  ([
    ['左肩', 5],
    ['右肩', 6],
    ['左股関節', 11],
    ['右股関節', 12],
    ['左膝', 13],
    ['右膝', 14],
    ['左足首', 15],
    ['右足首', 16],
    ['左母趾', 20],
    ['右母趾', 21],
    ['左小趾', 22],
    ['右小趾', 23],
    ['左かかと', 24],
    ['右かかと', 25],
  ] as [string, number][]).forEach(([label, idx]) => {
    const kp = keypoints[idx];
    if (kp) {
      debugRows[label] = { conf: kp.score, x: kp.pixelX, y: kp.pixelY };
    }
  });
  console.log(
    `[RTMPose] 主要キーポイント (信頼度 / 元動画ピクセル座標 ${videoWidth}x${videoHeight}):`
  );
  console.table(debugRows);
}

/**
 * HTMLCanvasElement または HTMLVideoElement から1フレームを取得し、
 * RTMPose で姿勢推定を実行する（通常解析：動画フレーム全体を入力）
 */
export async function estimatePoseFromMedia(
  source: HTMLVideoElement | HTMLCanvasElement,
  videoWidth: number,
  videoHeight: number
): Promise<PoseEstimationResult> {
  if (videoWidth <= 0 || videoHeight <= 0) {
    throw new Error('動画の解像度情報が無効です。');
  }

  // 通常解析では source = 動画フレーム全体のため、ローカル座標がそのまま元動画座標になる
  const { keypoints, inferenceTimeMs } = await runInference(source, videoWidth, videoHeight);

  console.log(`[RTMPose] 推論完了 (#${inferenceCount}): ${inferenceTimeMs} ms`);
  logKeypointDebugTable(keypoints, videoWidth, videoHeight);

  return { keypoints, inferenceTimeMs };
}

/**
 * 人物ROI（範囲指定）を使ってRTMPoseで姿勢推定を再実行する。
 * 人物が動画内で小さく、通常解析ではconfidenceが不足する場合の救済手段。
 *
 * 処理の流れ:
 *   ROI(元動画pixel座標, 既にpadding適用・クランプ済み)
 *   → 1:1クロップ（歪めない）
 *   → 既存と同一のletterbox前処理（アスペクト比維持）
 *   → 256x192 → RTMPose-s Halpe26 → SimCCデコード
 *   → ROIローカル座標 → 元動画pixel座標へ逆変換
 *
 * モデルセッションは getOrLoadRtmPoseSession() のキャッシュをそのまま再利用するため、
 * 再ロードは発生しない。
 *
 * @param roi 安全マージン適用・クランプ済みのROI（applyRoiPadding の戻り値を渡すこと）
 */
export async function estimatePoseFromROI(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  videoWidth: number,
  videoHeight: number,
  roi: RoiRect
): Promise<PoseEstimationResult> {
  if (videoWidth <= 0 || videoHeight <= 0) {
    throw new Error('動画の解像度情報が無効です。');
  }
  if (roi.width <= 0 || roi.height <= 0) {
    throw new Error('解析範囲が無効です。');
  }

  // 1. ROI crop（1:1、歪めない）
  const roiWidthPx = Math.max(1, Math.round(roi.width));
  const roiHeightPx = Math.max(1, Math.round(roi.height));
  const roiCanvas = document.createElement('canvas');
  roiCanvas.width = roiWidthPx;
  roiCanvas.height = roiHeightPx;
  const roiCtx = roiCanvas.getContext('2d');
  if (!roiCtx) {
    throw new Error('Canvas 2D コンテキストの取得に失敗しました。');
  }
  roiCtx.drawImage(
    source,
    roi.x,
    roi.y,
    roi.width,
    roi.height,
    0,
    0,
    roiWidthPx,
    roiHeightPx
  );

  // 2. 既存と同一のletterbox前処理・SimCCデコード（ROI画像内のローカル座標で結果が返る）
  const { keypoints: localKeypoints, inferenceTimeMs } = await runInference(
    roiCanvas,
    roiWidthPx,
    roiHeightPx
  );

  // 3. ROIローカル座標 → 元動画pixel座標へ逆変換。
  //    角度計算・骨格描画にはこの pixelX / pixelY（元動画座標）を使用する。
  const keypoints: DetectedKeypoint[] = localKeypoints.map((kp) => {
    const { pixelX, pixelY } = roiLocalToVideoPixel(kp.pixelX, kp.pixelY, roi);
    return {
      score: kp.score,
      pixelX,
      pixelY,
      x: (pixelX / videoWidth) * 100,
      y: (pixelY / videoHeight) * 100,
    };
  });

  console.log(
    `[RTMPose] ROI再解析 完了 (#${inferenceCount}): ${inferenceTimeMs} ms ` +
      `(解析範囲: ${roiWidthPx}x${roiHeightPx} @ (${Math.round(roi.x)}, ${Math.round(roi.y)}))`
  );
  logKeypointDebugTable(keypoints, videoWidth, videoHeight);

  return { keypoints, inferenceTimeMs };
}
