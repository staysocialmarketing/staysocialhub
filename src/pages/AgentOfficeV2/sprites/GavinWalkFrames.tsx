/**
 * Gavin walk cycle — 16×20 at P=3 (= 48×60 css-px)
 * Colors match GavinSprite: BALD (scalp = skin, no hair), warm brown skin, earth-tone shirt.
 * Bald head is the most distinctive feature — prominent in all 3 views.
 */

const P  = 3;
const W  = 16 * P;
const Ht = 20 * P;

const S  = '#a86830'; const SH = '#c07840'; const SD = '#8a5220'; const EY = '#100802';
const T  = '#5a3820'; const TH = '#7a4e30'; const TD = '#3a2214';
const GP = TD; // pants same dark earth
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
// Bald head: top rows are skin, not dark hair
const headFront: R[] = [
  r(4,0,8,1,SD),                           // top edge silhouette shadow
  r(3,1,10,1,S), r(2,2,12,1,S),            // scalp rows
  r(5,0,6,1,SH), r(4,1,8,1,SH),            // dome highlights
  r(3,0,1,2,SD), r(12,0,1,2,SD),           // silhouette edges
  r(2,3,2,4,S), r(12,3,2,4,S),             // bald sides (skin)
  r(2,3,1,4,SD), r(13,3,1,4,SD),
  r(3,3,10,7,S), r(3,3,1,7,SD), r(12,3,1,7,SD), r(4,3,8,2,SH),
  r(4,6,3,1,SH), r(9,6,3,1,SH), r(4,5,2,2,EY), r(9,5,2,2,EY),
  r(6,8,4,1,SD),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(2,11,12,1,TH), r(2,11,1,1,TD), r(13,11,1,1,TD),
  r(6,11,4,2,T), r(7,11,2,1,TH),
];
const hFDots: [number, number][] = [[5, 5], [10, 5]];

const bodyDown: R[] = [
  r(2,12,12,4,T), r(2,12,1,4,TD), r(13,12,1,4,TD), r(3,12,10,1,TH),
];

const legsDown: R[][] = [
  [r(3,16,4,1,GP),r(9,16,4,1,GP),r(3,17,3,2,GP),r(3,19,3,1,DP),r(9,17,3,2,GP)],
  [r(3,16,4,1,GP),r(9,16,4,1,GP),r(4,17,3,2,GP),r(4,19,3,1,DP),r(9,17,3,2,GP),r(9,19,3,1,DP)],
  [r(3,16,4,1,GP),r(9,16,4,1,GP),r(3,17,3,2,GP),r(9,17,3,2,GP),r(9,19,3,1,DP)],
  [r(3,16,4,1,GP),r(9,16,4,1,GP),r(4,17,3,2,GP),r(4,19,3,1,DP),r(9,17,3,2,GP),r(9,19,3,1,DP)],
];

export const GavinWalkDown: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headFront, ...bodyDown, ...legsDown[i]], hFDots)
);

// ── WALK LEFT (side profile) ──────────────────────────────────────────────
// Bald profile: scalp visible, no trailing dark hair — immediately readable as bald
const headLeft: R[] = [
  r(3,0,9,1,SD), r(3,1,9,2,S), r(4,0,6,1,SH), r(4,1,8,1,SH),
  r(11,1,3,5,S), r(13,1,1,5,SD),   // bald "trailing" = skin, not hair
  r(3,2,9,7,S), r(3,2,1,7,SD), r(4,2,7,2,SH),
  r(3,5,1,1,SD), r(5,5,1,2,EY), r(11,6,1,2,SD), r(5,8,2,1,SD),
  r(5,9,5,1,S), r(5,9,1,1,SD), r(9,9,1,1,SD),
  r(2,10,10,1,TH), r(2,10,1,6,TD), r(11,10,1,6,TD),
  r(5,10,3,1,T),
  r(3,11,8,5,T), r(4,11,6,1,TH),
];
const hLDot: [number, number][] = [[5, 5]];

const armsLeft: R[][] = [
  [r(1,11,2,3,T)],
  [r(1,12,2,3,T)],
  [r(1,13,2,3,TD)],
  [r(1,12,2,3,T)],
];

const legsLeft: R[][] = [
  [r(3,16,4,3,GP),r(3,18,3,1,DP),r(7,16,4,3,T),r(7,19,3,1,DP)],
  [r(3,16,4,3,GP),r(3,19,3,1,DP),r(7,16,4,3,GP),r(7,19,3,1,DP)],
  [r(3,16,4,3,T),r(3,19,3,1,DP),r(7,16,4,3,GP),r(7,18,3,1,DP)],
  [r(3,16,4,3,GP),r(3,19,3,1,DP),r(7,16,4,3,GP),r(7,19,3,1,DP)],
];

export const GavinWalkLeft: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headLeft, ...armsLeft[i], ...legsLeft[i]], hLDot)
);

// ── WALK UP (back view) ───────────────────────────────────────────────────
// Back of bald head: smooth skin dome
const headBack: R[] = [
  r(4,0,8,1,SD), r(3,1,10,1,S), r(2,2,12,2,S),
  r(5,0,6,1,SH), r(4,1,8,1,SH),
  r(2,4,2,4,S), r(12,4,2,4,S),
  r(2,4,1,4,SD), r(13,4,1,4,SD),
  r(6,9,4,1,SD),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(2,11,12,1,TH), r(2,11,1,1,TD), r(13,11,1,1,TD), r(6,11,4,1,T),
  r(2,12,12,4,T), r(2,12,1,4,TD), r(13,12,1,4,TD), r(3,12,10,1,TH),
  r(7,13,2,3,TD),
];

export const GavinWalkUp: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headBack, ...legsDown[i]])
);
