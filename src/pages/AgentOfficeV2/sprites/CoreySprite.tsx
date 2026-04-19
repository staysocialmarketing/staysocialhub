/**
 * Corey — 16×20 at P=3 = 48×60px
 * Stocky founder: widest shoulders (full 16 cols), short dark-brown hair,
 * fair skin, navy crew with gold pin.
 */
const H  = "#2a1608";  // hair base
const HH = "#5a3a20";  // hair highlight
const HD = "#180c04";  // hair shadow/edge

const S  = "#e8c8a8";  // skin base
const SH = "#f4d8bc";  // skin highlight
const SD = "#c8a488";  // skin shadow
const EY = "#1a0a04";  // eye

const N  = "#2a3450";  // navy base
const NH = "#3e4a68";  // navy highlight
const ND = "#1a2238";  // navy shadow
const GP = "#c48a12";  // gold pin

export function CoreySprite() {
  const P = 3, W = 16 * P, Ht = 20 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x*P} y={y*P} width={w*P} height={h*P} fill={fill} />
  );
  return (
    <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
      shapeRendering="crispEdges" style={{ imageRendering:'pixelated', display:'block' }}>

      {/* ── Hair: short dark-brown, slightly tousled ── */}
      {r(4, 0, 8, 1, HD)}
      {r(3, 1, 10, 1, H)}
      {r(2, 2, 12, 1, H)}
      {r(5, 1, 4, 1, HH)}   {/* highlight streak */}
      {r(8, 2, 3, 1, HH)}
      {/* Hair sides flanking face */}
      {r(2, 3, 2, 3, H)}
      {r(12, 3, 2, 3, H)}
      {r(2, 3, 1, 3, HD)}
      {r(13, 3, 1, 3, HD)}

      {/* ── FACE: fills cols 3-12, rows 3-9 completely ── */}
      {r(3, 3, 10, 7, S)}
      {r(3, 3, 1, 7, SD)}   {/* left edge */}
      {r(12, 3, 1, 7, SD)}  {/* right edge */}
      {r(4, 3, 8, 2, SH)}   {/* forehead highlight */}
      {/* Cheeks */}
      {r(4, 6, 3, 1, SH)}
      {r(9, 6, 3, 1, SH)}
      {/* Eyes: 2×2 black dots */}
      {r(4, 5, 2, 2, EY)}
      {r(9, 5, 2, 2, EY)}
      <rect x={5*P} y={5*P} width={1} height={1} fill="#fff" />
      <rect x={10*P} y={5*P} width={1} height={1} fill="#fff" />
      {/* Mouth: neutral, grounded */}
      {r(6, 8, 3, 1, SD)}

      {/* ── Neck ── */}
      {r(6, 10, 4, 1, S)}
      {r(6, 10, 1, 1, SD)}
      {r(9, 10, 1, 1, SD)}

      {/* ── Shoulders: FULL WIDTH for stocky founder build ── */}
      {r(0, 11, 16, 1, NH)}
      {r(0, 11, 1, 1, ND)}
      {r(15, 11, 1, 1, ND)}

      {/* ── Body ── */}
      {r(1, 12, 14, 8, N)}
      {r(1, 12, 1, 8, ND)}
      {r(14, 12, 1, 8, ND)}
      {r(2, 12, 12, 1, NH)}  {/* chest highlight */}
      {/* Collar */}
      {r(6, 11, 4, 2, N)}
      {r(7, 11, 2, 1, NH)}
      {/* Gold brand pin: left chest */}
      {r(4, 13, 2, 2, GP)}
    </svg>
  );
}
