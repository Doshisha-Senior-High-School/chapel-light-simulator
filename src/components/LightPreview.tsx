'use client';

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';

interface LightPreviewProps {
  faderValues: number[];
}

interface LightingStyle {
  coreBlur: number;
  glowBlur: number;
  hazeBlur: number;
  coreOpacity: number;
  glowOpacity: number;
  hazeOpacity: number;
  shadow: number;
}

function styleFor(svgId: string): LightingStyle {
  if (svgId.includes('ホリ')) {
    return { coreBlur: 8, glowBlur: 22, hazeBlur: 45, coreOpacity: 0.45, glowOpacity: 0.38, hazeOpacity: 0.22, shadow: 35 };
  }
  if (svgId.startsWith('SS')) {
    return { coreBlur: 10, glowBlur: 25, hazeBlur: 50, coreOpacity: 0.85, glowOpacity: 0.75, hazeOpacity: 0.45, shadow: 30 };
  }
  if (svgId.startsWith('FS') || svgId.startsWith('GS')) {
    return { coreBlur: 10, glowBlur: 25, hazeBlur: 50, coreOpacity: 0.50, glowOpacity: 0.40, hazeOpacity: 0.15, shadow: 30 };
  }
  if (svgId.startsWith('サス')) {
    return { coreBlur: 12, glowBlur: 30, hazeBlur: 60, coreOpacity: 0.36, glowOpacity: 0.30, hazeOpacity: 0.17, shadow: 32 };
  }
  if (svgId === '地明かりアンバー') {
    return { coreBlur: 14, glowBlur: 35, hazeBlur: 70, coreOpacity: 0.98, glowOpacity: 0.92, hazeOpacity: 0.65, shadow: 32 };
  }
  if (svgId.startsWith('地明かり')) {
    return { coreBlur: 14, glowBlur: 35, hazeBlur: 70, coreOpacity: 0.75, glowOpacity: 0.60, hazeOpacity: 0.35, shadow: 32 };
  }
  return { coreBlur: 14, glowBlur: 35, hazeBlur: 70, coreOpacity: 0.45, glowOpacity: 0.38, hazeOpacity: 0.22, shadow: 28 };
}

function lightFilter(style: LightingStyle, color: string, intensity: number, glowScale = 1) {
  const eased = Math.pow(intensity, 0.7);
  const blur = Math.round(style.coreBlur * glowScale + eased * 2);
  const shadow = Math.round(style.shadow * eased * glowScale);
  return `blur(${blur}px) drop-shadow(0 0 ${shadow}px ${color})`;
}

function wideGlowFilter(style: LightingStyle, color: string, intensity: number, blur: number, shadowScale: number) {
  const eased = Math.pow(intensity, 0.7);
  const shadow = Math.round(style.shadow * shadowScale * eased);
  return `blur(${blur}px) drop-shadow(0 0 ${shadow}px ${color})`;
}

function setElementFill(element: SVGElement, color: string) {
  element.style.fill = color;
  element.style.setProperty('fill', color, 'important');
  element.querySelectorAll('*').forEach(shape => {
    const s = shape as HTMLElement;
    s.style.fill = color;
    s.style.setProperty('fill', color, 'important');
  });
}

export default function LightPreview({ faderValues }: LightPreviewProps) {
  const svgRef = useRef<HTMLObjectElement>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);

  // SVGの各要素を制御するマッピング（iOSの実装に準拠）
  const lightMapping = useMemo(() => [
    { index: 0, svgId: 'FS下手' },
    { index: 1, svgId: 'FS上手' },
    { index: 2, svgId: 'GS下手' },
    { index: 3, svgId: 'GS上手' },
    { index: 4, svgId: 'A', color: '#ff9933' },
    { index: 5, svgId: 'B', color: '#ff9933' },
    { index: 6, svgId: 'C', color: '#ff9933' },
    { index: 7, svgId: 'D', color: '#ff9933' },
    { index: 8, svgId: 'E', color: '#ff9933' },
    { index: 9, svgId: 'F', color: '#ff9933' },
    { index: 10, svgId: 'G', color: '#ff9933' },
    { index: 11, svgId: 'H', color: '#ff9933' },
    { index: 12, svgId: '地明かりアンバー', color: '#ff6600' },
    { index: 13, svgId: '地明かり青緑', color: '#00a0e9' },
    { index: 14, svgId: '地明かり黄', color: '#ffff00' },
    { index: 15, svgId: '地明かり青紫', color: '#93278f' },
    { index: 17, svgId: 'アッパーホリ', color: '#0000ff' },
    { index: 18, svgId: 'アッパーホリ', color: '#00ff00' },
    { index: 19, svgId: 'アッパーホリ', color: '#ff0000' },
    { index: 21, svgId: 'ローホリ', color: '#0000ff' },
    { index: 22, svgId: 'ローホリ', color: '#00ff00' },
    { index: 23, svgId: 'ローホリ', color: '#ff0000' },
    { index: 24, svgId: 'サス下手', color: '#ff9933' },
    { index: 25, svgId: 'サス中央', color: '#ff9933' },
    { index: 26, svgId: 'サス上手', color: '#ff9933' },
    { index: 28, svgId: 'SS下手', color: '#ffe066' },
    { index: 29, svgId: 'SS上手', color: '#ffe066' }
  ], []);

  // 初期化：HazeとGlowの要素を動的生成
  const setupLights = useCallback((svgDoc: Document) => {
    // 既にクローンがある場合は削除して重複防止
    svgDoc.querySelectorAll('[data-light-glow], [data-light-haze]').forEach(el => el.remove());

    // 初期状態は非表示
    svgDoc.querySelectorAll('g[id], path[id], polygon[id], ellipse[id]').forEach(el => {
      const svgEl = el as SVGElement;
      if (!['背景', 'ホリ幕', '地面', 'レイヤー1'].includes(svgEl.id)) {
        svgEl.style.opacity = '0';
      }
    });

    // mix-blend-mode: screen スタイルをインジェクション
    const styleEl = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
      g[id], path[id], polygon[id], ellipse[id], [data-light-glow], [data-light-haze] { mix-blend-mode: screen !important; will-change: opacity, filter; }
      #背景, #ホリ幕, #地面, #レイヤー1 { mix-blend-mode: normal !important; }
    `;
    svgDoc.querySelector('defs')?.appendChild(styleEl);

    const lightIds = Array.from(new Set(lightMapping.map(m => m.svgId)));

    lightIds.forEach(svgId => {
      const element = svgDoc.getElementById(svgId);
      if (!element) return;

      const clipAttr = element.getAttribute('clip-path');

      // Haze クローン作成
      const haze = element.cloneNode(true) as SVGElement;
      haze.id = `${svgId}__haze`;
      haze.setAttribute('data-light-haze', svgId);
      haze.style.opacity = '0';
      haze.style.pointerEvents = 'none';
      haze.style.mixBlendMode = 'screen';
      if (clipAttr) haze.setAttribute('clip-path', clipAttr);

      // Glow クローン作成
      const glow = element.cloneNode(true) as SVGElement;
      glow.id = `${svgId}__glow`;
      glow.setAttribute('data-light-glow', svgId);
      glow.style.opacity = '0';
      glow.style.pointerEvents = 'none';
      glow.style.mixBlendMode = 'screen';
      if (clipAttr) glow.setAttribute('clip-path', clipAttr);

      element.parentNode?.insertBefore(haze, element);
      element.parentNode?.insertBefore(glow, element);
    });

    setSvgLoaded(true);
  }, [lightMapping]);

  useEffect(() => {
    // 最初の読み込み時にSVGをセットアップ
    const handleLoad = () => {
      const svgDoc = svgRef.current?.contentDocument;
      if (svgDoc) {
        setupLights(svgDoc);
      }
    };

    // すでに読み込まれている場合
    if (svgRef.current?.contentDocument) {
      handleLoad();
    }
  }, [setupLights]);

  // フェーダー値の変更を適用
  useEffect(() => {
    if (!svgLoaded) return;
    const svgDoc = svgRef.current?.contentDocument;
    if (!svgDoc) return;

    // SVG要素ごとにコントローラーをグループ化
    const elementGroups: { [key: string]: { index: number, color?: string, faderValue: number }[] } = {};
    lightMapping.forEach(mapping => {
      const faderValue = (faderValues[mapping.index] || 0) / 100.0;
      if (!elementGroups[mapping.svgId]) {
        elementGroups[mapping.svgId] = [];
      }
      elementGroups[mapping.svgId].push({ ...mapping, faderValue });
    });

    // 各要素のフェード、カラー、ハロー効果（ブラー）更新
    Object.entries(elementGroups).forEach(([svgId, controllers]) => {
      const element = svgDoc.getElementById(svgId) as SVGElement | null;
      const glow = svgDoc.getElementById(`${svgId}__glow`) as SVGElement | null;
      const haze = svgDoc.getElementById(`${svgId}__haze`) as SVGElement | null;
      if (!element) return;

      const activeControllers = controllers.filter(c => c.faderValue > 0);

      if (activeControllers.length === 0) {
        element.style.opacity = '0';
        element.style.filter = 'none';
        if (glow) {
          glow.style.opacity = '0';
          glow.style.filter = 'none';
        }
        if (haze) {
          haze.style.opacity = '0';
          haze.style.filter = 'none';
        }
      } else {
        const visualStyle = styleFor(svgId);
        const colorControllers = activeControllers.filter(c => c.color);

        if (colorControllers.length === 0) {
          // 色指定のないコントローラーのみ（白色系）
          let maxOpacity = 0;
          activeControllers.forEach(c => { maxOpacity = Math.max(maxOpacity, c.faderValue); });
          const eased = Math.pow(maxOpacity, 0.72);
          const warmWhite = 'rgb(255, 225, 170)';

          element.style.opacity = Math.min(eased * visualStyle.coreOpacity, visualStyle.coreOpacity).toString();
          element.style.filter = lightFilter(visualStyle, warmWhite, maxOpacity);
          setElementFill(element, warmWhite);

          if (glow) {
            glow.style.opacity = Math.min(eased * visualStyle.glowOpacity, visualStyle.glowOpacity).toString();
            glow.style.filter = wideGlowFilter(visualStyle, warmWhite, maxOpacity, visualStyle.glowBlur, 1.65);
            setElementFill(glow, warmWhite);
          }

          if (haze) {
            haze.style.opacity = Math.min(eased * visualStyle.hazeOpacity, visualStyle.hazeOpacity).toString();
            haze.style.filter = wideGlowFilter(visualStyle, warmWhite, maxOpacity, visualStyle.hazeBlur, 2.1);
            setElementFill(haze, warmWhite);
          }
        } else {
          // 色指定がある場合（加算混合）
          let totalR = 0, totalG = 0, totalB = 0;
          let maxOpacity = 0;
          
          activeControllers.forEach(c => {
            const intensity = c.faderValue;
            maxOpacity = Math.max(maxOpacity, intensity);
            if (c.color) {
              const hex = c.color.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
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

          const finalColor = `rgb(${Math.round(totalR)}, ${Math.round(totalG)}, ${Math.round(totalB)})`;
          const eased = Math.pow(maxOpacity, 0.72);
          const opacity = Math.min(eased * visualStyle.coreOpacity, visualStyle.coreOpacity);
          const glowOpacity = Math.min(eased * visualStyle.glowOpacity, visualStyle.glowOpacity);

          element.style.opacity = opacity.toString();
          element.style.filter = lightFilter(visualStyle, finalColor, maxOpacity);
          setElementFill(element, finalColor);

          if (glow) {
            glow.style.opacity = glowOpacity.toString();
            glow.style.filter = wideGlowFilter(visualStyle, finalColor, maxOpacity, visualStyle.glowBlur, 1.75);
            setElementFill(glow, finalColor);
          }

          if (haze) {
            haze.style.opacity = Math.min(eased * visualStyle.hazeOpacity, visualStyle.hazeOpacity).toString();
            haze.style.filter = wideGlowFilter(visualStyle, finalColor, maxOpacity, visualStyle.hazeBlur, 2.2);
            setElementFill(haze, finalColor);
          }
        }
      }
    });
  }, [faderValues, svgLoaded, lightMapping]);

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
            const svgDoc = svgRef.current?.contentDocument;
            if (svgDoc) {
              setupLights(svgDoc);
            }
          }}
        >
          チャペルSVGが読み込めませんでした
        </object>
      </div>
    </div>
  );
}
