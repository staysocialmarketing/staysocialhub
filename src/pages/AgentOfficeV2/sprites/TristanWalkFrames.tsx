/**
 * Tristan walk cycle — 16×20 at P=3 (= 48×60 css-px)
 * Colors match TristanSprite: wide black afro (cols 1-14), deep ebony skin,
 * bold warm red-orange shirt, stocky full-width shoulders.
 * Afro width remains distinctive in all 3 views.
 */

const P  = 3;
const W  = 16 * P;
const Ht = 20 * P;

const H  = '#100c08'; const HH = '#1e1814';
const S  = '#2e1a0c'; const SH = '#4a2e18'; const SD = '#1c0e06'; const EY = '#0a0604';
const T  = '#b84a18'; const TH = '#d45e22'; const TD = '#7a2e0a';
const BRD = '#1a1a1a'; // short black beard
const TP = '#1a0a08'; // very dark pants (contrast with bold shirt)
const DP = '#080c14';

type R = [number, number, number, number, string];
function r(x: number, y: number, w: number, h: number, fill: string): R { return [x, y, w, h, fill]; }
function makeSvg(rects: R[], dots?: [number, number][]): () => JSX.Element {
  return function WalkFrame() {
    return (
      <svg width={W} height={Ht} viewBox={`0 0 ${W} ${Ht}`}
        shapeRendering="crispEdges" style={{ imageRendering: 'pixelated', display: 'block' }}>
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

// ── WALK DOWN (front) ─────────────────────────────────────────────────────
const headFront: R[] = [
  // Wide afro (extends beyond face to cols 1-14)
  r(2,0,12,1,H), r(1,1,14,1,H), r(1,2,14,2,H),
  r(4,0,4,1,HH), r(1,1,1,3,HH), r(14,1,1,3,HH),
  r(1,4,2,3,H), r(13,4,2,3,H),
  // Face (paints over afro interior)
  r(3,3,10,7,S), r(3,3,1,7,SD), r(12,3,1,7,SD), r(4,3,8,2,SH),
  r(4,6,3,1,SH), r(9,6,3,1,SH), r(4,5,2,2,EY), r(9,5,2,2,EY),
  r(6,8,4,1,SD), r(6,8,1,1,SH), r(9,8,1,1,SH),
  // Short black beard: strip below mouth
  r(5,9,6,1,BRD), r(6,9,4,1,'#0a0a0a'),
  // Neck
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  // Full-width shoulders (stocky)
  r(0,11,16,1,TH), r(0,11,1,1,TD), r(15,11,1,1,TD),
  r(6,11,4,2,T), r(7,11,2,1,TH),
];
const hFDots: [number, number][] = [[5, 5], [10, 5]];

const bodyDown: R[] = [
  r(1,12,14,4,T), r(1,12,1,4,TD), r(14,12,1,4,TD), r(2,12,12,1,TH),
];

const legsDown: R[][] = [
  [r(3,16,4,1,TP),r(9,16,4,1,TP),r(3,17,3,2,TP),r(3,19,3,1,DP),r(9,17,3,2,TP)],
  [r(3,16,4,1,TP),r(9,16,4,1,TP),r(4,17,3,2,TP),r(4,19,3,1,DP),r(9,17,3,2,TP),r(9,19,3,1,DP)],
  [r(3,16,4,1,TP),r(9,16,4,1,TP),r(3,17,3,2,TP),r(9,17,3,2,TP),r(9,19,3,1,DP)],
  [r(3,16,4,1,TP),r(9,16,4,1,TP),r(4,17,3,2,TP),r(4,19,3,1,DP),r(9,17,3,2,TP),r(9,19,3,1,DP)],
];

export const TristanWalkDown: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headFront, ...bodyDown, ...legsDown[i]], hFDots)
);

// ── WALK LEFT (side profile) ──────────────────────────────────────────────
// Afro extends further in both directions in profile — wide & volumetric
const headLeft: R[] = [
  r(2,0,10,1,H), r(1,1,11,2,H), r(3,0,7,1,HH), r(1,1,1,3,HH),
  r(11,1,4,5,H), r(14,1,2,5,H),  // wider trailing afro in profile
  r(3,2,9,7,S), r(3,2,1,7,SD), r(4,2,7,2,SH),
  r(3,5,1,1,SD), r(5,5,1,2,EY), r(11,6,1,2,SD), r(5,8,2,1,SD),
  r(5,9,5,1,S), r(5,9,1,1,SD), r(9,9,1,1,SD),
  // Beard (side profile: jaw strip — after skin so it shows)
  r(6,9,3,1,BRD),
  r(1,10,12,1,TH), r(1,10,1,6,TD), r(13,10,1,6,TD),
  r(5,10,3,1,T),
  r(2,11,10,5,T), r(3,11,8,1,TH),
];
const hLDot: [number, number][] = [[5, 5]];

const armsLeft: R[][] = [
  [r(1,11,2,3,T)],
  [r(1,12,2,3,T)],
  [r(1,13,2,3,TD)],
  [r(1,12,2,3,T)],
];

const legsLeft: R[][] = [
  [r(3,16,4,3,TP),r(3,18,3,1,DP),r(7,16,4,3,T),r(7,19,3,1,DP)],
  [r(3,16,4,3,TP),r(3,19,3,1,DP),r(7,16,4,3,TP),r(7,19,3,1,DP)],
  [r(3,16,4,3,T),r(3,19,3,1,DP),r(7,16,4,3,TP),r(7,18,3,1,DP)],
  [r(3,16,4,3,TP),r(3,19,3,1,DP),r(7,16,4,3,TP),r(7,19,3,1,DP)],
];

export const TristanWalkLeft: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headLeft, ...armsLeft[i], ...legsLeft[i]], hLDot)
);

// ── WALK UP (back view) ───────────────────────────────────────────────────
// Afro visible and wide from behind
const headBack: R[] = [
  r(2,0,12,1,H), r(1,1,14,1,H), r(1,2,14,2,H),
  r(4,0,4,1,HH), r(1,1,1,3,HH), r(14,1,1,3,HH),
  r(1,4,2,3,H), r(13,4,2,3,H),
  r(6,9,4,1,SD),
  // Beard: visible on sides of jaw from back view
  r(4,9,2,1,BRD), r(10,9,2,1,BRD),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(0,11,16,1,TH), r(0,11,1,1,TD), r(15,11,1,1,TD), r(6,11,4,1,T),
  r(1,12,14,4,T), r(1,12,1,4,TD), r(14,12,1,4,TD), r(2,12,12,1,TH),
  r(7,13,2,3,TD),
];

export const TristanWalkUp: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headBack, ...legsDown[i]])
);
