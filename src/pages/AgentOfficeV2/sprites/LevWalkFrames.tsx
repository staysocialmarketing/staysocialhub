/**
 * Lev walk cycle — 16×20 at P=3 (= 48×60 css-px)
 * Colors match LevSprite: dark-brown hair, warm olive skin, steel navy + amber palette.
 * Narrower shoulders than Corey (1-14 range).
 */

const P  = 3;
const W  = 16 * P;
const Ht = 20 * P;

const H  = '#3a1800'; const HH = '#6b3a10'; const HD = '#260e00';
const S  = '#c8906a'; const SH = '#daa880'; const SD = '#a87050'; const EY = '#1e0800';
const N  = '#1e2d3d'; const NH = '#2e4050'; const ND = '#141e28';
const AM = '#d4822a';
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
  r(4,0,8,1,HD), r(3,1,10,1,H), r(2,2,12,1,H), r(5,1,5,1,HH), r(7,2,3,1,HH),
  r(2,3,2,4,H), r(12,3,2,4,H), r(2,3,1,4,HD), r(13,3,1,4,HD),
  r(3,3,10,7,S), r(3,3,1,7,SD), r(12,3,1,7,SD), r(4,3,8,2,SH),
  r(4,6,3,1,SH), r(9,6,3,1,SH), r(4,5,2,2,EY), r(9,5,2,2,EY),
  r(5,8,1,1,SD), r(6,8,3,1,SD),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(5,10,1,1,AM), r(10,10,1,1,AM),
  r(1,11,14,1,NH), r(1,11,1,1,ND), r(14,11,1,1,ND),
  r(6,11,4,2,N), r(7,11,2,1,NH),
];
const hFDots: [number, number][] = [[5, 5], [10, 5]];

const bodyDown: R[] = [
  r(2,12,12,4,N), r(2,12,1,4,ND), r(13,12,1,4,ND), r(3,12,10,1,NH),
  r(10,13,2,2,AM),
];

const legsDown: R[][] = [
  [r(3,16,4,1,ND),r(9,16,4,1,ND),r(3,17,3,2,ND),r(3,19,3,1,DP),r(9,17,3,2,ND)],
  [r(3,16,4,1,ND),r(9,16,4,1,ND),r(4,17,3,2,ND),r(4,19,3,1,DP),r(9,17,3,2,ND),r(9,19,3,1,DP)],
  [r(3,16,4,1,ND),r(9,16,4,1,ND),r(3,17,3,2,ND),r(9,17,3,2,ND),r(9,19,3,1,DP)],
  [r(3,16,4,1,ND),r(9,16,4,1,ND),r(4,17,3,2,ND),r(4,19,3,1,DP),r(9,17,3,2,ND),r(9,19,3,1,DP)],
];

export const LevWalkDown: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headFront, ...bodyDown, ...legsDown[i]], hFDots)
);

// ── WALK LEFT (side profile) ──────────────────────────────────────────────
const headLeft: R[] = [
  r(3,0,9,1,HD), r(3,1,9,2,H), r(4,1,3,2,HH),
  r(11,1,3,5,H), r(13,1,1,5,HD),
  r(3,2,9,7,S), r(3,2,1,7,SD), r(4,2,7,2,SH),
  r(3,5,1,1,SD), r(5,5,1,2,EY), r(11,6,1,2,SD), r(5,8,2,1,SD),
  r(5,9,5,1,S), r(5,9,1,1,SD), r(9,9,1,1,SD),
  r(9,9,1,1,AM),
  r(2,10,11,1,NH), r(2,10,1,6,ND), r(12,10,1,6,ND),
  r(5,10,3,1,N),
  r(3,11,9,5,N), r(4,11,7,1,NH),
  r(9,13,2,2,AM),
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

export const LevWalkLeft: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headLeft, ...armsLeft[i], ...legsLeft[i]], hLDot)
);

// ── WALK UP (back view) ───────────────────────────────────────────────────
const headBack: R[] = [
  r(4,0,8,1,HD), r(3,1,10,1,H), r(2,2,12,1,H), r(5,1,5,1,HH), r(7,2,3,1,HH),
  r(2,3,2,4,H), r(12,3,2,4,H), r(2,3,1,4,HD), r(13,3,1,4,HD),
  r(6,9,4,1,SD),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(1,11,14,1,NH), r(1,11,1,1,ND), r(14,11,1,1,ND), r(6,11,4,1,N),
  r(2,12,12,4,N), r(2,12,1,4,ND), r(13,12,1,4,ND), r(3,12,10,1,NH),
  r(7,13,2,3,ND),
];

export const LevWalkUp: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headBack, ...legsDown[i]])
);
