'use client';

import { useEffect, useRef } from 'react';

interface LightPreviewProps {
  faderValues: number[];
  lightDefinitions: string[];
}

export default function LightPreview({ faderValues, lightDefinitions }: LightPreviewProps) {
  const svgRef = useRef<HTMLObjectElement>(null);

  // SVGの各要素を制御するマッピング
  const lightMapping = [
    { index: 0, svgId: 'FS下手' },        // 1番: FS下手
    { index: 1, svgId: 'FS上手' },        // 2番: FS上手
    { index: 2, svgId: 'GS下手' },        // 3番: GS下手
    { index: 3, svgId: 'GS上手' },        // 4番: GS上手
    { index: 4, svgId: 'A' },             // 5番: エリアA
    { index: 5, svgId: 'B' },             // 6番: B
    { index: 6, svgId: 'C' },             // 7番: C
    { index: 7, svgId: 'D' },             // 8番: D
    { index: 8, svgId: 'E' },             // 9番: E
    { index: 9, svgId: 'F' },             // 10番: F
    { index: 10, svgId: 'G' },            // 11番: G
    { index: 11, svgId: 'H' },            // 12番: H
    { index: 12, svgId: '地明かりアンバー' }, // 13番: アンバー
    { index: 13, svgId: '地明かり青緑' },    // 14番: 青緑
    { index: 14, svgId: '地明かり黄' },     // 15番: 黄
    { index: 15, svgId: '地明かり青紫' },    // 16番: 青紫
    // 17番: 空き
    { index: 17, svgId: 'ローホリ', color: '#0000ff' }, // 18番: 青
    { index: 18, svgId: 'アッパーホリ', color: '#00ff00' }, // 19番: 緑
    { index: 19, svgId: 'ローホリ', color: '#ff0000' }, // 20番: 赤
    // 21番: 空き
    { index: 21, svgId: 'ローホリ', color: '#0000ff' }, // 22番: 青
    { index: 22, svgId: 'アッパーホリ', color: '#00ff00' }, // 23番: 緑
    { index: 23, svgId: 'アッパーホリ', color: '#ff0000' }, // 24番: 赤
    { index: 24, svgId: 'サス下手' },       // 25番: サス下手
    { index: 25, svgId: 'サス中央' },       // 26番: サス中央
    { index: 26, svgId: 'サス上手' },       // 27番: サス上手
    // 28番: 空き
    { index: 28, svgId: 'SS下手' },        // 29番: SS下手
    { index: 29, svgId: 'SS上手' },        // 30番: SS上手
    // 31-36番: 空き
  ];

  useEffect(() => {
    const updateSVGElements = () => {
      if (!svgRef.current) return;
      
      // SVGが完全に読み込まれるまで待機
      const checkSVG = () => {
        try {
          const svgDoc = svgRef.current?.contentDocument;
          if (!svgDoc) {
            setTimeout(checkSVG, 100);
            return;
          }

          lightMapping.forEach(({ index, svgId, color }) => {
            const element = svgDoc.getElementById(svgId);
            if (element) {
              const faderValue = faderValues[index] / 100; // 0-1の範囲
              const opacity = faderValue * 0.3; // 0-0.3の範囲（30%まで）
              
              // opacityで制御
              element.style.opacity = opacity.toString();
              
              // 特定の色が指定されている場合は色も変更
              if (color && opacity > 0) {
                const shapes = element.querySelectorAll('circle, ellipse, polygon, path');
                
                shapes.forEach(shape => {
                  shape.setAttribute('fill', color);
                });
              }
              
              // ホリゾントライトの場合は発光効果を追加
              if (svgId.includes('ホリ') && opacity > 0) {
                element.style.filter = `drop-shadow(0 0 ${10 * opacity}px currentColor)`;
              }
            }
          });
        } catch (error) {
          console.log('SVG更新エラー:', error);
          setTimeout(checkSVG, 100);
        }
      };

      checkSVG();
    };

    updateSVGElements();
  }, [faderValues]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="relative flex-1 w-full overflow-hidden">
        <object
          ref={svgRef}
          data="/chapel.svg"
          type="image/svg+xml"
          className="w-full h-full object-contain pointer-events-none"
          style={{ 
            pointerEvents: 'none', 
            userSelect: 'none',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
          onLoad={() => {
            // SVG読み込み完了後に初期化
            setTimeout(() => {
              if (svgRef.current?.contentDocument) {
                // 初期状態では全ての要素を非表示
                lightMapping.forEach(({ svgId }) => {
                  const element = svgRef.current?.contentDocument?.getElementById(svgId);
                  if (element) {
                    element.style.opacity = '0';
                  }
                });
              }
            }, 100);
          }}
        >
          チャペルSVGが読み込めませんでした
        </object>
      </div>
    </div>
  );
}
