import { MEETING_SEATS } from './desks';

// ---------------------------------------------------------------------------
// Column x-positions — vertical corridors agents walk along
// ---------------------------------------------------------------------------
export const COL_W = 106;   // Gavin / creative-pod centre
export const COL_L = 380;   // Scout column
export const COL_C = 480;   // Staircase / Corey / Lev / Quill
export const COL_R = 580;   // Ember column
export const COL_E = 854;   // Tristan / sales-pod centre

// Horizontal aisle y-position — clear corridor between ROW1 bottom (~351) and ROW2 top (425)
export const AISLE_N_Y = 395;

// ---------------------------------------------------------------------------
// Waypoint keys
// ---------------------------------------------------------------------------
export type WaypointKey =
  | 'desk_corey' | 'desk_lev' | 'desk_scout' | 'desk_quill' | 'desk_ember'
  | 'desk_gavin' | 'desk_tristan'
  | 'stair_bottom'
  | 'an_w' | 'an_l' | 'an_c' | 'an_r' | 'an_e'   // north-aisle intersections
  | 'meeting_entry' | 'table_corridor'
  | 'seat_0' | 'seat_1' | 'seat_2' | 'seat_3'
  | 'seat_4' | 'seat_5' | 'seat_6' | 'seat_7';

export type WaypointFloor = 'main' | 'upper';

export interface Waypoint {
  key: WaypointKey;
  label: string;
  x: number;
  y: number;
  floor: WaypointFloor;
}

// ---------------------------------------------------------------------------
// Waypoint coordinates
// Desk positions: y = desk_top + desk_h + 9 (stand point just below the desk)
//   ROW1 command (h=46):        y = 305 + 46 + 9 = 360
//   ROW1 chief_of_staff (h=40): y = 425 + 40 + 9 = 474  (Lev)
//   ROW1 director (h=36):       y = 305 + 36 + 9 = 350  (Gavin, Tristan)
//   ROW3 sub_agent (h=28):      y = 530 + 28 + 9 = 567  (Scout, Quill, Ember)
// ---------------------------------------------------------------------------
export const WAYPOINTS: Record<WaypointKey, Waypoint> = {
  // ── Desk stand positions ─────────────────────────────────────────────────
  desk_corey:   { key: 'desk_corey',   label: 'Corey',   x: COL_C, y: 360, floor: 'main' },
  desk_lev:     { key: 'desk_lev',     label: 'Lev',     x: COL_C, y: 474, floor: 'main' },
  desk_scout:   { key: 'desk_scout',   label: 'Scout',   x: COL_L, y: 567, floor: 'main' },
  desk_quill:   { key: 'desk_quill',   label: 'Quill',   x: COL_C, y: 567, floor: 'main' },
  desk_ember:   { key: 'desk_ember',   label: 'Ember',   x: COL_R, y: 567, floor: 'main' },
  desk_gavin:   { key: 'desk_gavin',   label: 'Gavin',   x: COL_W, y: 350, floor: 'main' },
  desk_tristan: { key: 'desk_tristan', label: 'Tristan', x: COL_E, y: 350, floor: 'main' },

  // ── Staircase ────────────────────────────────────────────────────────────
  // stair_bottom: main-floor side. The stair_bottom ↔ meeting_entry edge is the
  // cross-floor transition that triggers the climb/descend animation.
  stair_bottom: { key: 'stair_bottom', label: 'Stair bottom', x: COL_C, y: 284, floor: 'main' },

  // ── North aisle intersections (y = AISLE_N_Y = 395) ─────────────────────
  an_w: { key: 'an_w', label: 'N-aisle W', x: COL_W, y: AISLE_N_Y, floor: 'main' },
  an_l: { key: 'an_l', label: 'N-aisle L', x: COL_L, y: AISLE_N_Y, floor: 'main' },
  an_c: { key: 'an_c', label: 'N-aisle C', x: COL_C, y: AISLE_N_Y, floor: 'main' },
  an_r: { key: 'an_r', label: 'N-aisle R', x: COL_R, y: AISLE_N_Y, floor: 'main' },
  an_e: { key: 'an_e', label: 'N-aisle E', x: COL_E, y: AISLE_N_Y, floor: 'main' },

  // ── Meeting room ─────────────────────────────────────────────────────────
  // meeting_entry: staircase landing inside the upper floor (near door, y=228)
  // table_corridor: routing node above the bottom row of seats → top row of seats
  meeting_entry:  { key: 'meeting_entry',  label: 'Meeting entry',  x: COL_C, y: 228, floor: 'upper' },
  table_corridor: { key: 'table_corridor', label: 'Table corridor', x: COL_C, y: 138, floor: 'upper' },

  // Bottom-row seats (y=218) — reachable directly from meeting_entry
  seat_4: { key: 'seat_4', label: 'Seat 4', x: MEETING_SEATS[4].x, y: MEETING_SEATS[4].y, floor: 'upper' },
  seat_5: { key: 'seat_5', label: 'Seat 5', x: MEETING_SEATS[5].x, y: MEETING_SEATS[5].y, floor: 'upper' },
  seat_6: { key: 'seat_6', label: 'Seat 6', x: MEETING_SEATS[6].x, y: MEETING_SEATS[6].y, floor: 'upper' },
  seat_7: { key: 'seat_7', label: 'Seat 7', x: MEETING_SEATS[7].x, y: MEETING_SEATS[7].y, floor: 'upper' },

  // Top-row seats (y=138) — reachable via table_corridor
  seat_0: { key: 'seat_0', label: 'Seat 0', x: MEETING_SEATS[0].x, y: MEETING_SEATS[0].y, floor: 'upper' },
  seat_1: { key: 'seat_1', label: 'Seat 1', x: MEETING_SEATS[1].x, y: MEETING_SEATS[1].y, floor: 'upper' },
  seat_2: { key: 'seat_2', label: 'Seat 2', x: MEETING_SEATS[2].x, y: MEETING_SEATS[2].y, floor: 'upper' },
  seat_3: { key: 'seat_3', label: 'Seat 3', x: MEETING_SEATS[3].x, y: MEETING_SEATS[3].y, floor: 'upper' },
};

// ---------------------------------------------------------------------------
// Adjacency list — undirected edges
//
// Routing philosophy:
//   - Agents on the center column (Corey, Lev, Quill) walk north on x=480.
//   - Wing directors (Gavin, Tristan) and sub-agents (Scout, Ember) first walk
//     north to the shared aisle, then east/west to the staircase column.
//   - Sub-agents on the same row (Scout/Quill/Ember, y=567) can walk directly
//     east/west to each other before joining the aisle.
//   - stair_bottom ↔ meeting_entry is the CROSS-FLOOR edge; the walk engine
//     plays the climb/descend animation for this segment only.
// ---------------------------------------------------------------------------
export const WAYPOINT_GRAPH: Record<WaypointKey, WaypointKey[]> = {
  // Desks
  desk_corey:   ['an_c', 'stair_bottom'],             // stair is north, aisle is south
  desk_lev:     ['an_c'],                              // walk north to aisle
  desk_scout:   ['an_l', 'desk_quill'],                // north to aisle OR east to Quill
  desk_quill:   ['an_c', 'desk_scout', 'desk_ember'],  // north to aisle OR sideways
  desk_ember:   ['an_r', 'desk_quill'],                // north to aisle OR west to Quill
  desk_gavin:   ['an_w'],                              // south to aisle
  desk_tristan: ['an_e'],                              // south to aisle

  // Staircase — meeting_entry edge triggers cross-floor animation
  stair_bottom: ['an_c', 'desk_corey', 'meeting_entry'],

  // North aisle (horizontal connections + drops down to desks/staircase)
  an_w: ['desk_gavin', 'an_l'],
  an_l: ['an_w', 'an_c', 'desk_scout'],
  an_c: ['an_l', 'an_r', 'stair_bottom', 'desk_corey', 'desk_lev', 'desk_quill'],
  an_r: ['an_c', 'an_e', 'desk_ember'],
  an_e: ['an_r', 'desk_tristan'],

  // Meeting room
  meeting_entry:  ['stair_bottom', 'table_corridor', 'seat_4', 'seat_5', 'seat_6', 'seat_7'],
  table_corridor: ['meeting_entry', 'seat_0', 'seat_1', 'seat_2', 'seat_3'],

  // Seats connect back to their routing parent only
  seat_0: ['table_corridor'],
  seat_1: ['table_corridor'],
  seat_2: ['table_corridor'],
  seat_3: ['table_corridor'],
  seat_4: ['meeting_entry'],
  seat_5: ['meeting_entry'],
  seat_6: ['meeting_entry'],
  seat_7: ['meeting_entry'],
};

// The stair_bottom ↔ meeting_entry edge is the only cross-floor transition.
export const STAIR_EDGE: [WaypointKey, WaypointKey] = ['stair_bottom', 'meeting_entry'];

// Helper — BFS shortest path between two waypoints.
// Returns the full sequence including start and end, or [start] if unreachable.
export function findWaypointPath(start: WaypointKey, end: WaypointKey): WaypointKey[] {
  if (start === end) return [start];

  const visited = new Set<WaypointKey>([start]);
  const queue: WaypointKey[][] = [[start]];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    for (const neighbour of WAYPOINT_GRAPH[current]) {
      if (neighbour === end) return [...path, neighbour];
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.push([...path, neighbour]);
      }
    }
  }

  return [start]; // no path found — stay put
}

// Map agent key → home desk waypoint
export const AGENT_HOME_WAYPOINT: Record<string, WaypointKey> = {
  corey:   'desk_corey',
  lev:     'desk_lev',
  scout:   'desk_scout',
  quill:   'desk_quill',
  ember:   'desk_ember',
  gavin:   'desk_gavin',
  tristan: 'desk_tristan',
};
