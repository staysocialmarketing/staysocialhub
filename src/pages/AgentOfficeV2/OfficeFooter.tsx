import { useState, useEffect } from 'react';
import { CANVAS_W, CANVAS_H, DESKS } from './constants/desks';
import { useAgentStatuses } from './hooks/useAgentStatus';

export const FOOTER_H = 32;

const TOTAL_AGENTS = DESKS.filter(d => !d.isPlaceholder).length; // 7

function formatTime(d: Date) {
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

const LABEL: React.CSSProperties = {
  color: '#3a5a78',
  fontSize: 7,
  fontFamily: "'Courier New', monospace",
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const VAL: React.CSSProperties = { ...LABEL, color: '#6eb5e0' };

function Sep() {
  return <span style={{ ...LABEL, color: '#1a2840' }}>|</span>;
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span style={LABEL}>
      <span style={VAL}>{n}</span>{' '}{label}
    </span>
  );
}

export function OfficeFooter() {
  const statuses   = useAgentStatuses();
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(t);
  }, []);

  const activeCount  = Object.values(statuses).filter(s => s === 'active' || s === 'processing').length;
  const meetingCount = 0; // wired up in Phase 6.7 when meeting context lands

  return (
    <div style={{
      position: 'absolute',
      left: 0, top: CANVAS_H - FOOTER_H,
      width: CANVAS_W, height: FOOTER_H,
      background: '#161c2a',
      borderTop: '1px solid #2e3c54',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Stat n={TOTAL_AGENTS} label="Agents" />
        <Sep />
        <Stat n={activeCount}  label="Active" />
        <Sep />
        <Stat n={meetingCount} label="In Meeting" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={VAL}>Sync: {time}</span>
        <Sep />
        <span style={LABEL}>Poll 5s</span>
      </div>
    </div>
  );
}
