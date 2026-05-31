'use client';

import { useState, useEffect } from 'react';
import LightPreview from './LightPreview';
import FaderBank from './FaderBank';
import CrossFader from './CrossFader';

const LIGHT_DEFINITIONS = [
  'FS下手', 'FS上手', 'GS下手', 'GS上手', 'エリアA', 'エリアB', 'エリアC', 'エリアD', 'エリアE', 'エリアF', 'エリアG', 'エリアH',
  'アンバー', '青緑', '黄', '青紫', '→アッパー', '青', '緑', '赤', '→ロアー', '青', '緑', '赤',
  'サス下手', 'サス中央', 'サス上手', '', 'SS下手', 'SS上手', '', 'キャット間接', '1階側面スポ', '2階スポット', '1階座席天井', 'ステージ天井'
];
interface DocumentWithFullscreen extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

interface HTMLElementWithFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

export default function LightingConsole() {
  const [aFaderValues, setAFaderValues] = useState<number[]>(new Array(36).fill(0));
  const [bFaderValues, setBFaderValues] = useState<number[]>(new Array(36).fill(0));
  const [aFlashStates, setAFlashStates] = useState<boolean[]>(new Array(36).fill(false));
  const [bFlashStates, setBFlashStates] = useState<boolean[]>(new Array(36).fill(false));
  const [crossFaderValue, setCrossFaderValue] = useState(0); // 0 = A系統100%, 100 = B系統100%

  // デバイス・レイアウト状態
  const [deviceType, setDeviceType] = useState<'smartphone' | 'ipad' | 'allowed'>('allowed');
  const [isLandscape, setIsLandscape] = useState(true);
  const [bypassAppRedirect, setBypassAppRedirect] = useState(false);

  // 全画面表示の状態管理
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false);

  useEffect(() => {
    const doc = document as DocumentWithFullscreen;
    setIsFullscreenSupported(!!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled));

    const handleFullscreenChange = () => {
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const docEl = document.documentElement as HTMLElementWithFullscreen;
      const doc = document as DocumentWithFullscreen;

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  // モーダル表示状態
  const [showAbout, setShowAbout] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [showOrientationWarning, setShowOrientationWarning] = useState(true);

  // デバイスおよび画面の向きの判定
  useEffect(() => {
    const bypassed = sessionStorage.getItem('bypass_app_redirect') === 'true';
    setBypassAppRedirect(bypassed);

    const checkDevice = () => {
      const ua = navigator.userAgent;

      // iPad 判定（iPadOSのSafariデスクトップ表示モードも考慮）
      const isIPad = /iPad/.test(ua) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/.test(ua));

      // スマートフォン判定（iPhone, iPod, Android Mobile）
      const isSmartphone = /iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        (/Android/i.test(ua) && /Mobile/i.test(ua));

      if (isSmartphone) {
        setDeviceType('smartphone');
      } else if (isIPad) {
        setDeviceType('ipad');
        // iPadの場合は、未バイパスなら自動リダイレクトをタイマーで起動
        if (!bypassed) {
          const redirectTimer = setTimeout(() => {
            window.location.href = 'https://go.hunny.co.jp/dhs/light-iOS';
          }, 1500);
          return () => clearTimeout(redirectTimer);
        }
      } else {
        setDeviceType('allowed');
      }
    };

    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkDevice();
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // ページ全体のスクロール・ズーム防止（操作性をネイティブアプリに近づける）
  useEffect(() => {
    const preventDefault = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('button') ||
        target?.closest('a') ||
        target?.closest('.fader-touch-area') ||
        target?.closest('.crossfader-track')
      ) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventDefault, { passive: false });
    document.addEventListener('wheel', preventDefault, { passive: false });

    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchstart', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventDefault);
      document.removeEventListener('wheel', preventDefault);
      document.removeEventListener('touchstart', preventZoom);
    };
  }, []);

  // A系統とB系統の値をクロスフェーダーで合成（HTP/フラッシュ優先）
  const getCombinedFaderValues = () => {
    const combined: number[] = new Array(36).fill(0);
    const aRatio = (100 - crossFaderValue) / 100;
    const bRatio = crossFaderValue / 100;

    for (let i = 0; i < 36; i++) {
      if (aFlashStates[i] || bFlashStates[i]) {
        combined[i] = 100;
        continue;
      }
      const aLevel = aFaderValues[i] * aRatio;
      const bLevel = bFaderValues[i] * bRatio;
      combined[i] = Math.min(100, aLevel + bLevel);
    }
    return combined;
  };

  const updateAFader = (index: number, value: number) => {
    const newValues = [...aFaderValues];
    newValues[index] = value;
    setAFaderValues(newValues);
  };

  const updateBFader = (index: number, value: number) => {
    const newValues = [...bFaderValues];
    newValues[index] = value;
    setBFaderValues(newValues);
  };

  const handleAFlash = (index: number, isFlashing: boolean) => {
    const newFlashStates = [...aFlashStates];
    newFlashStates[index] = isFlashing;
    setAFlashStates(newFlashStates);
  };

  const handleBFlash = (index: number, isFlashing: boolean) => {
    const newFlashStates = [...bFlashStates];
    newFlashStates[index] = isFlashing;
    setBFlashStates(newFlashStates);
  };

  const resetAllFaders = () => {
    setAFaderValues(new Array(36).fill(0));
    setBFaderValues(new Array(36).fill(0));
    setAFlashStates(new Array(36).fill(false));
    setBFlashStates(new Array(36).fill(false));
    setCrossFaderValue(0);
    setShowResetConfirmation(false);
  };

  // --- スマートフォン表示制限ゲート ---
  if (deviceType === 'smartphone') {
    return (
      <div className="fixed inset-0 bg-gray-950 text-white flex flex-col items-center justify-center p-6 z-50 text-center select-none">
        <div className="max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-4">スマートフォン非対応</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            このチャペル照明シミュレーターは、タブレットまたはPCなどの大画面の横向きデバイス向けに最適化されています。
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            より大きな画面を持つデバイス（iPad、Androidタブレット、パソコンなど）から横画面でアクセスしてください。
          </p>
        </div>
      </div>
    );
  }

  // --- iPad専用アプリ誘導・自動リダイレクト ---
  if (deviceType === 'ipad' && !bypassAppRedirect) {
    return (
      <div className="fixed inset-0 bg-gray-950 text-white flex flex-col items-center justify-center p-6 z-50 text-center select-none">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-4">iPad専用アプリを起動しています</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            App Storeへ自動的にリダイレクトします。<br />
            自動的に移動しない場合は、App Storeを確認してください。
          </p>
          <div className="text-xs text-gray-500 bg-gray-950 p-4 rounded-lg border border-gray-800 mb-8 w-full leading-relaxed">
            ※学校等の制限デバイスでアプリをダウンロードできない場合は、以下のボタンからWeb版をそのままご利用いただけます。
          </div>
          <button
            onClick={() => {
              sessionStorage.setItem('bypass_app_redirect', 'true');
              setBypassAppRedirect(true);
            }}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-semibold transition-all text-sm active:scale-95"
          >
            Web版を使用する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white text-gray-900 overflow-hidden select-none">
      {/* ヘッダー */}
      <header className="bg-gray-100 border-b border-gray-300 p-2 flex-shrink-0 flex items-center justify-between select-none h-11">
        <button
          onClick={() => setShowResetConfirmation(true)}
          className="px-3 py-1 border border-red-500 text-red-650 hover:bg-red-50 text-[11px] font-semibold rounded transition-colors active:scale-95 cursor-pointer"
        >
          リセット
        </button>

        <h1 className="text-xs sm:text-sm font-bold text-gray-800 truncate px-2 text-center flex-1">
          同志社高等学校 チャペル舞台照明シミュレーター
        </h1>

        <div className="flex items-center gap-2">
          {isFullscreenSupported && (
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1 border border-gray-400 text-gray-700 hover:bg-gray-200 text-[11px] font-semibold rounded transition-colors active:scale-95 cursor-pointer"
            >
              {isFullscreen ? '全画面終了' : '全画面表示'}
            </button>
          )}
          <button
            onClick={() => setShowAbout(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded transition-colors active:scale-95 cursor-pointer"
          >
            アプリについて
          </button>
        </div>
      </header>

      {/* プレビューエリア (30vh固定) */}
      <div className="bg-black border-b border-gray-300 flex-shrink-0 overflow-hidden h-[30vh]">
        <LightPreview faderValues={getCombinedFaderValues()} />
      </div>

      {/* メインエリア（B系統、A系統、クロスフェーダー） */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden select-none bg-gray-200">

        {/* 左側：B系統とA系統のフェーダーバンク */}
        <div className="flex-1 flex flex-col h-full min-w-0">

          {/* B系統（上段） */}
          <div className="flex-1 min-h-0 flex items-stretch">
            {/* B系統ラベル */}
            <div className="bg-gray-300 px-2 flex items-center justify-center border-r border-gray-400 flex-shrink-0" style={{ width: '28px' }}>
              <div className="font-bold text-gray-800 text-xs leading-none" style={{ writingMode: 'vertical-rl' }}>
                Ｂ
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <FaderBank
                startIndex={0}
                endIndex={29}
                faderValues={bFaderValues}
                lightDefinitions={LIGHT_DEFINITIONS}
                onFaderChange={updateBFader}
                bankType="B"
                onFlashChange={handleBFlash}
              />
            </div>
          </div>

          {/* A系統（下段） */}
          <div className="flex-1 min-h-0 flex items-stretch border-t border-gray-400">
            {/* A系統ラベル */}
            <div className="bg-gray-300 px-2 flex items-center justify-center border-r border-gray-400 flex-shrink-0" style={{ width: '28px' }}>
              <div className="font-bold text-gray-800 text-xs leading-none" style={{ writingMode: 'vertical-rl' }}>
                Ａ
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <FaderBank
                startIndex={0}
                endIndex={29}
                faderValues={aFaderValues}
                lightDefinitions={LIGHT_DEFINITIONS}
                onFaderChange={updateAFader}
                bankType="A"
                onFlashChange={handleAFlash}
              />
            </div>
          </div>
        </div>

        {/* 右側：縦型クロスフェーダー（全体をカバー） */}
        <div className="bg-gray-300 border-l border-gray-400 flex-shrink-0 p-1 flex flex-col justify-stretch items-center select-none w-14">
          <CrossFader
            value={crossFaderValue}
            onChange={setCrossFaderValue}
            isVertical={true}
          />
        </div>
      </div>

      {/* --- 横向きの推奨警告モーダル --- */}
      {!isLandscape && showOrientationWarning && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-40 p-4">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-sm w-full text-center text-white shadow-2xl">
            <h2 className="text-base font-bold mb-2">横向きで使用してください</h2>
            <p className="text-gray-450 text-xs leading-relaxed mb-5">
              このシミュレーターは横画面での操作に最適化されています。すべてのフェーダーを1画面に収めるため、デバイスを横向きに回転してください。
            </p>
            <button
              onClick={() => setShowOrientationWarning(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-semibold active:scale-95 cursor-pointer"
            >
              閉じる（そのまま使う）
            </button>
          </div>
        </div>
      )}

      {/* --- リセット確認ダイアログ --- */}
      {showResetConfirmation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-white border border-gray-300 p-6 rounded-2xl max-w-sm w-full text-gray-800 shadow-2xl">
            <h3 className="text-base font-bold mb-2">フェーダーのリセット</h3>
            <p className="text-gray-500 text-xs mb-6">
              すべての系統のフェーダー値を0にリセットします。よろしいですか？
            </p>
            <div className="flex justify-end gap-3 text-xs">
              <button
                onClick={() => setShowResetConfirmation(false)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg font-semibold text-gray-700 active:scale-95 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={resetAllFaders}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold active:scale-95 cursor-pointer"
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- アプリについてダイアログ --- */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
          <div className="bg-white border border-gray-300 p-6 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col text-gray-800">
            <div className="flex items-center justify-between border-b pb-3 mb-4 flex-shrink-0">
              <h3 className="text-base font-bold">アプリについて</h3>
              <button
                onClick={() => setShowAbout(false)}
                className="text-gray-500 hover:text-gray-850 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto text-xs space-y-4 pr-1 leading-relaxed">
              <p>
                このアプリは、同志社高等学校のチャペル特設舞台の照明卓の機能を再現したシミュレーターです。
                2025年度の2年生パート有志で制作したものです。
              </p>

              <div className="space-y-2">
                <div className="font-bold">【省略されているチャンネルについて】</div>
                <p>
                  右端の下段 31チャンネル〜36チャンネル、上段 67チャンネル〜72チャンネルはアプリでの表示を省略しています。
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-semibold pl-1">
                  <div>・31ch / 67ch: 空き</div>
                  <div>・32ch / 68ch: キャット間接</div>
                  <div>・33ch / 69ch: 1階側面スポ</div>
                  <div>・34ch / 70ch: 2階スポット</div>
                  <div>・35ch / 71ch: 1階座席天井</div>
                  <div>・36ch / 72ch: ステージ天井</div>
                </div>
                <p className="text-[10px] opacity-80 leading-tight">
                  ※これらは照明卓下部の客電フェーダーで一括操作できるため、演劇の演出で使用する場合を除き、個別に操作する機会はほとんどありません。
                </p>
              </div>

              <div className="border-t pt-3 space-y-3">
                <h4 className="font-bold">関連リンク</h4>
                <div className="space-y-2 font-semibold">
                  <div>
                    <span className="text-gray-500 block text-[10px] font-normal">動画での解説(音響照明パート)</span>
                    <a href="https://go.hunny.co.jp/dhs/light-yt" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      https://go.hunny.co.jp/dhs/light-yt
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] font-normal">お問い合わせ・ご要望</span>
                    <a href="https://hunny.co.jp/contact" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      https://hunny.co.jp/contact
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] font-normal">iPad専用アプリ（App Store）</span>
                    <a href="https://go.hunny.co.jp/dhs/light-iOS" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                      https://go.hunny.co.jp/dhs/light-iOS
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-3 mt-4 text-center text-[10px] text-gray-500 flex-shrink-0">
              &copy; 2025-2026 Kanata Tsuda. All Rights Reserved.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
