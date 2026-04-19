// Canvas dimensions
export const CANVAS_W = 960;
export const CANVAS_H = 840;
export const UPPER_FLOOR_H = 260;
export const MAIN_FLOOR_Y = 268; // after 8px divider (UPPER_FLOOR_H + 8)
export const COMMON_AREA_Y = 705; // shared strip at bottom of main floor (135px tall)

// Desk tiers
export type DeskTier = 'command' | 'chief_of_staff' | 'director' | 'sub_agent';

export interface DeskConfig {
  key: string;
  label: string;
  tier: DeskTier;
  x: number; // desk rect left edge, canvas-absolute
  y: number; // desk rect top edge, canvas-absolute
  monitors: number;
  isPlaceholder?: boolean;
}

export const TIER_DIMS: Record<DeskTier, { w: number; h: number }> = {
  command:        { w: 140, h: 46 },
  chief_of_staff: { w: 120, h: 40 },
  director:       { w: 90,  h: 36 },
  sub_agent:      { w: 60,  h: 28 },
};

// ── Desk Y positions (canvas-absolute) ─────────────────────────────────────
// Sprites are 48×60px with visibleH=42 (bottom 18px behind desk surface).
// spriteTop = y - 42. Spacing ensures no label-to-sprite overlap between rows.
export const ROW1_Y = 305; // Corey + wing directors (sprite top = 263)
export const ROW2_Y = 460; // Lev                   (sprite top = 418, clears ROW1 labels)
export const ROW3_Y = 565; // Scout / Quill / Ember  (sprite top = 523, clears ROW2 labels)
export const ROW4_Y = 657; // Forge / Pixel          (sprite top = 615, clears ROW3 labels)

// Wing pods: future hire slots sit lower than the director, tighter to the nook below
export const WING_FUTURE_Y = 440;

// ── Pod X extents ──────────────────────────────────────────────────────────
export const CREATIVE_POD_X = 12;
export const CREATIVE_POD_W = 188;
export const AI_CORE_POD_X  = 220;
export const AI_CORE_POD_W  = 440; // right edge = 660, staircase at 700 is outside pod
export const SALES_POD_X    = 760;
export const SALES_POD_W    = 188;
export const COL_STAIR      = 700; // staircase column — in gap between AI Core (660) and Sales (760)

// ── AI Core desk zone: hardcoded to keep Corey/Lev centered on COL_C=480 ───
const AI_ZONE_X = 320;

// Sub-agents spread to give 80px desk-to-desk gaps (sprite=48px → 32px clearance each side)
const AI_SUB_1 = 310;  // center_x = 340 (COL_L)
const AI_SUB_2 = 450;  // center_x = 480 (COL_C)
const AI_SUB_3 = 590;  // center_x = 620 (COL_R)

export const DESKS: DeskConfig[] = [
  // ── AI Core Pod ──────────────────────────────────────────────────────────
  {
    key: 'corey', label: 'Corey', tier: 'command',
    x: AI_ZONE_X + (320 - 140) / 2, // 410
    y: ROW1_Y, monitors: 3,
  },
  {
    key: 'lev', label: 'Lev', tier: 'chief_of_staff',
    x: AI_ZONE_X + (320 - 120) / 2, // 420
    y: ROW2_Y, monitors: 3,
  },
  {
    key: 'scout', label: 'Scout', tier: 'sub_agent',
    x: AI_SUB_1, y: ROW3_Y, monitors: 2,
  },
  {
    key: 'quill', label: 'Quill', tier: 'sub_agent',
    x: AI_SUB_2, y: ROW3_Y, monitors: 2,
  },
  {
    key: 'ember', label: 'Ember', tier: 'sub_agent',
    x: AI_SUB_3, y: ROW3_Y, monitors: 2,
  },
  {
    key: 'forge', label: 'Forge', tier: 'sub_agent',
    x: AI_SUB_1, y: ROW4_Y, monitors: 2, isPlaceholder: true,
  },
  {
    key: 'pixel', label: 'Pixel', tier: 'sub_agent',
    x: AI_SUB_2, y: ROW4_Y, monitors: 2, isPlaceholder: true,
  },
  {
    key: 'future_ai', label: '?', tier: 'sub_agent',
    x: AI_SUB_3, y: ROW4_Y, monitors: 2, isPlaceholder: true,
  },

  // ── Creative Studio Pod ───────────────────────────────────────────────────
  {
    key: 'gavin', label: 'Gavin', tier: 'director',
    x: CREATIVE_POD_X + Math.floor((CREATIVE_POD_W - 90) / 2), // 61
    y: ROW1_Y, monitors: 2,  // same row as Corey → aligned eye level
  },
  {
    key: 'future_creative', label: '?', tier: 'sub_agent',
    x: CREATIVE_POD_X + Math.floor((CREATIVE_POD_W - 60) / 2), // 76
    y: WING_FUTURE_Y, monitors: 2, isPlaceholder: true,
  },

  // ── Sales Pod ────────────────────────────────────────────────────────────
  {
    key: 'tristan', label: 'Tristan', tier: 'director',
    x: SALES_POD_X + Math.floor((SALES_POD_W - 90) / 2), // 809
    y: ROW1_Y, monitors: 2,  // same row as Corey → aligned eye level
  },
  {
    key: 'future_sales', label: '?', tier: 'sub_agent',
    x: SALES_POD_X + Math.floor((SALES_POD_W - 60) / 2), // 824
    y: WING_FUTURE_Y, monitors: 2, isPlaceholder: true,
  },
];

// Meeting room seat coordinates — updated to match enlarged table (Phase 7)
export const MEETING_SEATS = [
  { x: 376, y: 138 }, { x: 445, y: 138 }, { x: 514, y: 138 }, { x: 583, y: 138 },
  { x: 376, y: 218 }, { x: 445, y: 218 }, { x: 514, y: 218 }, { x: 583, y: 218 },
];
