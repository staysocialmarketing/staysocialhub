import { CANVAS_W, UPPER_FLOOR_H } from './constants/desks';
import { MEETING_SEATS } from './constants/desks';

// Layout constants (all canvas-absolute)
const BACK_WALL_H = 22;
const ROOM_Y      = BACK_WALL_H;
const ROOM_H      = UPPER_FLOOR_H - BACK_WALL_H;

// 3 windows in the back wall
const WINDOWS = [
  { x: 260, w: 60 },
  { x: 440, w: 60 },
  { x: 640, w: 60 },
];

// Meeting table: 280×44 centered
const TABLE_X = (CANVAS_W - 280) / 2; // 340
const TABLE_Y = 90;
const TABLE_W = 280;
const TABLE_H = 44;

// Chair dimensions
const CHAIR_W = 22;
const CHAIR_H = 12;

// Top and bottom chairs share these x positions (4 chairs, evenly spaced)
const CHAIR_XS = [TABLE_X + 28, TABLE_X + 98, TABLE_X + 168, TABLE_X + 238];
const TOP_CHAIR_Y    = TABLE_Y - CHAIR_H - 2;   // 76
const BOTTOM_CHAIR_Y = TABLE_Y + TABLE_H + 2;   // 136

// Whiteboard: left room wall area
const WB_X = 192;
const WB_Y = 34;
const WB_W = 12;
const WB_H = 72;

// Campaign label on whiteboard (from Phase 5 constants; hardcoded here for Phase 1)
const ACTIVE_CAMPAIGN = 'Premiere · Punta Cana Contest';

// Two plants near window edges
const PLANTS = [
  { x: 228, y: 24 },
  { x: 698, y: 24 },
];

export function UpperFloor() {
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
          background: '#0e1422',
        }}
      />

      {/* Back wall */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: CANVAS_W,
          height: BACK_WALL_H,
          background: '#080e18',
          borderBottom: '1px solid #18243c',
        }}
      />

      {/* Windows in back wall */}
      {WINDOWS.map((win, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: win.x,
            top: 4,
            width: win.w,
            height: 14,
            background: 'linear-gradient(to bottom, #a8d0e8, #7ab5d8)',
            opacity: 0.65,
          }}
        />
      ))}

      {/* Room floor tile */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: ROOM_Y,
          width: CANVAS_W,
          height: ROOM_H,
          backgroundImage: `
            linear-gradient(rgba(24,36,60,0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(24,36,60,0.35) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Left room wall */}
      <div
        style={{
          position: 'absolute',
          left: 184,
          top: ROOM_Y,
          width: 4,
          height: ROOM_H,
          background: '#0c1220',
          borderRight: '1px solid #1a2840',
        }}
      />

      {/* Right room wall */}
      <div
        style={{
          position: 'absolute',
          left: 772,
          top: ROOM_Y,
          width: 4,
          height: ROOM_H,
          background: '#0c1220',
          borderLeft: '1px solid #1a2840',
        }}
      />

      {/* Whiteboard */}
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

      {/* Campaign name on whiteboard (rotated to fit vertically) */}
      <div
        style={{
          position: 'absolute',
          left: WB_X - 2,
          top: WB_Y + WB_H / 2,
          width: WB_H,
          transform: 'translateX(-50%) rotate(-90deg)',
          transformOrigin: 'center center',
          color: '#3a3028',
          fontSize: 6,
          fontFamily: "'Courier New', monospace",
          whiteSpace: 'nowrap',
          textAlign: 'center',
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        {ACTIVE_CAMPAIGN}
      </div>

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
            background: '#1a2030',
            border: '1px solid #243040',
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
            background: '#1a2030',
            border: '1px solid #243040',
          }}
        />
      ))}

      {/* Small plants near windows */}
      {PLANTS.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, top: 0 }}>
          {/* Pot */}
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
          {/* Leaves */}
          <div
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: 12,
              height: 10,
              borderRadius: '50% 50% 0 0',
              background: '#1e5c28',
            }}
          />
        </div>
      ))}

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
