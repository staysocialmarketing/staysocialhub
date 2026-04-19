import type { DeskConfig, DeskTier } from './constants/desks';
import { TIER_DIMS } from './constants/desks';

interface DeskProps {
  desk: DeskConfig;
}

const MONITOR_SIZES: Record<DeskTier, { w: number; h: number }> = {
  command:        { w: 32, h: 18 },
  chief_of_staff: { w: 26, h: 16 },
  director:       { w: 24, h: 14 },
  sub_agent:      { w: 20, h: 12 },
};

// Sprite placeholder circle diameters per tier
const CIRCLE_D: Record<DeskTier, number> = {
  command:        22,
  chief_of_staff: 20,
  director:       18,
  sub_agent:      14,
};

export function Desk({ desk }: DeskProps) {
  const { tier, x, y, monitors, isPlaceholder, label } = desk;
  const { w: dw, h: dh } = TIER_DIMS[tier];
  const { w: mw, h: mh } = MONITOR_SIZES[tier];
  const circleD = CIRCLE_D[tier];
  const ghost = isPlaceholder ?? false;

  // Circle: centered above desk, gap of 8px between circle bottom and desk top
  const circleX = x + Math.floor((dw - circleD) / 2);
  const circleY = y - circleD - 8;

  // Monitors: evenly spaced across top of desk (4px from desk top edge)
  const monGap = 3;
  const totalMonW = monitors * mw + (monitors - 1) * monGap;
  const monStartX = x + Math.floor((dw - totalMonW) / 2);

  return (
    <>
      {/* Sprite placeholder circle */}
      <div
        style={{
          position: 'absolute',
          left: circleX,
          top: circleY,
          width: circleD,
          height: circleD,
          borderRadius: '50%',
          background: ghost ? '#1e2228' : '#263344',
          border: `1px solid ${ghost ? '#262b35' : '#344860'}`,
          opacity: ghost ? 0.45 : 0.9,
        }}
      />

      {/* Desk surface */}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: dw,
          height: dh,
          background: ghost ? '#13161c' : '#19263a',
          border: `1px solid ${ghost ? '#1c1f26' : '#22334a'}`,
          opacity: ghost ? 0.5 : 1,
          imageRendering: 'pixelated',
        }}
      />

      {/* Monitor screens */}
      {Array.from({ length: monitors }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: monStartX + i * (mw + monGap),
            top: y + 4,
            width: mw,
            height: mh,
            background: ghost ? '#060606' : '#07091a',
            border: '1px solid #182030',
            opacity: ghost ? 0.35 : 1,
          }}
        />
      ))}

      {/* Agent name label */}
      <div
        style={{
          position: 'absolute',
          left: x + Math.floor(dw / 2),
          top: y + dh + 5,
          transform: 'translateX(-50%)',
          color: ghost ? '#2c3040' : '#6eb5e0',
          fontSize: 8,
          fontFamily: "'Courier New', monospace",
          fontWeight: ghost ? 400 : 700,
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          lineHeight: 1,
          textShadow: ghost ? 'none' : '0 0 6px #0d1520, 0 0 12px #0d1520',
          pointerEvents: 'none',
        }}
      >
        {label}
      </div>

      {/* Coming soon badge for placeholders */}
      {ghost && (
        <div
          style={{
            position: 'absolute',
            left: x + Math.floor(dw / 2),
            top: y + dh + 16,
            transform: 'translateX(-50%)',
            color: '#242830',
            fontSize: 7,
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          coming soon
        </div>
      )}
    </>
  );
}
