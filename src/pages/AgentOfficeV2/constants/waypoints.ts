import { MEETING_SEATS } from './desks';

// ---------------------------------------------------------------------------
// Column x-positions — vertical corridors agents walk along
// ---------------------------------------------------------------------------
export const COL_W     = 106;   // Gavin / creative-pod centre
export const COL_L     = 340;   // Scout column
export const COL_C     = 480;   // Corey / Lev / Quill
export const COL_R     = 620;   // Ember column
export const COL_STAIR = 700;   // Staircase column (gap between AI Core pod and Sales pod)
export const COL_E     = 854;   // Tristan / sales-pod centre

// Horizontal aisle y-position — clear corridor between ROW1 bottom (~351) and ROW2 top (460)
export const AISLE_N_Y = 415;

// ---------------------------------------------------------------------------
// Waypoint keys
// ---------------------------------------------------------------------------
export type WaypointKey =
  | 'desk_corey' | 'desk_lev' | 'desk_scout' | 'desk_quill' | 'desk_ember'
  | 'desk_gavin' | 'desk_tristan'
  | 'stair_bottom'
  | 'an_w' | 'an_l' | 'an_c' | 'an_r' | 'an_stair' | 'an_e'   // north-aisle intersections
  | 'meeting_entry' | 'mr_corridor' | 'table_corridor' | 'meeting_presenter'
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
// Desk seated y = desk.y + 18 (= desk.y - visibleH + SPRITE_H = desk.y - 42 + 60)
//   ROW1 (y=305): seated y = 323  (Corey, Gavin, Tristan)
//   ROW2 (y=460): seated y = 478  (Lev)
//   ROW3 (y=565): seated y = 583  (Scout, Quill, Ember)
// ---------------------------------------------------------------------------
export const WAYPOINTS: Record<WaypointKey, Waypoint> = {
  // ── Desk waypoints — y = desk.y + 18 = seated foot-anchor position ─────────
  desk_corey:   { key: 'desk_corey',   label: 'Corey',   x: COL_C,     y: 323, floor: 'main' },
  desk_lev:     { key: 'desk_lev',     label: 'Lev',     x: COL_C,     y: 478, floor: 'main' },
  desk_scout:   { key: 'desk_scout',   label: 'Scout',   x: COL_L,     y: 583, floor: 'main' },
  desk_quill:   { key: 'desk_quill',   label: 'Quill',   x: COL_C,     y: 583, floor: 'main' },
  desk_ember:   { key: 'desk_ember',   label: 'Ember',   x: COL_R,     y: 583, floor: 'main' },
  desk_gavin:   { key: 'desk_gavin',   label: 'Gavin',   x: COL_W,     y: 323, floor: 'main' },
  desk_tristan: { key: 'desk_tristan', label: 'Tristan', x: COL_E,     y: 323, floor: 'main' },

  // ── Staircase ────────────────────────────────────────────────────────────
  // Moved to COL_STAIR=700, clear of all desk columns.
  // stair_bottom ↔ meeting_entry is the only cross-floor transition edge.
  stair_bottom: { key: 'stair_bottom', label: 'Stair bottom', x: COL_STAIR, y: 284, floor: 'main' },

  // ── North aisle intersections (y = AISLE_N_Y) ────────────────────────────
  an_w:     { key: 'an_w',     label: 'N-aisle W',     x: COL_W,     y: AISLE_N_Y, floor: 'main' },
  an_l:     { key: 'an_l',     label: 'N-aisle L',     x: COL_L,     y: AISLE_N_Y, floor: 'main' },
  an_c:     { key: 'an_c',     label: 'N-aisle C',     x: COL_C,     y: AISLE_N_Y, floor: 'main' },
  an_r:     { key: 'an_r',     label: 'N-aisle R',     x: COL_R,     y: AISLE_N_Y, floor: 'main' },
  an_stair: { key: 'an_stair', label: 'N-aisle Stair', x: COL_STAIR, y: AISLE_N_Y, floor: 'main' },
  an_e:     { key: 'an_e',     label: 'N-aisle E',     x: COL_E,     y: AISLE_N_Y, floor: 'main' },

  // ── Meeting room ─────────────────────────────────────────────────────────
  // meeting_entry: staircase landing on upper floor (right side, aligned with COL_STAIR)
  // mr_corridor:   routing hub at table-level x — bridges entry to seats and table_corridor
  // table_corridor: routing node between top-row seats
  // meeting_presenter: presenter position in front of whiteboard
  meeting_entry:      { key: 'meeting_entry',      label: 'Meeting entry',      x: COL_STAIR, y: 228, floor: 'upper' },
  mr_corridor:        { key: 'mr_corridor',        label: 'MR corridor',        x: COL_C,     y: 228, floor: 'upper' },
  table_corridor:     { key: 'table_corridor',     label: 'Table corridor',     x: COL_C,     y: 138, floor: 'upper' },
  meeting_presenter:  { key: 'meeting_presenter',  label: 'Presenter',          x: 211,       y: 135, floor: 'upper' },

  // Bottom-row seats (y=218) — reachable via mr_corridor
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
//   - Center-column agents (Corey, Lev, Quill) walk north/south on COL_C=480.
//   - Wing directors (Gavin, Tristan) walk to the aisle, then east/west.
//   - Sub-agents (Scout, Quill, Ember) can walk sideways before joining aisle.
//   - Staircase is at COL_STAIR=700 (between AI Core pod and Sales pod).
//     Center-column agents reach it via an_c → an_r → an_stair → stair_bottom.
//   - stair_bottom ↔ meeting_entry is the CROSS-FLOOR edge; walk engine plays
//     climb/descend animation for this segment only.
//   - meeting_entry is at (COL_STAIR, 228); mr_corridor at (COL_C, 228) is the
//     routing hub for seats and table_corridor.
// ---------------------------------------------------------------------------
export const WAYPOINT_GRAPH: Record<WaypointKey, WaypointKey[]> = {
  // Desks
  desk_corey:   ['an_c'],
  desk_lev:     ['an_c'],
  desk_scout:   ['an_l', 'desk_quill'],
  desk_quill:   ['an_c', 'desk_scout', 'desk_ember'],
  desk_ember:   ['an_r', 'desk_quill'],
  desk_gavin:   ['an_w'],
  desk_tristan: ['an_e'],

  // Staircase — meeting_entry edge triggers cross-floor animation
  stair_bottom: ['an_stair', 'meeting_entry'],

  // North aisle
  an_w:     ['desk_gavin', 'an_l'],
  an_l:     ['an_w', 'an_c', 'desk_scout'],
  an_c:     ['an_l', 'an_r', 'desk_corey', 'desk_lev', 'desk_quill'],
  an_r:     ['an_c', 'an_stair', 'desk_ember'],
  an_stair: ['an_r', 'an_e', 'stair_bottom'],
  an_e:     ['an_stair', 'desk_tristan'],

  // Meeting room
  meeting_entry:     ['stair_bottom', 'mr_corridor'],
  mr_corridor:       ['meeting_entry', 'table_corridor', 'seat_4', 'seat_5', 'seat_6', 'seat_7'],
  table_corridor:    ['mr_corridor', 'meeting_presenter', 'seat_0', 'seat_1', 'seat_2', 'seat_3'],
  meeting_presenter: ['table_corridor'],

  // Seats connect back to their routing parent only
  seat_0: ['table_corridor'],
  seat_1: ['table_corridor'],
  seat_2: ['table_corridor'],
  seat_3: ['table_corridor'],
  seat_4: ['mr_corridor'],
  seat_5: ['mr_corridor'],
  seat_6: ['mr_corridor'],
  seat_7: ['mr_corridor'],
};

// The stair_bottom ↔ meeting_entry edge is the only cross-floor transition.
export const STAIR_EDGE: [WaypointKey, WaypointKey] = ['stair_bottom', 'meeting_entry'];

// Helper — BFS shortest path between two waypoints.
// Returns the full sequence including start and end, or [start] if unreachable.
// `blocked` is an optional set of waypoint keys to treat as impassable (dynamic avoidance).
export function findWaypointPath(
  start: WaypointKey,
  end: WaypointKey,
  blocked?: ReadonlySet<WaypointKey>,
): WaypointKey[] {
  if (start === end) return [start];

  const visited = new Set<WaypointKey>([start]);
  const queue: WaypointKey[][] = [[start]];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    for (const neighbour of WAYPOINT_GRAPH[current]) {
      if (neighbour === end) return [...path, neighbour];
      if (!visited.has(neighbour) && !blocked?.has(neighbour)) {
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
