import { describe, it, expect } from 'vitest';
import {
  calculate3PointAngle,
  calculateVerticalAngle,
  calculateHorizontalAngle,
  calculateToeMidpoint,
  calculateSquatSideAngles,
  calculateSquatFrontAngles,
  applyRoiPadding,
  roiLocalToVideoPixel,
  ROI_PADDING_VERTICAL,
  ROI_PADDING_HORIZONTAL,
  COCO_KEYPOINTS,
  Keypoint,
  RoiRect,
} from './squatCalculations';

describe('squatCalculations - 角度計算共通ユーティリティ', () => {
  it('3点角度計算: 直角 (90度) を正しく算出する', () => {
    const a: Keypoint = { x: 0, y: 10, score: 0.9 };
    const b: Keypoint = { x: 0, y: 0, score: 0.9 }; // 頂点
    const c: Keypoint = { x: 10, y: 0, score: 0.9 };

    const angle = calculate3PointAngle(a, b, c);
    expect(angle).toBe(90);
  });

  it('3点角度計算: 一直線 (180度) を正しく算出する', () => {
    const a: Keypoint = { x: 0, y: 10, score: 0.8 };
    const b: Keypoint = { x: 0, y: 0, score: 0.8 }; // 頂点
    const c: Keypoint = { x: 0, y: -10, score: 0.8 };

    const angle = calculate3PointAngle(a, b, c);
    expect(angle).toBe(180);
  });

  it('3点角度計算: 45度を正しく算出する', () => {
    const a: Keypoint = { x: 10, y: 0, score: 0.9 };
    const b: Keypoint = { x: 0, y: 0, score: 0.9 }; // 頂点
    const c: Keypoint = { x: 10, y: 10, score: 0.9 };

    const angle = calculate3PointAngle(a, b, c);
    expect(angle).toBe(45);
  });

  it('鉛直基準角度: 直立 (0度) を正しく算出する', () => {
    const from: Keypoint = { x: 100, y: 50, score: 0.9 };
    const to: Keypoint = { x: 100, y: 150, score: 0.9 }; // 真下

    const angle = calculateVerticalAngle(from, to);
    expect(angle).toBe(0);
  });

  it('鉛直基準角度: 前傾30度を正しく算出する', () => {
    // 30度傾斜: dy = 100 * cos(30°), dx = 100 * sin(30°)
    const rad = (30 * Math.PI) / 180;
    const from: Keypoint = { x: 0, y: 0, score: 0.9 };
    const to: Keypoint = { x: 100 * Math.sin(rad), y: 100 * Math.cos(rad), score: 0.9 };

    const angle = calculateVerticalAngle(from, to);
    expect(angle).toBeCloseTo(30, 1);
  });

  it('水平基準角度: 完全水平 (0度) を正しく算出する', () => {
    const left: Keypoint = { x: 50, y: 100, score: 0.9 };
    const right: Keypoint = { x: 150, y: 100, score: 0.9 };

    const angle = calculateHorizontalAngle(left, right);
    expect(angle).toBe(0);
  });

  it('水平基準角度: 傾斜5度を正しく算出する', () => {
    const rad = (5 * Math.PI) / 180;
    const left: Keypoint = { x: 0, y: 0, score: 0.9 };
    const right: Keypoint = { x: 100 * Math.cos(rad), y: 100 * Math.sin(rad), score: 0.9 };

    const angle = calculateHorizontalAngle(left, right);
    expect(angle).toBeCloseTo(5, 1);
  });

  it('信頼度 (confidence) 不足時は null を返す', () => {
    const lowConf: Keypoint = { x: 0, y: 10, score: 0.2 }; // 閾値 0.4 未満
    const b: Keypoint = { x: 0, y: 0, score: 0.9 };
    const c: Keypoint = { x: 10, y: 0, score: 0.9 };

    expect(calculate3PointAngle(lowConf, b, c)).toBeNull();
    expect(calculateVerticalAngle(lowConf, b)).toBeNull();
    expect(calculateHorizontalAngle(lowConf, c)).toBeNull();
  });

  it('横撮影: 左右の信頼度を比較して高い側を自動選択する', () => {
    const kpts: Keypoint[] = Array.from({ length: 17 }, () => ({
      x: 0,
      y: 0,
      score: 0.1,
    }));

    // 右側の信頼度を高く設定
    kpts[COCO_KEYPOINTS.RIGHT_SHOULDER] = { x: 100, y: 50, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_HIP] = { x: 120, y: 120, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_KNEE] = { x: 140, y: 180, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_ANKLE] = { x: 130, y: 250, score: 0.9 };

    // 左側は低い
    kpts[COCO_KEYPOINTS.LEFT_SHOULDER] = { x: 100, y: 50, score: 0.3 };
    kpts[COCO_KEYPOINTS.LEFT_HIP] = { x: 120, y: 120, score: 0.3 };
    kpts[COCO_KEYPOINTS.LEFT_KNEE] = { x: 140, y: 180, score: 0.3 };
    kpts[COCO_KEYPOINTS.LEFT_ANKLE] = { x: 130, y: 250, score: 0.3 };

    const res = calculateSquatSideAngles(kpts);
    expect(res.sideUsed).toBe('right');
    expect(res.kneeAngle).not.toBeNull();
    expect(res.hipAngle).not.toBeNull();
    expect(res.trunkAngle).not.toBeNull();
    expect(res.shankAngle).not.toBeNull();

    // 手動で 'left' を強制指定した場合
    const manualRes = calculateSquatSideAngles(kpts, 'left');
    expect(manualRes.sideUsed).toBe('left');
    // 左側は信頼度不足なので null になる
    expect(manualRes.kneeAngle).toBeNull();
  });

  it('正面撮影: 左右膝角度・左右差・傾きを正しく算出する', () => {
    const kpts: Keypoint[] = Array.from({ length: 17 }, () => ({
      x: 0,
      y: 0,
      score: 0.9,
    }));

    // 肩（水平）
    kpts[COCO_KEYPOINTS.LEFT_SHOULDER] = { x: 40, y: 50, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_SHOULDER] = { x: 60, y: 50, score: 0.9 };

    // 骨盤（少し右肩上がり・傾きあり）
    kpts[COCO_KEYPOINTS.LEFT_HIP] = { x: 45, y: 100, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_HIP] = { x: 55, y: 102, score: 0.9 };

    // 左脚（直角 90度）
    kpts[COCO_KEYPOINTS.LEFT_KNEE] = { x: 40, y: 140, score: 0.9 };
    kpts[COCO_KEYPOINTS.LEFT_ANKLE] = { x: 40, y: 180, score: 0.9 };

    // 右脚（直角 90度）
    kpts[COCO_KEYPOINTS.RIGHT_KNEE] = { x: 60, y: 140, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_ANKLE] = { x: 60, y: 180, score: 0.9 };

    const frontRes = calculateSquatFrontAngles(kpts);
    expect(frontRes.shoulderTiltAngle).toBe(0);
    expect(frontRes.pelvisTiltAngle).toBeGreaterThan(0);
    expect(frontRes.leftKneeAngle).not.toBeNull();
    expect(frontRes.rightKneeAngle).not.toBeNull();
    expect(frontRes.kneeAngleDiff).not.toBeNull();
  });
});

describe('squatCalculations - Halpe26 足部キーポイント (toeMidpoint / 足関節角度 / 足部角度)', () => {
  it('つま先中点: big toe と small toe の中点を正しく算出する', () => {
    const bigToe: Keypoint = { x: 150, y: 260, score: 0.8 };
    const smallToe: Keypoint = { x: 160, y: 258, score: 0.7 };

    const mid = calculateToeMidpoint(bigToe, smallToe);
    expect(mid).not.toBeNull();
    expect(mid!.x).toBe(155);
    expect(mid!.y).toBe(259);
    // score は低い方（confidenceが厳しい方）を採用する
    expect(mid!.score).toBe(0.7);
  });

  it('つま先中点: big toe の confidence 不足時は null を返す', () => {
    const bigToe: Keypoint = { x: 150, y: 260, score: 0.2 }; // 閾値0.4未満
    const smallToe: Keypoint = { x: 160, y: 258, score: 0.9 };

    expect(calculateToeMidpoint(bigToe, smallToe)).toBeNull();
  });

  it('つま先中点: small toe の confidence 不足時は null を返す', () => {
    const bigToe: Keypoint = { x: 150, y: 260, score: 0.9 };
    const smallToe: Keypoint = { x: 160, y: 258, score: 0.2 }; // 閾値0.4未満

    expect(calculateToeMidpoint(bigToe, smallToe)).toBeNull();
  });

  it('横撮影: 足関節角度（膝-足首-つま先中点）と足部角度（かかと→つま先中点と水平線）を正しく算出する', () => {
    const kpts: Keypoint[] = Array.from({ length: 26 }, () => ({
      x: 0,
      y: 0,
      score: 0.1,
    }));

    kpts[COCO_KEYPOINTS.RIGHT_SHOULDER] = { x: 100, y: 50, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_HIP] = { x: 120, y: 120, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_KNEE] = { x: 140, y: 180, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_ANKLE] = { x: 130, y: 250, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_BIG_TOE] = { x: 150, y: 260, score: 0.8 };
    kpts[COCO_KEYPOINTS.RIGHT_SMALL_TOE] = { x: 160, y: 258, score: 0.8 };
    kpts[COCO_KEYPOINTS.RIGHT_HEEL] = { x: 110, y: 255, score: 0.8 };

    const res = calculateSquatSideAngles(kpts, 'right');
    expect(res.ankleJointAngle).toBeCloseTo(101.7, 0);
    expect(res.footAngle).toBeCloseTo(5.1, 0);
    // 既存の4指標も引き続き算出される（新指標追加による副作用がないことの確認）
    expect(res.kneeAngle).not.toBeNull();
    expect(res.hipAngle).not.toBeNull();
    expect(res.trunkAngle).not.toBeNull();
    expect(res.shankAngle).not.toBeNull();
  });

  it('横撮影: big toe / small toe の confidence 不足時は足関節角度・足部角度のみ null になり、他の角度は無効化されない', () => {
    const kpts: Keypoint[] = Array.from({ length: 26 }, () => ({
      x: 0,
      y: 0,
      score: 0.1,
    }));

    kpts[COCO_KEYPOINTS.RIGHT_SHOULDER] = { x: 100, y: 50, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_HIP] = { x: 120, y: 120, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_KNEE] = { x: 140, y: 180, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_ANKLE] = { x: 130, y: 250, score: 0.9 };
    // つま先2点の confidence が閾値未満
    kpts[COCO_KEYPOINTS.RIGHT_BIG_TOE] = { x: 150, y: 260, score: 0.2 };
    kpts[COCO_KEYPOINTS.RIGHT_SMALL_TOE] = { x: 160, y: 258, score: 0.2 };
    kpts[COCO_KEYPOINTS.RIGHT_HEEL] = { x: 110, y: 255, score: 0.9 };

    const res = calculateSquatSideAngles(kpts, 'right');
    expect(res.ankleJointAngle).toBeNull();
    expect(res.footAngle).toBeNull(); // つま先中点がnullのため足部角度も算出不可
    // 足部以外の既存4指標は confidence 十分なので引き続き有効
    expect(res.kneeAngle).not.toBeNull();
    expect(res.hipAngle).not.toBeNull();
    expect(res.trunkAngle).not.toBeNull();
    expect(res.shankAngle).not.toBeNull();
  });

  it('横撮影: heel の confidence 不足時は足部角度のみ null になり、足関節角度は影響を受けない', () => {
    const kpts: Keypoint[] = Array.from({ length: 26 }, () => ({
      x: 0,
      y: 0,
      score: 0.1,
    }));

    kpts[COCO_KEYPOINTS.RIGHT_SHOULDER] = { x: 100, y: 50, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_HIP] = { x: 120, y: 120, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_KNEE] = { x: 140, y: 180, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_ANKLE] = { x: 130, y: 250, score: 0.9 };
    kpts[COCO_KEYPOINTS.RIGHT_BIG_TOE] = { x: 150, y: 260, score: 0.8 };
    kpts[COCO_KEYPOINTS.RIGHT_SMALL_TOE] = { x: 160, y: 258, score: 0.8 };
    // heel の confidence が閾値未満
    kpts[COCO_KEYPOINTS.RIGHT_HEEL] = { x: 110, y: 255, score: 0.1 };

    const res = calculateSquatSideAngles(kpts, 'right');
    expect(res.footAngle).toBeNull();
    // 足関節角度は heel を使わないため影響を受けない
    expect(res.ankleJointAngle).not.toBeNull();
  });
});

describe('squatCalculations - 解析範囲(ROI)のpadding・座標変換', () => {
  it('applyRoiPadding: 動画範囲内に収まる場合は指定どおりのpaddingを追加する', () => {
    const roi: RoiRect = { x: 100, y: 100, width: 200, height: 400 };
    const padded = applyRoiPadding(roi, 1000, 1000);

    // padX = 200 * 0.2 = 40, padY = 400 * 0.15 = 60
    expect(padded.x).toBe(100 - 200 * ROI_PADDING_HORIZONTAL);
    expect(padded.y).toBe(100 - 400 * ROI_PADDING_VERTICAL);
    expect(padded.width).toBe(200 + 2 * 200 * ROI_PADDING_HORIZONTAL);
    expect(padded.height).toBe(400 + 2 * 400 * ROI_PADDING_VERTICAL);
  });

  it('applyRoiPadding: 動画の左上端に近い矩形は0未満にならずクランプされる', () => {
    const roi: RoiRect = { x: 10, y: 10, width: 100, height: 200 };
    const padded = applyRoiPadding(roi, 500, 500);

    // 本来 x0 = 10 - 20 = -10, y0 = 10 - 30 = -20 だが 0 にクランプされる
    expect(padded.x).toBe(0);
    expect(padded.y).toBe(0);
    expect(padded.width).toBe(130); // 0 から (10+100+20) まで
    expect(padded.height).toBe(240); // 0 から (10+200+30) まで
  });

  it('applyRoiPadding: 動画の右下端に近い矩形は動画サイズを超えずクランプされる', () => {
    const roi: RoiRect = { x: 400, y: 700, width: 80, height: 250 };
    const padded = applyRoiPadding(roi, 500, 900);

    // 本来 x1 = 400+80+16 = 496 (500以内なのでクランプなし)
    // 本来 y1 = 700+250+37.5 = 987.5 だが動画高 900 にクランプされる
    expect(padded.x).toBeCloseTo(384, 5);
    expect(padded.y).toBeCloseTo(662.5, 5);
    expect(padded.x + padded.width).toBeLessThanOrEqual(500);
    expect(padded.y + padded.height).toBe(900); // クランプにより動画高ちょうどで終わる
  });

  it('roiLocalToVideoPixel: ROIローカル座標を元動画pixel座標へ正しく変換する', () => {
    const roi: RoiRect = { x: 50, y: 80, width: 200, height: 300 };
    const { pixelX, pixelY } = roiLocalToVideoPixel(30.25, 45.77, roi);

    expect(pixelX).toBe(80.3); // 50 + 30.25 = 80.25 → 四捨五入で80.3
    expect(pixelY).toBe(125.8); // 80 + 45.77 = 125.77 → 四捨五入で125.8
  });

  it('ROI座標変換後の角度は、変換前(ROIローカル)と同一の角度になる（平行移動は角度を変えない）', () => {
    // ROIクロップ画像内でのローカル座標（RTMPoseの生デコード結果を模擬）
    const localShoulder = { x: 100, y: 50, score: 0.9 };
    const localHip = { x: 120, y: 120, score: 0.9 };
    const localKnee = { x: 140, y: 180, score: 0.9 };
    const localAnkle = { x: 130, y: 250, score: 0.9 };

    const roi: RoiRect = { x: 300, y: 500, width: 260, height: 440 };

    const toGlobal = (p: { x: number; y: number; score: number }) => {
      const { pixelX, pixelY } = roiLocalToVideoPixel(p.x, p.y, roi);
      return { x: pixelX, y: pixelY, score: p.score };
    };

    const kptsLocal: Keypoint[] = Array.from({ length: 26 }, () => ({ x: 0, y: 0, score: 0.1 }));
    kptsLocal[COCO_KEYPOINTS.RIGHT_SHOULDER] = localShoulder;
    kptsLocal[COCO_KEYPOINTS.RIGHT_HIP] = localHip;
    kptsLocal[COCO_KEYPOINTS.RIGHT_KNEE] = localKnee;
    kptsLocal[COCO_KEYPOINTS.RIGHT_ANKLE] = localAnkle;

    const kptsGlobal: Keypoint[] = Array.from({ length: 26 }, () => ({ x: 0, y: 0, score: 0.1 }));
    kptsGlobal[COCO_KEYPOINTS.RIGHT_SHOULDER] = toGlobal(localShoulder);
    kptsGlobal[COCO_KEYPOINTS.RIGHT_HIP] = toGlobal(localHip);
    kptsGlobal[COCO_KEYPOINTS.RIGHT_KNEE] = toGlobal(localKnee);
    kptsGlobal[COCO_KEYPOINTS.RIGHT_ANKLE] = toGlobal(localAnkle);

    const resLocal = calculateSquatSideAngles(kptsLocal, 'right');
    const resGlobal = calculateSquatSideAngles(kptsGlobal, 'right');

    // ROI座標→元動画座標への変換は平行移動のみなので、膝角度・股関節角度は変化しない
    expect(resGlobal.kneeAngle).toBe(resLocal.kneeAngle);
    expect(resGlobal.hipAngle).toBe(resLocal.hipAngle);
    expect(resGlobal.kneeAngle).not.toBeNull();
  });

  it('ROI由来のキーポイントでもconfidence不足時は角度がnullになる', () => {
    const roi: RoiRect = { x: 200, y: 150, width: 180, height: 300 };
    const toGlobal = (x: number, y: number, score: number) => {
      const { pixelX, pixelY } = roiLocalToVideoPixel(x, y, roi);
      return { x: pixelX, y: pixelY, score };
    };

    const kpts: Keypoint[] = Array.from({ length: 26 }, () => ({ x: 0, y: 0, score: 0.1 }));
    kpts[COCO_KEYPOINTS.RIGHT_SHOULDER] = toGlobal(100, 50, 0.9);
    kpts[COCO_KEYPOINTS.RIGHT_HIP] = toGlobal(120, 120, 0.9);
    // ROI解析でも膝のconfidenceが閾値(0.4)未満なら、膝を使う角度はnullのまま
    kpts[COCO_KEYPOINTS.RIGHT_KNEE] = toGlobal(140, 180, 0.3);
    kpts[COCO_KEYPOINTS.RIGHT_ANKLE] = toGlobal(130, 250, 0.9);

    const res = calculateSquatSideAngles(kpts, 'right');
    expect(res.kneeAngle).toBeNull();
    expect(res.hipAngle).toBeNull(); // hipAngleもknee(shoulder-hip-knee)を使うためnull
  });
});
