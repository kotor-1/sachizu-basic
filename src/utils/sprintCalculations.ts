/**
 * 10mスプリント計算ロジック
 */

export interface SprintContactInput {
  landingFrame: number; // 着地フレーム
  takeoffFrame: number; // 離地フレーム
}

export interface SprintStepDetail {
  stepNumber: number;
  landingFrame: number;
  takeoffFrame: number;
  contactTimeSeconds: number;
  flightTimeSeconds: number | null; // 次の着地までの滞空時間
  stepTimeSeconds: number | null;   // 次の着地までのステップ時間
  isValidInInterval: boolean;       // 0m〜10m区間内に完全に収まっているか
}

export interface SprintResult {
  fps: number;
  startFrame: number; // 0m通過フレーム
  endFrame: number;   // 10m通過フレーム
  timeSeconds: number; // 10mタイム [s]
  averageSpeedMps: number; // 平均速度 [m/s]
  direction: 'left_to_right' | 'right_to_left';
  allSteps: SprintStepDetail[];
  validSteps: SprintStepDetail[]; // 区間内完全接地
  averageContactTimeSeconds: number | null; // 平均接地時間 [s]
  averageFlightTimeSeconds: number | null;  // 平均滞空時間 [s]
  pitchStepsPerSecond: number | null;       // ピッチ [steps/s]
}

/**
 * 10mスプリントの計算
 * @param startFrame 0m通過フレーム（胸が0mラインを越えた瞬間）
 * @param endFrame 10m通過フレーム（胸が10mラインを越えた瞬間）
 * @param fps フレームレート
 * @param contacts 登録された接地イベント一覧
 * @param line0X 0mラインの画面上X位置（0〜100）
 * @param line10X 10mラインの画面上X位置（0〜100）
 */
export function calculateSprint(
  startFrame: number,
  endFrame: number,
  fps: number,
  contacts: SprintContactInput[] = [],
  line0X: number = 20,
  line10X: number = 80
): SprintResult {
  if (fps <= 0) {
    throw new Error('fpsは正の数値を指定してください');
  }
  if (endFrame <= startFrame) {
    throw new Error('10m通過フレームは0m通過フレームより後を指定してください');
  }

  // 走行方向判定
  const direction: 'left_to_right' | 'right_to_left' =
    line0X <= line10X ? 'left_to_right' : 'right_to_left';

  // 10mタイム [s]
  const frameDiff = endFrame - startFrame;
  const timeSeconds = frameDiff / fps;

  // 平均速度 [m/s] (10m固定)
  const averageSpeedMps = 10 / timeSeconds;

  // 接地イベントの計算
  const allSteps: SprintStepDetail[] = contacts.map((c, idx) => {
    if (c.takeoffFrame <= c.landingFrame) {
      throw new Error(`接地${idx + 1}の離地フレームは着地フレームより後を指定してください`);
    }
    const contactFrames = c.takeoffFrame - c.landingFrame;
    const contactTimeSeconds = contactFrames / fps;

    // 0m〜10m区間内に完全に収まっているか判定（着地・離地の双方が区間内）
    const isValidInInterval = c.landingFrame >= startFrame && c.takeoffFrame <= endFrame;

    // 次のステップが存在する場合の滞空時間・ステップ時間
    let flightTimeSeconds: number | null = null;
    let stepTimeSeconds: number | null = null;
    if (idx < contacts.length - 1) {
      const nextContact = contacts[idx + 1];
      if (nextContact.landingFrame > c.takeoffFrame) {
        flightTimeSeconds = (nextContact.landingFrame - c.takeoffFrame) / fps;
      }
      if (nextContact.landingFrame > c.landingFrame) {
        stepTimeSeconds = (nextContact.landingFrame - c.landingFrame) / fps;
      }
    }

    return {
      stepNumber: idx + 1,
      landingFrame: c.landingFrame,
      takeoffFrame: c.takeoffFrame,
      contactTimeSeconds,
      flightTimeSeconds,
      stepTimeSeconds,
      isValidInInterval,
    };
  });

  // 区間内完全接地のみを抽出
  const validSteps = allSteps.filter((s) => s.isValidInInterval);

  // 1. 平均接地時間
  let averageContactTimeSeconds: number | null = null;
  if (validSteps.length > 0) {
    const totalContactTime = validSteps.reduce((sum, s) => sum + s.contactTimeSeconds, 0);
    averageContactTimeSeconds = totalContactTime / validSteps.length;
  }

  // 2. 平均滞空時間（有効な区間内連続ステップ間の滞空時間のみ集計）
  let averageFlightTimeSeconds: number | null = null;
  const validFlightTimes: number[] = [];
  for (let i = 0; i < validSteps.length - 1; i++) {
    const current = validSteps[i];
    const next = validSteps[i + 1];
    if (next.landingFrame > current.takeoffFrame) {
      validFlightTimes.push((next.landingFrame - current.takeoffFrame) / fps);
    }
  }
  if (validFlightTimes.length > 0) {
    const totalFlight = validFlightTimes.reduce((sum, f) => sum + f, 0);
    averageFlightTimeSeconds = totalFlight / validFlightTimes.length;
  }

  // 3. ピッチ計算（連続する有効着地イベントを使用）
  // N個の着地がある場合、ステップ間隔は N - 1 個
  // stepFrequency = (N - 1) / ((lastLandingFrame - firstLandingFrame) / fps)
  let pitchStepsPerSecond: number | null = null;
  const N = validSteps.length;
  if (N >= 2) {
    const firstLanding = validSteps[0].landingFrame;
    const lastLanding = validSteps[N - 1].landingFrame;
    const durationSeconds = (lastLanding - firstLanding) / fps;
    if (durationSeconds > 0) {
      pitchStepsPerSecond = (N - 1) / durationSeconds;
    }
  }

  return {
    fps,
    startFrame,
    endFrame,
    timeSeconds,
    averageSpeedMps,
    direction,
    allSteps,
    validSteps,
    averageContactTimeSeconds,
    averageFlightTimeSeconds,
    pitchStepsPerSecond,
  };
}
