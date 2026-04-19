/**
 * Pixel — 16×20 at P=3 = 48×60px
 * PLACEHOLDER — rendered with grayscale + reduced opacity by Desk.tsx.
 * Swept right-heavy hair, warm tan skin, vivid electric blue jacket (vs Forge's muted industrial).
 */
const H  = "#181c24";
const HH = "#282e3e";
const HD = "#0c0e14";

const S  = "#c8a87a";
const SH = "#dcc090";
const SD = "#a88858";
const EY = "#141820";

const B  = "#0a4a8c";  // electric blue — vivid
const BH = "#1060b0";
const BD = "#062a5a";
const SL = "#1e2a3c";  // slate accent

export function PixelSprite() {
  const P = 3, W = 16 * P, Ht = 20 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x*P} y={y*P} width={w*P} height={h*P} fill={fill} />
  );
  return (
    <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
      shapeRendering="crispEdges" style={{ imageRendering:'pixelated', display:'block' }}>

      {/* ── Hair: swept right-heavy asymmetric ── */}
      {r(4, 0, 8, 1, HD)}
      {r(3, 1, 10, 1, H)}
      {r(2, 2, 12, 1, H)}
      {r(6, 0, 6, 1, HH)}   {/* swept right highlight */}
      {r(7, 1, 5, 1, HH)}   {/* more swept right */}
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
      {/* Eyes: sharp, slightly intense */}
      {r(4, 5, 2, 2, EY)}
      {r(9, 5, 2, 2, EY)}
      <rect x={5*P} y={5*P} width={1} height={1} fill="#7090c0" />
      <rect x={10*P} y={5*P} width={1} height={1} fill="#7090c0" />
      {/* Slight smirk */}
      {r(6, 8, 4, 1, SD)}
      {r(9, 8, 1, 1, SH)}   {/* right smirk lift */}

      {/* ── Neck ── */}
      {r(6, 10, 4, 1, S)}
      {r(6, 10, 1, 1, SD)}
      {r(9, 10, 1, 1, SD)}

      {/* ── Shoulders ── */}
      {r(1, 11, 14, 1, BH)}
      {r(1, 11, 1, 1, BD)}
      {r(14, 11, 1, 1, BD)}

      {/* ── Body: electric blue jacket ── */}
      {r(2, 12, 12, 8, B)}
      {r(2, 12, 1, 8, BD)}
      {r(13, 12, 1, 8, BD)}
      {r(3, 12, 10, 1, BH)}
      {/* Slate collar stripe */}
      {r(6, 11, 4, 2, SL)}
      {r(7, 11, 2, 3, SL)}
    </svg>
  );
}
