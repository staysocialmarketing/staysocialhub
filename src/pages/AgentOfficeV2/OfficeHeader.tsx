import './monitor-animations.css';
import { CANVAS_W } from './constants/desks';
import { useLighting } from './hooks/LightingContext';
import { useMeeting } from './hooks/MeetingContext';
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
  const { mode, toggleMode } = useLighting();
  const isNight = mode === 'night';
  const C = mode === 'day' ? DAY : NIGHT;
  const { meetingState, triggerMeeting, endMeeting } = useMeeting();
  const isInSession = meetingState === 'active' || meetingState === 'calling' || inSession;
  const dotClass  = isInSession ? 'dot-session' : 'dot-live';
  const dotColor  = isInSession ? '#3b82f6' : '#22c55e';
  const dotLabel  = isInSession ? 'In Session' : 'Live';
  const isMeetingActive  = meetingState === 'active';
  const isMeetingBusy    = meetingState === 'calling' || meetingState === 'dispersing';

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
        {/* ── Call to Meeting button ──────────────────────────────────────── */}
        <button
          onClick={isMeetingActive ? endMeeting : triggerMeeting}
          disabled={isMeetingBusy}
          aria-label={isMeetingActive ? 'End meeting' : 'Call all agents to meeting'}
          style={{
            background: 'none',
            border: `1px solid ${isMeetingActive ? '#3b82f6' : C.chromeBorder}`,
            borderRadius: 3,
            cursor: isMeetingBusy ? 'default' : 'pointer',
            padding: '2px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: isMeetingBusy ? 0.5 : 1,
            transition: 'border-color 300ms ease, opacity 300ms ease',
          }}
        >
          <span style={{ fontSize: 10, lineHeight: 1 }}>
            {isMeetingActive ? '🚪' : '📋'}
          </span>
          <span style={{
            ...TEXT,
            color: isMeetingActive ? '#3b82f6' : C.chromeBorder,
            transition: 'color 300ms ease',
          }}>
            {isMeetingBusy
              ? (meetingState === 'calling' ? 'Calling…' : 'Dispersing…')
              : (isMeetingActive ? 'End Meeting' : 'Call to Meeting')}
          </span>
        </button>

        {/* ── Day / night toggle ──────────────────────────────────────────── */}
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
