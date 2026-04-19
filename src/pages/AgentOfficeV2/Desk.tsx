import './monitor-animations.css';
import type { DeskConfig, DeskTier } from './constants/desks';
import { TIER_DIMS } from './constants/desks';
import { SPRITE_MAP, SPRITE_DIMS } from './sprites';
import { AGENTS } from './constants/agents';
import { DeskLamp } from './DeskLamp';
import { DeskIndicator } from './DeskIndicator';
import type { IndicatorType } from './DeskIndicator';
import { useAgentStatuses } from './hooks/useAgentStatus';
import type { AgentState } from './hooks/useAgentStatus';

interface DeskProps {
  desk: DeskConfig;
  lampBoost?: number;  // additive lamp opacity boost (used for Lev↔Corey sync)
}

const MONITOR_SIZES: Record<DeskTier, { w: number; h: number }> = {
  command:        { w: 32, h: 18 },
  chief_of_staff: { w: 26, h: 16 },
  director:       { w: 24, h: 14 },
  sub_agent:      { w: 20, h: 12 },
};

const ROLE_SUBTITLES: Record<string, string> = {
  corey: 'Founder · AI Systems Architect',
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

export function Desk({ desk, lampBoost = 0 }: DeskProps) {
  const { tier, x, y, monitors, isPlaceholder, label, key } = desk;
  const { w: dw, h: dh } = TIER_DIMS[tier];
  const { w: mw, h: mh } = MONITOR_SIZES[tier];
  const ghost = isPlaceholder ?? false;

  // Resolve live state — ghost desks are always 'placeholder'
  const allStatuses = useAgentStatuses();
  const agentState: AgentState = ghost ? 'placeholder' : (allStatuses[key] ?? 'offline');

  const SpriteComponent = SPRITE_MAP[key];
  const dims = SPRITE_DIMS[key] ?? SPRITE_DIMS['_default'];
  const spriteX = x + Math.floor((dw - dims.w) / 2);
  const spriteY = y - dims.visibleH;

  const monGap = 3;
  const totalMonW = monitors * mw + (monitors - 1) * monGap;
  const monStartX = x + Math.floor((dw - totalMonW) / 2);

  const roleSubtitle = ROLE_SUBTITLES[key];

  const lampCfg = LAMP_CONFIG[tier];

  const agentCfg = AGENTS[key];
  const indicatorType: IndicatorType = agentCfg?.indicator ?? 'question';
  const indicatorColor = agentCfg?.palette ?? '#2a3a50';

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

      {/* ── Character sprite ── */}
      {SpriteComponent ? (
        <div
          style={{
            position: 'absolute',
            left: spriteX,
            top: spriteY,
            width: dims.w,
            height: dims.h,
            opacity: ghost ? 0.55 : 1,
            filter: ghost ? 'grayscale(0.5)' : 'none',
            imageRendering: 'pixelated',
          }}
        >
          <SpriteComponent />
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: x + Math.floor((dw - 14) / 2),
            top: y - 22,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: ghost ? '#1e2228' : '#263344',
            border: `1px solid ${ghost ? '#262b35' : '#344860'}`,
            opacity: ghost ? 0.55 : 0.9,
          }}
        />
      )}

      {/* ── Desk surface ── */}
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
        }}
      />

      {/* ── Monitor screens ── */}
      {Array.from({ length: monitors }).map((_, i) => (
        <div
          key={i}
          className={monitorClass(agentState, ghost)}
          style={{
            position: 'absolute',
            left: monStartX + i * (mw + monGap),
            top: y + 4,
            width: mw,
            height: mh,
            backgroundColor: ghost ? '#060606' : monitorBg(agentState),
            backgroundImage: (!ghost && agentState === 'active')
              ? activeBackgroundImage()
              : undefined,
            border: '1px solid #182030',
            opacity: ghost ? 0.35 : 1,
          }}
        />
      ))}

      {/* ── Indicator badge ── */}
      <DeskIndicator
        type={indicatorType}
        color={indicatorColor}
        x={x} y={y} deskW={dw}
        ghost={ghost}
      />

      {/* ── Agent name label ── */}
      <div
        style={{
          position: 'absolute',
          left: x + Math.floor(dw / 2),
          top: y + dh + 6,
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

      {/* ── Role subtitle (Corey only) ── */}
      {roleSubtitle && !ghost && (
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
