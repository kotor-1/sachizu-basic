import { describe, it, expect } from 'vitest';
import { calculateCMJ, calculateSingleRJ, calculateRJ, calculateRJFrom7Points } from './jumpCalculations';

describe('CMJ計算', () => {
  it('正常系: 120fpsで滞空時間が約0.5秒の場合', () => {
    // 120fpsで滞空時間 60フレーム = 0.5秒
    // h = 9.80665 * 0.5^2 / 8 = 9.80665 * 0.25 / 8 = 0.3064578... m = 30.65 cm
    const result = calculateCMJ(100, 160, 120);
    expect(result.flightTimeSeconds).toBeCloseTo(0.5, 3);
    expect(result.jumpHeightCm).toBeCloseTo(30.65, 1);
  });

  it('ユーザーリクエスト例: 120fpsで滞空時間0.548秒のときジャンプ高約36.8cm', () => {
    // t = 0.548秒 -> 120fpsで約 65.76フレーム
    // 9.80665 * (0.548)^2 / 8 = 9.80665 * 0.300304 / 8 = 0.368117 m = 36.8 cm
    const frames = Math.round(0.548 * 120); // 66フレーム
    const result = calculateCMJ(0, frames, 120);
    expect(result.jumpHeightCm).toBeCloseTo(37.0, 0); // 66/120 = 0.55s -> 約37.1cm
  });

  it('異常系: 着地フレームが離地フレーム以下の場合はエラー', () => {
    expect(() => calculateCMJ(100, 100, 60)).toThrow();
    expect(() => calculateCMJ(100, 90, 60)).toThrow();
  });

  it('異常系: fpsが0以下の場合はエラー', () => {
    expect(() => calculateCMJ(10, 20, 0)).toThrow();
    expect(() => calculateCMJ(10, 20, -60)).toThrow();
  });
});

describe('RJ計算', () => {
  it('1回のリバウンドジャンプの正常系', () => {
    // 120fps
    // 接地: 着地100 -> 離地120 (20フレーム = 0.1667秒)
    // 滞空: 離地120 -> 次の着地180 (60フレーム = 0.5秒)
    // 跳躍高: 9.80665 * 0.25 / 8 = 0.3065 m (30.65 cm)
    // RJ-index: 0.3065 / 0.1667 = 約 1.84
    const result = calculateSingleRJ(1, 100, 120, 180, 120);
    expect(result.contactTimeSeconds).toBeCloseTo(0.1667, 3);
    expect(result.flightTimeSeconds).toBeCloseTo(0.5, 3);
    expect(result.jumpHeightCm).toBeCloseTo(30.65, 1);
    expect(result.rjIndex).toBeCloseTo(1.84, 1);
  });

  it('3回のRJ計算と平均値の算出', () => {
    const inputs = [
      { landingFrame: 100, takeoffFrame: 120, nextLandingFrame: 180 }, // 1回目
      { landingFrame: 180, takeoffFrame: 198, nextLandingFrame: 260 }, // 2回目
      { landingFrame: 260, takeoffFrame: 275, nextLandingFrame: 340 }, // 3回目
    ];

    const result = calculateRJ(inputs, 120);
    expect(result.jumps.length).toBe(3);
    expect(result.averageRjIndex).toBeGreaterThan(0);
    expect(result.averageJumpHeightCm).toBeGreaterThan(0);
    expect(result.averageContactTimeSeconds).toBeGreaterThan(0);
    expect(result.averageFlightTimeSeconds).toBeGreaterThan(0);
  });

  it('異常系: 順序が崩れている場合', () => {
    expect(() => calculateSingleRJ(1, 100, 90, 120, 60)).toThrow();
    expect(() => calculateSingleRJ(1, 100, 120, 110, 60)).toThrow();
  });

  it('7点指定からのRJ計算が正しく算出されること', () => {
    const points = {
      landing1: 100,
      takeoff1: 120, // 接地 20F
      landing2: 180, // 滞空 60F
      takeoff2: 200, // 接地 20F
      landing3: 260, // 滞空 60F
      takeoff3: 280, // 接地 20F
      landing4: 340, // 滞空 60F
    };

    const result = calculateRJFrom7Points(points, 120);
    expect(result.jumps.length).toBe(3);
    // 3回とも同じ数値
    expect(result.averageJumpHeightCm).toBeCloseTo(30.65, 1);
    expect(result.averageContactTimeSeconds).toBeCloseTo(0.1667, 3);
    expect(result.averageRjIndex).toBeCloseTo(1.84, 1);
  });

  it('7点指定でフレーム順序が逆転している場合はエラーになること', () => {
    const invalidPoints = {
      landing1: 100,
      takeoff1: 90, // 離地が着地より前
      landing2: 180,
      takeoff2: 200,
      landing3: 260,
      takeoff3: 280,
      landing4: 340,
    };
    expect(() => calculateRJFrom7Points(invalidPoints, 120)).toThrow();
  });
});

