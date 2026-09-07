import { describe, it, expect } from 'vitest';
import { parseRoute, normalizePath, PAGE_PATHS, APP_PATH } from './router';

describe('normalizePath', () => {
  it('クエリ・ハッシュを除去する', () => {
    expect(normalizePath('/consultation?utm=x')).toBe('/consultation');
    expect(normalizePath('/consultation#top')).toBe('/consultation');
  });

  it('末尾スラッシュを無視する', () => {
    expect(normalizePath('/consultation/')).toBe('/consultation');
    expect(normalizePath('/online-personal//')).toBe('/online-personal');
  });

  it('ルートは / のまま', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
  });

  it('大文字小文字を無視する', () => {
    expect(normalizePath('/Consultation')).toBe('/consultation');
  });
});

describe('parseRoute', () => {
  it('/consultation を無料相談ページとして解決する', () => {
    expect(parseRoute('/consultation')).toEqual({
      kind: 'page',
      page: 'consultation',
    });
  });

  it('/online-personal をオンラインパーソナルページとして解決する', () => {
    expect(parseRoute('/online-personal')).toEqual({
      kind: 'page',
      page: 'online-personal',
    });
  });

  it('末尾スラッシュ・クエリ付きの直リンクでも解決する', () => {
    expect(parseRoute('/consultation/')).toEqual({
      kind: 'page',
      page: 'consultation',
    });
    expect(parseRoute('/online-personal/?from=home')).toEqual({
      kind: 'page',
      page: 'online-personal',
    });
  });

  it('ルート・未知のパスは測定アプリ本体になる', () => {
    expect(parseRoute(APP_PATH)).toEqual({ kind: 'app' });
    expect(parseRoute('/')).toEqual({ kind: 'app' });
    expect(parseRoute('/unknown')).toEqual({ kind: 'app' });
    expect(parseRoute('/consultation-extra')).toEqual({ kind: 'app' });
  });
});

describe('PAGE_PATHS', () => {
  it('公開パスが仕様どおり', () => {
    expect(PAGE_PATHS.consultation).toBe('/consultation');
    expect(PAGE_PATHS['online-personal']).toBe('/online-personal');
  });
});
