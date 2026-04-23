// Canvas dimensions — sized to reduce letterboxing on 1280–1920px screens
export const CANVAS_W = 1280;
export const CANVAS_H = 900;
export const UPPER_FLOOR_H = 260;
export const MAIN_FLOOR_Y = 268; // after 8px divider (UPPER_FLOOR_H + 8)
export const COMMON_AREA_Y = 720; // shared strip at bottom of main floor (180px tall with 900px canvas)

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

// ── Pod X extents (scaled to 1280px canvas) ────────────────────────────────
export const CREATIVE_POD_X = 12;
export const CREATIVE_POD_W = 240;
export const AI_CORE_POD_X  = 268;
export const AI_CORE_POD_W  = 600; // right edge = 868, centred around COL_C=640
export const SALES_POD_X    = 1028;
export const SALES_POD_W    = 240;
export const COL_STAIR      = 960; // staircase column — gap between AI Core (868) and Sales (1028)

// ── AI Core desk zone: Corey/Lev centered on COL_C=640 ────────────────────
const AI_ZONE_X = 480;  // zone left; Corey desk x = 480+(320-140)/2 = 570

// Sub-agents spread to give 80px desk-to-desk gaps (sprite=48px → 32px clearance each side)
const AI_SUB_1 = 310;  // center_x = 340 (COL_L)
const AI_SUB_2 = 610;  // center_x = 640 (COL_C)
const AI_SUB_3 = 590;  // center_x = 620 (COL_R)

export const DESKS: DeskConfig[] = [
  // ── AI Core Pod ──────────────────────────────────────────────────────────
  {
    key: 'corey', label: 'Corey', tier: 'command',
    x: AI_ZONE_X + (320 - 140) / 2, // 570
    y: ROW1_Y, monitors: 3,
  },
  {
    key: 'lev', label: 'Lev', tier: 'chief_of_staff',
    x: AI_ZONE_X + (320 - 120) / 2, // 580
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
    x: AI_SUB_1, y: ROW4_Y, monitors: 2,
  },
  {
    key: 'pixel', label: 'Pixel', tier: 'sub_agent',
    x: AI_SUB_2, y: ROW4_Y, monitors: 2,
  },
  {
    key: 'future_ai', label: '?', tier: 'sub_agent',
    x: AI_SUB_3, y: ROW4_Y, monitors: 2, isPlaceholder: true,
  },

  // ── Creative Studio Pod ───────────────────────────────────────────────────
  {
    key: 'gavin', label: 'Gavin', tier: 'director',
    x: CREATIVE_POD_X + Math.floor((CREATIVE_POD_W - 90) / 2), // 87
    y: ROW1_Y, monitors: 2,
  },
  {
    key: 'future_creative', label: '?', tier: 'sub_agent',
    x: CREATIVE_POD_X + Math.floor((CREATIVE_POD_W - 60) / 2), // 102
    y: WING_FUTURE_Y, monitors: 2, isPlaceholder: true,
  },

  // ── Sales Pod ────────────────────────────────────────────────────────────
  {
    key: 'tristan', label: 'Tristan', tier: 'director',
    x: SALES_POD_X + Math.floor((SALES_POD_W - 90) / 2), // 1103
    y: ROW1_Y, monitors: 2,
  },
  {
    key: 'future_sales', label: '?', tier: 'sub_agent',
    x: SALES_POD_X + Math.floor((SALES_POD_W - 60) / 2), // 1118
    y: WING_FUTURE_Y, monitors: 2, isPlaceholder: true,
  },
];

// Meeting room seat coordinates — updated to match enlarged table (380px wide, center x=640)
export const MEETING_SEATS = [
  { x: 514, y: 138 }, { x: 596, y: 138 }, { x: 678, y: 138 }, { x: 760, y: 138 },
  { x: 514, y: 218 }, { x: 596, y: 218 }, { x: 678, y: 218 }, { x: 760, y: 218 },
];
