/**
 * Pixel — 16×20 at P=3 = 48×60px
 * Ads Strategist: bright coral/orange jacket, slicked-back light auburn hair, no glasses.
 * Warm, bright, high-contrast — immediately distinct from Forge.
 */
const H  = "#c89040";  // slicked-back light auburn
const HH = "#e0b060";
const HD = "#a07020";

const S  = "#c8906a";
const SH = "#daa880";
const SD = "#a87050";
const EY = "#141820";

const B  = "#e05030";  // bright coral/orange jacket
const BH = "#f07050";
const BD = "#b83010";
const SL = "#c04020";  // deeper coral accent

export function PixelSprite() {
  const P = 3, W = 16 * P, Ht = 20 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x*P} y={y*P} width={w*P} height={h*P} fill={fill} />
  );
  return (
    <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
      shapeRendering="crispEdges" style={{ imageRendering:'pixelated', display:'block' }}>

      {/* ── Hair: slicked-back smooth light auburn ── */}
      {r(4, 0, 8, 1, HD)}
      {r(3, 1, 10, 1, H)}
      {r(2, 2, 12, 1, H)}
      {r(4, 0, 8, 1, HH)}   {/* smooth highlight across top — slick look */}
      {r(4, 1, 8, 1, HH)}   {/* continued shine */}
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
      {/* Eyes: no glasses, sharp and bright */}
      {r(4, 5, 2, 2, EY)}
      {r(9, 5, 2, 2, EY)}
      <rect x={5*P} y={5*P} width={1} height={1} fill="#90b8e0" />
      <rect x={10*P} y={5*P} width={1} height={1} fill="#90b8e0" />
      {/* Slight smirk */}
      {r(6, 8, 4, 1, SD)}
      {r(9, 8, 1, 1, SH)}   {/* right smirk lift */}

      {/* ── Neck ── */}
      {r(6, 10, 4, 1, S)}
      {r(6, 10, 1, 1, SD)}
      {r(9, 10, 1, 1, SD)}

      {/* ── Shoulders: coral/orange jacket ── */}
      {r(1, 11, 14, 1, BH)}
      {r(1, 11, 1, 1, BD)}
      {r(14, 11, 1, 1, BD)}

      {/* ── Body: bright coral/orange jacket ── */}
      {r(2, 12, 12, 8, B)}
      {r(2, 12, 1, 8, BD)}
      {r(13, 12, 1, 8, BD)}
      {r(3, 12, 10, 1, BH)}
      {/* V-collar stripe */}
      {r(6, 11, 4, 3, SL)}
      {r(7, 11, 2, 1, B)}
      {/* Chest detail */}
      {r(4, 14, 2, 2, BD)}
    </svg>
  );
}
