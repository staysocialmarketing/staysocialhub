import { CANVAS_W, CANVAS_H, MAIN_FLOOR_Y } from './constants/desks';
import { AICorePod } from './pods/AICorePod';
import { CreativeStudioPod } from './pods/CreativeStudioPod';
import { SalesPod } from './pods/SalesPod';
import { CommonArea } from './CommonArea';
import { useLighting } from './hooks/LightingContext';
import { DAY, NIGHT } from './lighting-palette';

// Back wall window strip on the main floor
const BACK_WALL_H = 22;
const WIN_Y       = MAIN_FLOOR_Y + 3;
const WIN_H       = 14;

const MAIN_WINDOWS = [
  { x: 20,   w: 230 }, // Creative wing window
  { x: 268,  w: 740 }, // AI core window (wider, matches AI_CORE_POD_X to AI_CORE right edge)
  { x: 1028, w: 230 }, // Sales wing window
];

export function MainFloor() {
  const { mode } = useLighting();
  const C = mode === 'day' ? DAY : NIGHT;

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
          background: C.floorBg,
          transition: 'background-color 500ms ease',
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
          background: C.backWallBg,
          backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 49px, #232933 49px, #232933 50px)',
          borderBottom: `1px solid ${C.backWallBorder}`,
          transition: 'background-color 500ms ease, border-color 500ms ease',
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

      {/* Plants — staircase corridor (gap between AI Core x=868 and Sales x=1028, centred at COL_STAIR=960) */}
      <div style={{ position: 'absolute', left: 962, top: 630, width: 8,  height: 6,  background: '#4a3020', border: '1px solid #3a2818', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 960, top: 620, width: 12, height: 10, borderRadius: '50% 50% 0 0', background: '#2e7838', opacity: 0.9, pointerEvents: 'none' }} />
      {/* Second plant — other side of corridor */}
      <div style={{ position: 'absolute', left: 922, top: 630, width: 8,  height: 6,  background: '#4a3020', border: '1px solid #3a2818', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 920, top: 620, width: 12, height: 10, borderRadius: '50% 50% 0 0', background: '#357040', opacity: 0.9, pointerEvents: 'none' }} />

      {/* Subtle wall panelling — vertical strips on the back wall */}
      {[120, 260, 500, 780, 920, 1160].map((px, i) => (
        <div
          key={`panel-${i}`}
          style={{
            position: 'absolute',
            left: px,
            top: MAIN_FLOOR_Y + 2,
            width: 1,
            height: BACK_WALL_H - 4,
            background: '#252e3d',
            pointerEvents: 'none',
            opacity: 0.6,
          }}
        />
      ))}

      {/* Three pods */}
      <CreativeStudioPod />
      <AICorePod />
      <SalesPod />

      {/* Shared common area strip */}
      <CommonArea />

    </>
  );
}
