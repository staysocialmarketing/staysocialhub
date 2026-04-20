/**
 * Quill walk cycle — 16×20 at P=3 (= 48×60 css-px)
 * Colors match QuillSprite: auburn hair (distinctive), warm skin, burgundy top, cream V-collar.
 * Slightly longer hair sides than Scout.
 */

const P  = 3;
const W  = 16 * P;
const Ht = 20 * P;

const H  = '#8b3a1a'; const HH = '#c05020'; const HD = '#5a1e08';
const S  = '#d4a06a'; const SH = '#e4b888'; const SD = '#b07848'; const EY = '#1e0800';
const B  = '#7a1a2e'; const BH = '#962030'; const BD = '#4e0e1e';
const CR = '#e8dfc0';
const QP = '#2a1810'; // dark warm-brown pants
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
  r(4,0,8,1,HD), r(3,1,10,1,H), r(2,2,12,2,H), r(5,0,5,2,HH),
  r(2,2,1,2,HD), r(13,2,1,2,HD),
  r(2,4,2,4,H), r(12,4,2,4,H), r(2,4,1,4,HD), r(13,4,1,4,HD),
  r(3,3,10,7,S), r(3,3,1,7,SD), r(12,3,1,7,SD), r(4,3,8,2,SH),
  r(4,6,2,1,SH), r(10,6,2,1,SH), r(4,5,2,2,EY), r(9,5,2,2,EY),
  r(6,8,4,1,SD), r(6,8,1,1,SH), r(9,8,1,1,SH),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(1,11,14,1,BH), r(1,11,1,1,BD), r(14,11,1,1,BD),
  r(6,11,4,1,CR), r(7,11,2,3,CR),
];
const hFDots: [number, number][] = [[5, 5], [10, 5]];

const bodyDown: R[] = [
  r(2,12,12,4,B), r(2,12,1,4,BD), r(13,12,1,4,BD), r(3,12,10,1,BH),
];

const legsDown: R[][] = [
  [r(3,16,4,1,QP),r(9,16,4,1,QP),r(3,17,3,2,QP),r(3,19,3,1,DP),r(9,17,3,2,QP)],
  [r(3,16,4,1,QP),r(9,16,4,1,QP),r(4,17,3,2,QP),r(4,19,3,1,DP),r(9,17,3,2,QP),r(9,19,3,1,DP)],
  [r(3,16,4,1,QP),r(9,16,4,1,QP),r(3,17,3,2,QP),r(9,17,3,2,QP),r(9,19,3,1,DP)],
  [r(3,16,4,1,QP),r(9,16,4,1,QP),r(4,17,3,2,QP),r(4,19,3,1,DP),r(9,17,3,2,QP),r(9,19,3,1,DP)],
];

export const QuillWalkDown: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headFront, ...bodyDown, ...legsDown[i]], hFDots)
);

// ── WALK LEFT (side profile) ──────────────────────────────────────────────
const headLeft: R[] = [
  r(3,0,9,1,HD), r(3,1,9,2,H), r(4,1,3,2,HH),
  r(11,1,3,6,H), r(13,1,1,6,HD),  // slightly longer trailing hair
  r(3,2,9,7,S), r(3,2,1,7,SD), r(4,2,7,2,SH),
  r(3,5,1,1,SD), r(5,5,1,2,EY), r(11,6,1,2,SD), r(5,8,2,1,SD),
  r(5,9,5,1,S), r(5,9,1,1,SD), r(9,9,1,1,SD),
  r(2,10,11,1,BH), r(2,10,1,6,BD), r(12,10,1,6,BD),
  r(5,10,3,1,CR),
  r(3,11,9,5,B), r(4,11,7,1,BH),
  r(6,11,1,3,CR),
];
const hLDot: [number, number][] = [[5, 5]];

const armsLeft: R[][] = [
  [r(1,11,2,3,B)],
  [r(1,12,2,3,B)],
  [r(1,13,2,3,BD)],
  [r(1,12,2,3,B)],
];

const legsLeft: R[][] = [
  [r(3,16,4,3,QP),r(3,18,3,1,DP),r(7,16,4,3,B),r(7,19,3,1,DP)],
  [r(3,16,4,3,QP),r(3,19,3,1,DP),r(7,16,4,3,QP),r(7,19,3,1,DP)],
  [r(3,16,4,3,B),r(3,19,3,1,DP),r(7,16,4,3,QP),r(7,18,3,1,DP)],
  [r(3,16,4,3,QP),r(3,19,3,1,DP),r(7,16,4,3,QP),r(7,19,3,1,DP)],
];

export const QuillWalkLeft: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headLeft, ...armsLeft[i], ...legsLeft[i]], hLDot)
);

// ── WALK UP (back view) ───────────────────────────────────────────────────
const headBack: R[] = [
  r(4,0,8,1,HD), r(3,1,10,1,H), r(2,2,12,2,H), r(5,0,5,2,HH),
  r(2,2,1,2,HD), r(13,2,1,2,HD),
  r(2,4,2,4,H), r(12,4,2,4,H), r(2,4,1,4,HD), r(13,4,1,4,HD),
  r(6,9,4,1,SD),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(1,11,14,1,BH), r(1,11,1,1,BD), r(14,11,1,1,BD), r(6,11,4,1,B),
  r(2,12,12,4,B), r(2,12,1,4,BD), r(13,12,1,4,BD), r(3,12,10,1,BH),
  r(7,13,2,3,BD),
];

export const QuillWalkUp: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headBack, ...legsDown[i]])
);
