/**
 * Toronto Skyline — 200×90 pixel art · NIGHT
 * CN Tower lit up, downtown towers with office windows glowing,
 * Lake Ontario dark with city reflection.
 */
export function TorontoNightWindow() {
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
      {/* ── Night sky ── */}
      {r(0,  0, 200, 10, '#050810')}
      {r(0, 10, 200, 10, '#060a14')}
      {r(0, 20, 200, 10, '#070c18')}
      {r(0, 30, 200, 10, '#080e1c')}
      {r(0, 40, 200, 10, '#091020')}
      {r(0, 50, 200, 10, '#0a1222')}
      {r(0, 60, 200, 10, '#0c1428')}

      {/* ── Stars ── */}
      {r(  8,  5, 1, 1, '#d8e4f4')}
      {r( 32,  3, 1, 1, '#e0e8f8')}
      {r( 55,  9, 1, 1, '#c8d4e8')}
      {r( 72,  4, 1, 1, '#d0d8e8')}
      {r(118,  7, 1, 1, '#e0e8f8')}
      {r(145,  2, 1, 1, '#c8d4e8')}
      {r(162, 10, 1, 1, '#d8e4f4')}
      {r(183,  5, 1, 1, '#e0e8f8')}
      {r( 20, 19, 1, 1, '#c0ccde')}
      {r( 85, 14, 1, 1, '#d0d8e8')}
      {r(192, 14, 1, 1, '#c8d4e8')}

      {/* ── Lake Ontario — night, dark with city light reflection ── */}
      {r(  0, 82, 200,  8, '#04080e')}
      {r(  0, 84, 200,  2, '#081018')}
      {/* City light reflections in water */}
      {r( 85, 83, 40,  2, '#1a2030')}
      {r( 93, 85, 22,  1, '#121828')}
      {r( 33, 85, 20,  1, '#0e1420')}
      {r(148, 84, 30,  1, '#0e1420')}

      {/* ── CN Tower — lit at night ── */}
      {/* Antenna with red beacon */}
      {r(100,  0, 2, 27, '#585870')}
      {r(100,  0, 2,  2, '#ff4040')}   {/* red beacon at tip */}
      {r( 99,  3, 4,  2, '#ff804020')} {/* faint glow */}

      {/* Shaft above pod */}
      {r(98, 16, 4, 11, '#50506a')}

      {/* POD DISC — lit amber glow */}
      {r(90, 24, 20, 14, '#6a6880')}
      {r(90, 24, 20,  2, '#9090a8')}   {/* top highlight */}
      {r(90, 36, 20,  2, '#3a3848')}   {/* underside shadow */}

      {/* Pod observation windows — warm amber glow (illuminated) */}
      {r(93, 28, 3, 6, '#f0c850')}
      {r(100, 28, 3, 6, '#e8c040')}
      {r(107, 28, 3, 6, '#f0c850')}
      {/* Pod glow bleed */}
      {r(89, 26, 2, 10, '#f0c85018')}
      {r(111, 26, 2, 10, '#f0c85018')}

      {/* Main shaft — slightly lit from pod spill */}
      {r(97, 38,  8, 20, '#484860')}
      {r(97, 38,  2, 20, '#585870')}
      {r(96, 58, 10, 20, '#404055')}
      {r(96, 58,  2, 20, '#505065')}

      {/* Base */}
      {r(92, 78, 18,  4, '#383848')}
      {r(84, 82, 34,  4, '#303040')}

      {/* ── Building silhouettes — dark with lit windows ── */}
      {/* Left skyline */}
      {r(  0, 53, 29, 29, '#0e1828')}
      {r( 29, 41, 19, 41, '#0e1828')}
      {r( 48, 59, 13, 23, '#0e1828')}
      {r( 64, 49, 12, 33, '#0e1828')}
      {r( 79, 41, 11, 41, '#0e1828')}

      {/* Right skyline */}
      {r(112, 41, 11, 41, '#0e1828')}
      {r(123, 49, 15, 33, '#0e1828')}
      {r(139, 57, 14, 25, '#0e1828')}
      {r(153, 45, 17, 37, '#0e1828')}
      {r(173, 55, 27, 27, '#0e1828')}

      {/* Lit office windows — warm yellow + cool blue */}
      {/* Left tower cluster */}
      {r(  3, 56, 3, 2, '#f0d870')}
      {r(  8, 60, 2, 2, '#c8dff8')}
      {r( 14, 58, 3, 2, '#f0d870')}
      {r( 18, 54, 2, 3, '#c8dff8')}
      {r( 32, 44, 3, 2, '#f0d870')}
      {r( 37, 48, 2, 2, '#f0d870')}
      {r( 40, 53, 3, 2, '#c8dff8')}
      {r( 33, 50, 2, 2, '#c8dff8')}
      {r( 51, 62, 2, 2, '#f0d870')}
      {r( 55, 65, 3, 2, '#c8dff8')}
      {r( 67, 52, 2, 3, '#f0d870')}
      {r( 71, 56, 2, 2, '#c8dff8')}
      {r( 80, 44, 3, 2, '#f0d870')}
      {r( 84, 48, 2, 3, '#c8dff8')}
      {r( 83, 52, 3, 2, '#f0d870')}

      {/* Right tower cluster */}
      {r(115, 44, 3, 2, '#f0d870')}
      {r(119, 48, 2, 2, '#c8dff8')}
      {r(124, 52, 3, 2, '#f0d870')}
      {r(128, 56, 2, 3, '#c8dff8')}
      {r(130, 62, 3, 2, '#f0d870')}
      {r(142, 60, 3, 2, '#f0d870')}
      {r(146, 63, 2, 2, '#c8dff8')}
      {r(156, 48, 3, 2, '#f0d870')}
      {r(160, 52, 2, 3, '#c8dff8')}
      {r(157, 56, 3, 2, '#f0d870')}
      {r(163, 60, 2, 2, '#c8dff8')}
      {r(176, 58, 3, 2, '#f0d870')}
      {r(181, 62, 2, 2, '#c8dff8')}
      {r(185, 58, 3, 2, '#f0d870')}
      {r(190, 62, 2, 3, '#c8dff8')}
    </svg>
  );
}
