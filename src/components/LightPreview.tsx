'use client';

import { useRef, useEffect, useMemo } from 'react';

interface LightPreviewProps {
  faderValues: number[];
}

export default function LightPreview({ faderValues }: LightPreviewProps) {
  const svgRef = useRef<HTMLObjectElement>(null);

  // SVGの各要素を制御するマッピング
  const lightMapping = useMemo(() => [
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
    // 17番: →アッパー
    { index: 17, svgId: 'アッパーホリ', color: '#0000ff' }, // 18番: 青（アッパー）
    { index: 18, svgId: 'アッパーホリ', color: '#00ff00' }, // 19番: 緑（アッパー）
    { index: 19, svgId: 'アッパーホリ', color: '#ff0000' }, // 20番: 赤（アッパー）
    // 21番: →ロアー
    { index: 21, svgId: 'ローホリ', color: '#0000ff' }, // 22番: 青（ロアー）
    { index: 22, svgId: 'ローホリ', color: '#00ff00' }, // 23番: 緑（ロアー）
    { index: 23, svgId: 'ローホリ', color: '#ff0000' }, // 24番: 赤（ロアー）
    { index: 24, svgId: 'サス下手' },       // 25番: サス下手
    { index: 25, svgId: 'サス中央' },       // 26番: サス中央
    { index: 26, svgId: 'サス上手' },       // 27番: サス上手
    // 28番: 空き
    { index: 28, svgId: 'SS下手' },        // 29番: SS下手
    { index: 29, svgId: 'SS上手' },        // 30番: SS上手
    // 31-36番: 空き
  ], []);

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

          // 各SVG要素ごとにグループ化して処理
          const elementGroups: { [key: string]: { index: number, color?: string, faderValue: number }[] } = {};
          
          lightMapping.forEach(({ index, svgId, color }) => {
            const faderValue = faderValues[index] / 100;
            if (!elementGroups[svgId]) {
              elementGroups[svgId] = [];
            }
            elementGroups[svgId].push({ index, color, faderValue });
          });

          // 各SVG要素を更新
          Object.entries(elementGroups).forEach(([svgId, controllers]) => {
            const element = svgDoc.getElementById(svgId);
            if (!element) return;

            // アクティブなコントローラーを見つける（フェーダー値が0より大きい）
            const activeControllers = controllers.filter(c => c.faderValue > 0);
            
            if (activeControllers.length === 0) {
              // すべてのフェーダーが0の場合は非表示にし、CSSクラスを復元
              element.style.opacity = '0';
              element.style.filter = 'none';
              
              // CSSクラスを復元
              if (element.hasAttribute('data-original-class')) {
                element.setAttribute('class', element.getAttribute('data-original-class') || '');
                element.removeAttribute('data-original-class');
              }
              
              // 子要素のCSSクラスも復元
              const shapes = element.querySelectorAll('*');
              shapes.forEach(shape => {
                const svgShape = shape as SVGElement;
                if (svgShape.hasAttribute('data-original-class')) {
                  svgShape.setAttribute('class', svgShape.getAttribute('data-original-class') || '');
                  svgShape.removeAttribute('data-original-class');
                }
              });
            } else {
              // 色が指定されているコントローラーをチェック
              const colorControllers = activeControllers.filter(controller => controller.color);
              
              if (colorControllers.length === 0) {
                // 色指定のないコントローラーのみの場合は、明度のみを制御
                let maxOpacity = 0;
                activeControllers.forEach(controller => {
                  maxOpacity = Math.max(maxOpacity, controller.faderValue);
                });
                
                const opacity = Math.min(maxOpacity * 0.3, 0.3);
                element.style.opacity = opacity.toString();
                element.style.filter = 'none';
                
                // 元の色を保持（色変更は行わない）
                const shapes = element.querySelectorAll('*');
                shapes.forEach(shape => {
                  const svgShape = shape as SVGElement;
                  // CSSクラスを復元して元の色を保持
                  if (svgShape.hasAttribute('data-original-class')) {
                    svgShape.setAttribute('class', svgShape.getAttribute('data-original-class') || '');
                    svgShape.removeAttribute('data-original-class');
                  }
                });
              } else {
                // RGB色の加算混合を計算
                let totalR = 0, totalG = 0, totalB = 0;
                let maxOpacity = 0;
                
                activeControllers.forEach(controller => {
                  const intensity = controller.faderValue;
                  maxOpacity = Math.max(maxOpacity, intensity);
                  
                  if (controller.color) {
                    // 色をRGBに分解
                    const hex = controller.color.replace('#', '');
                    const r = parseInt(hex.substr(0, 2), 16);
                    const g = parseInt(hex.substr(2, 2), 16);
                    const b = parseInt(hex.substr(4, 2), 16);
                    
                    // 強度に基づいて色を加算
                    totalR += r * intensity;
                    totalG += g * intensity;
                    totalB += b * intensity;
                  }
                });
                
                // 最大値を255に正規化
                const maxValue = Math.max(totalR, totalG, totalB);
                if (maxValue > 255) {
                  totalR = (totalR / maxValue) * 255;
                  totalG = (totalG / maxValue) * 255;
                  totalB = (totalB / maxValue) * 255;
                }
                
                // 最終的な色を作成
                const finalColor = `rgb(${Math.round(totalR)}, ${Math.round(totalG)}, ${Math.round(totalB)})`;
                const opacity = Math.min(maxOpacity * 0.3, 0.3); // 0-0.3の範囲
                
                element.style.opacity = opacity.toString();
                
                // 混合された色を適用
                const shapes = element.querySelectorAll('*');
                shapes.forEach(shape => {
                  const svgShape = shape as SVGElement;
                  
                  // CSSクラスを一時的に無効化
                  if (svgShape.hasAttribute('class')) {
                    svgShape.setAttribute('data-original-class', svgShape.getAttribute('class') || '');
                    svgShape.removeAttribute('class');
                  }
                  
                  // 直接的な属性操作
                  svgShape.setAttribute('fill', finalColor);
                  svgShape.setAttribute('stroke', finalColor);
                  
                  // スタイル属性での強制適用
                  svgShape.style.fill = finalColor;
                  svgShape.style.stroke = finalColor;
                  svgShape.style.color = finalColor;
                  
                  // CSS優先度を最高にして強制適用
                  svgShape.style.setProperty('fill', finalColor, 'important');
                  svgShape.style.setProperty('stroke', finalColor, 'important');
                  svgShape.style.setProperty('color', finalColor, 'important');
                  
                  // 他の可能性のある色属性も設定
                  svgShape.setAttribute('stop-color', finalColor);
                  svgShape.style.setProperty('stop-color', finalColor, 'important');
                });
                
                // 要素自体にも色を設定
                if (element.hasAttribute('class')) {
                  element.setAttribute('data-original-class', element.getAttribute('class') || '');
                  element.removeAttribute('class');
                }
                
                element.setAttribute('fill', finalColor);
                element.setAttribute('stroke', finalColor);
                element.style.fill = finalColor;
                element.style.stroke = finalColor;
                element.style.color = finalColor;
                element.style.setProperty('fill', finalColor, 'important');
                element.style.setProperty('stroke', finalColor, 'important');
                element.style.setProperty('color', finalColor, 'important');
                
                // SVGのdefs内のstyleタグを書き換える
                const svgDoc = element.ownerDocument;
                if (svgDoc) {
                  const defs = svgDoc.querySelector('defs');
                  if (defs) {
                    const styleElements = defs.querySelectorAll('style');
                    styleElements.forEach(styleEl => {
                      let cssText = styleEl.textContent || '';
                      // 該当するIDのスタイルを動的に書き換え
                      const idSelector = `#${element.id}`;
                      if (cssText.includes(idSelector)) {
                        // 既存のfillルールを置き換え
                        cssText = cssText.replace(
                          new RegExp(`${idSelector}\\s*{[^}]*}`, 'g'), 
                          `${idSelector} { fill: ${finalColor} !important; stroke: ${finalColor} !important; }`
                        );
                        styleEl.textContent = cssText;
                      }
                    });
                  }
                }
                
                // ホリゾントライトの発光効果
                if (svgId.includes('ホリ')) {
                  element.style.filter = `drop-shadow(0 0 ${10 * opacity}px ${finalColor})`;
                }
              }
            }
          });
        } catch {
          setTimeout(checkSVG, 100);
        }
      };

      checkSVG();
    };

    updateSVGElements();
  }, [faderValues, lightMapping]);

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
