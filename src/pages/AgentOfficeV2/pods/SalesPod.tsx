import { DESKS, CANVAS_H, SALES_POD_X, SALES_POD_W, MAIN_FLOOR_Y } from '../constants/desks';
import { Desk } from '../Desk';

const SALES_KEYS = ['tristan', 'future_sales'];
const salesDesks = DESKS.filter(d => SALES_KEYS.includes(d.key));

const PLANT_Y  = 530;
const COFFEE_Y = 565;
const COFFEE_H = 100;

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
          background: '#232a34',
          borderLeft: '1px solid #2e384a',
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
          background: '#20242c',
          border: '1px solid #2c3444',
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

      {/* Bookshelf — right wall, 3 shelves with colored spines */}
      <svg
        style={{ position: 'absolute', left: podLeft + podW - 22, top: 470, width: 20, height: 88, pointerEvents: 'none' }}
      >
        <rect width="20" height="88" fill="#161c28" stroke="#2a3448" strokeWidth="1" />
        {/* Shelf boards */}
        <rect x="0" y="28" width="20" height="3" fill="#2a3448" />
        <rect x="0" y="58" width="20" height="3" fill="#2a3448" />
        {/* Books — shelf 1 */}
        <rect x="2"  y="2"  width="3" height="24" fill="#1e3a6a" />
        <rect x="6"  y="4"  width="4" height="22" fill="#4a7840" />
        <rect x="11" y="2"  width="3" height="24" fill="#8a4a20" />
        <rect x="15" y="5"  width="3" height="21" fill="#2a5060" />
        {/* Books — shelf 2 */}
        <rect x="2"  y="33" width="4" height="23" fill="#2a5060" />
        <rect x="7"  y="35" width="3" height="21" fill="#8a4a20" />
        <rect x="11" y="33" width="4" height="23" fill="#1e3a6a" />
        <rect x="16" y="35" width="2" height="21" fill="#4a7840" />
        {/* Books — shelf 3 */}
        <rect x="2"  y="63" width="3" height="21" fill="#4a7840" />
        <rect x="6"  y="63" width="4" height="21" fill="#1e3a6a" />
        <rect x="11" y="65" width="3" height="19" fill="#8a4a20" />
        <rect x="15" y="63" width="3" height="21" fill="#2a5060" />
      </svg>

      {/* Pixel espresso machine — inside coffee station nook */}
      <svg
        style={{ position: 'absolute', left: 784, top: 577, width: 22, height: 22, pointerEvents: 'none' }}
      >
        {/* Machine body */}
        <rect width="18" height="14" fill="#1a2030" stroke="#283040" strokeWidth="1" />
        {/* Front panel inset */}
        <rect x="2" y="2" width="8" height="5" fill="#0a1020" stroke="#1e2c3c" strokeWidth="0.5" />
        {/* Indicator light */}
        <rect x="12" y="3" width="3" height="3" fill="#1a6030" />
        {/* Drip tray */}
        <rect x="0" y="14" width="18" height="3" fill="#141c28" stroke="#202c3c" strokeWidth="1" />
        {/* Cup */}
        <rect x="6" y="15" width="5" height="4" fill="#0d1520" stroke="#283848" strokeWidth="0.5" />
        {/* Steam arm */}
        <rect x="16" y="2" width="2" height="10" fill="#1e2a3c" />
        <rect x="16" y="2" width="5" height="2" fill="#1e2a3c" />
      </svg>

      {/* Sales desks */}
      {salesDesks.map(desk => (
        <Desk key={desk.key} desk={desk} />
      ))}
    </>
  );
}
