import { DESKS, CANVAS_H, SALES_POD_X, SALES_POD_W, MAIN_FLOOR_Y } from '../constants/desks';
import { Desk } from '../Desk';

const SALES_KEYS = ['tristan', 'future_sales'];
const salesDesks = DESKS.filter(d => SALES_KEYS.includes(d.key));

const PLANT_Y  = 455;
const COFFEE_Y = 510;
const COFFEE_H = 88;

export function SalesPod() {
  const podLeft = SALES_POD_X;
  const podW    = SALES_POD_W;
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
          background: '#0f1620',
          borderLeft: '1px solid #1a2436',
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
        Sales & CS
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
            background: '#1a5222',
            opacity: 0.8,
          }}
        />
      </div>

      {/* Coffee station */}
      <div
        style={{
          position: 'absolute',
          left: podLeft + 12,
          top: COFFEE_Y,
          width: podW - 24,
          height: COFFEE_H,
          background: '#0c1018',
          border: '1px solid #182030',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: podLeft + podW / 2,
          top: COFFEE_Y + 8,
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
        Coffee Station
      </div>

      {/* Sales desks */}
      {salesDesks.map(desk => (
        <Desk key={desk.key} desk={desk} />
      ))}
    </>
  );
}
