/**
 * Quill — 16×20 at P=3 = 48×60px
 * Social Media Strategist: auburn hair (slightly wider/longer sides), warm skin, burgundy top.
 */
const H  = "#8b3a1a";
const HH = "#c05020";
const HD = "#5a1e08";

const S  = "#d4a06a";
const SH = "#e4b888";
const SD = "#b07848";
const EY = "#1e0800";

const B  = "#7a1a2e";  // burgundy
const BH = "#962030";
const BD = "#4e0e1e";
const CR = "#e8dfc0";  // cream

export function QuillSprite() {
  const P = 3, W = 16 * P, Ht = 20 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x*P} y={y*P} width={w*P} height={h*P} fill={fill} />
  );
  return (
    <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
      shapeRendering="crispEdges" style={{ imageRendering:'pixelated', display:'block' }}>

      {/* ── Hair: auburn, slightly longer sides than Scout ── */}
      {r(4, 0, 8, 1, HD)}
      {r(3, 1, 10, 1, H)}
      {r(2, 2, 12, 2, H)}   {/* 2 rows at widest — longer hair */}
      {r(5, 0, 5, 2, HH)}   {/* top highlight */}
      {r(2, 2, 1, 2, HD)}
      {r(13, 2, 1, 2, HD)}
      {/* Hair sides extend one extra row */}
      {r(2, 4, 2, 4, H)}
      {r(12, 4, 2, 4, H)}
      {r(2, 4, 1, 4, HD)}
      {r(13, 4, 1, 4, HD)}

      {/* ── FACE ── */}
      {r(3, 3, 10, 7, S)}
      {r(3, 3, 1, 7, SD)}
      {r(12, 3, 1, 7, SD)}
      {r(4, 3, 8, 2, SH)}
      {r(4, 6, 2, 1, SH)}
      {r(10, 6, 2, 1, SH)}
      {/* Eyes: slightly downcast/thoughtful */}
      {r(4, 5, 2, 2, EY)}
      {r(9, 5, 2, 2, EY)}
      <rect x={5*P} y={5*P} width={1} height={1} fill="#fff" />
      <rect x={10*P} y={5*P} width={1} height={1} fill="#fff" />
      {/* Soft smile */}
      {r(6, 8, 4, 1, SD)}
      {r(6, 8, 1, 1, SH)}   {/* left smile lift */}
      {r(9, 8, 1, 1, SH)}   {/* right smile lift */}

      {/* ── Neck ── */}
      {r(6, 10, 4, 1, S)}
      {r(6, 10, 1, 1, SD)}
      {r(9, 10, 1, 1, SD)}

      {/* ── Shoulders ── */}
      {r(1, 11, 14, 1, BH)}
      {r(1, 11, 1, 1, BD)}
      {r(14, 11, 1, 1, BD)}

      {/* ── Body: burgundy top ── */}
      {r(2, 12, 12, 8, B)}
      {r(2, 12, 1, 8, BD)}
      {r(13, 12, 1, 8, BD)}
      {r(3, 12, 10, 1, BH)}
      {/* Cream collar V */}
      {r(6, 11, 4, 1, CR)}
      {r(7, 11, 2, 3, CR)}  {/* V neckline */}
    </svg>
  );
}
