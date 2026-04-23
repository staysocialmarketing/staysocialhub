/**
 * Gavin — 16×20 at P=3 = 48×60px
 * Creative director: BALD, warm brown skin, earth-tone shirt, quiet authority.
 * Features: short brown beard + dark-grey glasses.
 */
const S  = "#a86830";
const SH = "#c07840";
const SD = "#8a5220";
const EY = "#100802";

const T  = "#5a3820";  // warm earth
const TH = "#7a4e30";
const TD = "#3a2214";
const GL = "#333333";  // glasses dark grey
const BD = "#7a4a1a";  // beard warm brown

export function GavinSprite() {
  const P = 3, W = 16 * P, Ht = 20 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x*P} y={y*P} width={w*P} height={h*P} fill={fill} />
  );
  return (
    <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
      shapeRendering="crispEdges" style={{ imageRendering:'pixelated', display:'block' }}>

      {/* ── Bald head: scalp = skin, smooth dome ── */}
      {r(4, 0, 8, 1, SD)}   {/* top edge shadow */}
      {r(3, 1, 10, 1, S)}   {/* scalp row 1 */}
      {r(2, 2, 12, 1, S)}   {/* scalp row 2 — full width */}
      {r(5, 0, 6, 1, SH)}   {/* dome highlight */}
      {r(4, 1, 8, 1, SH)}   {/* forehead highlight row 1 */}
      {r(3, 0, 1, 2, SD)}   {/* left silhouette */}
      {r(12, 0, 1, 2, SD)}  {/* right silhouette */}
      {/* Bald sides — scalp continues down */}
      {r(2, 3, 2, 4, S)}
      {r(12, 3, 2, 4, S)}
      {r(2, 3, 1, 4, SD)}
      {r(13, 3, 1, 4, SD)}

      {/* ── FACE ── */}
      {r(3, 3, 10, 7, S)}
      {r(3, 3, 1, 7, SD)}
      {r(12, 3, 1, 7, SD)}
      {r(4, 3, 8, 2, SH)}
      {r(4, 6, 3, 1, SH)}
      {r(9, 6, 3, 1, SH)}
      {/* Glasses frames (drawn before eyes so pupils paint over interior) */}
      {r(4, 5, 3, 2, GL)} {/* left lens frame */}
      {r(8, 5, 1, 1, GL)} {/* bridge */}
      {r(9, 5, 2, 2, GL)} {/* right lens frame */}
      {/* Eyes: quiet, thoughtful */}
      {r(4, 5, 2, 2, EY)}
      {r(9, 5, 2, 2, EY)}
      <rect x={5*P} y={5*P} width={1} height={1} fill="#fff" />
      <rect x={10*P} y={5*P} width={1} height={1} fill="#fff" />
      {/* Glasses frames: two 3×2 rects + 1px bridge */}
      {r(4, 5, 3, 2, GL)}
      {r(9, 5, 3, 2, GL)}
      {r(8, 5, 1, 1, GL)} {/* bridge */}
      {/* Eye pupils over glasses */}
      {r(5, 5, 1, 1, EY)}
      {r(10, 5, 1, 1, EY)}
      {/* Subtle serene mouth */}
      {r(6, 8, 4, 1, SD)}
      {/* Short brown beard: 4px strip below mouth */}
      {r(5, 9, 6, 1, BD)}
      {r(6, 9, 4, 1, "#6a3a10")} {/* slightly darker center */}

      {/* ── Neck ── */}
      {r(6, 10, 4, 1, S)}
      {r(6, 10, 1, 1, SD)}
      {r(9, 10, 1, 1, SD)}

      {/* ── Shoulders: slightly narrower (director) ── */}
      {r(2, 11, 12, 1, TH)}
      {r(2, 11, 1, 1, TD)}
      {r(13, 11, 1, 1, TD)}

      {/* ── Body: warm earth shirt ── */}
      {r(2, 12, 12, 8, T)}
      {r(2, 12, 1, 8, TD)}
      {r(13, 12, 1, 8, TD)}
      {r(3, 12, 10, 1, TH)}
      {/* Crew neck */}
      {r(6, 11, 4, 2, T)}
      {r(7, 11, 2, 1, TH)}
    </svg>
  );
}
