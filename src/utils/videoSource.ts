/**
 * ローカル動画ファイルを <video> へ接続するためのユーティリティ。
 *
 * 背景:
 * iOS Safari (WebKit) では HTMLMediaElement.srcObject に File / Blob を直接
 * 代入できる。一方 Chromium 系は MediaStream / MediaSourceHandle 以外を
 * 受け付けず TypeError を投げる。そのため「WebKit では srcObject、
 * それ以外では URL.createObjectURL」という二段構えにする。
 *
 * ここには測定ロジック（CMJ / RJ / 10m / SQUAT の計算）は一切含まれない。
 */

/** 拡張子だけで動画と判断してよいもの（file.type が空で来る端末向けの保険） */
const VIDEO_EXTENSIONS = [
  '.mp4',
  '.m4v',
  '.mov',
  '.qt',
  '.webm',
  '.ogv',
  '.avi',
  '.mkv',
  '.3gp',
];

/**
 * 選択されたファイルを動画として受け入れてよいか。
 *
 * iPhone のフォトライブラリからは video/quicktime (.mov) や video/mp4 が渡る。
 * ただし端末・経路によっては file.type が空文字で渡ることがあるため、
 * その場合は拡張子で救済する（MIME だけで弾かない）。
 */
export function isAcceptableVideoFile(file: {
  name: string;
  type: string;
}): boolean {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('video/')) return true;

  // 一部の端末は動画でも空文字や application/octet-stream を返す
  if (type === '' || type === 'application/octet-stream') {
    const name = (file.name || '').toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
  }

  return false;
}

let fileSrcObjectSupport: boolean | null = null;

/**
 * この環境が srcObject への File 代入を受け付けるか（= WebKit 系か）。
 * 判定は初回だけ行い、以降はキャッシュした結果を返す。
 */
export function supportsFileSrcObject(): boolean {
  if (fileSrcObjectSupport !== null) return fileSrcObjectSupport;
  if (typeof document === 'undefined') return false;

  try {
    const probeVideo = document.createElement('video');
    const probeFile = new File([new Uint8Array(1)], 'probe.mp4', {
      type: 'video/mp4',
    });
    // Chromium はここで TypeError を投げる
    probeVideo.srcObject = probeFile as unknown as MediaProvider;
    fileSrcObjectSupport = probeVideo.srcObject !== null;
    probeVideo.srcObject = null;
  } catch {
    fileSrcObjectSupport = false;
  }

  return fileSrcObjectSupport;
}

/** 動画診断パネルを表示するか（?debug=video または localStorage） */
export function isVideoDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('debug') === 'video') {
      return true;
    }
    return window.localStorage.getItem('sachizu:debug:video') === '1';
  } catch {
    return false;
  }
}

/** 診断パネル用に File の素性を1行で表す */
export function describeFile(file: File | null): string {
  if (!file) return 'file: (なし)';
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  return [
    `name=${file.name}`,
    `type=${file.type || '(空)'}`,
    `size=${sizeMb}MB`,
    `lastModified=${file.lastModified}`,
  ].join(' ');
}

/**
 * duration を扱える値に正規化する。
 * iOS Safari は blob 由来のメディアで loadedmetadata 時点の duration が
 * Infinity / NaN になることがあるため、そのまま計算に流さない。
 */
export function normalizeDuration(rawDuration: number): number {
  if (!Number.isFinite(rawDuration) || rawDuration <= 0) return 0;
  return rawDuration;
}
