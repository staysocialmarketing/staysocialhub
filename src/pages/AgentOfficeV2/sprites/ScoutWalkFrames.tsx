/**
 * Scout walk cycle — 16×20 at P=3 (= 48×60 css-px)
 *
 * ScoutWalkDown[0-3]  front-facing, walking toward viewer
 * ScoutWalkLeft[0-3]  side profile facing left
 * ScoutWalkUp[0-3]    back view, walking away
 * Right direction     = ScoutWalkLeft rendered with CSS scaleX(-1) at use-site
 *
 * Stride sequence per direction: leg-back | neutral | leg-forward | neutral
 * Intended playback: 8 fps (125 ms per frame)
 */

const P  = 3;
const W  = 16 * P;   // 48 css-px
const Ht = 20 * P;   // 60 css-px

/* ── palette (identical to ScoutSprite idle) ────────────────────────────── */
const H  = '#1a1a2a';
const HH = '#2e2e44';
const HD = '#0c0c18';
const S  = '#c8906a';
const SH = '#daa880';
const SD = '#a87050';
const EY = '#1e0800';
const G  = '#2e6b3e';
const GH = '#3d8a52';
const GD = '#1e4a2a';
const CR = '#e8dfc0';
const DP = '#121828';  // dark pants / boots

/* ── helpers ─────────────────────────────────────────────────────────────── */
type R = [number, number, number, number, string];

function r(x: number, y: number, w: number, h: number, fill: string): R {
  return [x, y, w, h, fill];
}

function makeSvg(rects: R[], dots?: [number, number][]): () => JSX.Element {
  return function WalkFrame() {
    return (
      <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
        shapeRendering="crispEdges"
        style={{ imageRendering: 'pixelated', display: 'block' }}>
        {rects.map(([x, y, w, h, fill], i) => (
          <rect key={i} x={x * P} y={y * P} width={w * P} height={h * P} fill={fill} />
        ))}
        {dots?.map(([x, y], i) => (
          <rect key={`s${i}`} x={x * P} y={y * P} width={1} height={1} fill="#fff" />
        ))}
      </svg>
    );
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * WALK DOWN — front-facing, toward viewer
 * ═══════════════════════════════════════════════════════════════════════════ */

// Head + upper body — identical to idle ScoutSprite rows 0-11
const headFront: R[] = [
  r(4,0,8,1,HD), r(3,1,10,1,H), r(2,2,12,1,H), r(3,1,3,2,HH),
  r(2,3,2,4,H),  r(12,3,2,4,H), r(2,3,1,4,HD), r(13,3,1,4,HD),
  r(3,3,10,7,S), r(3,3,1,7,SD), r(12,3,1,7,SD), r(4,3,8,2,SH),
  r(3,5,2,2,EY), r(10,5,2,2,EY),
  r(6,8,2,1,SD), r(8,7,1,1,SD),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(1,11,14,1,GH), r(1,11,1,1,GD), r(14,11,1,1,GD),
  r(6,11,4,2,CR),
];
const headFrontDots: [number, number][] = [[4, 5], [11, 5]];

// Hoodie torso (rows 12-15, constant across down-walk frames)
const bodyDown: R[] = [
  r(2,12,12,4,G), r(2,12,1,4,GD), r(13,12,1,4,GD), r(3,12,10,1,GH),
  r(6,15,4,1,GD),
];

// Leg configs: [hip+leg+foot rects] per frame
// Row 16 = hip, row 17-18 = thighs/shins, row 19 = boot sole
const legsDown: R[][] = [
  // F0 — left foot forward
  [
    r(3,16,4,1,GD), r(9,16,4,1,GD),
    r(3,17,3,2,GD), r(3,19,3,1,DP),   // left leg reaches floor
    r(9,17,3,2,GD),                     // right leg lifted (no foot pixel)
  ],
  // F1 — neutral, both feet planted
  [
    r(3,16,4,1,GD), r(9,16,4,1,GD),
    r(4,17,3,2,GD), r(4,19,3,1,DP),
    r(9,17,3,2,GD), r(9,19,3,1,DP),
  ],
  // F2 — right foot forward
  [
    r(3,16,4,1,GD), r(9,16,4,1,GD),
    r(3,17,3,2,GD),                     // left leg lifted
    r(9,17,3,2,GD), r(9,19,3,1,DP),   // right leg reaches floor
  ],
  // F3 — neutral (same as F1)
  [
    r(3,16,4,1,GD), r(9,16,4,1,GD),
    r(4,17,3,2,GD), r(4,19,3,1,DP),
    r(9,17,3,2,GD), r(9,19,3,1,DP),
  ],
];

export const ScoutWalkDown: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headFront, ...bodyDown, ...legsDown[i]], headFrontDots)
);

/* ═══════════════════════════════════════════════════════════════════════════
 * WALK LEFT — side profile, Scout faces left
 * Right direction = these frames + CSS transform: scaleX(-1)
 * ═══════════════════════════════════════════════════════════════════════════ */

// Head in profile — nose stub at x=3 (leftmost), hair trailing right
const headLeft: R[] = [
  r(3,0,9,1,HD), r(3,1,9,2,H), r(4,1,3,2,HH),
  r(11,1,3,5,H), r(13,1,1,5,HD),
  r(3,2,9,7,S),  r(3,2,1,7,SD), r(4,2,7,2,SH),
  r(3,5,1,1,SD),  // nose stub
  r(5,5,1,2,EY),  // side-view eye
  r(11,6,1,2,SD), // far ear
  r(5,8,2,1,SD),  // mouth hint
  r(5,9,5,1,S),   r(5,9,1,1,SD), r(9,9,1,1,SD),
  r(2,10,11,1,GH), r(2,10,1,6,GD), r(12,10,1,6,GD),
  r(5,10,4,1,CR),
  r(3,11,9,5,G),  r(4,11,7,1,GH),
];
const headLeftDot: [number, number][] = [[5, 5]];

// Near arm (left arm in this profile) swings opposite to forward leg
// F0=arm fwd, F1=neutral, F2=arm back, F3=neutral
const armsLeft: R[][] = [
  [r(1,11,2,3,G)],    // F0: arm forward (rows 11-13)
  [r(1,12,2,3,G)],    // F1: neutral (rows 12-14)
  [r(1,13,2,3,GD)],   // F2: arm back + darker (rows 13-15)
  [r(1,12,2,3,G)],    // F3: neutral
];

// Near leg = x=3-6 (left side of frame), far leg = x=7-10 (slightly behind)
// Brighter = forward (nearer to viewer), darker = back
const legsLeft: R[][] = [
  // F0 — near leg back, far leg forward
  [
    r(3,16,4,3,GD), r(3,18,3,1,DP),   // near leg back, foot slightly elevated
    r(7,16,4,3,G),  r(7,19,3,1,DP),   // far leg forward, foot at floor
  ],
  // F1 — neutral
  [
    r(3,16,4,3,GD), r(3,19,3,1,DP),
    r(7,16,4,3,GD), r(7,19,3,1,DP),
  ],
  // F2 — near leg forward, far leg back
  [
    r(3,16,4,3,G),  r(3,19,3,1,DP),   // near leg forward
    r(7,16,4,3,GD), r(7,18,3,1,DP),   // far leg back, foot slightly elevated
  ],
  // F3 — neutral
  [
    r(3,16,4,3,GD), r(3,19,3,1,DP),
    r(7,16,4,3,GD), r(7,19,3,1,DP),
  ],
];

export const ScoutWalkLeft: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headLeft, ...armsLeft[i], ...legsLeft[i]], headLeftDot)
);

/* ═══════════════════════════════════════════════════════════════════════════
 * WALK UP — back view, walking away from viewer
 * ═══════════════════════════════════════════════════════════════════════════ */

// Back of head — no face features visible
const headBack: R[] = [
  r(3,0,10,1,HD), r(2,1,12,1,H), r(2,2,12,2,H),
  r(2,4,2,4,H),   r(12,4,2,4,H),
  r(2,4,1,4,HD),  r(13,4,1,4,HD),
  r(6,9,4,1,SD),  // back of neck
  r(1,10,14,1,GH), r(1,10,1,6,GD), r(14,10,1,6,GD),
  r(2,11,12,5,G),  r(3,11,10,1,GH),
  r(7,13,2,3,GD),  // subtle back seam
];

// Legs from behind — same alternation pattern as walk-down
export const ScoutWalkUp: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headBack, ...legsDown[i]])
);
