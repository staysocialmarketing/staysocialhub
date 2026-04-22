import type { ReactElement } from 'react';
import './monitor-animations.css';
import type { DeskConfig, DeskTier } from './constants/desks';
import { TIER_DIMS } from './constants/desks';
import { AGENTS } from './constants/agents';
import { DeskLamp } from './DeskLamp';
import { DeskIndicator } from './DeskIndicator';
import type { IndicatorType } from './DeskIndicator';
import { useAgentStatuses } from './hooks/useAgentStatus';
import type { AgentState } from './hooks/useAgentStatus';

interface DeskProps {
  desk: DeskConfig;
  lampBoost?: number;  // additive lamp opacity boost (used for Lev↔Corey sync)
  activeSubAgentCount?: number; // for Lev's dot cluster
}

const MONITOR_SIZES: Record<DeskTier, { w: number; h: number }> = {
  command:        { w: 32, h: 18 },
  chief_of_staff: { w: 26, h: 16 },
  director:       { w: 24, h: 14 },
  sub_agent:      { w: 20, h: 12 },
};

const ROLE_SUBTITLES: Record<string, string> = {
  corey: 'Founder · AI Systems Architect',
  lev:   'AI Chief of Staff · Ops & Delegation',
};

interface LampConfig { w: number; topStop: string }

const LAMP_CONFIG: Record<DeskTier, LampConfig> = {
  command:        { w: 120, topStop: '#ffd88a' },
  chief_of_staff: { w: 116, topStop: '#ffc870' },
  director:       { w: 90,  topStop: '#ffd88a' },
  sub_agent:      { w: 64,  topStop: '#ffd88a' },
};

// Monitor background per state
function monitorBg(state: AgentState): string {
  switch (state) {
    case 'active':      return '#07091a'; // subtle — stripes via CSS class
    case 'processing':  return '#0a1428'; // pulsed via CSS class
    case 'offline':     return '#000000';
    case 'placeholder': return '#060606';
    default:            return '#040608'; // idle — very dim
  }
}

function monitorClass(state: AgentState, ghost: boolean): string {
  if (ghost) return '';
  if (state === 'processing') return 'monitor-processing';
  if (state === 'active')     return 'monitor-active';
  return '';
}

function activeBackgroundImage(): string {
  return 'repeating-linear-gradient(180deg, transparent 0px, transparent 3px, rgba(14,34,68,0.55) 3px, rgba(14,34,68,0.55) 4px)';
}

// ── Per-agent monitor styles when active ────────────────────────────────────

interface MonitorStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  opacity?: number;
}

function monitorStyleForAgent(
  key: string,
  monitorIndex: number,
  state: AgentState,
  ghost: boolean,
): MonitorStyle {
  if (ghost || state !== 'active') return {};

  // Forge: 3 screens — main (scanlines, default), green tint (terminal), dimmer neutral (docs)
  if (key === 'forge') {
    if (monitorIndex === 1) return { backgroundColor: '#071a0a' }; // green-tinted terminal
    if (monitorIndex === 2) return { backgroundColor: '#050810', opacity: 0.6 }; // dimmer neutral
    return {}; // monitor 0: default active scanlines
  }

  // Pixel: 2 screens — left cooler (data, default), right warmer (creative review)
  if (key === 'pixel') {
    if (monitorIndex === 1) return { backgroundColor: '#14090a' }; // warmer right monitor
    return {}; // monitor 0: default cool data treatment
  }

  // Quill: first monitor gets amber-warm tint when active
  if (key === 'quill') {
    if (monitorIndex === 0) return { backgroundColor: '#150d04', backgroundImage: 'none' }; // warm amber, no scanlines
    return {};
  }

  return {};
}

// ── Pixel: dashboard bar chart on left monitor (active only) ────────────────
function PixelBarChart({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  // Faint horizontal bar pattern — alternating light/dark rows at 2px each
  const rows: ReactElement[] = [];
  for (let i = 0; i < h; i += 4) {
    rows.push(
      <rect key={i}
        x={x + 2} y={y + i}
        width={w - 4} height={2}
        fill="rgba(60,120,200,0.18)"
      />
    );
  }
  return <>{rows}</>;
}

export function Desk({ desk, lampBoost = 0, activeSubAgentCount }: DeskProps) {
  const { tier, x, y, monitors, label, key } = desk;
  const { w: dw, h: dh } = TIER_DIMS[tier];
  const { w: mw, h: mh } = MONITOR_SIZES[tier];

  const monGap = 3;
  const totalMonW = monitors * mw + (monitors - 1) * monGap;
  const monStartX = x + Math.floor((dw - totalMonW) / 2);

  const roleSubtitle = ROLE_SUBTITLES[key];
  const lampCfg = LAMP_CONFIG[tier];

  const agentCfg = AGENTS[key];
  const indicatorType: IndicatorType = agentCfg?.indicator ?? 'question';
  const indicatorColor = agentCfg?.palette ?? '#2a3a50';

  // Resolve live state — driven by DB via useAgentStatus resolveState()
  // Forge/Pixel start as 'placeholder' but activate when DB transitions to a live state.
  // Other agents fall back to 'offline' when no DB entry is present.
  const allStatuses = useAgentStatuses();
  const isInitiallyPlaceholder = desk.isPlaceholder ?? agentCfg?.isPlaceholder ?? false;
  const agentState: AgentState = allStatuses[key] ?? (isInitiallyPlaceholder ? 'placeholder' : 'offline');

  // Ghost rendering is entirely driven by live agentState
  const isGhost = agentState === 'placeholder';

  // ── Lev dot cluster: active sub-agents ──────────────────────────────────
  const LEV_DOT_COUNT = 4;
  const levDotX = x + 3; // left edge of desk
  const levDotY = y + Math.floor(dh / 2) - 2;

  return (
    <>
      {/* ── Lamp glow — behind everything ── */}
      <DeskLamp
        x={x} y={y} deskW={dw} deskH={dh}
        lampW={lampCfg.w}
        state={agentState}
        opacityBoost={lampBoost}
        topStop={lampCfg.topStop}
      />

      {/* ── Desk surface ── */}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: dw,
          height: dh,
          background: isGhost ? '#272a30' : '#2d3a4e',
          border: `1px solid ${isGhost ? '#303338' : '#36475e'}`,
          opacity: isGhost ? 0.5 : 1,
        }}
      />

      {/* ── Scout: faint compass rose in desk texture ── */}
      {key === 'scout' && !isGhost && (
        <svg
          style={{ position: 'absolute', left: x + Math.floor(dw / 2) - 5, top: y + Math.floor(dh / 2) - 5, pointerEvents: 'none', opacity: 0.10 }}
          width={10} height={10}
        >
          {/* Cardinal lines */}
          <line x1="5" y1="0" x2="5" y2="10" stroke="#a0b8d0" strokeWidth="0.8"/>
          <line x1="0" y1="5" x2="10" y2="5" stroke="#a0b8d0" strokeWidth="0.8"/>
          {/* Diagonal arms */}
          <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="#a0b8d0" strokeWidth="0.5"/>
          <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="#a0b8d0" strokeWidth="0.5"/>
          {/* North point */}
          <polygon points="5,0 4,3 6,3" fill="#a0b8d0"/>
        </svg>
      )}

      {/* ── Scout: paper stack next to desk ── */}
      {key === 'scout' && !isGhost && (
        <div
          style={{
            position: 'absolute',
            left: x + dw + 2,
            top: y + dh - 6,
            width: 8,
            height: 4,
            background: '#ddd8c8',
            border: '1px solid #b8b0a0',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Ember: subject-line note (angled strip) ── */}
      {key === 'ember' && !isGhost && (
        <div
          style={{
            position: 'absolute',
            left: x + 8,
            top: y + 6,
            width: 14,
            height: 4,
            background: '#f0e8d8',
            border: '1px solid #c8b898',
            transform: 'rotate(-4deg)',
            transformOrigin: 'left center',
            pointerEvents: 'none',
            opacity: 0.9,
          }}
        />
      )}

      {/* ── Forge: mechanical keyboard ── */}
      {key === 'forge' && !isGhost && (
        <div
          style={{
            position: 'absolute',
            left: x + Math.floor((dw - 30) / 2),
            top: y + dh - 8,
            width: 30,
            height: 6,
            background: '#2a2c32',
            border: '1px solid #3a3e48',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Monitor screens ── */}
      {Array.from({ length: monitors }).map((_, i) => {
        const extraStyle = monitorStyleForAgent(key, i, agentState, isGhost);
        const mLeft = monStartX + i * (mw + monGap);
        const mTop  = y + 4;

        return (
          <div
            key={i}
            className={monitorClass(agentState, isGhost)}
            style={{
              position: 'absolute',
              left: mLeft,
              top: mTop,
              width: mw,
              height: mh,
              backgroundColor: isGhost ? '#060606' : (extraStyle.backgroundColor ?? monitorBg(agentState)),
              backgroundImage: (!isGhost && agentState === 'active' && extraStyle.backgroundImage !== 'none')
                ? (extraStyle.backgroundImage ?? activeBackgroundImage())
                : undefined,
              border: '1px solid #252d3d',
              opacity: isGhost ? 0.35 : (extraStyle.opacity ?? 1),
            }}
          >
            {/* Pixel: dashboard bar chart on left monitor when active */}
            {key === 'pixel' && i === 0 && agentState === 'active' && (
              <svg
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                width={mw} height={mh}
              >
                <PixelBarChart x={0} y={0} w={mw} h={mh} />
              </svg>
            )}
          </div>
        );
      })}

      {/* ── Quill: back-wall pinboard ── */}
      {key === 'quill' && !isGhost && (
        <div
          style={{
            position: 'absolute',
            left: x + Math.floor((dw - 12) / 2),
            top: y - 16,
            width: 12,
            height: 8,
            background: '#2a2218',
            border: '1px solid #3e3020',
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Indicator badge ── */}
      <DeskIndicator
        type={indicatorType}
        color={indicatorColor}
        x={x} y={y} deskW={dw}
        ghost={isGhost}
      />

      {/* ── Pixel: live indicator dot ── */}
      {key === 'pixel' && !isGhost && (
        <div
          className={
            agentState === 'active' || agentState === 'processing'
              ? 'dot-live'
              : ''
          }
          style={{
            position: 'absolute',
            left: x + dw - 20,
            top: y + 2,
            width: 3,
            height: 3,
            borderRadius: '50%',
            background:
              agentState === 'active' || agentState === 'processing'
                ? '#0090ff'
                : agentState === 'offline'
                ? '#000000'
                : '#1a2030',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Lev: active sub-agent dot cluster ── */}
      {key === 'lev' && !isGhost && (
        <svg
          style={{ position: 'absolute', left: levDotX, top: levDotY, pointerEvents: 'none' }}
          width={20} height={5}
        >
          {Array.from({ length: LEV_DOT_COUNT }).map((_, i) => {
            const lit = activeSubAgentCount !== undefined && i < activeSubAgentCount;
            return (
              <circle
                key={i}
                cx={2 + i * 5}
                cy={2.5}
                r={1.5}
                fill={lit ? '#d4822a' : '#2a3040'}
                opacity={lit ? 0.9 : 0.4}
              />
            );
          })}
        </svg>
      )}

      {/* ── Agent name label ── */}
      <div
        style={{
          position: 'absolute',
          left: x + Math.floor(dw / 2),
          top: y + dh + 6,
          transform: 'translateX(-50%)',
          color: isGhost ? '#2c3040' : '#6eb5e0',
          fontSize: 8,
          fontFamily: "'Courier New', monospace",
          fontWeight: isGhost ? 400 : 700,
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          lineHeight: 1,
          textShadow: isGhost ? 'none' : '0 0 6px #212934, 0 0 12px #212934',
          pointerEvents: 'none',
        }}
      >
        {label}
      </div>

      {/* ── Role subtitle (Corey + Lev) ── */}
      {roleSubtitle && !isGhost && (
        <div
          style={{
            position: 'absolute',
            left: x + Math.floor(dw / 2),
            top: y + dh + 17,
            transform: 'translateX(-50%)',
            color: '#3a5a78',
            fontSize: 6,
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {roleSubtitle}
        </div>
      )}

      {/* ── Coming soon badge for placeholders ── */}
      {isGhost && (
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
