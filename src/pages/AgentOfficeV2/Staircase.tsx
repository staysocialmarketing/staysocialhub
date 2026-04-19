import { CANVAS_W, UPPER_FLOOR_H } from './constants/desks';

// Staircase connects upper floor bottom-center to main floor
// Steps descend from y=UPPER_FLOOR_H-24 down to y=UPPER_FLOOR_H+6
const STAIR_CX = CANVAS_W / 2; // 480 — center of canvas
const STAIR_W  = 48;
const STAIR_X  = STAIR_CX - STAIR_W / 2; // 456

const STEPS = 4;
const STEP_H = 5;
const STEP_INDENT = 4; // each step narrows by this much per side

export function Staircase() {
  return (
    <>
      {steps()}
      {/* Stair label */}
      <div
        style={{
          position: 'absolute',
          left: STAIR_CX,
          top: UPPER_FLOOR_H - 24,
          transform: 'translateX(-50%)',
          color: '#1a2840',
          fontSize: 6,
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        ▲ upstairs
      </div>
    </>
  );
}

function steps() {
  const items = [];
  for (let i = 0; i < STEPS; i++) {
    const stepW = STAIR_W - i * STEP_INDENT * 2;
    const stepX = STAIR_X + i * STEP_INDENT;
    const stepY = UPPER_FLOOR_H - 4 - (STEPS - i) * STEP_H;
    items.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: stepX,
          top: stepY,
          width: stepW,
          height: STEP_H,
          background: i === 0 ? '#16202e' : `hsl(216, 40%, ${10 + i * 3}%)`,
          borderTop: '1px solid #243448',
        }}
      />
    );
  }
  return items;
}
