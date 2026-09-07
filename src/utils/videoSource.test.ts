import { describe, it, expect } from 'vitest';
import { isAcceptableVideoFile, normalizeDuration } from './videoSource';

describe('isAcceptableVideoFile', () => {
  it('iPhone / PC から渡る代表的な MIME を受け入れる', () => {
    expect(isAcceptableVideoFile({ name: 'IMG_0001.MOV', type: 'video/quicktime' })).toBe(true);
    expect(isAcceptableVideoFile({ name: 'clip.mp4', type: 'video/mp4' })).toBe(true);
    expect(isAcceptableVideoFile({ name: 'clip.m4v', type: 'video/x-m4v' })).toBe(true);
    expect(isAcceptableVideoFile({ name: 'clip.webm', type: 'video/webm' })).toBe(true);
  });

  it('type が空でも動画拡張子なら受け入れる', () => {
    expect(isAcceptableVideoFile({ name: 'IMG_0002.MOV', type: '' })).toBe(true);
    expect(isAcceptableVideoFile({ name: 'clip.mp4', type: '' })).toBe(true);
    expect(isAcceptableVideoFile({ name: 'clip.m4v', type: '' })).toBe(true);
    expect(isAcceptableVideoFile({ name: 'clip.MP4', type: 'application/octet-stream' })).toBe(true);
  });

  it('動画以外は拒否する', () => {
    expect(isAcceptableVideoFile({ name: 'photo.jpg', type: 'image/jpeg' })).toBe(false);
    expect(isAcceptableVideoFile({ name: 'memo.txt', type: 'text/plain' })).toBe(false);
    expect(isAcceptableVideoFile({ name: 'noext', type: '' })).toBe(false);
  });
});

describe('normalizeDuration', () => {
  it('通常の duration はそのまま返す', () => {
    expect(normalizeDuration(2.5)).toBe(2.5);
  });

  it('iOS Safari で起こりうる Infinity / NaN / 0 は 0 に落とす', () => {
    expect(normalizeDuration(Infinity)).toBe(0);
    expect(normalizeDuration(NaN)).toBe(0);
    expect(normalizeDuration(0)).toBe(0);
    expect(normalizeDuration(-1)).toBe(0);
  });
});
