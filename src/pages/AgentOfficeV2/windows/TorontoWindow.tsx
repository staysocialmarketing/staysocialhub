/**
 * Toronto Skyline — 200×90 pixel art · MIDDAY
 * CN Tower as the unmistakable centrepiece, flanked by downtown towers,
 * Lake Ontario in the foreground.
 * Time-of-day: midday — bright sky, concrete tower, no lit windows, no stars.
 */
export function TorontoWindow() {
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
      {/* ── Sky — bright midday blue (matching Halifax) ── */}
      {r(0,  0, 200,  8, '#3a82b8')}
      {r(0,  8, 200,  8, '#4e96c8')}
      {r(0, 16, 200,  8, '#62a8d4')}
      {r(0, 24, 200,  8, '#7ab8e0')}
      {r(0, 32, 200,  8, '#92c8e8')}
      {r(0, 40, 200,  8, '#aad4f0')}
      {r(0, 48, 200, 10, '#badef4')}
      {r(0, 58, 200, 10, '#cce8f8')}

      {/* ── Clouds ── */}
      {r(28, 18, 26,  4, '#e8f4fc')}   {/* cloud 1 body */}
      {r(34, 14, 16,  5, '#f4faff')}   {/* cloud 1 puff */}
      {r(24, 21,  8,  2, '#d8eef8')}   {/* cloud 1 base */}

      {r(132, 9, 22,  4, '#e8f4fc')}   {/* cloud 2 body */}
      {r(138, 5, 12,  5, '#f4faff')}   {/* cloud 2 puff */}
      {r(128, 12,  8,  2, '#d8eef8')}  {/* cloud 2 base */}

      {/* ── Lake Ontario — midday blue ── */}
      {r(  0, 82, 200,  8, '#1a3654')}
      {r(  0, 84, 200,  2, '#264a6a')}
      {r( 33, 86,  40,  2, '#183050')}
      {r(120, 87,  67,  2, '#264a6a')}

      {/* Lake sparkle */}
      {r( 38, 83,  4,  1, '#5a8aaa')}
      {r( 88, 85,  3,  1, '#5a8aaa')}
      {r(158, 83,  3,  1, '#5a8aaa')}

      {/* ── CN Tower — concrete in full daylight ── */}
      {/* Antenna — light grey */}
      {r(100,  0, 2, 27, '#b0b0c4')}

      {/* Shaft above pod */}
      {r(98, 16, 4, 11, '#9898ac')}

      {/* POD DISC — concrete, readable in daylight */}
      {r(90, 24, 20, 14, '#a0a0b4')}   {/* pod body */}
      {r(90, 24, 20,  2, '#c4c4d4')}   {/* pod top — sun highlight */}
      {r(90, 36, 20,  2, '#787888')}   {/* pod underside — shadow */}

      {/* Pod observation windows — sky-blue glass reflections */}
      {r(93, 28, 3, 6, '#7ab8d8')}
      {r(100, 28, 3, 6, '#7ab8d8')}
      {r(107, 28, 3, 6, '#7ab8d8')}

      {/* Main shaft — concrete, sunlit left face */}
      {r(97, 38,  8, 20, '#9898ac')}   {/* main shaft */}
      {r(97, 38,  2, 20, '#b0b0c4')}   {/* sunlit left edge */}
      {r(96, 58, 10, 20, '#909098')}   {/* lower shaft */}
      {r(96, 58,  2, 20, '#a8a8b8')}   {/* sunlit left edge */}

      {/* Base */}
      {r(92, 78, 18,  4, '#888898')}
      {r(84, 82, 34,  4, '#808090')}

      {/* ── Building silhouettes — daytime grey-blue, no lit windows ── */}
      {/* Left skyline */}
      {r(  0, 53, 29, 29, '#2a3a4e')}
      {r( 29, 41, 19, 41, '#2a3a4e')}
      {r( 48, 59, 13, 23, '#2a3a4e')}
      {r( 64, 49, 12, 33, '#2a3a4e')}
      {r( 79, 41, 11, 41, '#2a3a4e')}

      {/* Right skyline */}
      {r(112, 41, 11, 41, '#2a3a4e')}
      {r(123, 49, 15, 33, '#2a3a4e')}
      {r(139, 57, 14, 25, '#2a3a4e')}
      {r(153, 45, 17, 37, '#2a3a4e')}
      {r(173, 55, 27, 27, '#2a3a4e')}

      {/* Sunlit right-edge highlights */}
      {r( 27, 53,  1, 29, '#3a4e68')}
      {r( 47, 41,  1, 41, '#3a4e68')}
      {r(122, 41,  1, 41, '#3a4e68')}
      {r(169, 45,  1, 37, '#3a4e68')}
    </svg>
  );
}
