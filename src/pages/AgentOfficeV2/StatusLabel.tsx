/**
 * StatusLabel — floating speech-bubble above a character sprite.
 *
 * Shown when: walkState === 'idle' AND status is 'active' or 'processing',
 *             OR walkState === 'seated_meeting'.
 * Hidden when: walking, stair transitions, idle+offline/placeholder.
 *
 * Uses memo + primitive props to avoid re-renders on every walk frame tick.
 * Keeps the last valid config in a ref so the label fades out with correct
 * content rather than going blank mid-transition.
 */
import { memo, useRef } from 'react';
import { useAgentStatuses } from './hooks/useAgentStatus';
import type { WalkState } from './hooks/useWalkAnimation';

const SPRITE_H = 60; // full sprite height; top is at y - SPRITE_H (not y - visibleH)
const GAP      = 14; // px between label bottom edge and sprite top edge
const LABEL_H  = 18; // approximate label height for top-offset calculation

interface LabelConfig {
  text:   string;
  border: string;
  color:  string;
  glow:   string;
}

function resolveConfig(walkState: WalkState, status: string): LabelConfig | null {
  if (walkState === 'seated_meeting') {
    return { text: 'In meeting',    border: '#3b82f6', color: '#3b82f6', glow: 'rgba(59,130,246,0.12)' };
  }
  if (walkState !== 'idle') return null;
  if (status === 'active') {
    return { text: 'Working...',    border: '#22a84a', color: '#22a84a', glow: 'rgba(34,168,74,0.10)' };
  }
  if (status === 'processing') {
    return { text: 'Processing...', border: '#d97706', color: '#d97706', glow: 'rgba(217,119,6,0.10)' };
  }
  return null;
}

interface StatusLabelProps {
  agentKey:  string;
  walkState: WalkState;
  x:         number;
  y:         number;
}

export const StatusLabel = memo(function StatusLabel({ agentKey, walkState, x, y }: StatusLabelProps) {
  const statuses = useAgentStatuses();
  const status   = statuses[agentKey] ?? 'idle';
  const config   = resolveConfig(walkState, status);
  const visible  = config !== null;

  // Keep last non-null config so the bubble fades out with correct content.
  const lastCfgRef = useRef<LabelConfig | null>(null);
  if (config !== null) lastCfgRef.current = config;
  const display = config ?? lastCfgRef.current;

  // Sprite top is at y - SPRITE_H. Label bottom floats GAP px above that.
  // top = (y - SPRITE_H - GAP) - LABEL_H
  const top  = Math.round(y - SPRITE_H - GAP - LABEL_H);
  const left = Math.round(x);

  return (
    <div
      style={{
        position:        'absolute',
        left,
        top,
        transform:       'translateX(-50%)',
        zIndex:          28,
        pointerEvents:   'none',
        opacity:         visible ? 1 : 0,
        // Fade in with 300ms arrival delay; fade out immediately.
        transition:      visible ? 'opacity 200ms 300ms' : 'opacity 150ms',
        background:      'rgba(8,14,28,0.90)',
        border:          `1px solid ${display?.border ?? 'transparent'}`,
        borderRadius:    3,
        padding:         '2px 6px',
        whiteSpace:      'nowrap',
        boxShadow:       display ? `0 0 8px ${display.glow}` : 'none',
      }}
    >
      <span style={{
        color:       display?.color ?? 'transparent',
        fontSize:    7,
        fontFamily:  "'Courier New', monospace",
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        lineHeight:  1,
      }}>
        {display?.text ?? ''}
      </span>
    </div>
  );
});
