// Canvas dimensions
export const CANVAS_W = 960;
export const CANVAS_H = 840;
export const UPPER_FLOOR_H = 230;
export const MAIN_FLOOR_Y = 238; // after 8px divider (UPPER_FLOOR_H + 8)
export const COMMON_AREA_Y = 690; // shared strip at bottom of main floor (150px tall)

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
export const ROW2_Y = 425; // Lev                   (sprite top = 383, clears ROW1 labels)
export const ROW3_Y = 530; // Scout / Quill / Ember  (sprite top = 488, clears ROW2 labels)
export const ROW4_Y = 622; // Forge / Pixel          (sprite top = 580, clears ROW3 labels)

// Wing pods: future hire slots sit lower than the director, tighter to the nook below
export const WING_FUTURE_Y = 440;

// ── Pod X extents ──────────────────────────────────────────────────────────
export const CREATIVE_POD_X = 12;
export const CREATIVE_POD_W = 188;
export const AI_CORE_POD_X  = 220;
export const AI_CORE_POD_W  = 520;
export const SALES_POD_X    = 760;
export const SALES_POD_W    = 188;
// 12+188+20+520+20+188+12 = 960 ✓

// ── AI Core desk zone: 320px centered inside 520px pod ─────────────────────
// zone_x = 220 + (520-320)/2 = 320
const AI_ZONE_X = 320;

// 3 sub-agents × 60px with margin=30, gap=40: [30][60][40][60][40][60][30] = 320 ✓
const AI_SUB_1 = AI_ZONE_X + 30;  // 350
const AI_SUB_2 = AI_ZONE_X + 130; // 450
const AI_SUB_3 = AI_ZONE_X + 230; // 550

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
  { x: 376, y: 70 }, { x: 445, y: 70 }, { x: 514, y: 70 }, { x: 583, y: 70 },
  { x: 376, y: 150 }, { x: 445, y: 150 }, { x: 514, y: 150 }, { x: 583, y: 150 },
];
