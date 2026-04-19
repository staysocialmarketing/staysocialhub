// Canvas dimensions
export const CANVAS_W = 960;
export const CANVAS_H = 780;
export const UPPER_FLOOR_H = 230;
export const MAIN_FLOOR_Y = 238; // after 6px divider (UPPER_FLOOR_H + 2)
export const COMMON_AREA_Y = 630; // shared strip at bottom of main floor

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

// ── Desk Y positions (all canvas-absolute) ──────────────────────────────────
// Row spacing sized so character circles don't overlap the desk above.
// Each circle diameter: command=22, chief_of_staff=20, director=18, sub_agent=14
// Circle sits (circleD + 8)px above desk top edge.
export const ROW1_Y = 305; // Corey + directors
export const ROW2_Y = 395; // Lev + future director slots
export const ROW3_Y = 485; // Sub-agents row 1
export const ROW4_Y = 559; // Sub-agents row 2

// ── Pod X extents ──────────────────────────────────────────────────────────
export const CREATIVE_POD_X = 12;
export const CREATIVE_POD_W = 188;
export const AI_CORE_POD_X  = 220;
export const AI_CORE_POD_W  = 520;
export const SALES_POD_X    = 760;
export const SALES_POD_W    = 188;
// 12+188+20+520+20+188+12 = 960 ✓

// ── AI Core desk zone: 300px centered inside 520px pod ─────────────────────
// zone_x = 220 + (520-300)/2 = 330
const AI_ZONE_X = 330;

// 3 sub-agents × 60px in 300px: margin=30, gap=30
// [30][60][30][60][30][60][30] = 300 ✓
const AI_SUB_1 = AI_ZONE_X + 30;  // 360
const AI_SUB_2 = AI_ZONE_X + 120; // 450
const AI_SUB_3 = AI_ZONE_X + 210; // 540

export const DESKS: DeskConfig[] = [
  // ── AI Core Pod ──────────────────────────────────────────────────────────
  {
    key: 'corey', label: 'Corey', tier: 'command',
    x: AI_ZONE_X + (300 - 140) / 2, // 410
    y: ROW1_Y, monitors: 3,
  },
  {
    key: 'lev', label: 'Lev', tier: 'chief_of_staff',
    x: AI_ZONE_X + (300 - 120) / 2, // 420
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
    y: ROW1_Y, monitors: 2,
  },
  {
    key: 'future_creative', label: '?', tier: 'sub_agent',
    x: CREATIVE_POD_X + Math.floor((CREATIVE_POD_W - 60) / 2), // 76
    y: ROW2_Y, monitors: 2, isPlaceholder: true,
  },

  // ── Sales Pod ────────────────────────────────────────────────────────────
  {
    key: 'tristan', label: 'Tristan', tier: 'director',
    x: SALES_POD_X + Math.floor((SALES_POD_W - 90) / 2), // 809
    y: ROW1_Y, monitors: 2,
  },
  {
    key: 'future_sales', label: '?', tier: 'sub_agent',
    x: SALES_POD_X + Math.floor((SALES_POD_W - 60) / 2), // 824
    y: ROW2_Y, monitors: 2, isPlaceholder: true,
  },
];

// Meeting room seat coordinates for Phase 7 (matches UpperFloor table layout)
export const MEETING_SEATS = [
  { x: 379, y: 82 }, { x: 449, y: 82 }, { x: 519, y: 82 }, { x: 589, y: 82 },
  { x: 379, y: 142 }, { x: 449, y: 142 }, { x: 519, y: 142 }, { x: 589, y: 142 },
];
