/**
 * Ember walk cycle — 16×20 at P=3 (= 48×60 css-px)
 * Colors match EmberSprite: short neat warm-brown hair, warm medium-brown skin,
 * deep amber top, cream V-collar, amber earring stud (right ear, stays consistent).
 */

const P  = 3;
const W  = 16 * P;
const Ht = 20 * P;

const H  = '#2a1a14'; const HH = '#3e2a20'; const HD = '#1a0c0a';
const S  = '#b07a55'; const SH = '#c49068'; const SD = '#8a5a3a'; const EY = '#1e0800';
const T  = '#9a6018'; const TH = '#b87828'; const TD = '#6a400c';
const CR = '#e8d8b8';
const EP = '#1e1820'; // dark neutral pants
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
  r(5,0,6,1,H), r(4,1,8,1,H), r(5,0,5,1,HH),
  r(3,2,2,5,H), r(11,2,2,5,H), r(3,2,1,5,HD), r(12,2,1,5,HD),
  r(3,3,10,7,S), r(3,3,1,7,SD), r(12,3,1,7,SD), r(4,3,8,2,SH),
  r(4,6,3,1,SH), r(9,6,3,1,SH), r(5,5,2,2,EY), r(9,5,2,2,EY),
  r(6,8,4,1,SD),
  r(12,8,1,1,TH), // amber earring stud (right ear)
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(1,11,14,1,TH), r(1,11,1,1,TD), r(14,11,1,1,TD),
  r(6,11,4,1,CR), r(7,11,2,3,CR),
];
const hFDots: [number, number][] = [[6, 5], [10, 5]];

const bodyDown: R[] = [
  r(2,12,12,4,T), r(2,12,1,4,TD), r(13,12,1,4,TD), r(3,12,10,1,TH),
];

const legsDown: R[][] = [
  [r(3,16,4,1,EP),r(9,16,4,1,EP),r(3,17,3,2,EP),r(3,19,3,1,DP),r(9,17,3,2,EP)],
  [r(3,16,4,1,EP),r(9,16,4,1,EP),r(4,17,3,2,EP),r(4,19,3,1,DP),r(9,17,3,2,EP),r(9,19,3,1,DP)],
  [r(3,16,4,1,EP),r(9,16,4,1,EP),r(3,17,3,2,EP),r(9,17,3,2,EP),r(9,19,3,1,DP)],
  [r(3,16,4,1,EP),r(9,16,4,1,EP),r(4,17,3,2,EP),r(4,19,3,1,DP),r(9,17,3,2,EP),r(9,19,3,1,DP)],
];

export const EmberWalkDown: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headFront, ...bodyDown, ...legsDown[i]], hFDots)
);

// ── WALK LEFT (side profile) ──────────────────────────────────────────────
const headLeft: R[] = [
  // Short neat hair — minimal overhang, tight profile
  r(4,0,8,1,HD), r(3,1,9,1,H), r(4,0,6,1,HH),
  r(11,1,2,3,H), r(12,1,1,3,HD),  // minimal trailing (short cut)
  r(3,2,9,7,S), r(3,2,1,7,SD), r(4,2,7,2,SH),
  r(3,5,1,1,SD), r(5,5,1,2,EY),
  r(11,6,1,2,SD),   // far ear
  r(11,7,1,1,TH),   // amber earring on far ear
  r(5,8,2,1,SD),
  r(5,9,5,1,S), r(5,9,1,1,SD), r(9,9,1,1,SD),
  r(2,10,11,1,TH), r(2,10,1,6,TD), r(12,10,1,6,TD),
  r(5,10,3,1,CR),
  r(3,11,9,5,T), r(4,11,7,1,TH),
  r(6,11,1,3,CR),
];
const hLDot: [number, number][] = [[5, 5]];

const armsLeft: R[][] = [
  [r(1,11,2,3,T)],
  [r(1,12,2,3,T)],
  [r(1,13,2,3,TD)],
  [r(1,12,2,3,T)],
];

const legsLeft: R[][] = [
  [r(3,16,4,3,EP),r(3,18,3,1,DP),r(7,16,4,3,T),r(7,19,3,1,DP)],
  [r(3,16,4,3,EP),r(3,19,3,1,DP),r(7,16,4,3,EP),r(7,19,3,1,DP)],
  [r(3,16,4,3,T),r(3,19,3,1,DP),r(7,16,4,3,EP),r(7,18,3,1,DP)],
  [r(3,16,4,3,EP),r(3,19,3,1,DP),r(7,16,4,3,EP),r(7,19,3,1,DP)],
];

export const EmberWalkLeft: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headLeft, ...armsLeft[i], ...legsLeft[i]], hLDot)
);

// ── WALK UP (back view) ───────────────────────────────────────────────────
const headBack: R[] = [
  r(5,0,6,1,H), r(4,1,8,1,H), r(5,0,5,1,HH),
  r(3,2,2,5,H), r(11,2,2,5,H), r(3,2,1,5,HD), r(12,2,1,5,HD),
  r(6,9,4,1,SD),
  r(6,10,4,1,S), r(6,10,1,1,SD), r(9,10,1,1,SD),
  r(1,11,14,1,TH), r(1,11,1,1,TD), r(14,11,1,1,TD), r(6,11,4,1,T),
  r(2,12,12,4,T), r(2,12,1,4,TD), r(13,12,1,4,TD), r(3,12,10,1,TH),
  r(7,13,2,3,TD),
];

export const EmberWalkUp: Array<() => JSX.Element> = [0, 1, 2, 3].map(i =>
  makeSvg([...headBack, ...legsDown[i]])
);
