"use client";

import { useRef } from 'react';

interface CrossFaderProps {
  value: number; // 0=A 100=B
  onChange: (value: number) => void;
  isVertical?: boolean;
}

export default function CrossFader({ value, onChange, isVertical = false }: CrossFaderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);

  const knobW = 46; 
  const knobH = 24; 

  const getGeometry = () => {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return { usable: 0, knobLong: 0, trackLong: 0 };
    const trackRect = track.getBoundingClientRect();
    const knobLong = isVertical ? knobH : knobW;
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

  const { usable } = getGeometry();
  const posPx = (usable * value) / 100;

  if (isVertical) {
    return (
      <div className="h-full flex flex-col items-center justify-between crossfader-container py-1 select-none">
        <div className="text-[10px] text-gray-800 font-bold mb-1 select-none">A</div>
        
        {/* スライドレール */}
        <div 
          className="flex-1 relative mx-1 crossfader-track select-none w-4" 
          ref={trackRef} 
          style={{ minHeight: '100px', touchAction: 'none' }}
        >
          {/* レール背景スリット */}
          <div className="absolute inset-y-0 bg-gray-300 rounded-sm border border-gray-400" style={{ width: '4px', left: '50%', transform: 'translateX(-50%)' }}></div>
          
          {/* CSSクロスフェーダーノブ（赤） */}
          <div
            ref={knobRef}
            className="absolute z-20 cursor-grab active:cursor-grabbing bg-red-600 border border-red-800 rounded shadow-md flex flex-col justify-center items-center"
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
            {/* 白のセンターライン */}
            <div className="w-full h-[2.5px] bg-white opacity-85 pointer-events-none"></div>
          </div>
        </div>
        
        <div className="text-[10px] text-gray-800 font-bold mt-1 select-none">B</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 rounded-lg p-3 border border-gray-300 h-14 flex items-center gap-4 crossfader-container select-none">
      <div className="text-xs text-gray-800 font-bold flex-shrink-0 select-none">A</div>
      <div className="flex-1 relative crossfader-track select-none h-4" ref={trackRef} style={{ minWidth: '120px', touchAction: 'none' }}>
        <div className="absolute inset-x-0 bg-gray-300 rounded-sm border border-gray-400" style={{ height: '4px', top: '50%', transform: 'translateY(-50%)' }}></div>
        <div
          ref={knobRef}
          className="absolute z-20 cursor-grab active:cursor-grabbing bg-red-600 border border-red-800 rounded shadow-md flex flex-col justify-center items-center"
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
          <div className="w-[2.5px] h-full bg-white opacity-85 pointer-events-none"></div>
        </div>
      </div>
      <div className="text-xs text-gray-800 font-bold flex-shrink-0 select-none">B</div>
    </div>
  );
}
