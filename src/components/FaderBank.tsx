'use client';

import Fader from './Fader';

interface FaderBankProps {
  startIndex: number;
  endIndex: number;
  faderValues: number[];
  lightDefinitions: string[];
  onFaderChange: (index: number, value: number) => void;
  isTabletMode?: boolean;
  scrollLeft?: number;
  onScrollChange?: (scrollLeft: number) => void;
  bankType?: 'A' | 'B';
  flashStates?: boolean[];
  onFlashChange?: (index: number, isFlashing: boolean) => void;
}

export default function FaderBank({ 
  startIndex, 
  endIndex, 
  faderValues, 
  lightDefinitions, 
  onFaderChange,
  isTabletMode = false,
  bankType = 'A',
  onFlashChange
}: FaderBankProps) {

  // 最大ラベル文字数を計算
  const maxLabelLength = Math.max(
    ...lightDefinitions.slice(startIndex, endIndex + 1).map(label => label.length),
    1
  );

  const faders = [];
  
  for (let i = startIndex; i <= endIndex; i++) {
    // 12と13の間、24と25の間に隙間を追加
    const needsGap = i === 12 || i === 24;
    
    faders.push(
      <div 
        key={i} 
        className={`flex-1 min-w-0 h-full ${needsGap ? 'ml-1.5 sm:ml-2.5' : ''}`}
      >
        <Fader
          index={i}
          value={faderValues[i]}
          label={lightDefinitions[i]}
          onChange={onFaderChange}
          isTabletMode={isTabletMode}
          maxLabelLength={maxLabelLength}
          onFlash={onFlashChange}
          bankType={bankType}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full p-0.5 overflow-hidden select-none">
      <div className="flex gap-[2px] w-full h-full select-none">
        {faders}
      </div>
    </div>
  );
}
