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
  bankType?: 'A' | 'B'; // フェーダーバンクの種類
  flashStates?: boolean[]; // フラッシュ状態
  onFlashChange?: (index: number, isFlashing: boolean) => void; // フラッシュ状態変更
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
    1 // 最低1文字
  );

  const faders = [];
  
  for (let i = startIndex; i <= endIndex; i++) {
    // 12と13の間、24と25の間に隙間を追加
    const needsGap = i === 12 || i === 24;
    
    faders.push(
      <div key={i} className={`flex-shrink-0 ${needsGap ? 'ml-4' : ''}`}>
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

  // 動的幅計算（フェーダー幅 + ギャップ + マージンを含む）
  const faderWidth = isTabletMode ? 56 : 48; // フェーダー1個の幅
  const gapWidth = 16; // ml-4のマージン（1rem = 16px）
  const totalGaps = 2; // 12-13間と24-25間
  const baseWidth = (endIndex - startIndex + 1) * faderWidth;
  const gapTotalWidth = totalGaps * gapWidth;
  const totalWidth = baseWidth + gapTotalWidth + 32; // 余裕をもたせる

  return (
    <div 
      className="h-full p-1"
      style={{ 
        width: '100%',
        maxWidth: '100%'
      }}
    >
      <div
        data-fader-inner
        className={`flex gap-1 whitespace-nowrap h-full`}
        style={{
          width: `${totalWidth}px`, // 動的計算された幅
        }}
      >
        {faders}
      </div>
    </div>
  );
}
