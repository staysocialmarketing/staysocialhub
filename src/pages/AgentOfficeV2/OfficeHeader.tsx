import './monitor-animations.css';
import { CANVAS_W } from './constants/desks';
import { useLighting } from './hooks/LightingContext';
import { DAY, NIGHT } from './lighting-palette';

export const HEADER_H = 36;

// Phase 6.8: replace hardcoded floor with a FloorContext value
const CURRENT_FLOOR = 1;

const TEXT: React.CSSProperties = {
  color: '#527080',
  fontSize: 8,
  fontFamily: "'Courier New', monospace",
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

function PixelMark() {
  return (
    <span style={{ color: '#3a6a8a', fontSize: 13, letterSpacing: -1, lineHeight: 1, userSelect: 'none' }}>
      ▓▓
    </span>
  );
}

interface OfficeHeaderProps {
  inSession?: boolean; // true when any agent is in a meeting — wired up in Phase 6.7
}

export function OfficeHeader({ inSession = false }: OfficeHeaderProps) {
  const dotClass  = inSession ? 'dot-session' : 'dot-live';
  const dotColor  = inSession ? '#3b82f6' : '#22c55e';
  const dotLabel  = inSession ? 'In Session' : 'Live';
  const { mode, toggleMode } = useLighting();
  const isNight = mode === 'night';
  const C = mode === 'day' ? DAY : NIGHT;

  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 0,
      width: CANVAS_W, height: HEADER_H,
      background: C.chromeBg,
      borderBottom: `1px solid ${C.chromeBorder}`,
      transition: 'background-color 500ms ease, border-color 500ms ease',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PixelMark />
        <span style={TEXT}>
          Agent Office · Stay Social HQ · Floor {CURRENT_FLOOR} · Live
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={toggleMode}
          aria-label={isNight ? 'Switch to day mode' : 'Switch to night mode'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 2px',
            display: 'flex',
            alignItems: 'center',
            fontSize: 13,
            lineHeight: 1,
            color: isNight ? '#e0e8f0' : '#ffb64a',
            transition: 'color 300ms ease',
          }}
        >
          {isNight ? '☽' : '☀'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div
            className={dotClass}
            style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }}
          />
          <span style={{ ...TEXT, color: dotColor }}>{dotLabel}</span>
        </div>
      </div>
    </div>
  );
}
