import { CANVAS_W, CANVAS_H, MAIN_FLOOR_Y } from './constants/desks';
import { AICorePod } from './pods/AICorePod';
import { CreativeStudioPod } from './pods/CreativeStudioPod';
import { SalesPod } from './pods/SalesPod';
import { CommonArea } from './CommonArea';
import { ScoutWalkTest } from './ScoutWalkTest';

const WALK_TEST = new URLSearchParams(window.location.search).has('walk_test');

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
          background: '#0d1520',
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
          background: '#0a1018',
          borderBottom: '1px solid #1a2840',
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

      {/* Floor tile pattern overlay */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: MAIN_FLOOR_Y + BACK_WALL_H,
          width: CANVAS_W,
          height: CANVAS_H - MAIN_FLOOR_Y - BACK_WALL_H,
          backgroundImage: `
            linear-gradient(rgba(30,42,64,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30,42,64,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      {/* Three pods */}
      <CreativeStudioPod />
      <AICorePod />
      <SalesPod />

      {/* Shared common area strip */}
      <CommonArea />

      {/* Dev walk test — active when ?walk_test=1 */}
      {WALK_TEST && <ScoutWalkTest />}
    </>
  );
}
