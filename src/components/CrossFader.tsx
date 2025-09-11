"use client";

import { useRef } from 'react';
import Image from 'next/image';

interface CrossFaderProps {
  value: number; // 0=A 100=B
  onChange: (value: number) => void;
  isTabletMode?: boolean;
  isVertical?: boolean;
}

export default function CrossFader({ value, onChange, isTabletMode = false, isVertical = false }: CrossFaderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);

  const getGeometry = () => {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return { usable: 0, knobLong: 0, trackLong: 0 };
    const trackRect = track.getBoundingClientRect();
    const knobLong = isVertical ? knob.offsetHeight : knob.offsetWidth;
    const trackLong = isVertical ? trackRect.height : trackRect.width;
    return { usable: trackLong - knobLong, knobLong, trackLong };
  };

  const calcValue = (clientX: number, clientY: number) => {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return value;
    const rect = track.getBoundingClientRect();
    const { usable, knobLong } = getGeometry();
    if (usable <= 0) return value;
    if (isVertical) {
      const pos = clientY - rect.top - knobLong / 2;
      const clamped = Math.max(0, Math.min(usable, pos));
      return Math.round((clamped / usable) * 100);
    } else {
      const pos = clientX - rect.left - knobLong / 2;
      const clamped = Math.max(0, Math.min(usable, pos));
      return Math.round((clamped / usable) * 100);
    }
  };

  const startMouse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(calcValue(e.clientX, e.clientY));
    const move = (me: MouseEvent) => onChange(calcValue(me.clientX, me.clientY));
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const startTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches[0];
    onChange(calcValue(t.clientX, t.clientY));
    const move = (te: TouchEvent) => {
      te.preventDefault();
      const tt = te.touches[0];
      onChange(calcValue(tt.clientX, tt.clientY));
    };
    const end = () => {
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
    };
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
  };

  const knobW = isTabletMode ? 60 : 54; // フェーダーより大きく
  const knobH = isTabletMode ? 48 : 42; // フェーダーより大きく
  const { usable } = getGeometry();
  const posPx = (usable * value) / 100; // 0..usable (中心位置基準)

  if (isVertical) {
    return (
      <div className="h-full flex flex-col items-center justify-between crossfader-container">
        <div className={`${isTabletMode ? 'text-sm' : 'text-xs'} text-gray-800 font-bold mb-2`}>A</div>
        <div className="flex-1 relative mx-2 crossfader-track select-none w-4" ref={trackRef} style={{ minHeight: '100px' }}>
          <div className="absolute inset-y-0 bg-gray-300 rounded-sm border border-gray-500" style={{ width: '4px', left: '50%', transform: 'translateX(-50%)' }}></div>
          <div
            ref={knobRef}
            className="absolute z-20 cursor-grab active:cursor-grabbing transition-all duration-50 ease-linear"
            style={{
              top: `${posPx + knobH / 2}px`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${knobW}px`,
              height: `${knobH}px`,
              touchAction: 'none'
            }}
            onMouseDown={startMouse}
            onTouchStart={startTouch}
          >
            <Image src="/crossfader.svg" alt="CrossFader" width={knobW} height={knobH} className="w-full h-full object-contain pointer-events-none" />
          </div>
        </div>
        <div className={`${isTabletMode ? 'text-sm' : 'text-xs'} text-gray-800 font-bold mt-2`}>B</div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-100 rounded-lg p-3 border border-gray-300 ${isTabletMode ? 'h-20' : 'h-16'} flex items-center gap-4 crossfader-container`}>
      <div className={`${isTabletMode ? 'text-sm' : 'text-xs'} text-gray-800 font-bold flex-shrink-0`}>A</div>
      <div className="flex-1 relative crossfader-track select-none" ref={trackRef} style={{ minWidth: '160px' }}>
        <div className="absolute inset-y-0 bg-gray-300 rounded-sm border border-gray-500" style={{ width: '100%', height: '4px', top: '50%', transform: 'translateY(-50%)' }}></div>
        <div
          ref={knobRef}
            className="absolute z-20 cursor-grab active:cursor-grabbing transition-all duration-50 ease-linear"
          style={{
            left: `${posPx + knobW / 2}px`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${knobW}px`,
            height: `${knobH}px`,
            touchAction: 'none'
          }}
          onMouseDown={startMouse}
          onTouchStart={startTouch}
        >
          <Image src="/crossfader.svg" alt="CrossFader" width={knobW} height={knobH} className="w-full h-full object-contain pointer-events-none" />
        </div>
      </div>
      <div className={`${isTabletMode ? 'text-sm' : 'text-xs'} text-gray-800 font-bold flex-shrink-0`}>B</div>
    </div>
  );
}
