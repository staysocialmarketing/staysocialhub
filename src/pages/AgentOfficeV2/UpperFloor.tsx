import { CANVAS_W, UPPER_FLOOR_H, COL_STAIR } from './constants/desks';
import { HalifaxWindow } from './windows/HalifaxWindow';
import { HalifaxNightWindow } from './windows/HalifaxNightWindow';
import { TorontoWindow } from './windows/TorontoWindow';
import { TorontoNightWindow } from './windows/TorontoNightWindow';
import { useLighting } from './hooks/LightingContext';
import { DAY, NIGHT } from './lighting-palette';

// Layout constants
const BACK_WALL_H = 125;  // dominant back wall — houses the city windows
const ROOM_Y      = BACK_WALL_H;
const ROOM_H      = UPPER_FLOOR_H - BACK_WALL_H; // 135px

// ── Feature city windows — inside back wall ──────────────────────────────────
const WIN_W = 200;
const WIN_H = 90;
const WIN_Y = 10;  // 10px from top, well within back wall

// Centre both windows in the room interior (x=188..1092 = 904px wide)
// Total occupied: 200+100+200=500. Margin each side=(904-500)/2=202.
const HALIFAX_X  = 188 + 202;       // 390
const TORONTO_X  = HALIFAX_X + WIN_W + 100; // 690  (right edge 890 < 1092 ✓)

// Meeting table — centred in canvas, below back wall
const TABLE_W = 380;
const TABLE_H = 60;
const TABLE_X = (CANVAS_W - TABLE_W) / 2; // 450 (center x = 640)
const TABLE_Y = 148;

// Chair dimensions
const CHAIR_W = 26;
const CHAIR_H = 14;

// 4 chairs per side, evenly spaced across TABLE_W
const CHAIR_XS = [
  TABLE_X + 51,   // 501
  TABLE_X + 133,  // 583
  TABLE_X + 215,  // 665
  TABLE_X + 297,  // 747
];
const TOP_CHAIR_Y    = TABLE_Y - CHAIR_H - 3; // 131
const BOTTOM_CHAIR_Y = TABLE_Y + TABLE_H + 3; // 211

// Whiteboard — on left room wall
const WB_X = 192;
const WB_Y = 70;
const WB_W = 38;
const WB_H = 50;

// Door opening — aligned with staircase at COL_STAIR=960
const DOOR_W = 30;
const DOOR_H = 50;
const DOOR_X = COL_STAIR - DOOR_W / 2; // 945
const DOOR_Y = UPPER_FLOOR_H - DOOR_H - 4; // 206

const ACTIVE_CAMPAIGN = 'Premiere · Punta Cana Contest';

// Plants — flanking the city windows
const PLANTS = [
  { x: 355, y: 14 },  // left of Halifax window (HALIFAX_X - 35)
  { x: 905, y: 14 },  // right of Toronto window (TORONTO_X + WIN_W + 15)
];

export function UpperFloor() {
  const { mode } = useLighting();
  const C = mode === 'day' ? DAY : NIGHT;

  return (
    <>
      {/* Upper floor background */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: CANVAS_W,
          height: UPPER_FLOOR_H,
          background: C.upperBg,
          transition: 'background-color 500ms ease',
        }}
      />

      {/* Back wall — dominant zone housing the city windows */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: CANVAS_W,
          height: BACK_WALL_H,
          background: mode === 'day' ? 'linear-gradient(to bottom, #10161e, #151b25)' : C.upperWallBg,
          borderBottom: `1px solid ${C.upperWallBorder}`,
          transition: 'background-color 500ms ease, border-color 500ms ease',
        }}
      />

      {/* ── Halifax window ── */}
      <div
        style={{
          position: 'absolute',
          left: HALIFAX_X - 2,
          top: WIN_Y - 2,
          width: WIN_W + 4,
          height: WIN_H + 4,
          border: '2px solid #3a4e68',
          background: '#050c18',
          boxShadow: '0 0 8px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: mode === 'day' ? 1 : 0, transition: 'opacity 800ms ease' }}>
          <HalifaxWindow />
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: mode === 'night' ? 1 : 0, transition: 'opacity 800ms ease' }}>
          <HalifaxNightWindow />
        </div>
      </div>

      {/* Halifax city label */}
      <div
        style={{
          position: 'absolute',
          left: HALIFAX_X + WIN_W / 2,
          top: WIN_Y + WIN_H + 6,
          transform: 'translateX(-50%)',
          color: '#527080',
          fontSize: 7,
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        Halifax
      </div>

      {/* ── Toronto window ── */}
      <div
        style={{
          position: 'absolute',
          left: TORONTO_X - 2,
          top: WIN_Y - 2,
          width: WIN_W + 4,
          height: WIN_H + 4,
          border: '2px solid #3a4e68',
          background: '#050c18',
          boxShadow: '0 0 8px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: mode === 'day' ? 1 : 0, transition: 'opacity 800ms ease' }}>
          <TorontoWindow />
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: mode === 'night' ? 1 : 0, transition: 'opacity 800ms ease' }}>
          <TorontoNightWindow />
        </div>
      </div>

      {/* Toronto city label */}
      <div
        style={{
          position: 'absolute',
          left: TORONTO_X + WIN_W / 2,
          top: WIN_Y + WIN_H + 6,
          transform: 'translateX(-50%)',
          color: '#527080',
          fontSize: 7,
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        Toronto
      </div>

      {/* SVG checkerboard floor — finer 16px cells, slightly warmer for meeting room carpet feel */}
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: ROOM_Y,
          width: CANVAS_W,
          height: ROOM_H,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <pattern id="meeting-room-check" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="8" height="8" fill="#252a3b" />
            <rect x="8" y="0" width="8" height="8" fill="#202533" />
            <rect x="0" y="8" width="8" height="8" fill="#202533" />
            <rect x="8" y="8" width="8" height="8" fill="#252a3b" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#meeting-room-check)" />
      </svg>

      {/* Left room wall */}
      <div
        style={{
          position: 'absolute',
          left: 184,
          top: ROOM_Y,
          width: 4,
          height: ROOM_H,
          background: C.meetWallBg,
          borderRight: `1px solid ${C.meetWallBorder}`,
          transition: 'background-color 500ms ease, border-color 500ms ease',
        }}
      />

      {/* Right room wall */}
      <div
        style={{
          position: 'absolute',
          left: 1092,
          top: ROOM_Y,
          width: 4,
          height: ROOM_H,
          background: C.meetWallBg,
          borderLeft: `1px solid ${C.meetWallBorder}`,
          transition: 'background-color 500ms ease, border-color 500ms ease',
        }}
      />

      {/* Whiteboard — on left room wall */}
      <div
        style={{
          position: 'absolute',
          left: WB_X,
          top: WB_Y,
          width: WB_W,
          height: WB_H,
          background: '#d8d0c0',
          border: '1px solid #b0a898',
        }}
      />
      {/* Campaign label — two centered lines */}
      <div
        style={{
          position: 'absolute',
          left: WB_X + WB_W / 2,
          top: WB_Y + WB_H / 2 - 5,
          transform: 'translateX(-50%)',
          color: '#3a3028',
          fontSize: 5,
          fontFamily: "'Courier New', monospace",
          whiteSpace: 'nowrap',
          textAlign: 'center',
          lineHeight: 1.5,
          pointerEvents: 'none',
        }}
      >
        <div>Premiere</div>
        <div>Punta Cana</div>
      </div>

      {/* Door frame — bottom-center of room, above staircase landing */}
      {/* Lintel */}
      <div style={{ position: 'absolute', left: DOOR_X - 2, top: DOOR_Y, width: DOOR_W + 4, height: 2, background: '#4a3520' }} />
      {/* Left pillar */}
      <div style={{ position: 'absolute', left: DOOR_X - 2, top: DOOR_Y, width: 2, height: DOOR_H + 4, background: '#4a3520' }} />
      {/* Right pillar */}
      <div style={{ position: 'absolute', left: DOOR_X + DOOR_W, top: DOOR_Y, width: 2, height: DOOR_H + 4, background: '#4a3520' }} />

      {/* Meeting table */}
      <div
        style={{
          position: 'absolute',
          left: TABLE_X,
          top: TABLE_Y,
          width: TABLE_W,
          height: TABLE_H,
          background: '#2a1e0e',
          border: '1px solid #3a2c18',
        }}
      />

      {/* Top chairs */}
      {CHAIR_XS.map((cx, i) => (
        <div
          key={`top-${i}`}
          style={{
            position: 'absolute',
            left: cx,
            top: TOP_CHAIR_Y,
            width: CHAIR_W,
            height: CHAIR_H,
            background: '#272d3d',
            border: '1px solid #313d4d',
          }}
        />
      ))}

      {/* Bottom chairs */}
      {CHAIR_XS.map((cx, i) => (
        <div
          key={`bot-${i}`}
          style={{
            position: 'absolute',
            left: cx,
            top: BOTTOM_CHAIR_Y,
            width: CHAIR_W,
            height: CHAIR_H,
            background: '#272d3d',
            border: '1px solid #313d4d',
          }}
        />
      ))}

      {/* Wall clock — right side of back wall, between Toronto window and right edge */}
      <svg
        style={{ position: 'absolute', left: 1120, top: 18, width: 22, height: 22, pointerEvents: 'none' }}
      >
        <circle cx="11" cy="11" r="10" fill="#d8d0b8" stroke="#4a6888" strokeWidth="1" />
        {/* Tick marks at 12, 3, 6, 9 */}
        <line x1="11" y1="2"  x2="11" y2="5"  stroke="#38485a" strokeWidth="1" />
        <line x1="20" y1="11" x2="17" y2="11" stroke="#38485a" strokeWidth="1" />
        <line x1="11" y1="20" x2="11" y2="17" stroke="#38485a" strokeWidth="1" />
        <line x1="2"  y1="11" x2="5"  y2="11" stroke="#38485a" strokeWidth="1" />
        {/* Hour hand ~10 o'clock */}
        <line x1="11" y1="11" x2="7"  y2="5"  stroke="#1a2438" strokeWidth="1.5" strokeLinecap="round" />
        {/* Minute hand ~2 o'clock */}
        <line x1="11" y1="11" x2="15" y2="6"  stroke="#1a2438" strokeWidth="1"   strokeLinecap="round" />
        <circle cx="11" cy="11" r="1" fill="#2a3448" />
      </svg>

      {/* Plants flanking the city windows */}
      {PLANTS.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, top: 0 }}>
          <div
            style={{
              position: 'absolute',
              left: p.x + 2,
              top: p.y + 8,
              width: 8,
              height: 6,
              background: '#5a3c24',
              border: '1px solid #3a2a18',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: 12,
              height: 10,
              borderRadius: '50% 50% 0 0',
              background: '#357040',
            }}
          />
        </div>
      ))}

      {/* Small plant — near left room wall below whiteboard */}
      <div style={{ position: 'absolute', left: 194, top: 134, width: 8,  height: 6,  background: '#4a3020', border: '1px solid #3a2818' }} />
      <div style={{ position: 'absolute', left: 192, top: 126, width: 12, height: 10, borderRadius: '50% 50% 0 0', background: '#2e7838', opacity: 0.9 }} />

      {/* Chair rail — subtle horizontal architectural line at 40% of back wall height */}
      <div style={{ position: 'absolute', left: 0, top: 50, width: CANVAS_W, height: 1, background: '#253040', pointerEvents: 'none' }} />

      {/* Wall shelf — left side between whiteboard and Halifax window */}
      <div style={{ position: 'absolute', left: 240, top: 58, width: 120, height: 3, background: '#2a3040', border: '1px solid #3a4050', pointerEvents: 'none', opacity: 0.7 }} />
      {/* Shelf items: small book spines */}
      <div style={{ position: 'absolute', left: 244, top: 46, width: 6, height: 12, background: '#4a2818', border: '1px solid #2a1808', pointerEvents: 'none', opacity: 0.8 }} />
      <div style={{ position: 'absolute', left: 252, top: 48, width: 5, height: 10, background: '#183040', border: '1px solid #0e2030', pointerEvents: 'none', opacity: 0.8 }} />
      <div style={{ position: 'absolute', left: 259, top: 47, width: 6, height: 11, background: '#2a3018', border: '1px solid #1a2008', pointerEvents: 'none', opacity: 0.8 }} />
      <div style={{ position: 'absolute', left: 267, top: 49, width: 4, height: 9, background: '#381828', border: '1px solid #28081a', pointerEvents: 'none', opacity: 0.8 }} />

      {/* Wall shelf — right side between Toronto window and clock */}
      <div style={{ position: 'absolute', left: 910, top: 58, width: 120, height: 3, background: '#2a3040', border: '1px solid #3a4050', pointerEvents: 'none', opacity: 0.7 }} />
      {/* Shelf items */}
      <div style={{ position: 'absolute', left: 914, top: 46, width: 6, height: 12, background: '#18304a', border: '1px solid #0e2030', pointerEvents: 'none', opacity: 0.8 }} />
      <div style={{ position: 'absolute', left: 922, top: 48, width: 5, height: 10, background: '#3a1820', border: '1px solid #280e18', pointerEvents: 'none', opacity: 0.8 }} />
      <div style={{ position: 'absolute', left: 929, top: 47, width: 6, height: 11, background: '#182838', border: '1px solid #0e1828', pointerEvents: 'none', opacity: 0.8 }} />

      {/* Meeting room label */}
      <div
        style={{
          position: 'absolute',
          left: CANVAS_W / 2,
          top: ROOM_Y + 6,
          transform: 'translateX(-50%)',
          color: '#3a5a7a',
          fontSize: 7,
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        Meeting Room
      </div>
    </>
  );
}
