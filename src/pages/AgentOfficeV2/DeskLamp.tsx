import type { AgentState } from './hooks/useAgentStatus';
import { STATE_OPACITY } from './hooks/useAgentStatus';

interface DeskLampProps {
  x: number;
  y: number;
  deskW: number;
  deskH: number;
  lampW: number;
  state: AgentState;
  opacityBoost?: number;   // additive boost, e.g. Lev gets +0.1 when Corey is active
  topStop?: string;
}

export function DeskLamp({
  x, y, deskW, deskH, lampW,
  state,
  opacityBoost = 0,
  topStop = '#ffd88a',
}: DeskLampProps) {
  const base = STATE_OPACITY[state];
  const opacity = Math.min(1, base + (base > 0 ? opacityBoost : 0));

  const lampH = Math.round(lampW * 0.45);
  const lampX = x + Math.floor((deskW - lampW) / 2);
  const lampY = y + Math.floor((deskH - lampH) / 2) - Math.round(lampH * 0.15);

  const hex = topStop.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return (
    <div
      style={{
        position: 'absolute',
        left: lampX,
        top: lampY,
        width: lampW,
        height: lampH,
        background: `radial-gradient(ellipse at 50% 40%, rgba(${r},${g},${b},0.88) 0%, rgba(${r},${g},${b},0) 72%)`,
        opacity,
        transition: 'opacity 300ms ease',
        pointerEvents: 'none',
      }}
    />
  );
}
