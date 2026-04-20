import './monitor-animations.css';
import { CANVAS_W } from './constants/desks';

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

  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 0,
      width: CANVAS_W, height: HEADER_H,
      background: '#161c2a',
      borderBottom: '1px solid #2e3c54',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div
          className={dotClass}
          style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }}
        />
        <span style={{ ...TEXT, color: dotColor }}>{dotLabel}</span>
      </div>
    </div>
  );
}
