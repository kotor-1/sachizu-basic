/**
 * スクワット角度計算ユーティリティ
 * - ベクトルの内積による3点角度計算 (0〜180度)
 * - 鉛直線・水平線との角度計算
 * - 左右の信頼度比較と自動選択
 * - 横・正面の各指標算出
 */

export interface Keypoint {
  x: number; // 0〜1 または ピクセル座標
  y: number; // 0〜1 または ピクセル座標
  score: number; // 0〜1
}

// 人物ROI（範囲指定）。元動画のpixel座標系（0..videoWidth, 0..videoHeight）。
export interface RoiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ROI再解析時に内部で追加する安全マージン。
// ユーザーが指定する矩形は身体の端（頭頂・足先・肩幅）をわずかに切ってしまうことが
// あるため、タイトクロップのまま使わずマージンを加える。
// 値は RTMPose-s / RTMPose-m 比較検証および ROI 技術検証で確認済みの範囲
// （上下15% / 左右15〜20%）に基づく。
export const ROI_PADDING_VERTICAL = 0.15;
export const ROI_PADDING_HORIZONTAL = 0.2;

/**
 * ユーザーが指定したROI（元動画pixel座標系）に安全マージンを追加し、
 * 動画範囲内へクランプする。
 */
export function applyRoiPadding(
  roi: RoiRect,
  videoWidth: number,
  videoHeight: number
): RoiRect {
  const padX = roi.width * ROI_PADDING_HORIZONTAL;
  const padY = roi.height * ROI_PADDING_VERTICAL;

  const x0 = Math.max(0, roi.x - padX);
  const y0 = Math.max(0, roi.y - padY);
  const x1 = Math.min(videoWidth, roi.x + roi.width + padX);
  const y1 = Math.min(videoHeight, roi.y + roi.height + padY);

  return {
    x: x0,
    y: y0,
    width: Math.max(1, x1 - x0),
    height: Math.max(1, y1 - y0),
  };
}

/**
 * ROIクロップ画像内のローカルpixel座標を、元動画のpixel座標へ変換する。
 * 角度計算・骨格描画は必ずこの変換後の座標（元動画座標系）を使用する。
 */
export function roiLocalToVideoPixel(
  localX: number,
  localY: number,
  roi: RoiRect
): { pixelX: number; pixelY: number } {
  return {
    pixelX: Math.round((roi.x + localX) * 10) / 10,
    pixelY: Math.round((roi.y + localY) * 10) / 10,
  };
}

// RTMPose-s Halpe26 キーポイントのインデックス定義
// 0〜16 は COCO17 と同一の並び順（OpenMMLab公式 configs/_base_/datasets/halpe26.py で検証済み）。
// 17〜25 が Halpe26 で追加される点（head/neck/hip中心/足部6点）。
export const COCO_KEYPOINTS = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
  HEAD: 17,
  NECK: 18,
  HIP_CENTER: 19,
  LEFT_BIG_TOE: 20,
  RIGHT_BIG_TOE: 21,
  LEFT_SMALL_TOE: 22,
  RIGHT_SMALL_TOE: 23,
  LEFT_HEEL: 24,
  RIGHT_HEEL: 25,
} as const;

// 骨格接続定義（肩、肘、手首、股関節、膝、足首、足部）
export const SKELETON_CONNECTIONS: [number, number][] = [
  // 体幹
  [COCO_KEYPOINTS.LEFT_SHOULDER, COCO_KEYPOINTS.RIGHT_SHOULDER],
  [COCO_KEYPOINTS.LEFT_HIP, COCO_KEYPOINTS.RIGHT_HIP],
  [COCO_KEYPOINTS.LEFT_SHOULDER, COCO_KEYPOINTS.LEFT_HIP],
  [COCO_KEYPOINTS.RIGHT_SHOULDER, COCO_KEYPOINTS.RIGHT_HIP],
  // 左腕
  [COCO_KEYPOINTS.LEFT_SHOULDER, COCO_KEYPOINTS.LEFT_ELBOW],
  [COCO_KEYPOINTS.LEFT_ELBOW, COCO_KEYPOINTS.LEFT_WRIST],
  // 右腕
  [COCO_KEYPOINTS.RIGHT_SHOULDER, COCO_KEYPOINTS.RIGHT_ELBOW],
  [COCO_KEYPOINTS.RIGHT_ELBOW, COCO_KEYPOINTS.RIGHT_WRIST],
  // 左脚
  [COCO_KEYPOINTS.LEFT_HIP, COCO_KEYPOINTS.LEFT_KNEE],
  [COCO_KEYPOINTS.LEFT_KNEE, COCO_KEYPOINTS.LEFT_ANKLE],
  // 右脚
  [COCO_KEYPOINTS.RIGHT_HIP, COCO_KEYPOINTS.RIGHT_KNEE],
  [COCO_KEYPOINTS.RIGHT_KNEE, COCO_KEYPOINTS.RIGHT_ANKLE],
];

// 足部の骨格接続定義（足首 → 母趾/小趾/かかと）。
// スクワット結果画像（SquatFlow の合成Canvas）専用の追加描画に用いる。
// 動画上のリアルタイムオーバーレイ（SquatSkeletonOverlay, aspect比の課題は別対応予定）
// には影響させないため、SKELETON_CONNECTIONS とは別定数として分離する。
export const FOOT_SKELETON_CONNECTIONS: [number, number][] = [
  // 左足部
  [COCO_KEYPOINTS.LEFT_ANKLE, COCO_KEYPOINTS.LEFT_BIG_TOE],
  [COCO_KEYPOINTS.LEFT_ANKLE, COCO_KEYPOINTS.LEFT_SMALL_TOE],
  [COCO_KEYPOINTS.LEFT_ANKLE, COCO_KEYPOINTS.LEFT_HEEL],
  // 右足部
  [COCO_KEYPOINTS.RIGHT_ANKLE, COCO_KEYPOINTS.RIGHT_BIG_TOE],
  [COCO_KEYPOINTS.RIGHT_ANKLE, COCO_KEYPOINTS.RIGHT_SMALL_TOE],
  [COCO_KEYPOINTS.RIGHT_ANKLE, COCO_KEYPOINTS.RIGHT_HEEL],
];

// 信頼度閾値（この閾値未満の点は角度計算不可とする）
export const POSE_CONFIDENCE_THRESHOLD = 0.4;

/**
 * 3点 A-B-C の頂点 B における内角（0〜180度）を計算する
 * @param pointA 端点A
 * @param vertexB 頂点B
 * @param pointC 端点C
 * @param minScore 最小信頼度
 * @returns 角度（度、0〜180）、信頼度不足や計算不能時は null
 */
export function calculate3PointAngle(
  pointA: Keypoint | null | undefined,
  vertexB: Keypoint | null | undefined,
  pointC: Keypoint | null | undefined,
  minScore: number = POSE_CONFIDENCE_THRESHOLD
): number | null {
  if (!pointA || !vertexB || !pointC) return null;
  if (
    pointA.score < minScore ||
    vertexB.score < minScore ||
    pointC.score < minScore
  ) {
    return null;
  }

  // ベクトル BA = A - B, ベクトル BC = C - B
  const bax = pointA.x - vertexB.x;
  const bay = pointA.y - vertexB.y;
  const bcx = pointC.x - vertexB.x;
  const bcy = pointC.y - vertexB.y;

  const lenBA = Math.hypot(bax, bay);
  const lenBC = Math.hypot(bcx, bcy);

  if (lenBA < 1e-6 || lenBC < 1e-6) {
    return null;
  }

  // 内積
  const dot = bax * bcx + bay * bcy;
  // コサインのクランプ（-1〜1）
  const cosTheta = Math.max(-1, Math.min(1, dot / (lenBA * lenBC)));
  const angleRad = Math.acos(cosTheta);
  const angleDeg = (angleRad * 180) / Math.PI;

  return Math.round(angleDeg * 10) / 10;
}

/**
 * 線分 (from -> to) と画面鉛直線（下向き）との角度（0〜180度）を計算する
 * 鉛直下向きベクトル = (0, 1)
 */
export function calculateVerticalAngle(
  pointFrom: Keypoint | null | undefined,
  pointTo: Keypoint | null | undefined,
  minScore: number = POSE_CONFIDENCE_THRESHOLD
): number | null {
  if (!pointFrom || !pointTo) return null;
  if (pointFrom.score < minScore || pointTo.score < minScore) {
    return null;
  }

  const vx = pointTo.x - pointFrom.x;
  const vy = pointTo.y - pointFrom.y;
  const len = Math.hypot(vx, vy);

  if (len < 1e-6) return null;

  // 鉛直下向き (0, 1) との内積は vy
  const cosTheta = Math.max(-1, Math.min(1, vy / len));
  const angleRad = Math.acos(cosTheta);
  const angleDeg = (angleRad * 180) / Math.PI;

  return Math.round(angleDeg * 10) / 10;
}

/**
 * 線分 (left -> right) と画面水平線（右向き）との傾き角度（0〜90度、絶対値）を計算する
 */
export function calculateHorizontalAngle(
  pointLeft: Keypoint | null | undefined,
  pointRight: Keypoint | null | undefined,
  minScore: number = POSE_CONFIDENCE_THRESHOLD
): number | null {
  if (!pointLeft || !pointRight) return null;
  if (pointLeft.score < minScore || pointRight.score < minScore) {
    return null;
  }

  const dx = pointRight.x - pointLeft.x;
  const dy = pointRight.y - pointLeft.y;

  if (Math.hypot(dx, dy) < 1e-6) return null;

  const angleRad = Math.atan2(Math.abs(dy), Math.abs(dx));
  const angleDeg = (angleRad * 180) / Math.PI;

  return Math.round(angleDeg * 10) / 10;
}

/**
 * 母趾(big toe)と小趾(small toe)の中点を計算する（Halpe26専用）。
 * 両方のconfidenceが閾値以上の場合のみ有効な点を返す（片方でも不足していればnull）。
 * @param bigToe 母趾キーポイント
 * @param smallToe 小趾キーポイント
 * @param minScore 最小信頼度
 * @returns 中点キーポイント（score は bigToe/smallToe の低い方）、算出不能時は null
 */
export function calculateToeMidpoint(
  bigToe: Keypoint | null | undefined,
  smallToe: Keypoint | null | undefined,
  minScore: number = POSE_CONFIDENCE_THRESHOLD
): Keypoint | null {
  if (!bigToe || !smallToe) return null;
  if (bigToe.score < minScore || smallToe.score < minScore) return null;

  return {
    x: (bigToe.x + smallToe.x) / 2,
    y: (bigToe.y + smallToe.y) / 2,
    score: Math.min(bigToe.score, smallToe.score),
  };
}

// 横撮影の計算結果
export interface SquatSideResult {
  sideUsed: 'left' | 'right';
  kneeAngle: number | null; // 膝角度 (股関節-膝-足首)
  hipAngle: number | null; // 股関節角度 (肩-股関節-膝)
  ankleJointAngle: number | null; // 足関節角度 (膝-足首-つま先中点)
  trunkAngle: number | null; // 体幹前傾 (肩→股関節と鉛直線)
  shankAngle: number | null; // 下腿前傾 (膝→足首と鉛直線)
  footAngle: number | null; // 足部角度 (かかと→つま先中点 と水平線)
  meanConfidence: number;
}

/**
 * 横からのスクワット角度を計算する
 * @param keypoints Halpe26 キーポイント配列 (26点)
 * @param manualSide 手動指定の左右（指定がない場合は平均信頼度が高い側を自動選択）
 */
export function calculateSquatSideAngles(
  keypoints: Keypoint[],
  manualSide?: 'left' | 'right'
): SquatSideResult {
  const leftShoulder = keypoints[COCO_KEYPOINTS.LEFT_SHOULDER];
  const leftHip = keypoints[COCO_KEYPOINTS.LEFT_HIP];
  const leftKnee = keypoints[COCO_KEYPOINTS.LEFT_KNEE];
  const leftAnkle = keypoints[COCO_KEYPOINTS.LEFT_ANKLE];
  const leftBigToe = keypoints[COCO_KEYPOINTS.LEFT_BIG_TOE];
  const leftSmallToe = keypoints[COCO_KEYPOINTS.LEFT_SMALL_TOE];
  const leftHeel = keypoints[COCO_KEYPOINTS.LEFT_HEEL];

  const rightShoulder = keypoints[COCO_KEYPOINTS.RIGHT_SHOULDER];
  const rightHip = keypoints[COCO_KEYPOINTS.RIGHT_HIP];
  const rightKnee = keypoints[COCO_KEYPOINTS.RIGHT_KNEE];
  const rightAnkle = keypoints[COCO_KEYPOINTS.RIGHT_ANKLE];
  const rightBigToe = keypoints[COCO_KEYPOINTS.RIGHT_BIG_TOE];
  const rightSmallToe = keypoints[COCO_KEYPOINTS.RIGHT_SMALL_TOE];
  const rightHeel = keypoints[COCO_KEYPOINTS.RIGHT_HEEL];

  const leftMeanConf =
    ((leftShoulder?.score ?? 0) +
      (leftHip?.score ?? 0) +
      (leftKnee?.score ?? 0) +
      (leftAnkle?.score ?? 0)) /
    4;

  const rightMeanConf =
    ((rightShoulder?.score ?? 0) +
      (rightHip?.score ?? 0) +
      (rightKnee?.score ?? 0) +
      (rightAnkle?.score ?? 0)) /
    4;

  const sideUsed = manualSide ?? (rightMeanConf >= leftMeanConf ? 'right' : 'left');

  const shoulder = sideUsed === 'right' ? rightShoulder : leftShoulder;
  const hip = sideUsed === 'right' ? rightHip : leftHip;
  const knee = sideUsed === 'right' ? rightKnee : leftKnee;
  const ankle = sideUsed === 'right' ? rightAnkle : leftAnkle;
  const bigToe = sideUsed === 'right' ? rightBigToe : leftBigToe;
  const smallToe = sideUsed === 'right' ? rightSmallToe : leftSmallToe;
  const heel = sideUsed === 'right' ? rightHeel : leftHeel;

  // 1. 膝角度: hip - knee - ankle (頂点: knee)
  const kneeAngle = calculate3PointAngle(hip, knee, ankle);

  // 2. 股関節角度: shoulder - hip - knee (頂点: hip)
  const hipAngle = calculate3PointAngle(shoulder, hip, knee);

  // 3. つま先中点（big toe / small toe 両方のconfidenceが必要）
  const toeMidpoint = calculateToeMidpoint(bigToe, smallToe);

  // 4. 足関節角度: knee - ankle - toeMidpoint (頂点: ankle)
  //    必要点: knee, ankle, bigToe, smallToe（いずれか不足でnull）
  const ankleJointAngle = calculate3PointAngle(knee, ankle, toeMidpoint);

  // 5. 体幹前傾: shoulder -> hip と鉛直線
  const trunkAngle = calculateVerticalAngle(shoulder, hip);

  // 6. 下腿前傾: knee -> ankle と鉛直線
  const shankAngle = calculateVerticalAngle(knee, ankle);

  // 7. 足部角度: heel -> toeMidpoint と水平線
  //    必要点: heel, bigToe, smallToe（いずれか不足でnull）
  const footAngle = calculateHorizontalAngle(heel, toeMidpoint);

  return {
    sideUsed,
    kneeAngle,
    hipAngle,
    ankleJointAngle,
    trunkAngle,
    shankAngle,
    footAngle,
    meanConfidence: sideUsed === 'right' ? rightMeanConf : leftMeanConf,
  };
}

// 正面撮影の計算結果
export interface SquatFrontResult {
  leftKneeAngle: number | null; // 左膝角度
  rightKneeAngle: number | null; // 右膝角度
  kneeAngleDiff: number | null; // 膝角度の左右差
  shoulderTiltAngle: number | null; // 肩の傾き
  pelvisTiltAngle: number | null; // 骨盤の傾き
  trunkLateralTiltAngle: number | null; // 体幹の左右傾き
}

/**
 * 正面からのスクワット角度を計算する
 */
export function calculateSquatFrontAngles(
  keypoints: Keypoint[]
): SquatFrontResult {
  const leftShoulder = keypoints[COCO_KEYPOINTS.LEFT_SHOULDER];
  const rightShoulder = keypoints[COCO_KEYPOINTS.RIGHT_SHOULDER];
  const leftHip = keypoints[COCO_KEYPOINTS.LEFT_HIP];
  const rightHip = keypoints[COCO_KEYPOINTS.RIGHT_HIP];
  const leftKnee = keypoints[COCO_KEYPOINTS.LEFT_KNEE];
  const rightKnee = keypoints[COCO_KEYPOINTS.RIGHT_KNEE];
  const leftAnkle = keypoints[COCO_KEYPOINTS.LEFT_ANKLE];
  const rightAnkle = keypoints[COCO_KEYPOINTS.RIGHT_ANKLE];

  // 1. 左膝角度
  const leftKneeAngle = calculate3PointAngle(leftHip, leftKnee, leftAnkle);

  // 2. 右膝角度
  const rightKneeAngle = calculate3PointAngle(rightHip, rightKnee, rightAnkle);

  // 3. 左右差
  let kneeAngleDiff: number | null = null;
  if (leftKneeAngle !== null && rightKneeAngle !== null) {
    kneeAngleDiff =
      Math.round(Math.abs(leftKneeAngle - rightKneeAngle) * 10) / 10;
  }

  // 4. 肩の傾き (水平線との角度)
  const shoulderTiltAngle = calculateHorizontalAngle(leftShoulder, rightShoulder);

  // 5. 骨盤の傾き (水平線との角度)
  const pelvisTiltAngle = calculateHorizontalAngle(leftHip, rightHip);

  // 6. 体幹の左右傾き
  // 左右股関節の中点 -> 左右肩の中点 のベクトルと鉛直線(上向き)との角度
  let trunkLateralTiltAngle: number | null = null;
  if (
    leftHip &&
    rightHip &&
    leftShoulder &&
    rightShoulder &&
    leftHip.score >= POSE_CONFIDENCE_THRESHOLD &&
    rightHip.score >= POSE_CONFIDENCE_THRESHOLD &&
    leftShoulder.score >= POSE_CONFIDENCE_THRESHOLD &&
    rightShoulder.score >= POSE_CONFIDENCE_THRESHOLD
  ) {
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

    // 股関節中点から肩中点へのベクトル (画面上向きなので dy は負)
    const dx = shoulderMidX - hipMidX;
    const dy = shoulderMidY - hipMidY;
    const len = Math.hypot(dx, dy);

    if (len >= 1e-6) {
      // 鉛直上向き (0, -1) との内積は -dy
      const cosTheta = Math.max(-1, Math.min(1, -dy / len));
      const angleRad = Math.acos(cosTheta);
      trunkLateralTiltAngle =
        Math.round(((angleRad * 180) / Math.PI) * 10) / 10;
    }
  }

  return {
    leftKneeAngle,
    rightKneeAngle,
    kneeAngleDiff,
    shoulderTiltAngle,
    pelvisTiltAngle,
    trunkLateralTiltAngle,
  };
}
