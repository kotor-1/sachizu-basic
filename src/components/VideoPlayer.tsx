import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import {
  describeFile,
  isVideoDebugEnabled,
  normalizeDuration,
  supportsFileSrcObject,
} from '../utils/videoSource';

export interface VideoMarker {
  frame: number;
  label: string;
  color?: string;
}

interface VideoPlayerProps {
  videoSrc: string;
  /**
   * 選択された元 File。渡されている場合、WebKit (iOS Safari) では
   * blob URL ではなく srcObject へ直接接続する。
   * 未指定なら従来どおり videoSrc (blob URL) を使う。
   */
  videoFile?: File | null;
  fps: number;
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  markers?: VideoMarker[];
  overlay?: React.ReactNode; // 動画の上に重ねるオーバーレイ（スプリントライン等）
  children?: React.ReactNode; // コマ送り直下にイベント登録エリアを直結
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoSrc,
  videoFile = null,
  fps,
  currentFrame,
  onFrameChange,
  markers = [],
  overlay,
  children,
}) => {

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);

  // 動画診断（?debug=video のときだけ有効。本番の通常表示には出さない）
  const [debugEnabled] = useState(isVideoDebugEnabled);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [sourceMode, setSourceMode] = useState<'srcObject' | 'blob-url' | '-'>('-');

  // ピンチズーム・パン用ステート（1.0x〜4.0x）
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const panRef = useRef(pan);
  panRef.current = pan;

  // ズーム倍率・位置リセット
  const resetZoom = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // 動画切り替え時にズームをリセット
  useEffect(() => {
    resetZoom();
  }, [videoSrc, resetZoom]);

  // パン移動の境界クランプ計算
  const clampPan = useCallback((targetX: number, targetY: number, targetScale: number) => {
    if (!containerRef.current || targetScale <= 1.0) {
      return { x: 0, y: 0 };
    }
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    const maxPanX = (w * (targetScale - 1)) / 2;
    const maxPanY = (h * (targetScale - 1)) / 2;

    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, targetX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, targetY)),
    };
  }, []);

  /**
   * メタデータ確定時の処理。
   * duration / videoWidth / videoHeight が取れた時点で操作可能にする
   * （loadeddata / canplay は待たない）。
   * iOS Safari では duration が Infinity や NaN で来ることがあるため正規化し、
   * 後から durationchange で確定したときに再計算する。
   */
  const handleMetadataAvailable = useCallback(() => {
    if (!videoRef.current) return;
    const dur = normalizeDuration(videoRef.current.duration);
    setDuration(dur);
    setTotalFrames(dur > 0 ? Math.max(1, Math.floor(dur * fps)) : 0);
  }, [fps]);

  // フレームシーク（フレーム中央を指定して境界ブレを防止）
  const seekToFrame = useCallback(
    (frame: number) => {
      if (!videoRef.current) return;
      const maxF = totalFrames > 0 ? totalFrames : 999999;
      const targetFrame = Math.max(0, Math.min(frame, maxF));
      const targetTime = (targetFrame + 0.5) / fps;
      videoRef.current.currentTime = duration > 0 ? Math.min(targetTime, duration) : targetTime;
      onFrameChange(targetFrame);
    },
    [fps, totalFrames, duration, onFrameChange]
  );

  // 再生時間の同期
  const handleTimeUpdate = () => {
    if (!videoRef.current || !isPlaying) return;
    const time = videoRef.current.currentTime;
    const frame = Math.round(time * fps);
    onFrameChange(frame);
  };

  // 再生/一時停止
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // 終了時
  const handleEnded = () => {
    setIsPlaying(false);
  };

  // 任意フレーム移動
  const stepBy = (delta: number) => {
    if (isPlaying && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    seekToFrame(currentFrame + delta);
  };

  // 最初へ
  const resetToStart = () => {
    if (isPlaying && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    seekToFrame(0);
  };

  // シークバー操作
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(e.target.value, 10);
    if (isPlaying && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    seekToFrame(frame);
  };

  const currentTimeSec = (currentFrame / fps).toFixed(3);

  useEffect(() => {
    if (videoRef.current && !isPlaying) {
      const targetTime = (currentFrame + 0.5) / fps;
      const threshold = 0.4 / fps;
      if (Math.abs(videoRef.current.currentTime - targetTime) > threshold) {
        videoRef.current.currentTime = duration > 0 ? Math.min(targetTime, duration) : targetTime;
      }
    }
  }, [currentFrame, fps, isPlaying, duration]);

  /**
   * メディアソースの接続。
   *
   * iOS Safari (WebKit) は srcObject へ File を直接代入できるため、そちらを優先する。
   * 受け付けないブラウザ (Chromium 系は TypeError) では blob URL へフォールバックする。
   * blob URL の生成・破棄は呼び出し元の Flow が担当し、ここでは revoke しない
   * （src 設定直後に破棄してしまう事故を防ぐため）。
   * 明示的な load() は呼ばない（iOS で loadeddata が来なくなる既知問題を避ける）。
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let mode: 'srcObject' | 'blob-url' = 'blob-url';

    if (videoFile && supportsFileSrcObject()) {
      try {
        video.removeAttribute('src');
        video.srcObject = videoFile as unknown as MediaProvider;
        mode = 'srcObject';
      } catch {
        video.srcObject = null;
        video.src = videoSrc;
      }
    } else {
      video.srcObject = null;
      video.src = videoSrc;
    }

    setSourceMode(mode);

    return () => {
      // 動画切り替え時・unmount 時のみ srcObject を外す
      try {
        video.srcObject = null;
      } catch {
        /* 解放できない環境では何もしない */
      }
    };
  }, [videoFile, videoSrc]);

  // 動画診断ログ（?debug=video のときのみ購読する）
  useEffect(() => {
    if (!debugEnabled) return;
    const video = videoRef.current;
    if (!video) return;

    const names = [
      'loadstart',
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'canplaythrough',
      'durationchange',
      'suspend',
      'stalled',
      'waiting',
      'seeked',
      'error',
    ];

    const onEvent = (e: Event) => {
      const err = video.error;
      const line = [
        e.type,
        `rs=${video.readyState}`,
        `ns=${video.networkState}`,
        `t=${video.currentTime.toFixed(3)}`,
        `dur=${video.duration}`,
        `${video.videoWidth}x${video.videoHeight}`,
        err ? `ERR=${err.code}:${err.message}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      setDebugLines((prev) => [...prev.slice(-49), line]);
    };

    names.forEach((n) => video.addEventListener(n, onEvent));
    return () => names.forEach((n) => video.removeEventListener(n, onEvent));
  }, [debugEnabled, videoSrc, videoFile]);

  // タッチ・ジェスチャー追跡用の参照
  const gestureRef = useRef<{
    touchCount: number;
    startTouches: { id: number; clientX: number; clientY: number }[];
    startDist: number;
    startCenter: { x: number; y: number };
    startScale: number;
    startPan: { x: number; y: number };
    hasMoved: boolean;
    startTime: number;
  }>({
    touchCount: 0,
    startTouches: [],
    startDist: 0,
    startCenter: { x: 0, y: 0 },
    startScale: 1,
    startPan: { x: 0, y: 0 },
    hasMoved: false,
    startTime: 0,
  });

  // モバイル端末（特にiPhone Safari）でのピンチズーム・パン登録
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // ボタンやラインハンドルを直接タップした場合は動画ジェスチャーを無視
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, [data-line-handle]')) {
        return;
      }

      const touches = e.touches;
      gestureRef.current.touchCount = touches.length;
      gestureRef.current.startTime = Date.now();
      gestureRef.current.hasMoved = false;

      if (touches.length === 2) {
        // 2本指: ピンチズーム操作
        e.preventDefault();
        const t1 = touches[0];
        const t2 = touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const center = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        gestureRef.current.startTouches = [
          { id: t1.identifier, clientX: t1.clientX, clientY: t1.clientY },
          { id: t2.identifier, clientX: t2.clientX, clientY: t2.clientY },
        ];
        gestureRef.current.startDist = dist;
        gestureRef.current.startCenter = center;
        gestureRef.current.startScale = scaleRef.current;
        gestureRef.current.startPan = panRef.current;
      } else if (touches.length === 1) {
        // 1本指
        const t = touches[0];
        gestureRef.current.startTouches = [
          { id: t.identifier, clientX: t.clientX, clientY: t.clientY },
        ];
        gestureRef.current.startScale = scaleRef.current;
        gestureRef.current.startPan = panRef.current;

        if (scaleRef.current > 1.0) {
          // ズーム中ならパン移動（Safariでの縦スクロール競合を防ぐ）
          e.preventDefault();
        }
        // scale === 1.0 の場合はブラウザの通常縦スクロールを妨げない
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const touches = e.touches;

      if (touches.length === 2) {
        // 2本指ズーム & パン
        e.preventDefault();
        const t1 = touches[0];
        const t2 = touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const center = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        if (gestureRef.current.startDist > 0) {
          const ratio = dist / gestureRef.current.startDist;
          const newScale = Math.max(1.0, Math.min(4.0, gestureRef.current.startScale * ratio));

          const dx = center.x - gestureRef.current.startCenter.x;
          const dy = center.y - gestureRef.current.startCenter.y;

          const rawPanX = gestureRef.current.startPan.x + dx;
          const rawPanY = gestureRef.current.startPan.y + dy;

          const clamped = clampPan(rawPanX, rawPanY, newScale);
          setScale(newScale);
          setPan(clamped);
          gestureRef.current.hasMoved = true;
        }
      } else if (touches.length === 1 && scaleRef.current > 1.0) {
        // ズーム中の1本指パン
        const t = touches[0];
        const start = gestureRef.current.startTouches[0];
        if (!start) return;

        const dx = t.clientX - start.clientX;
        const dy = t.clientY - start.clientY;

        if (Math.hypot(dx, dy) > 3) {
          e.preventDefault();
          gestureRef.current.hasMoved = true;

          const rawPanX = gestureRef.current.startPan.x + dx;
          const rawPanY = gestureRef.current.startPan.y + dy;

          const clamped = clampPan(rawPanX, rawPanY, scaleRef.current);
          setPan(clamped);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        const wasMoved = gestureRef.current.hasMoved;
        const durationMs = Date.now() - gestureRef.current.startTime;

        // 動かさずにタップした場合のみ再生/一時停止
        if (!wasMoved && durationMs < 300 && gestureRef.current.touchCount === 1) {
          togglePlay();
        }

        // 1.02以下のわずかな拡大は綺麗に等倍へ戻す
        if (scaleRef.current <= 1.02) {
          setScale(1);
          setPan({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1) {
        // 2本指から1本指になった時の座標再同期
        const t = e.touches[0];
        gestureRef.current.startTouches = [
          { id: t.identifier, clientX: t.clientX, clientY: t.clientY },
        ];
        gestureRef.current.startPan = panRef.current;
        gestureRef.current.startScale = scaleRef.current;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [clampPan, togglePlay]);

  // マウス操作（PCブラウザ確認用）
  const mouseRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    startPan: { x: 0, y: 0 },
    hasMoved: false,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, [data-line-handle]')) return;
    mouseRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      startPan: pan,
      hasMoved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseRef.current.isDown) return;
    const dx = e.clientX - mouseRef.current.startX;
    const dy = e.clientY - mouseRef.current.startY;
    if (Math.hypot(dx, dy) > 4) {
      mouseRef.current.hasMoved = true;
      if (scale > 1.0) {
        const rawPanX = mouseRef.current.startPan.x + dx;
        const rawPanY = mouseRef.current.startPan.y + dy;
        const clamped = clampPan(rawPanX, rawPanY, scale);
        setPan(clamped);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mouseRef.current.isDown) return;
    const hasMoved = mouseRef.current.hasMoved;
    mouseRef.current.isDown = false;
    if (!hasMoved && !(e.target as HTMLElement).closest('button, [data-line-handle]')) {
      togglePlay();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newScale = Math.max(1.0, Math.min(4.0, scale * zoomFactor));
      if (newScale <= 1.01) {
        setScale(1);
        setPan({ x: 0, y: 0 });
      } else {
        const clamped = clampPan(pan.x, pan.y, newScale);
        setScale(newScale);
        setPan(clamped);
      }
    }
  };

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs">
      {/* 1. 動画ビューア（黒背景をクリアに見せ、足元確認を最優先） */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`relative bg-zinc-950 flex items-center justify-center aspect-4/3 max-h-[350px] w-full overflow-hidden select-none ${
          scale > 1.0 ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        }`}
      >
        {/* 変形ラッパーレイヤー（動画とオーバーレイを内包し、同期してズーム・パン） */}
        <div
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.05s ease-out',
          }}
          className="relative w-full h-full flex items-center justify-center pointer-events-auto"
        >
          {/* src / srcObject は上の useEffect が命令的に接続する（JSX では指定しない） */}
          <video
            ref={videoRef}
            playsInline
            muted
            preload="metadata"
            onLoadedMetadata={handleMetadataAvailable}
            onDurationChange={handleMetadataAvailable}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* スプリントライン等のオーバーレイレイヤー（動画と一緒にズーム・パン） */}
          {overlay && (
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {overlay}
            </div>
          )}
        </div>

        {/* 再生状態インジケーター（動画内に小さく左上） */}
        <div className="absolute top-2 left-2 pointer-events-none z-30">
          {isPlaying ? (
            <span className="flex items-center space-x-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PLAY</span>
            </span>
          ) : (
            <span className="bg-black/60 backdrop-blur-xs text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded">
              PAUSE
            </span>
          )}
        </div>

        {/* ズームリセットボタン（1.0xを超えている場合のみ右下に表示） */}
        {scale > 1.01 && (
          <button
            type="button"
            onClick={resetZoom}
            className="absolute bottom-2.5 right-2.5 z-30 px-2 py-1 rounded-md bg-zinc-900/80 hover:bg-zinc-900 active:scale-95 text-white font-mono text-[11px] font-bold border border-white/20 backdrop-blur-xs flex items-center space-x-1 shadow-md transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-zinc-300" />
            <span>{Math.round(scale * 10) / 10}x 表示を戻す</span>
          </button>
        )}
      </div>


      {/* 動画診断パネル（?debug=video のときだけ表示。実機のSafariでも読めるようDOMに出す） */}
      {debugEnabled && (
        <div className="bg-zinc-950 text-zinc-200 font-mono text-[10px] leading-snug p-2.5 space-y-1 border-t border-zinc-800">
          <div className="text-emerald-400">VIDEO DEBUG</div>
          <div className="break-all">{describeFile(videoFile)}</div>
          <div>
            source={sourceMode} / srcObjectSupport={String(supportsFileSrcObject())}
          </div>
          <div>
            duration={duration} totalFrames={totalFrames} frame={currentFrame}
          </div>
          <div className="max-h-40 overflow-auto space-y-0.5 pt-1 border-t border-zinc-800">
            {debugLines.length === 0 ? (
              <div className="text-zinc-500">(イベント未発火)</div>
            ) : (
              debugLines.map((line, i) => (
                <div key={i} className="break-all text-zinc-300">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. コントロール＆作業面 */}
      <div className="p-3.5 space-y-3 bg-white">
        {/* シークバー & タイムコード */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-black text-zinc-950 text-sm">
                {currentFrame} <span className="text-[10px] font-normal text-zinc-400">F</span>
              </span>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-500 font-medium">
                {currentTimeSec}s
              </span>
            </div>

            {/* ミニマルな再生/最初ボタン */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={resetToStart}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-md hover:bg-zinc-100 transition-colors"
                title="最初へ"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold flex items-center space-x-1 transition-colors ${
                  isPlaying
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>停止</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>再生</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* シークバースライダー */}
          <div className="relative py-1">
            <input
              type="range"
              min={0}
              max={totalFrames || 100}
              value={currentFrame}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-950"
            />
            {/* マーカーピン */}
            {markers.map((m, idx) => {
              if (totalFrames <= 0) return null;
              const leftPercent = Math.min(100, Math.max(0, (m.frame / totalFrames) * 100));
              return (
                <div
                  key={idx}
                  onClick={() => seekToFrame(m.frame)}
                  title={`${m.label}: ${m.frame}F`}
                  style={{ left: `${leftPercent}%` }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow-xs cursor-pointer"
                />
              );
            })}
          </div>

          {/* 打刻済みポイント一覧 */}
          {markers.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {markers.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => seekToFrame(m.frame)}
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 hover:bg-zinc-200 flex items-center space-x-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>{m.label}</span>
                  <span className="text-zinc-400">{m.frame}F</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. コマ送りUI（階層と強弱を付けたプロ仕様コントローラー） */}
        <div className="space-y-1 pt-0.5">
          {/* 上段（戻る系）： -10, -5, -1 */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => stepBy(-10)}
              className="h-11 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-600 font-mono font-bold rounded-lg text-xs flex items-center justify-center transition-colors"
            >
              -10
            </button>
            <button
              type="button"
              onClick={() => stepBy(-5)}
              className="h-11 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-mono font-bold rounded-lg text-xs flex items-center justify-center transition-colors"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => stepBy(-1)}
              className="h-11 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 border border-blue-200/80 font-mono font-black rounded-lg text-sm flex items-center justify-center transition-colors"
            >
              -1
            </button>
          </div>

          {/* 下段（進む系）： +1, +5, +10 */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => stepBy(1)}
              className="h-11 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 border border-blue-200/80 font-mono font-black rounded-lg text-sm flex items-center justify-center transition-colors"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => stepBy(5)}
              className="h-11 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-mono font-bold rounded-lg text-xs flex items-center justify-center transition-colors"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => stepBy(10)}
              className="h-11 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-600 font-mono font-bold rounded-lg text-xs flex items-center justify-center transition-colors"
            >
              +10
            </button>
          </div>
        </div>

        {/* 4. コマ送りの直下に直結するイベント登録スロット */}
        {children && <div className="pt-2">{children}</div>}
      </div>
    </div>
  );
};
