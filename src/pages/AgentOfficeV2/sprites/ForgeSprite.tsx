/**
 * Forge — 16×20 at P=3 = 48×60px
 * Developer: dark navy hoodie, short dark brown hair, stubble, thick dark-rim glasses.
 */
const H  = "#2a1a0a";  // short dark brown hair
const HH = "#3a2a14";
const HD = "#1a0e04";

const S  = "#c8906a";
const SH = "#daa880";
const SD = "#a87050";
const EY = "#1a1c20";
const ST = "#4a2a10";  // stubble warm dark brown

const GL = "#222222";  // thick dark-rim glasses

const B  = "#1a2a4a";  // dark navy hoodie
const BH = "#243660";
const BD = "#0e1a30";
const CH = "#141e2e";  // dark collar

export function ForgeSprite() {
  const P = 3, W = 16 * P, Ht = 20 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x*P} y={y*P} width={w*P} height={h*P} fill={fill} />
  );
  return (
    <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
      shapeRendering="crispEdges" style={{ imageRendering:'pixelated', display:'block' }}>

      {/* ── Hair: short dark brown ── */}
      {r(4, 0, 8, 1, HD)}
      {r(3, 1, 10, 1, H)}
      {r(2, 2, 12, 1, H)}
      {r(4, 1, 4, 1, HH)}   {/* subtle highlight */}
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
      {/* Thick dark-rim glasses: filled 3×2 rects */}
      {r(4, 5, 3, 2, GL)} {/* left lens — thick dark frame */}
      {r(9, 5, 3, 2, GL)} {/* right lens — thick dark frame */}
      {r(8, 5, 1, 1, GL)} {/* bridge */}
      {/* Eyes over glasses */}
      {r(4, 5, 2, 2, EY)}
      {r(9, 5, 2, 2, EY)}
      <rect x={5*P} y={5*P} width={1} height={1} fill="#5a6070" />
      <rect x={10*P} y={5*P} width={1} height={1} fill="#5a6070" />
      {/* Neutral focused mouth */}
      {r(6, 8, 4, 1, SD)}
      {/* Stubble: warm dark dots on jaw */}
      {r(5, 9, 2, 1, ST)}
      {r(9, 9, 2, 1, ST)}
      {r(6, 9, 4, 1, ST)}

      {/* ── Neck ── */}
      {r(6, 10, 4, 1, S)}
      {r(6, 10, 1, 1, SD)}
      {r(9, 10, 1, 1, SD)}

      {/* ── Shoulders: dark navy hoodie ── */}
      {r(1, 11, 14, 1, BH)}
      {r(1, 11, 1, 1, BD)}
      {r(14, 11, 1, 1, BD)}

      {/* ── Body: dark navy hoodie ── */}
      {r(2, 12, 12, 8, B)}
      {r(2, 12, 1, 8, BD)}
      {r(13, 12, 1, 8, BD)}
      {r(3, 12, 10, 1, BH)}
      {/* Dark collar */}
      {r(6, 11, 4, 2, CH)}
      {r(7, 11, 2, 1, B)}
      {/* Kangaroo pocket */}
      {r(5, 15, 6, 3, BD)}
      {r(5, 15, 6, 1, B)}
    </svg>
  );
}
