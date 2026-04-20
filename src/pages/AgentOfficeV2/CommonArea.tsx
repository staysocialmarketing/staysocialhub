import type React from 'react';
import {
  CANVAS_W, CANVAS_H, COMMON_AREA_Y,
  CREATIVE_POD_X, CREATIVE_POD_W,
  AI_CORE_POD_X, AI_CORE_POD_W,
  SALES_POD_X, SALES_POD_W,
} from './constants/desks';

const STRIP_H = CANVAS_H - COMMON_AREA_Y; // 150px

// Section centers
const LOUNGE_CX  = CREATIVE_POD_X + CREATIVE_POD_W / 2;         // 106
const CLIENT_CX  = AI_CORE_POD_X  + AI_CORE_POD_W  / 2;         // 480
const PIPELINE_CX = SALES_POD_X   + SALES_POD_W    / 2;         // 854

// ── Lounge furniture ────────────────────────────────────────────────────────
const COUCH_X = Math.round(LOUNGE_CX - 42);  // 64
const COUCH_Y = COMMON_AREA_Y + 28;
const COUCH_W = 84;
const COUCH_H = 22;
const CTABLE_X = COUCH_X + 18;
const CTABLE_Y = COUCH_Y + COUCH_H + 6;
const CTABLE_W = 48;
const CTABLE_H = 10;

// ── Client wall grid ────────────────────────────────────────────────────────
const FRAME_W = 36;
const FRAME_H = 20;
const FRAME_GAP_X = 6;
const FRAME_GAP_Y = 6;
const GRID_COLS = 6;
const GRID_ROWS = 4;
const GRID_W = GRID_COLS * FRAME_W + (GRID_COLS - 1) * FRAME_GAP_X; // 246
const GRID_H = GRID_ROWS * FRAME_H + (GRID_ROWS - 1) * FRAME_GAP_Y; // 98
const GRID_X = Math.round(CLIENT_CX - GRID_W / 2);                   // 357
const GRID_Y = COMMON_AREA_Y + 26;

// ── Pipeline bars ────────────────────────────────────────────────────────────
const BAR_W   = 28;
const BAR_GAP = 14;
const BARS = [
  { label: 'PROS', h: 42, color: '#1e3a5a', count: '12' },
  { label: 'ACT',  h: 62, color: '#1a4a34', count: '7'  },
  { label: 'CLO',  h: 26, color: '#2a3a50', count: '5'  },
];
const BAR_BASE_Y = COMMON_AREA_Y + STRIP_H - 18; // 762 — bars anchor here
const BARS_TOTAL_W = BARS.length * BAR_W + (BARS.length - 1) * BAR_GAP; // 112
const BARS_X = Math.round(PIPELINE_CX - BARS_TOTAL_W / 2); // 798

// Shared label style values
const LABEL_COLOR   = '#3a5a7a';
const LABEL_FONT    = "'Courier New', monospace";
const LABEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  transform: 'translateX(-50%)',
  color: LABEL_COLOR,
  fontSize: 7,
  fontFamily: LABEL_FONT,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
};

export function CommonArea() {
  return (
    <>
      {/* Strip background */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: COMMON_AREA_Y,
          width: CANVAS_W,
          height: STRIP_H,
          background: '#1f252c',
        }}
      />

      {/* Top divider */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: COMMON_AREA_Y,
          width: CANVAS_W,
          height: 1,
          background: '#2e3c54',
        }}
      />

      {/* Vertical section separators (align with pod walls) */}
      <div style={{ position: 'absolute', left: CREATIVE_POD_X + CREATIVE_POD_W, top: COMMON_AREA_Y + 1, width: 1, height: STRIP_H - 1, background: '#2e384a' }} />
      <div style={{ position: 'absolute', left: SALES_POD_X, top: COMMON_AREA_Y + 1, width: 1, height: STRIP_H - 1, background: '#2e384a' }} />

      {/* ── LOUNGE ─────────────────────────────────────────────────────────── */}

      {/* Section label */}
      <div style={{ ...LABEL_STYLE, left: LOUNGE_CX, top: COMMON_AREA_Y + 8 }}>
        Lounge
      </div>

      {/* Couch body */}
      <div
        style={{
          position: 'absolute',
          left: COUCH_X,
          top: COUCH_Y,
          width: COUCH_W,
          height: COUCH_H,
          background: '#1c2838',
          border: '1px solid #28384e',
        }}
      />
      {/* Left cushion */}
      <div
        style={{
          position: 'absolute',
          left: COUCH_X + 4,
          top: COUCH_Y + 3,
          width: 34,
          height: 16,
          background: '#223042',
          border: '1px solid #2e3e54',
        }}
      />
      {/* Right cushion */}
      <div
        style={{
          position: 'absolute',
          left: COUCH_X + 42,
          top: COUCH_Y + 3,
          width: 34,
          height: 16,
          background: '#223042',
          border: '1px solid #2e3e54',
        }}
      />

      {/* Coffee table */}
      <div
        style={{
          position: 'absolute',
          left: CTABLE_X,
          top: CTABLE_Y,
          width: CTABLE_W,
          height: CTABLE_H,
          background: '#2a1e0e',
          border: '1px solid #3a2c18',
        }}
      />
      {/* Laptop on table */}
      <div
        style={{
          position: 'absolute',
          left: CTABLE_X + Math.floor((CTABLE_W - 18) / 2),
          top: CTABLE_Y + 2,
          width: 18,
          height: 6,
          background: '#212934',
          border: '1px solid #2e3a4a',
        }}
      />

      {/* Plant beside couch */}
      <div
        style={{
          position: 'absolute',
          left: COUCH_X - 18,
          top: COUCH_Y + 10,
          width: 8,
          height: 6,
          background: '#4a3020',
          border: '1px solid #3a2818',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: COUCH_X - 20,
          top: COUCH_Y,
          width: 12,
          height: 12,
          borderRadius: '50% 50% 0 0',
          background: '#1a5222',
          opacity: 0.85,
        }}
      />

      {/* Second lounge plant — right side of couch */}
      <div style={{ position: 'absolute', left: COUCH_X + COUCH_W + 8,     top: COUCH_Y + 12, width: 8,  height: 6,  background: '#4a3020', border: '1px solid #3a2818' }} />
      <div style={{ position: 'absolute', left: COUCH_X + COUCH_W + 6,     top: COUCH_Y + 2,  width: 12, height: 12, borderRadius: '50% 50% 0 0', background: '#1a5222', opacity: 0.8 }} />

      {/* ── CLIENT WALL ────────────────────────────────────────────────────── */}

      {/* Section label */}
      <div style={{ ...LABEL_STYLE, left: CLIENT_CX, top: COMMON_AREA_Y + 8 }}>
        Client Wall · 18 active
      </div>

      {/* Grid of client frames */}
      {Array.from({ length: GRID_ROWS }).map((_, row) =>
        Array.from({ length: GRID_COLS }).map((_, col) => (
          <div
            key={`frame-${row}-${col}`}
            style={{
              position: 'absolute',
              left: GRID_X + col * (FRAME_W + FRAME_GAP_X),
              top:  GRID_Y + row * (FRAME_H + FRAME_GAP_Y),
              width: FRAME_W,
              height: FRAME_H,
              background: '#1e222c',
              border: '1px solid #2e384a',
            }}
          />
        ))
      )}

      {/* ── PIPELINE ───────────────────────────────────────────────────────── */}

      {/* Section label */}
      <div style={{ ...LABEL_STYLE, left: PIPELINE_CX, top: COMMON_AREA_Y + 8 }}>
        Pipeline
      </div>

      {/* Stage bars */}
      {BARS.map((bar, i) => {
        const bx = BARS_X + i * (BAR_W + BAR_GAP);
        return (
          <div key={bar.label}>
            {/* Bar */}
            <div
              style={{
                position: 'absolute',
                left: bx,
                top: BAR_BASE_Y - bar.h,
                width: BAR_W,
                height: bar.h,
                background: bar.color,
                border: '1px solid #283848',
              }}
            />
            {/* Count label above bar */}
            <div
              style={{
                position: 'absolute',
                left: bx + BAR_W / 2,
                top: BAR_BASE_Y - bar.h - 11,
                transform: 'translateX(-50%)',
                color: '#4a7aaa',
                fontSize: 7,
                fontFamily: LABEL_FONT,
                fontWeight: 700,
                pointerEvents: 'none',
              }}
            >
              {bar.count}
            </div>
            {/* Stage label below bar */}
            <div
              style={{
                position: 'absolute',
                left: bx + BAR_W / 2,
                top: BAR_BASE_Y + 3,
                transform: 'translateX(-50%)',
                color: '#2a4060',
                fontSize: 6,
                fontFamily: LABEL_FONT,
                letterSpacing: '0.1em',
                pointerEvents: 'none',
              }}
            >
              {bar.label}
            </div>
          </div>
        );
      })}
    </>
  );
}
