/**
 * Halifax Harbour View — 200×90 pixel art · NIGHT
 * Same vantage as the day view. Dark sky, stars, lit Dartmouth windows,
 * lighthouse ON, moonlight on the water.
 */
export function HalifaxNightWindow() {
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
      {/* ── Night sky — deep navy gradient ── */}
      {r(0,  0, 200, 10, '#050810')}
      {r(0, 10, 200, 10, '#060a14')}
      {r(0, 20, 200, 10, '#070c18')}
      {r(0, 30, 200, 10, '#080e1c')}
      {r(0, 40, 200, 10, '#091020')}
      {r(0, 50, 200,  8, '#0a1222')}
      {r(0, 58, 200, 10, '#0c1428')}

      {/* ── Stars ── */}
      {r( 12,  4, 1, 1, '#d0d8e8')}
      {r( 35,  8, 1, 1, '#c8d4e8')}
      {r( 54,  3, 1, 1, '#e0e8f8')}
      {r( 78, 12, 1, 1, '#c0ccde')}
      {r( 96,  6, 1, 1, '#d8e4f4')}
      {r(110,  2, 1, 1, '#e0e8f8')}
      {r(130,  9, 1, 1, '#c8d4e8')}
      {r(158,  5, 1, 1, '#d8e4f4')}
      {r(178, 11, 1, 1, '#c0ccde')}
      {r( 22, 18, 1, 1, '#c8d4e8')}
      {r( 68, 22, 1, 1, '#d0d8e8')}
      {r(148, 16, 1, 1, '#c8d4e8')}
      {r(192,  7, 1, 1, '#e0e8f8')}

      {/* ── Moon — pale ivory disc ── */}
      {r(170, 14, 8, 8, '#e8e4d0')}
      {r(168, 15, 2, 6, '#e8e4d0')}   {/* left edge bleed */}
      {r(178, 15, 2, 6, '#e8e4d0')}   {/* right edge bleed */}
      {r(170, 12, 8, 2, '#e8e4d0')}   {/* top */}
      {r(170, 22, 8, 2, '#e8e4d0')}   {/* bottom */}

      {/* ── Dartmouth shoreline — dark silhouettes with lit windows ── */}
      {r(  0, 62, 14,  6, '#141e2c')}
      {r( 16, 54, 10, 14, '#141e2c')}
      {r( 28, 58,  8, 10, '#141e2c')}
      {r( 38, 48,  5, 20, '#141e2c')}
      {r( 40, 45,  2,  3, '#1c2840')}
      {r( 44, 56, 12, 12, '#141e2c')}
      {r( 58, 60,  8,  8, '#141e2c')}
      {r( 68, 50, 11, 18, '#141e2c')}
      {r( 81, 56,  8, 12, '#141e2c')}
      {r( 91, 61, 10,  7, '#141e2c')}
      {r(103, 52, 10, 16, '#141e2c')}
      {r(115, 58,  8, 10, '#141e2c')}

      {/* Lit office windows — warm yellow + cool blue mix */}
      {r( 20, 58, 3, 2, '#f0d870')}
      {r( 24, 56, 2, 3, '#c8dff8')}
      {r( 47, 59, 3, 2, '#f0d870')}
      {r( 51, 61, 3, 2, '#c8dff8')}
      {r( 61, 62, 2, 2, '#f0d870')}
      {r( 70, 53, 3, 2, '#f0d870')}
      {r( 74, 56, 3, 3, '#c8dff8')}
      {r( 83, 59, 2, 2, '#f0d870')}
      {r( 86, 62, 3, 2, '#c8dff8')}
      {r( 95, 63, 2, 2, '#f0d870')}
      {r(105, 55, 3, 2, '#c8dff8')}
      {r(109, 59, 2, 3, '#f0d870')}
      {r(117, 60, 3, 2, '#c8dff8')}

      {/* ── McNabs Island — dark night silhouette ── */}
      {r(130, 58, 70, 10, '#0a1410')}

      {/* Tree canopy — near black */}
      {r(130, 55,  8,  3, '#0c1810')}
      {r(138, 51, 10,  7, '#0c1810')}
      {r(148, 46, 14, 12, '#0e1c14')}
      {r(162, 49, 10,  9, '#0c1810')}
      {r(172, 53,  8,  5, '#0c1810')}

      {/* Lighthouse — tower + glowing lamp */}
      {r(156, 43, 2, 15, '#1e2c3c')}   {/* tower */}
      {r(155, 41, 4,  3, '#ffc850')}   {/* lamp housing — ON, amber */}
      {r(154, 40, 6,  2, '#ffe090')}   {/* bright lamp top */}
      {/* Glow halo around lamp */}
      {r(152, 40, 10,  5, '#ffd06020')}

      {/* ── Harbour water — night, dark with moonlight ── */}
      {r(  0, 68, 200, 22, '#06101e')}
      {r(  0, 71, 200,  1, '#0c1e30')}  {/* subtle wave */}
      {/* Moonlight reflection stripe */}
      {r(150, 70,  30,  2, '#1a3a5a')}
      {r(158, 72,  16,  2, '#122838')}
      {r(163, 74,   8,  1, '#0e2030')}

      {/* ── Harbour ferry — navigation lights ── */}
      {r(45, 74, 16,  3, '#0c1828')}
      {r(48, 71,  8,  3, '#101e30')}
      {r(50, 69,  4,  2, '#141e2c')}
      {r(52, 68,  2,  1, '#f0c060')}   {/* nav light */}
    </svg>
  );
}
