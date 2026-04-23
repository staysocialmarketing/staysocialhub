/**
 * Tristan — 16×20 at P=3 = 48×60px
 * Sales director: stocky build, deep ebony skin, medium-short black afro (wider than face),
 * full-width shoulders, bold warm red-orange shirt.
 */
const H  = "#100c08";  // afro — deep black
const HH = "#1e1814";  // afro volume highlight

const S  = "#2e1a0c";  // deep ebony
const SH = "#4a2e18";
const SD = "#1c0e06";
const EY = "#0a0604";

const T  = "#b84a18";  // bold warm shirt
const TH = "#d45e22";
const TD = "#7a2e0a";

const BRD = "#1a1a1a";  // short black beard

export function TristanSprite() {
  const P = 3, W = 16 * P, Ht = 20 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x*P} y={y*P} width={w*P} height={h*P} fill={fill} />
  );
  return (
    <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
      shapeRendering="crispEdges" style={{ imageRendering:'pixelated', display:'block' }}>

      {/* ── Afro: WIDER than face (cols 1-14), volumetric ── */}
      {r(2, 0, 12, 1, H)}
      {r(1, 1, 14, 1, H)}
      {r(1, 2, 14, 2, H)}   {/* widest — 2 rows */}
      {r(4, 0, 4, 1, HH)}   {/* top dome highlight */}
      {r(1, 1, 1, 3, HH)}   {/* left volume */}
      {r(14, 1, 1, 3, HH)}  {/* right volume */}
      {/* Afro sides extend past face rows */}
      {r(1, 4, 2, 3, H)}
      {r(13, 4, 2, 3, H)}

      {/* ── FACE — face fill paints over afro inner area ── */}
      {r(3, 3, 10, 7, S)}
      {r(3, 3, 1, 7, SD)}
      {r(12, 3, 1, 7, SD)}
      {r(4, 3, 8, 2, SH)}
      {r(4, 6, 3, 1, SH)}
      {r(9, 6, 3, 1, SH)}
      {/* Eyes: confident, direct */}
      {r(4, 5, 2, 2, EY)}
      {r(9, 5, 2, 2, EY)}
      <rect x={5*P} y={5*P} width={1} height={1} fill="#fff" />
      <rect x={10*P} y={5*P} width={1} height={1} fill="#fff" />
      {/* Confident smile */}
      {r(6, 8, 4, 1, SD)}
      {r(6, 8, 1, 1, SH)}
      {r(9, 8, 1, 1, SH)}
      {/* Short black beard: 3–4px strip below mouth */}
      {r(5, 9, 6, 1, BRD)}
      {r(6, 9, 4, 1, "#0a0a0a")} {/* slightly darker center */}

      {/* ── Neck ── */}
      {r(6, 10, 4, 1, S)}
      {r(6, 10, 1, 1, SD)}
      {r(9, 10, 1, 1, SD)}

      {/* ── Shoulders: FULL WIDTH for stocky build ── */}
      {r(0, 11, 16, 1, TH)}
      {r(0, 11, 1, 1, TD)}
      {r(15, 11, 1, 1, TD)}

      {/* ── Body ── */}
      {r(1, 12, 14, 8, T)}
      {r(1, 12, 1, 8, TD)}
      {r(14, 12, 1, 8, TD)}
      {r(2, 12, 12, 1, TH)}
      {/* Collar */}
      {r(6, 11, 4, 2, T)}
      {r(7, 11, 2, 1, TH)}
    </svg>
  );
}
