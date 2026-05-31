'use client';

import { useState } from 'react';

interface FaderProps {
  index: number;
  value: number;
  label: string;
  onChange: (index: number, value: number) => void;
  isTabletMode?: boolean;
  maxLabelLength?: number;
  onFlash?: (index: number, isFlashing: boolean) => void;
  bankType?: 'A' | 'B';
}

export default function Fader({ index, value, label, onChange, onFlash, bankType = 'A' }: FaderProps) {
  const [isFlashing, setIsFlashing] = useState(false);

  const handleFlashPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const faderNumber = bankType === 'B' ? index + 37 : index + 1;
  const displayValue = isFlashing ? 100 : value;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const knobEl = e.currentTarget as HTMLElement;
    const container = knobEl.closest('.fader-touch-area') as HTMLElement | null;
    if (!container) return;
    const trackRect = container.getBoundingClientRect();
    const knobHeight = 20; // 固定されたCSSノブの高さ
    const usableHeight = trackRect.height - knobHeight;

    const calcValue = (clientY: number) => {
      const posFromBottom = (trackRect.bottom - clientY) - knobHeight / 2;
      const clamped = Math.max(0, Math.min(usableHeight, posFromBottom));
      return Math.round((clamped / usableHeight) * 100);
    };

    onChange(index, calcValue(e.clientY));

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

  const bottomPos = `calc(${value}% - ${(value / 100) * 20}px)`;

  return (
    <div className="bg-gray-100 rounded border border-gray-300 w-full min-w-0 h-full flex flex-col justify-between p-1 overflow-hidden fader-container shadow-sm select-none">
      {/* 100分率数値 */}
      <div className="text-center text-[10px] font-mono text-gray-500 min-h-[14px] leading-tight select-none">
        {displayValue === 100 ? 'FF' : displayValue}
      </div>
      {/* スライダーエリア */}
      <div 
        className="flex items-center justify-center relative select-none fader-touch-area my-1 flex-1 min-h-0"
        style={{ touchAction: 'none' }}
      >
        <div className="relative h-full w-full flex items-center justify-center">
          {/* フェーダー背景（スリット） */}
          <div className="absolute w-[2px] bg-gray-300 border border-gray-400 rounded-sm h-full pointer-events-none"></div>
          
          {/* CSSフェーダーつまみ */}
          <div 
            className="absolute z-10 cursor-grab active:cursor-grabbing bg-black border border-gray-700 rounded-sm flex flex-col justify-center items-center shadow-md"
            onPointerDown={handlePointerDown}
            style={{ 
              bottom: bottomPos,
              width: '90%',
              height: '20px',
              touchAction: 'none'
            }}
          >
            {/* 白のセンターライン */}
            <div className="w-full h-[2px] bg-white opacity-85 pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* 系統番号 */}
      <div className="text-center text-[10px] font-bold text-gray-700 leading-tight select-none opacity-80">
        {faderNumber}
      </div>

      {/* フラッシュランプ */}
      <div className="flex justify-center my-0.5 select-none">
        <div 
          className={`w-1.5 h-1.5 rounded-full border transition-colors ${
            isFlashing 
              ? 'bg-red-500 border-red-400 shadow-red-500/50 shadow-sm' 
              : 'bg-gray-300 border-gray-400'
          }`}
        ></div>
      </div>

      {/* フラッシュボタン */}
      <button
        onPointerDown={handleFlashPointerDown}
        className={`w-full rounded-sm transition-colors border select-none ${
          isFlashing 
            ? 'bg-red-600 border-red-400' 
            : 'bg-gray-700 hover:bg-gray-600 border-gray-500 active:bg-gray-800'
        }`}
        style={{ height: '14px', touchAction: 'none' }}
      ></button>

      {/* 縦書きラベル (SVGを用いて見切れ・折り返しを完全に防止、中央寄せ＆適切な文字サイズでデッドスペースを排除、高さを52pxに抑えてフェーダー長さを確保) */}
      <div 
        className="w-full flex-shrink-1 min-h-0 flex items-center justify-center mt-1 select-none"
        style={{ height: '52px', maxHeight: '52px' }}
      >
        <svg 
          viewBox="0 0 24 52" 
          className="w-full h-full select-none overflow-visible"
        >
          {(() => {
            const chars = Array.from(label);
            const N = chars.length;
            
            // 文字数に応じたフォントサイズ(F)の決定 (最大11px)
            let F = 11;
            if (N > 5) {
              F = 8.5;
            }

            // 文字間隔(S)の決定。最大文字間隔を制限して文字が離れすぎないようにする（デッドスペース排除）
            const maxSpacing = F * 1.1;
            let S = N > 1 ? (46 - F) / (N - 1) : 0;
            if (N > 1 && S > maxSpacing) {
              S = maxSpacing;
            }

            // 全体の高さと開始位置(startY)の計算（中央寄せ）
            const textHeight = N > 1 ? (N - 1) * S + F : F;
            const startY = (52 - textHeight) / 2 + F / 2;

            return chars.map((char, charIndex) => {
              const y = startY + charIndex * S;
              const isProlongedMark = char === 'ー';
              
              return (
                <text
                  key={charIndex}
                  x="12"
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#1f2937"
                  fontWeight="700"
                  transform={isProlongedMark ? `rotate(90, 12, ${y})` : undefined}
                  style={{ fontSize: `${F}px` }}
                >
                  {char}
                </text>
              );
            });
          })()}
        </svg>
      </div>
    </div>
  );
}
