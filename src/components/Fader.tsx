'use client';

import { useState } from 'react';
import Image from 'next/image';

interface FaderProps {
  index: number;
  value: number;
  label: string;
  onChange: (index: number, value: number) => void;
  isTabletMode?: boolean;
  maxLabelLength?: number; // 最大ラベル文字数
  onFlash?: (index: number, isFlashing: boolean) => void; // フラッシュ状態の通知
  bankType?: 'A' | 'B'; // フェーダーバンクの種類
}

export default function Fader({ index, value, label, onChange, isTabletMode = false, maxLabelLength = 4, onFlash, bankType = 'A' }: FaderProps) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [originalValue, setOriginalValue] = useState(0); // フラッシュ前の値を保存

  // フラッシュ（押している間だけ 100%） Pointer Events で統一
  const handleFlashPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOriginalValue(value);
    setIsFlashing(true);
    onFlash?.(index, true);
    const release = () => {
      setIsFlashing(false);
      onFlash?.(index, false);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
    };
    window.addEventListener('pointerup', release, { once: true });
    window.addEventListener('pointercancel', release, { once: true });
    window.addEventListener('blur', release, { once: true });
  };

  // チャンネル番号の計算：A系統は1-36、B系統は37-72
  const faderNumber = bankType === 'B' ? index + 37 : index + 1;
  const widthClass = isTabletMode ? 'w-12' : 'w-10';

  // フラッシュ時の値計算（フェーダー位置は変えずに100%出力）
  const displayValue = isFlashing ? 100 : value;

  // Pointer Drag 統一
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const knobEl = e.currentTarget as HTMLElement;
    const container = knobEl.closest('.fader-touch-area') as HTMLElement | null;
    if (!container) return;
    const trackRect = container.getBoundingClientRect();
    const knobHeight = knobEl.offsetHeight || (isTabletMode ? 40 : 36);
    const usableHeight = trackRect.height - knobHeight; // px 可動域

    const calcValue = (clientY: number) => {
      const posFromBottom = (trackRect.bottom - clientY) - knobHeight / 2; // 下基準
      const clamped = Math.max(0, Math.min(usableHeight, posFromBottom));
      return Math.round((clamped / usableHeight) * 100);
    };

    // 初期値反映
    onChange(index, calcValue(e.clientY));

    // キャプチャで安定
    knobEl.setPointerCapture(e.pointerId);
    const move = (pe: PointerEvent) => {
      onChange(index, calcValue(pe.clientY));
    };
    const end = () => {
      knobEl.releasePointerCapture(e.pointerId);
      knobEl.removeEventListener('pointermove', move);
      knobEl.removeEventListener('pointerup', end);
      knobEl.removeEventListener('pointercancel', end);
    };
    knobEl.addEventListener('pointermove', move);
    knobEl.addEventListener('pointerup', end, { once: true });
    knobEl.addEventListener('pointercancel', end, { once: true });
  };

  return (
    <div 
      className={`bg-gray-100 rounded-lg p-2 border border-gray-300 ${widthClass} h-full flex flex-col flex-shrink-0 overflow-hidden fader-container`}
    >
      {/* 100分率数値 */}
      <div className={`text-center text-xs text-gray-700 mb-1 flex-shrink-0`} style={{ lineHeight: '1', minHeight: '14px' }}>
        {displayValue === 100 ? 'FF' : displayValue}
      </div>

      {/* フェーダーつまみ（SVG使用） */}
      <div 
        className="flex items-center justify-center mb-1 relative select-none fader-touch-area"
        style={{ height: '140px', flexShrink: 0 }} // 180px → 140px に縮小
      >
         <div className="relative h-full w-4 flex items-center">
           {/* フェーダー背景（白） - 操作不可 */}
           <div className="absolute inset-x-0 bg-gray-300 rounded-sm border border-gray-500 pointer-events-none" style={{ height: '100%', width: '3px', left: '50%', transform: 'translateX(-50%)' }}></div>          {/* フェーダーつまみ（SVG） - つまみのみ操作可能 */}
          <div 
            className="absolute transition-all duration-50 ease-linear z-10 cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            style={{ 
              // 可動範囲: 140px(新しい固定値) - ノブ高さ
              bottom: `${(value / 100) * (140 - (isTabletMode ? 40 : 36))}px`,
              left: '50%',
              transform: 'translate(-50%, 0)',
              width: isTabletMode ? '50px' : '45px', // 40/36px → 50/45px
              height: isTabletMode ? '40px' : '36px', // 32/28px → 40/36px
              touchAction: 'none'
            }}
          >
            <Image
              src="/fader.svg"
              alt="Fader"
              width={isTabletMode ? 50 : 45}
              height={isTabletMode ? 40 : 36}
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* 系統番号 */}
      <div className={`text-center text-xs font-bold text-gray-800 mb-1 flex-shrink-0`} style={{ opacity: 0.7, lineHeight: '1', minHeight: '14px' }}>
        {faderNumber}
      </div>

      {/* フラッシュ検出ランプ */}
      <div className="flex justify-center mb-1 flex-shrink-0" style={{ minHeight: '12px' }}>
        <div 
          className={`w-2 h-2 rounded-full border transition-colors ${
            isFlashing 
              ? 'bg-red-500 border-red-400 shadow-red-500/50 shadow-sm' 
              : 'bg-gray-300 border-gray-400'
          }`}
        ></div>
      </div>

      {/* フラッシュボタン（正方形） */}
      <button
        onPointerDown={handleFlashPointerDown}
        className={`w-full rounded transition-colors mb-1 flex-shrink-0 ${
          isFlashing 
            ? 'bg-red-600 border border-red-400' 
            : 'bg-gray-700 hover:bg-gray-600 border border-gray-500'
        }`}
        style={{ height: '20px' }} // 高さを最小化
      >
      </button>

      {/* タイトル（フェーダーの定義）高さ拡大 */}
      <div 
        className={`text-center text-gray-700 flex items-center justify-center flex-1 min-h-[100px]`}
        style={{ 
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          lineHeight: '1.25',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: label.length > 4 ? '16px' : (label.length > 3 ? '18px' : '20px'), // 文字サイズを元に戻す
          minHeight: '100px' // 元に戻す
        }}
      >
        {label}
      </div>
    </div>
  );
}
