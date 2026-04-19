/**
 * Lev — 16×20 at P=3 = 48×60px
 * Chief of Staff: tidy dark-brown hair, warm olive skin, navy with amber accents.
 */
const H  = "#3a1800";
const HH = "#6b3a10";
const HD = "#260e00";

const S  = "#c8906a";
const SH = "#daa880";
const SD = "#a87050";
const EY = "#1e0800";

const N  = "#1e2d3d";
const NH = "#2e4050";
const ND = "#141e28";
const AM = "#d4822a";  // amber accent

export function LevSprite() {
  const P = 3, W = 16 * P, Ht = 20 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x*P} y={y*P} width={w*P} height={h*P} fill={fill} />
  );
  return (
    <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
      shapeRendering="crispEdges" style={{ imageRendering:'pixelated', display:'block' }}>

      {/* ── Hair: tidy dark-brown ── */}
      {r(4, 0, 8, 1, HD)}
      {r(3, 1, 10, 1, H)}
      {r(2, 2, 12, 1, H)}
      {r(5, 1, 5, 1, HH)}
      {r(7, 2, 3, 1, HH)}
      {r(2, 3, 2, 4, H)}
      {r(12, 3, 2, 4, H)}
      {r(2, 3, 1, 4, HD)}
      {r(13, 3, 1, 4, HD)}

      {/* ── FACE ── */}
      {r(3, 3, 10, 7, S)}
      {r(3, 3, 1, 7, SD)}
      {r(12, 3, 1, 7, SD)}
      {r(4, 3, 8, 2, SH)}
      {r(4, 6, 3, 1, SH)}
      {r(9, 6, 3, 1, SH)}
      {r(4, 5, 2, 2, EY)}
      {r(9, 5, 2, 2, EY)}
      <rect x={5*P} y={5*P} width={1} height={1} fill="#fff" />
      <rect x={10*P} y={5*P} width={1} height={1} fill="#fff" />
      {/* Subtle smirk */}
      {r(5, 8, 1, 1, SD)}
      {r(6, 8, 3, 1, SD)}

      {/* ── Neck ── */}
      {r(6, 10, 4, 1, S)}
      {r(6, 10, 1, 1, SD)}
      {r(9, 10, 1, 1, SD)}
      {/* Amber collar pips at neck */}
      {r(5, 10, 1, 1, AM)}
      {r(10, 10, 1, 1, AM)}

      {/* ── Shoulders ── */}
      {r(1, 11, 14, 1, NH)}
      {r(1, 11, 1, 1, ND)}
      {r(14, 11, 1, 1, ND)}

      {/* ── Body: navy with amber badge ── */}
      {r(2, 12, 12, 8, N)}
      {r(2, 12, 1, 8, ND)}
      {r(13, 12, 1, 8, ND)}
      {r(3, 12, 10, 1, NH)}
      {/* Collar */}
      {r(6, 11, 4, 2, N)}
      {r(7, 11, 2, 1, NH)}
      {/* Amber chest badge */}
      {r(10, 13, 2, 2, AM)}
    </svg>
  );
}
