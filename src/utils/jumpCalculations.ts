import { GRAVITY } from '../config';

export interface CMJResult {
  takeoffFrame: number;
  landingFrame: number;
  fps: number;
  flightTimeSeconds: number; // 滞空時間 [s]
  jumpHeightCm: number;      // ジャンプ高 [cm]
  jumpHeightMeters: number;  // ジャンプ高 [m]
}

export interface RJSingleJumpResult {
  jumpNumber: number;        // 1, 2, 3
  landingFrame: number;      // 着地フレーム
  takeoffFrame: number;      // 離地フレーム
  nextLandingFrame: number;  // 次の着地フレーム
  contactTimeSeconds: number;// 接地時間 [s]
  flightTimeSeconds: number; // 滞空時間 [s]
  jumpHeightCm: number;      // 跳躍高 [cm]
  jumpHeightMeters: number;  // 跳躍高 [m]
  rjIndex: number;           // RJ-index (跳躍高[m] / 接地時間[s])
}

export interface RJResult {
  fps: number;
  jumps: RJSingleJumpResult[];
  averageRjIndex: number;
  averageJumpHeightCm: number;
  averageContactTimeSeconds: number;
  averageFlightTimeSeconds: number;
}

/**
 * CMJ（カウンター・ムーヴメント・ジャンプ）の計算
 * @param takeoffFrame 離地フレーム番号
 * @param landingFrame 着地フレーム番号
 * @param fps 動画のフレームレート
 */
export function calculateCMJ(takeoffFrame: number, landingFrame: number, fps: number): CMJResult {
  if (fps <= 0) {
    throw new Error('fpsは正の数値を指定してください');
  }
  if (landingFrame <= takeoffFrame) {
    throw new Error('着地フレームは離地フレームより後を指定してください');
  }

  const frameDiff = landingFrame - takeoffFrame;
  const flightTimeSeconds = frameDiff / fps;
  const jumpHeightMeters = (GRAVITY * Math.pow(flightTimeSeconds, 2)) / 8;
  const jumpHeightCm = jumpHeightMeters * 100;

  return {
    takeoffFrame,
    landingFrame,
    fps,
    flightTimeSeconds,
    jumpHeightCm,
    jumpHeightMeters,
  };
}

export interface RJJumpInput {
  landingFrame: number;
  takeoffFrame: number;
  nextLandingFrame: number;
}

/**
 * 1回のリバウンドジャンプの計算
 */
export function calculateSingleRJ(
  jumpNumber: number,
  landingFrame: number,
  takeoffFrame: number,
  nextLandingFrame: number,
  fps: number
): RJSingleJumpResult {
  if (fps <= 0) {
    throw new Error('fpsは正の数値を指定してください');
  }
  if (takeoffFrame <= landingFrame) {
    throw new Error('離地フレームは着地フレームより後を指定してください');
  }
  if (nextLandingFrame <= takeoffFrame) {
    throw new Error('次の着地フレームは離地フレームより後を指定してください');
  }

  const contactFrames = takeoffFrame - landingFrame;
  const contactTimeSeconds = contactFrames / fps;

  const flightFrames = nextLandingFrame - takeoffFrame;
  const flightTimeSeconds = flightFrames / fps;

  const jumpHeightMeters = (GRAVITY * Math.pow(flightTimeSeconds, 2)) / 8;
  const jumpHeightCm = jumpHeightMeters * 100;

  // 接地時間が極めて0に近い場合のゼロ除算防止
  const rjIndex = contactTimeSeconds > 0 ? jumpHeightMeters / contactTimeSeconds : 0;

  return {
    jumpNumber,
    landingFrame,
    takeoffFrame,
    nextLandingFrame,
    contactTimeSeconds,
    flightTimeSeconds,
    jumpHeightCm,
    jumpHeightMeters,
    rjIndex,
  };
}

/**
 * RJ（連続リバウンドジャンプ・最後の3回）の計算
 * @param jumpInputs 3回分のフレーム指定
 * @param fps 動画のフレームレート
 */
export function calculateRJ(jumpInputs: RJJumpInput[], fps: number): RJResult {
  if (!jumpInputs || jumpInputs.length !== 3) {
    throw new Error('RJ測定には3回分のジャンプが必要です');
  }

  const jumps = jumpInputs.map((input, index) =>
    calculateSingleRJ(index + 1, input.landingFrame, input.takeoffFrame, input.nextLandingFrame, fps)
  );

  const totalRjIndex = jumps.reduce((sum, j) => sum + j.rjIndex, 0);
  const totalJumpHeightCm = jumps.reduce((sum, j) => sum + j.jumpHeightCm, 0);
  const totalContactTime = jumps.reduce((sum, j) => sum + j.contactTimeSeconds, 0);
  const totalFlightTime = jumps.reduce((sum, j) => sum + j.flightTimeSeconds, 0);

  return {
    fps,
    jumps,
    averageRjIndex: totalRjIndex / jumps.length,
    averageJumpHeightCm: totalJumpHeightCm / jumps.length,
    averageContactTimeSeconds: totalContactTime / jumps.length,
    averageFlightTimeSeconds: totalFlightTime / jumps.length,
  };
}

export interface RJ7Points {
  landing1: number;
  takeoff1: number;
  landing2: number;
  takeoff2: number;
  landing3: number;
  takeoff3: number;
  landing4: number; // 最後の着地
}

/**
 * 7点イベントフレームからRJを計算
 * 1. 1回目の着地
 * 2. 1回目の離地
 * 3. 2回目の着地
 * 4. 2回目の離地
 * 5. 3回目の着地
 * 6. 3回目の離地
 * 7. 3回目の次の着地（最後の着地）
 */
export function calculateRJFrom7Points(points: RJ7Points, fps: number): RJResult {
  const { landing1, takeoff1, landing2, takeoff2, landing3, takeoff3, landing4 } = points;

  if (
    !(
      landing1 < takeoff1 &&
      takeoff1 < landing2 &&
      landing2 < takeoff2 &&
      takeoff2 < landing3 &&
      landing3 < takeoff3 &&
      takeoff3 < landing4
    )
  ) {
    throw new Error('各フレームは時系列順（着地1 < 離地1 < 着地2 < 離地2 < 着地3 < 離地3 < 最後の着地）で指定してください');
  }

  const jumpInputs: RJJumpInput[] = [
    { landingFrame: landing1, takeoffFrame: takeoff1, nextLandingFrame: landing2 },
    { landingFrame: landing2, takeoffFrame: takeoff2, nextLandingFrame: landing3 },
    { landingFrame: landing3, takeoffFrame: takeoff3, nextLandingFrame: landing4 },
  ];

  return calculateRJ(jumpInputs, fps);
}

