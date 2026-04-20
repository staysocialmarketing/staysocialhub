import { CANVAS_W, CANVAS_H, MAIN_FLOOR_Y } from './constants/desks';
import { AICorePod } from './pods/AICorePod';
import { CreativeStudioPod } from './pods/CreativeStudioPod';
import { SalesPod } from './pods/SalesPod';
import { CommonArea } from './CommonArea';

// Back wall window strip on the main floor
const BACK_WALL_H = 22;
const WIN_Y       = MAIN_FLOOR_Y + 3;
const WIN_H       = 14;

const MAIN_WINDOWS = [
  { x: 20,  w: 180 }, // Creative wing window
  { x: 240, w: 480 }, // AI core window (wider)
  { x: 760, w: 180 }, // Sales wing window
];

export function MainFloor() {
  return (
    <>
      {/* Main floor background */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: MAIN_FLOOR_Y,
          width: CANVAS_W,
          height: CANVAS_H - MAIN_FLOOR_Y,
          background: '#212934',
        }}
      />

      {/* Back wall */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: MAIN_FLOOR_Y,
          width: CANVAS_W,
          height: BACK_WALL_H,
          background: '#1e242c',
          borderBottom: '1px solid #2e3c54',
        }}
      />

      {/* Back wall windows — placeholder gradient (Phase 9 makes these dynamic) */}
      {MAIN_WINDOWS.map((win, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: win.x,
            top: WIN_Y,
            width: win.w,
            height: WIN_H,
            background: 'linear-gradient(to bottom, #7ab5d8, #5a9ac8)',
            opacity: 0.6,
          }}
        />
      ))}

      {/* SVG checkerboard floor — visible in walkable corridors between pods */}
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: MAIN_FLOOR_Y + BACK_WALL_H,
          width: CANVAS_W,
          height: CANVAS_H - MAIN_FLOOR_Y - BACK_WALL_H,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <pattern id="main-floor-check" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect x="0"  y="0"  width="10" height="10" fill="#232c39" />
            <rect x="10" y="0"  width="10" height="10" fill="#1f262f" />
            <rect x="0"  y="10" width="10" height="10" fill="#1f262f" />
            <rect x="10" y="10" width="10" height="10" fill="#232c39" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#main-floor-check)" />
      </svg>

      {/* Plant — staircase corridor (gap between AI Core x=660 and Sales x=760, clear of walk path) */}
      <div style={{ position: 'absolute', left: 722, top: 630, width: 8,  height: 6,  background: '#4a3020', border: '1px solid #3a2818', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 720, top: 620, width: 12, height: 10, borderRadius: '50% 50% 0 0', background: '#1a5222', opacity: 0.8, pointerEvents: 'none' }} />

      {/* Three pods */}
      <CreativeStudioPod />
      <AICorePod />
      <SalesPod />

      {/* Shared common area strip */}
      <CommonArea />

    </>
  );
}
