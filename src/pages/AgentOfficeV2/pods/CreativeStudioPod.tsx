import { DESKS, CANVAS_H, CREATIVE_POD_X, CREATIVE_POD_W, MAIN_FLOOR_Y } from '../constants/desks';
import { Desk } from '../Desk';
import { useLighting } from '../hooks/LightingContext';
import { DAY, NIGHT } from '../lighting-palette';

const CREATIVE_KEYS = ['gavin', 'future_creative'];
const creativeDesks = DESKS.filter(d => CREATIVE_KEYS.includes(d.key));

const PLANT_Y = 530;
const NOOK_Y  = 565;
const NOOK_H  = 100;

export function CreativeStudioPod() {
  const { mode } = useLighting();
  const C = mode === 'day' ? DAY : NIGHT;
  const podLeft = CREATIVE_POD_X;
  const podW    = CREATIVE_POD_W;
  const podTop  = MAIN_FLOOR_Y;
  const podH    = CANVAS_H - MAIN_FLOOR_Y;

  return (
    <>
      {/* Pod background */}
      <div
        style={{
          position: 'absolute',
          left: podLeft,
          top: podTop,
          width: podW,
          height: podH,
          background: C.podWingBg,
          borderRight: `1px solid ${C.podWingBorder}`,
          transition: 'background-color 500ms ease, border-color 500ms ease',
        }}
      />

      {/* Pod label */}
      <div
        style={{
          position: 'absolute',
          left: podLeft + podW / 2,
          top: podTop + 8,
          transform: 'translateX(-50%)',
          color: '#3a6080',
          fontSize: 7,
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        Creative
      </div>

      {/* Mid-pod plant */}
      <div style={{ position: 'absolute', left: 0, top: 0 }}>
        <div
          style={{
            position: 'absolute',
            left: podLeft + Math.floor(podW / 2) - 4,
            top: PLANT_Y + 10,
            width: 8,
            height: 6,
            background: '#4a3020',
            border: '1px solid #3a2818',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: podLeft + Math.floor(podW / 2) - 6,
            top: PLANT_Y,
            width: 12,
            height: 12,
            borderRadius: '50% 50% 0 0',
            background: '#2e7838',
            opacity: 0.9,
          }}
        />
      </div>

      {/* Recording nook */}
      <div
        style={{
          position: 'absolute',
          left: podLeft + 12,
          top: NOOK_Y,
          width: podW - 24,
          height: NOOK_H,
          background: C.nookBg,
          border: `1px solid ${C.nookBorder}`,
          transition: 'background-color 500ms ease, border-color 500ms ease',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: podLeft + podW / 2,
          top: NOOK_Y + 8,
          transform: 'translateX(-50%)',
          color: '#2a4060',
          fontSize: 7,
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        Recording Nook
      </div>

      {/* Filing cabinet — left wall, below future hire slot */}
      <svg
        style={{ position: 'absolute', left: podLeft + 4, top: 487, width: 28, height: 52, pointerEvents: 'none' }}
      >
        <rect width="28" height="52" fill="#2a3448" stroke="#3a4e66" strokeWidth="1" />
        {/* Top highlight — gives dimension */}
        <rect x="1" y="1" width="26" height="1" fill="#4a6278" />
        {/* Bottom shadow */}
        <rect x="1" y="50" width="26" height="1" fill="#1c2a40" />
        {/* Drawer divider */}
        <rect x="1" y="25" width="26" height="1" fill="#3a4e66" />
        {/* Top drawer pull */}
        <rect x="11" y="10" width="6" height="4" fill="#d97706" stroke="#b45309" strokeWidth="0.5" rx="1" />
        {/* Bottom drawer pull */}
        <rect x="11" y="35" width="6" height="4" fill="#d97706" stroke="#b45309" strokeWidth="0.5" rx="1" />
      </svg>

      {/* Creative desks */}
      {creativeDesks.map(desk => (
        <Desk key={desk.key} desk={desk} />
      ))}
    </>
  );
}
