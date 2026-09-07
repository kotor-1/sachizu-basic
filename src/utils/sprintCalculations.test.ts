import { describe, it, expect } from 'vitest';
import { calculateSprint } from './sprintCalculations';

describe('10mスプリント計算', () => {
  it('正常系: 120fpsで接地・滞空・ピッチの計算が正確に行われること', () => {
    const startFrame = 100;
    const endFrame = 250;
    const fps = 120;

    const contacts = [
      { landingFrame: 110, takeoffFrame: 126 }, // 接地1: 16F (0.1333s)
      { landingFrame: 140, takeoffFrame: 156 }, // 滞空1: 14F (0.1167s), 接地2: 16F (0.1333s)
      { landingFrame: 170, takeoffFrame: 186 }, // 滞空2: 14F (0.1167s), 接地3: 16F (0.1333s)
    ];

    const result = calculateSprint(startFrame, endFrame, fps, contacts, 20, 80);

    expect(result.direction).toBe('left_to_right');
    expect(result.timeSeconds).toBeCloseTo(150 / 120, 3); // 1.25s
    expect(result.averageSpeedMps).toBeCloseTo(10 / 1.25, 2); // 8.0 m/s
    expect(result.validSteps.length).toBe(3);

    // 平均接地時間: 16 / 120 = 0.1333s
    expect(result.averageContactTimeSeconds).toBeCloseTo(16 / 120, 3);

    // 平均滞空時間: 14 / 120 = 0.1167s
    expect(result.averageFlightTimeSeconds).toBeCloseTo(14 / 120, 3);

    // 各ステップの滞空時間とステップ時間
    expect(result.validSteps[0].flightTimeSeconds).toBeCloseTo(14 / 120, 3);
    expect(result.validSteps[0].stepTimeSeconds).toBeCloseTo(30 / 120, 3); // 140 - 110 = 30F
    expect(result.validSteps[2].flightTimeSeconds).toBeNull(); // 最後の接地

    // ピッチ: N=3, first=110F, last=170F -> duration=60F=0.5s -> (3-1)/0.5 = 4.0 steps/s
    expect(result.pitchStepsPerSecond).toBeCloseTo(4.0, 2);
  });

  it('N < 2 の場合はピッチがnullになること', () => {
    const contacts = [{ landingFrame: 110, takeoffFrame: 120 }];
    const result = calculateSprint(100, 200, 60, contacts);
    expect(result.pitchStepsPerSecond).toBeNull();
    expect(result.averageFlightTimeSeconds).toBeNull();
  });

  it('区間境界をまたぐ接地は除外されること', () => {
    const startFrame = 100;
    const endFrame = 200;
    const fps = 60;

    const contacts = [
      { landingFrame: 90, takeoffFrame: 105 },  // 0m通過前着地 -> 除外
      { landingFrame: 110, takeoffFrame: 120 }, // 有効
      { landingFrame: 130, takeoffFrame: 140 }, // 有効
      { landingFrame: 195, takeoffFrame: 210 }, // 10m通過後離地 -> 除外
    ];

    const result = calculateSprint(startFrame, endFrame, fps, contacts);
    expect(result.validSteps.length).toBe(2);
    expect(result.validSteps[0].landingFrame).toBe(110);
    expect(result.validSteps[1].landingFrame).toBe(130);
  });

  it('異常系: endFrame <= startFrame はエラー', () => {
    expect(() => calculateSprint(100, 100, 60)).toThrow();
    expect(() => calculateSprint(100, 90, 60)).toThrow();
  });
});
