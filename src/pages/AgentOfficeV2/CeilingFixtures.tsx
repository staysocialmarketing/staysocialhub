/**
 * CeilingFixtures — LED/fluorescent ceiling panels with ambient glow halos.
 *
 * Renders at z=8 (above floor/wall layers, below character sprites at z=20).
 *
 * CSS variable hooks for Part 3 day/night toggle:
 *   --ceiling-panel  : panel face color  (default #dae6f0)
 *   --ceiling-opacity: whole-layer alpha (default 1, night mode sets to 0.25)
 *
 * Main floor  — 4 panels inside pod areas (clear of pod borders at x=200/220/660/760)
 * Upper floor — 2 panels flanking Halifax (x=250-450) and Toronto (x=510-710) windows
 */
import { CANVAS_W, MAIN_FLOOR_Y } from './constants/desks';

const BACK_WALL_H = 22;   // matches MainFloor.tsx local constant

// Panel geometry
const PANEL_W     = 110;
const PANEL_H     = 8;
const HALO_RX     = 115;  // halo horizontal radius (wider than panel for spread)
const HALO_RY     = 65;   // halo vertical radius  (downward extent)
const HALO_CY_OFF = 26;   // halo ellipse centre offset below panel bottom

// Halo gradient — cool LED tint
const HALO_COLOR = '#c0d8e8';

// Main floor: centres within Creative (≈106), AI Core left (≈360),
//             AI Core right (≈550), Sales (≈854)
const MAIN_PANELS: number[] = [106, 360, 550, 854];

// Upper floor: left of Halifax window start (250) and right of Toronto end (710)
const MEET_PANELS: number[] = [150, 820];

// Canvas positions
const MAIN_CEIL_Y = MAIN_FLOOR_Y + BACK_WALL_H; // 290 — top of main floor workspace
const MEET_CEIL_Y = 4;                            // 4px from canvas top, in back-wall zone

const SVG_H = PANEL_H + HALO_CY_OFF + HALO_RY + 6;

// ── Single panel + halo group ──────────────────────────────────────────────
function PanelStrip({ cx, gradId }: { cx: number; gradId: string }) {
  return (
    <g>
      {/* Ambient glow ellipse — fades outward from panel centre */}
      <ellipse
        cx={cx}
        cy={PANEL_H + HALO_CY_OFF}
        rx={HALO_RX}
        ry={HALO_RY}
        fill={`url(#${gradId})`}
      />
      {/* Fixture face — colour driven by CSS variable */}
      <rect
        x={cx - PANEL_W / 2}
        y={0}
        width={PANEL_W}
        height={PANEL_H}
        style={{ fill: 'var(--ceiling-panel, #dae6f0)', stroke: '#a8c8e0', strokeWidth: 0.5 }}
        rx={2}
      />
      {/* Specular shine — thin white highlight on face */}
      <rect
        x={cx - PANEL_W / 2 + 6}
        y={2}
        width={PANEL_W - 12}
        height={2}
        fill="#ffffff"
        fillOpacity={0.32}
      />
    </g>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export function CeilingFixtures() {
  return (
    <div style={{ opacity: 'var(--ceiling-opacity, 1)' as React.CSSProperties['opacity'] }}>
      {/* ── Main floor panels (4×) ──────────────────────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: MAIN_CEIL_Y,
          width: CANVAS_W,
          height: SVG_H,
          pointerEvents: 'none',
          zIndex: 8,
        }}
      >
        <defs>
          {MAIN_PANELS.map((cx, i) => (
            <radialGradient
              key={i}
              id={`cf-mf-${i}`}
              cx={cx}
              cy={0}
              r={155}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor={HALO_COLOR} stopOpacity={0.15} />
              <stop offset="100%" stopColor={HALO_COLOR} stopOpacity={0}    />
            </radialGradient>
          ))}
        </defs>
        {MAIN_PANELS.map((cx, i) => (
          <PanelStrip key={i} cx={cx} gradId={`cf-mf-${i}`} />
        ))}
      </svg>

      {/* ── Upper floor / meeting room panels (2×) ──────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: MEET_CEIL_Y,
          width: CANVAS_W,
          height: SVG_H,
          pointerEvents: 'none',
          zIndex: 8,
        }}
      >
        <defs>
          {MEET_PANELS.map((cx, i) => (
            <radialGradient
              key={i}
              id={`cf-mr-${i}`}
              cx={cx}
              cy={0}
              r={155}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor={HALO_COLOR} stopOpacity={0.12} />
              <stop offset="100%" stopColor={HALO_COLOR} stopOpacity={0}    />
            </radialGradient>
          ))}
        </defs>
        {MEET_PANELS.map((cx, i) => (
          <PanelStrip key={i} cx={cx} gradId={`cf-mr-${i}`} />
        ))}
      </svg>
    </div>
  );
}
