/**
 * Corey walk cycle — 16×20 at P=3 (= 48×60 css-px)
 * Colors match CoreySprite: short dark-brown hair, fair skin, navy/gold palette.
 * Full 16-col shoulders (founder stocky build).
 */

const P  = 3;
const W  = 16 * P;
const Ht = 20 * P;

const H  = '#2a1608'; const HH = '#5a3a20'; const HD = '#180c04';
const S  = '#e8c8a8'; const SH = '#f4d8bc'; const SD = '#c8a488'; const EY = '#1a0a04';
const N  = '#2a3450'; const NH = '#3e4a68'; const ND = '#1a2238';
const GP = '#c48a12';
const DP = '#080c14';
const ST = '#4a2a10';  // stubble shadow — subtle

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
  r(4,0,8,1,HD), r(3,1,10,1,H), r(2,2,12,1,H), r(5,1,4,1,HH), r(8,2,3,1,HH),
  r(2,3,2,3,H), r(12,3,2,3,H), r(2,3,1,3,HD), r(13,3,1,3,HD),
  r(3,3,10,7,S), r(3,3,1,7,SD), r(12,3,1,7,SD), r(4,3,8,2,SH),
  r(4,6,3,1,SH), r(9,6,3,1,SH), r(4,5,2,2,EY), r(9,5,2,2,EY),
  r(6,8,3,1,SD),
  // Very short dark shadow stubble under chin
  r(5,9,6,1,ST),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(0,11,16,1,NH), r(0,11,1,1,ND), r(15,11,1,1,ND),
  r(6,11,4,2,N), r(7,11,2,1,NH),
];
const hFDots: [number, number][] = [[5, 5], [10, 5]];

const bodyDown: R[] = [
  r(1,12,14,4,N), r(1,12,1,4,ND), r(14,12,1,4,ND), r(2,12,12,1,NH),
  r(4,13,2,2,GP),
];

const legsDown: R[][] = [
  [r(3,16,4,1,ND),r(9,16,4,1,ND),r(3,17,3,2,ND),r(3,19,3,1,DP),r(9,17,3,2,ND)],
  [r(3,16,4,1,ND),r(9,16,4,1,ND),r(4,17,3,2,ND),r(4,19,3,1,DP),r(9,17,3,2,ND),r(9,19,3,1,DP)],
  [r(3,16,4,1,ND),r(9,16,4,1,ND),r(3,17,3,2,ND),r(9,17,3,2,ND),r(9,19,3,1,DP)],
  [r(3,16,4,1,ND),r(9,16,4,1,ND),r(4,17,3,2,ND),r(4,19,3,1,DP),r(9,17,3,2,ND),r(9,19,3,1,DP)],
];

export const CoreyWalkDown: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headFront, ...bodyDown, ...legsDown[i]], hFDots)
);

// ── WALK LEFT (side profile) ──────────────────────────────────────────────
const headLeft: R[] = [
  r(3,0,9,1,HD), r(3,1,9,2,H), r(4,1,3,2,HH),
  r(11,1,3,5,H), r(13,1,1,5,HD),
  r(3,2,10,7,S), r(3,2,1,7,SD), r(4,2,8,2,SH),
  r(3,5,1,1,SD), r(5,5,1,2,EY), r(11,6,1,2,SD), r(5,8,2,1,SD),
  // Stubble (side profile: jaw shadow strip)
  r(5,9,4,1,ST),
  r(5,9,5,1,S), r(5,9,1,1,SD), r(9,9,1,1,SD),
  r(1,10,12,1,NH), r(1,10,1,6,ND), r(12,10,1,6,ND),
  r(5,10,3,1,N),
  r(2,11,10,5,N), r(3,11,8,1,NH),
];
const hLDot: [number, number][] = [[5, 5]];

const armsLeft: R[][] = [
  [r(1,11,2,3,N)],
  [r(1,12,2,3,N)],
  [r(1,13,2,3,ND)],
  [r(1,12,2,3,N)],
];

const legsLeft: R[][] = [
  [r(3,16,4,3,ND),r(3,18,3,1,DP),r(7,16,4,3,N),r(7,19,3,1,DP)],
  [r(3,16,4,3,ND),r(3,19,3,1,DP),r(7,16,4,3,ND),r(7,19,3,1,DP)],
  [r(3,16,4,3,N),r(3,19,3,1,DP),r(7,16,4,3,ND),r(7,18,3,1,DP)],
  [r(3,16,4,3,ND),r(3,19,3,1,DP),r(7,16,4,3,ND),r(7,19,3,1,DP)],
];

export const CoreyWalkLeft: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headLeft, ...armsLeft[i], ...legsLeft[i]], hLDot)
);

// ── WALK UP (back view) ───────────────────────────────────────────────────
const headBack: R[] = [
  r(4,0,8,1,HD), r(3,1,10,1,H), r(2,2,12,1,H), r(5,1,4,1,HH), r(8,2,3,1,HH),
  r(2,3,2,3,H), r(12,3,2,3,H), r(2,3,1,3,HD), r(13,3,1,3,HD),
  r(6,9,4,1,SD),
  // Stubble: subtle shadow on sides of jaw from back
  r(4,9,2,1,ST), r(10,9,2,1,ST),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(0,11,16,1,NH), r(0,11,1,1,ND), r(15,11,1,1,ND), r(6,11,4,1,N),
  r(1,12,14,4,N), r(1,12,1,4,ND), r(14,12,1,4,ND), r(2,12,12,1,NH),
  r(7,13,2,3,ND),
];

export const CoreyWalkUp: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headBack, ...legsDown[i]])
);
