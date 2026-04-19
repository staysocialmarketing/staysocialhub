/**
 * Corey — pixel chibi sprite, 24×32 at P=3 = 72×96px rendered.
 *
 * Visible when seated: top 60px (rows 0-19). Desk surface covers rows 20-31.
 *
 * Row breakdown:
 *   0-3  : hair crown
 *   4-15 : face (skin fills this ENTIRE block — see r(5,4,14,12) below)
 *   9-10 : eyes (2×2 dots inside face block)
 *   16-18: neck
 *   18-19: shoulder tops (visible above desk)
 *   20-31: lower body (hidden behind desk surface — draw anyway for completeness)
 *
 * Silhouette: stocky wide shoulders > head width → founder solidity.
 */

// Hair — short dark-brown, slightly tousled
const H_BASE   = "#3a2414";
const H_HIGH   = "#5a3a20";
const H_SHADOW = "#201008";

// Skin — fair/white with warm undertone
const S_BASE   = "#e8c8a8";
const S_HIGH   = "#f4d8bc";
const S_SHADOW = "#c8a488";

// Eyes
const EYE      = "#1a0a04";

// Shirt — dark navy, grounded
const N_BASE   = "#2a3450";
const N_HIGH   = "#3e4a68";
const N_SHADOW = "#1a2238";

// Gold brand pin
const GOLD_PIN = "#c48a12";

export function CoreyChibi() {
  const P = 3;
  const W = 24 * P; // 72
  const H = 32 * P; // 96
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x * P} y={y * P} width={w * P} height={h * P} fill={fill} />
  );

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'block', overflow: 'visible' }}
    >

      {/* ── HAIR CROWN (rows 0-3) ─────────────────────────────────────────── */}
      {r(7,  0, 10, 1, H_SHADOW)}  {/* top edge, dark */}
      {r(5,  1, 14, 1, H_BASE)}
      {r(4,  2, 16, 2, H_BASE)}    {/* rows 2-3: widest part of hair */}
      {/* Highlight streaks — tousled texture */}
      {r(8,  1,  5, 1, H_HIGH)}
      {r(9,  2,  4, 1, H_HIGH)}
      {r(6,  2,  2, 1, H_HIGH)}    {/* left tuft */}
      {r(16, 2,  2, 1, H_HIGH)}    {/* right tuft */}

      {/* ── HAIR SIDES (rows 4-9, flanking face) ─────────────────────────── */}
      {r(4, 4, 2, 7, H_BASE)}      {/* left side hair */}
      {r(18,4, 2, 7, H_BASE)}      {/* right side hair */}
      {r(4, 4, 1, 7, H_SHADOW)}    {/* left outer shadow */}
      {r(19,4, 1, 7, H_SHADOW)}    {/* right outer shadow */}

      {/* ── FACE BLOCK — EXPLICIT FULL FILL (rows 4-15, cols 5-18) ──────── */}
      {/* This rect is the core of the face. It MUST render to show skin.    */}
      {r(5, 4, 14, 12, S_BASE)}    {/* ← entire face: 42×36px of skin color */}

      {/* Face shading over the base */}
      {r(5,  4, 1, 12, S_SHADOW)}  {/* left edge shadow */}
      {r(18, 4, 1, 12, S_SHADOW)}  {/* right edge shadow */}
      {r(6,  4, 10, 2, S_HIGH)}    {/* forehead highlight (rows 4-5) */}

      {/* Cheek blush patches */}
      {r(6,  11, 3, 2, S_HIGH)}    {/* left cheek */}
      {r(15, 11, 3, 2, S_HIGH)}    {/* right cheek */}

      {/* ── EYES — two 2×2 black dots (rows 9-10, confident wide-set) ───── */}
      {r(8,  9, 2, 2, EYE)}        {/* left eye */}
      {r(14, 9, 2, 2, EYE)}        {/* right eye */}
      {/* White glints — top-right corner of each eye */}
      <rect x={9 * P} y={9 * P} width={1} height={1} fill="#fff" />
      <rect x={15 * P} y={9 * P} width={1} height={1} fill="#fff" />

      {/* ── JAWLINE (rows 14-15 — slightly wider, chibi rounded chin) ────── */}
      {r(4, 14, 16, 2, S_BASE)}
      {r(4, 14,  1, 2, S_SHADOW)}
      {r(19,14,  1, 2, S_SHADOW)}
      {r(5, 15, 14, 1, S_SHADOW)}  {/* chin bottom shadow */}

      {/* ── NECK (rows 16-18) ─────────────────────────────────────────────── */}
      {r(9, 16, 6, 3, S_BASE)}
      {r(9, 16, 1, 3, S_SHADOW)}
      {r(14,16, 1, 3, S_SHADOW)}

      {/* ── SHOULDERS (row 18 — WIDE for stocky build) ───────────────────── */}
      {r(2, 18, 20, 1, N_HIGH)}    {/* broad shoulder highlight */}
      {r(2, 18,  1, 1, N_SHADOW)}
      {r(21,18,  1, 1, N_SHADOW)}

      {/* ── BODY (rows 19-31 — mostly hidden by desk, draw anyway) ────────── */}
      {r(3, 19, 18, 13, N_BASE)}
      {r(3, 19,  1, 13, N_SHADOW)} {/* left body shadow */}
      {r(20,19,  1, 13, N_SHADOW)} {/* right body shadow */}
      {r(4, 19, 16,  1, N_HIGH)}   {/* top body highlight (just below shoulder) */}

      {/* Collar at neck */}
      {r(9, 19, 6, 2, N_HIGH)}
      {r(11,19, 2, 3, N_BASE)}     {/* collar center channel */}

      {/* Gold brand pin — 2×2 left chest */}
      {r(7, 22, 2, 2, GOLD_PIN)}

    </svg>
  );
}
