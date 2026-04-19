/**
 * Ember — 16×20 at P=3 = 48×60px
 * Data analyst: neat short professional cut (warm brown), warm medium-brown skin,
 * deep amber top with cream V collar, small amber earring stud.
 */
const H  = "#2a1a14";  // dark warm brown hair
const HH = "#3e2a20";
const HD = "#1a0c0a";

const S  = "#b07a55";  // warm medium-brown (between Corey fair and Tristan ebony)
const SH = "#c49068";
const SD = "#8a5a3a";
const EY = "#1e0800";

const T  = "#9a6018";  // deep amber
const TH = "#b87828";
const TD = "#6a400c";
const CR = "#e8d8b8";  // cream

export function EmberSprite() {
  const P = 3, W = 16 * P, Ht = 20 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x*P} y={y*P} width={w*P} height={h*P} fill={fill} />
  );
  return (
    <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
      shapeRendering="crispEdges" style={{ imageRendering:'pixelated', display:'block' }}>

      {/* ── Hair: neat short cut, close to scalp, warm brown ── */}
      {r(5, 0, 6, 1, H)}
      {r(4, 1, 8, 1, H)}
      {r(5, 0, 5, 1, HH)}   {/* smooth top highlight */}
      {/* Tight sides — minimal width, professional */}
      {r(3, 2, 2, 5, H)}
      {r(11, 2, 2, 5, H)}
      {r(3, 2, 1, 5, HD)}
      {r(12, 2, 1, 5, HD)}

      {/* ── FACE: warm medium-brown ── */}
      {r(3, 3, 10, 7, S)}
      {r(3, 3, 1, 7, SD)}
      {r(12, 3, 1, 7, SD)}
      {r(4, 3, 8, 2, SH)}   {/* forehead */}
      {r(4, 6, 3, 1, SH)}   {/* left cheek */}
      {r(9, 6, 3, 1, SH)}   {/* right cheek */}
      {/* Eyes: slightly inward — focused, composed precision */}
      {r(5, 5, 2, 2, EY)}
      {r(9, 5, 2, 2, EY)}
      <rect x={6*P} y={5*P} width={1} height={1} fill="#fff" />
      <rect x={10*P} y={5*P} width={1} height={1} fill="#fff" />
      {/* Neutral, upright mouth */}
      {r(6, 8, 4, 1, SD)}
      {/* Amber earring stud — right side, earlobe row */}
      {r(12, 8, 1, 1, TH)}

      {/* ── Neck ── */}
      {r(6, 10, 4, 1, S)}
      {r(6, 10, 1, 1, SD)}
      {r(9, 10, 1, 1, SD)}

      {/* ── Shoulders ── */}
      {r(1, 11, 14, 1, TH)}
      {r(1, 11, 1, 1, TD)}
      {r(14, 11, 1, 1, TD)}

      {/* ── Body: deep amber top ── */}
      {r(2, 12, 12, 8, T)}
      {r(2, 12, 1, 8, TD)}
      {r(13, 12, 1, 8, TD)}
      {r(3, 12, 10, 1, TH)}   {/* chest highlight */}
      {/* Cream collar V */}
      {r(6, 11, 4, 1, CR)}
      {r(7, 11, 2, 3, CR)}
    </svg>
  );
}
