/**
 * Halifax Harbour View — 200×90 pixel art · MIDDAY
 * Standing on the Halifax boardwalk looking east across the harbour to Dartmouth.
 * McNabs Island at the harbour mouth to the right.
 * Time-of-day: midday — bright sky, lit water, lamp off, no stars.
 */
export function HalifaxWindow() {
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x} y={y} width={w} height={h} fill={fill} />
  );

  return (
    <svg
      width={200} height={90}
      viewBox="0 0 200 90"
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {/* ── Sky — bright midday blue gradient ── */}
      {r(0,  0, 200,  8, '#3a82b8')}
      {r(0,  8, 200,  8, '#4e96c8')}
      {r(0, 16, 200,  8, '#62a8d4')}
      {r(0, 24, 200,  8, '#7ab8e0')}
      {r(0, 32, 200,  8, '#92c8e8')}
      {r(0, 40, 200,  8, '#aad4f0')}
      {r(0, 48, 200, 10, '#badef4')}
      {r(0, 58, 200, 10, '#cce8f8')}  {/* hazy horizon to waterline y=68 */}

      {/* ── Clouds ── */}
      {r(22, 13, 24,  4, '#e8f4fc')}  {/* cloud 1 body */}
      {r(28,  9, 14,  5, '#f4faff')}  {/* cloud 1 puff */}
      {r(18, 16,  8,  2, '#d8eef8')}  {/* cloud 1 base shadow */}

      {r(142, 21, 22,  4, '#e8f4fc')}  {/* cloud 2 body */}
      {r(148, 17, 12,  5, '#f4faff')}  {/* cloud 2 puff */}
      {r(138, 24,  8,  2, '#d8eef8')}  {/* cloud 2 base shadow */}

      {/* ── Dartmouth shoreline — daytime grey-blue, no lit windows ── */}
      {r(  0, 62, 14,  6, '#2a3a4e')}
      {r( 16, 54, 10, 14, '#2a3a4e')}
      {r( 28, 58,  8, 10, '#2a3a4e')}
      {r( 38, 48,  5, 20, '#2a3a4e')}  {/* narrow tower */}
      {r( 40, 45,  2,  3, '#303c52')}  {/* spire */}
      {r( 44, 56, 12, 12, '#2a3a4e')}
      {r( 58, 60,  8,  8, '#2a3a4e')}
      {r( 68, 50, 11, 18, '#2a3a4e')}
      {r( 81, 56,  8, 12, '#2a3a4e')}
      {r( 91, 61, 10,  7, '#2a3a4e')}
      {r(103, 52, 10, 16, '#2a3a4e')}
      {r(115, 58,  8, 10, '#2a3a4e')}

      {/* Sunlit right-edge highlights (midday sun slightly overhead-left) */}
      {r( 25, 54,  1, 14, '#3a4e68')}
      {r( 78, 50,  1, 18, '#3a4e68')}
      {r(112, 52,  1, 16, '#3a4e68')}

      {/* ── McNabs Island — bright daytime forest green ── */}
      {r(130, 58, 70, 10, '#264428')}  {/* island base */}

      {/* Tree canopy */}
      {r(130, 55,  8,  3, '#2a4a2e')}
      {r(138, 51, 10,  7, '#2a4a2e')}
      {r(148, 46, 14, 12, '#2e5232')}  {/* tallest trees centre */}
      {r(162, 49, 10,  9, '#2a4a2e')}
      {r(172, 53,  8,  5, '#2a4a2e')}
      {r(180, 56, 10,  2, '#264428')}

      {/* Sunlit canopy tops */}
      {r(150, 46,  8,  2, '#4a7848')}
      {r(140, 51,  6,  2, '#3a6038')}
      {r(163, 49,  5,  2, '#3a6038')}

      {/* Lighthouse — tower visible, lamp OFF at midday */}
      {r(156, 43, 2, 15, '#3a4a5a')}  {/* tower */}
      {r(155, 41, 4,  3, '#8090a0')}  {/* lamp housing — grey, off */}

      {/* ── Harbour water — midday blue ── */}
      {r(  0, 68, 200, 22, '#1a3654')}
      {r(  0, 71, 200,  2, '#264a6a')}  {/* wave crest */}
      {r( 20, 76,  38,  1, '#183050')}  {/* ripple */}
      {r( 85, 79,  50,  1, '#264a6a')}  {/* ripple */}
      {r(148, 74,  40,  1, '#183050')}  {/* ripple */}

      {/* Water sparkle — specular highlights */}
      {r( 58, 72,  4,  1, '#5a8aaa')}
      {r(118, 75,  3,  1, '#5a8aaa')}
      {r(168, 70,  3,  1, '#5a8aaa')}

      {/* ── Harbour ferry ── */}
      {r(45, 74, 16,  3, '#14263c')}
      {r(48, 71,  8,  3, '#182c44')}
      {r(50, 69,  4,  2, '#1c3248')}
    </svg>
  );
}
