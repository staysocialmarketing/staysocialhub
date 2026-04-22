/**
 * Scout — 16×20 at P=3 = 48×60px
 * Researcher: short dark hair with side part, alert wide eyes, forest green hoodie, cream collar.
 */
const H  = "#1a1a2a";
const HH = "#2e2e44";
const HD = "#0c0c18";

const S  = "#c8906a";
const SH = "#daa880";
const SD = "#a87050";
const EY = "#1e0800";

const G  = "#2e6b3e";  // forest green
const GH = "#3d8a52";
const GD = "#1e4a2a";
const CR = "#e8dfc0";  // cream

export function ScoutSprite() {
  const P = 3, W = 16 * P, Ht = 20 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x*P} y={y*P} width={w*P} height={h*P} fill={fill} />
  );
  return (
    <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
      shapeRendering="crispEdges" style={{ imageRendering:'pixelated', display:'block' }}>

      {/* ── Hair: short dark, side part on left — asymmetric highlight reads "moving fast" ── */}
      {r(4, 0, 8, 1, HD)}
      {r(3, 1, 10, 1, H)}
      {r(2, 2, 12, 1, H)}
      {r(3, 1, 2, 2, HH)}  {/* left part highlight — shorter */}
      {r(8, 0, 3, 1, HH)}  {/* offset right highlight — asymmetric, dynamic */}
      {r(2, 3, 2, 4, H)}
      {r(12, 3, 2, 4, H)}
      {r(2, 3, 1, 4, HD)}
      {r(13, 3, 1, 4, HD)}

      {/* ── FACE: alert, wide eyes ── */}
      {r(3, 3, 10, 7, S)}
      {r(3, 3, 1, 7, SD)}
      {r(12, 3, 1, 7, SD)}
      {r(4, 3, 8, 2, SH)}
      {/* Wide alert eyes — slightly larger feel */}
      {r(3, 5, 2, 2, EY)}  {/* left eye shifted in */}
      {r(10, 5, 2, 2, EY)} {/* right eye */}
      <rect x={4*P} y={5*P} width={1} height={1} fill="#fff" />
      <rect x={11*P} y={5*P} width={1} height={1} fill="#fff" />
      {/* Slight upward mouth — curious energy */}
      {r(6, 8, 2, 1, SD)}
      {r(8, 7, 1, 1, SD)}  {/* right upward tick */}

      {/* ── Neck ── */}
      {r(6, 10, 4, 1, S)}
      {r(6, 10, 1, 1, SD)}
      {r(9, 10, 1, 1, SD)}

      {/* ── Shoulders: hoodie ── */}
      {r(1, 11, 14, 1, GH)}
      {r(1, 11, 1, 1, GD)}
      {r(14, 11, 1, 1, GD)}

      {/* ── Body: forest green hoodie ── */}
      {r(2, 12, 12, 8, G)}
      {r(2, 12, 1, 8, GD)}
      {r(13, 12, 1, 8, GD)}
      {r(3, 12, 10, 1, GH)}
      {/* Cream collar */}
      {r(6, 11, 4, 1, CR)}
      {r(6, 11, 4, 2, CR)}
      {/* Hoodie pocket seam center */}
      {r(6, 15, 4, 3, GD)}
      {r(6, 15, 4, 1, G)}
    </svg>
  );
}
