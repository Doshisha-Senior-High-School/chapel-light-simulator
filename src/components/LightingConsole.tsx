'use client';

import { useState, useEffect } from 'react';
import LightPreview from './LightPreview';
import FaderBank from './FaderBank';
import CrossFader from './CrossFader';

// PWA用の型定義
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

const LIGHT_DEFINITIONS = [
    'FS下手', 'FS上手', 'GS下手', 'GS上手', 'エリアA', 'エリアB', 'エリアC', 'エリアD', 'エリアE', 'エリアF', 'エリアG', 'エリアH',
    'アンバー', '青緑', '黄', '青紫', '→アッパー', '青', '緑', '赤', '→ロアー', '青', '緑', '赤',
    'サス下手', 'サス中央', 'サス上手', '', 'SS下手', 'SS上手', '', 'キャット間接', '1階側面スポ', '2階スポット', '1階座席天井', 'ステージ天井'
];

export default function LightingConsole() {
    const [aFaderValues, setAFaderValues] = useState<number[]>(new Array(36).fill(0));
    const [bFaderValues, setBFaderValues] = useState<number[]>(new Array(36).fill(0));
    const [aFlashStates, setAFlashStates] = useState<boolean[]>(new Array(36).fill(false));
    const [bFlashStates, setBFlashStates] = useState<boolean[]>(new Array(36).fill(false));
  const [crossFaderValue, setCrossFaderValue] = useState(0); // デフォルトA-100% (0=A系統100%)
  const [isTabletMode, setIsTabletMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showPWAWarning, setShowPWAWarning] = useState(false);
  const [showOrientationWarning, setShowOrientationWarning] = useState(false);    useEffect(() => {
    // Hydration完了フラグを設定
    setIsHydrated(true);
    
    // PWAインストールプロンプトを保存
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.deferredPrompt = e as BeforeInstallPromptEvent;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);    const checkDeviceType = () => {
      const userAgent = navigator.userAgent;
      const isTablet = /iPad|Android|Tablet/.test(userAgent) || 
                      (window.innerWidth >= 768 && window.innerHeight >= 1024);
      setIsTabletMode(isTablet);
    };

    const checkWarnings = () => {
      // PWAチェック
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as Navigator).standalone === true;
      setShowPWAWarning(!isPWA);

      // デバイスチェック（iPadチェックは削除）
      // setShowDeviceWarning(false); // 常に非表示

      // 画面向きチェック
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowOrientationWarning(!isPortrait);
    };

    checkDeviceType();
    checkWarnings();
    
    window.addEventListener('resize', checkDeviceType);
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        checkDeviceType();
        checkWarnings();
      }, 100);
    });

    return () => {
      window.removeEventListener('resize', checkDeviceType);
      window.removeEventListener('orientationchange', checkDeviceType);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

    // A系統とB系統の値をクロスフェーダーで合成（クロスフェーダー表示: 上A / 下B）
    const getCombinedFaderValues = () => {
        const combined: number[] = new Array(36).fill(0);
        // クロスフェーダー比率（通常時）
        const aRatio = (100 - crossFaderValue) / 100;
        const bRatio = crossFaderValue / 100;

        for (let i = 0; i < 36; i++) {
            // どちらかがフラッシュ中ならクロスフェーダー位置に関係なく 100% (HTP 的優先)
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

    // ページレベルの縦スクロール防止と拡大禁止
    useEffect(() => {
        const preventVerticalScroll = (e: WheelEvent) => {
            // フェーダーエリア外での縦スクロールを防止
            const target = e.target as Element;
            if (!target.closest('.fader-bank-scroll')) {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                }
            }
        };

        const preventTouchScroll = (e: TouchEvent) => {
            // フェーダーバンクエリア内でのタッチスクロールは許可
            const target = e.target as Element;
            if (target.closest('.fader-bank-scroll') || target.closest('.fader-container')) {
                return; // スクロールとフェーダー操作を許可
            }
            // その他のエリアでは縦スクロールを防止
            e.preventDefault();
        };

        // 拡大防止のためのタッチイベント制御
        const preventZoom = (e: TouchEvent) => {
            // 2本指以上のタッチ（ピンチジェスチャー）を防止
            if (e.touches.length > 1) {
                e.preventDefault();
                return;
            }

            // フェーダーエリア内では1本指タッチを許可
            const target = e.target as Element;
            if (target.closest('.fader-bank-scroll') || target.closest('.fader-container') || target.closest('.crossfader-container')) {
                return; // フェーダー操作とスクロールを許可
            }

            // その他の場所では基本的にタッチを制限
            e.preventDefault();
        };

        const preventTouchStart = (e: TouchEvent) => {
            // 2本指以上のタッチを防止（ピンチズーム防止）
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        document.addEventListener('wheel', preventVerticalScroll, { passive: false });
        document.addEventListener('touchmove', preventTouchScroll, { passive: false });
        document.addEventListener('touchstart', preventTouchStart, { passive: false });
        document.addEventListener('touchmove', preventZoom, { passive: false });

        // タブレット用の追加処理 - hydration後にのみ実行
        if (isHydrated && isTabletMode) {
            // タブレットでのスクロール改善
            const faderScrollArea = document.querySelector('.fader-bank-scroll');
            if (faderScrollArea) {
                // タッチスクロールを確実に有効化
                faderScrollArea.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                }, { passive: true });

                faderScrollArea.addEventListener('touchmove', (e) => {
                    e.stopPropagation();
                }, { passive: true });
            }
        }

        return () => {
            document.removeEventListener('wheel', preventVerticalScroll);
            document.removeEventListener('touchmove', preventTouchScroll);
            document.removeEventListener('touchstart', preventTouchStart);
            document.removeEventListener('touchmove', preventZoom);
        };
    }, [isHydrated, isTabletMode]);

    // 警告モーダルコンポーネント
    const WarningModal = ({ show, title, message, onClose, showInstallButton }: {
        show: boolean;
        title: string;
        message: string;
        onClose: () => void;
        showInstallButton?: boolean;
    }) => {
        if (!show) return null;
        
        const handleInstall = () => {
            // PWAインストールプロンプトが利用可能な場合のみ
            const deferredPrompt = window.deferredPrompt;
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(() => {
                    window.deferredPrompt = undefined;
                    onClose();
                });
            } else {
                // 手動インストール案内
                alert('ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選択してください。');
            }
        };
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg max-w-md mx-4">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
                    <p className="text-gray-600 mb-6">{message}</p>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                        >
                            無視
                        </button>
                        {showInstallButton && (
                            <button
                                onClick={handleInstall}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                対応する
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col bg-white text-gray-900 overflow-hidden">
            {/* ヘッダー */}
            <header className="bg-gray-100 border-b border-gray-300 p-3 flex-shrink-0">
                <div className="flex items-center justify-center w-full">
                    <h1 className="text-lg font-bold text-gray-800 text-center">
                        同志社高等学校 チャペル照明シミュレーター
                    </h1>
                </div>
            </header>

            {/* プレビュー */}
            <div
                className="bg-gray-900 p-2 border-b border-gray-300 flex-shrink-0"
                style={{
                    height: '25vh',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    zIndex: 1
                }}
            >
                <LightPreview faderValues={getCombinedFaderValues()} />
            </div>

            {/* メインエリア（統合A/B系統、クロスフェーダー） */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左側：統合A/B系統フェーダー */}
        <div className="w-full" style={{ width: 'calc(100vw - 60px)' }}>
          {/* 共通スクロールコンテナ */}
          <div 
            className="h-full overflow-x-auto overflow-y-hidden fader-bank-scroll"
            onWheel={(e) => {
              // 縦方向のホイールスクロールを横方向に変換
              if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            style={{ 
              touchAction: 'pan-x pinch-zoom',
              overscrollBehavior: 'none',
              width: '100%',
              maxWidth: '100%',
              WebkitOverflowScrolling: 'touch', // iOS用の滑らかなスクロール
              minHeight: 0
            }}
          >
            {/* 内容全体コンテナ */}
            <div 
              className="h-full flex flex-col" 
              style={{ 
                width: isHydrated ? `${(() => {
                  const faderWidth = isTabletMode ? 56 : 48;
                  const gapWidth = 16;
                  const totalGaps = 2;
                  const baseWidth = 36 * faderWidth;
                  const gapTotalWidth = totalGaps * gapWidth;
                  return baseWidth + gapTotalWidth + 32; // 40pxのラベル幅を削除
                })()}px` : '2000px' // SSR用のフォールバック幅
              }}
            >
              {/* B系統（上段） */}
              <div className="flex-1 flex">
                {/* B系統ラベル（左側固定） */}
                <div className="bg-gray-200 p-2 flex items-center justify-center border-r border-gray-400 flex-shrink-0 sticky left-0 z-20" style={{ width: '40px' }}>
                  <div className={`font-bold text-gray-800 ${isTabletMode ? 'text-lg' : 'text-base'}`} style={{ writingMode: 'vertical-rl' }}>
                    Ｂ
                  </div>
                </div>                                {/* B系統フェーダーエリア */}
                                <div className="flex-1">
                                    <FaderBank
                                        startIndex={0}
                                        endIndex={35}
                                        faderValues={bFaderValues}
                                        lightDefinitions={LIGHT_DEFINITIONS}
                                        onFaderChange={updateBFader}
                                        isTabletMode={isHydrated ? isTabletMode : false}
                                        bankType="B"
                                        onFlashChange={handleBFlash}
                                    />
                                </div>
                            </div>

              {/* A系統（下段） */}
              <div className="flex-1 flex border-t border-gray-400">
                {/* A系統ラベル（左側固定） */}
                <div className="bg-gray-200 p-2 flex items-center justify-center border-r border-gray-400 flex-shrink-0 sticky left-0 z-20" style={{ width: '40px' }}>
                  <div className={`font-bold text-gray-800 ${isTabletMode ? 'text-lg' : 'text-base'}`} style={{ writingMode: 'vertical-rl' }}>
                    Ａ
                  </div>
                </div>                                {/* A系統フェーダーエリア */}
                                <div className="flex-1">
                                    <FaderBank
                                        startIndex={0}
                                        endIndex={35}
                                        faderValues={aFaderValues}
                                        lightDefinitions={LIGHT_DEFINITIONS}
                                        onFaderChange={updateAFader}
                                        isTabletMode={isHydrated ? isTabletMode : false}
                                        bankType="A"
                                        onFlashChange={handleAFlash}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>        {/* 右側：縦型クロスフェーダー（固定） */}
                <div className="bg-gray-200 border-l border-gray-400 flex-shrink-0 p-1 flex flex-col justify-center" style={{ width: '60px', zIndex: 10, position: 'sticky', right: 0 }}>
                    <div style={{ height: '50%' }}>
                        <CrossFader
                            value={crossFaderValue}
                            onChange={setCrossFaderValue}
                            isTabletMode={isHydrated ? isTabletMode : false}
                            isVertical={true}
                        />
                    </div>
                </div>
            </div>

            {/* フッター */}
            <div className="bg-gray-100 border-t border-gray-300 p-1 flex-shrink-0">
                <div className="flex items-center justify-center w-full">
                    <p className="text-xs text-gray-600">
                        ©︎ 2025 Kanata Tsuda. All Rights Reserved.
                    </p>
                </div>
            </div>

            {/* 警告モーダル */}
            <WarningModal
                show={showPWAWarning}
                title="ホーム画面に追加してください"
                message="共有マーク↑から「ホーム画面に追加」を選択してください。"
                onClose={() => setShowPWAWarning(false)}
                showInstallButton={true}
            />
            <WarningModal
                show={showOrientationWarning}
                title="縦向きで使用してください"
                message="このアプリは縦向きでの利用を想定しています。デバイスを縦向きにしてください。"
                onClose={() => setShowOrientationWarning(false)}
            />
        </div>
    );
}
