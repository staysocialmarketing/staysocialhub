import { findWaypointPath, WAYPOINTS } from '../constants/waypoints';
import type { WaypointKey } from '../constants/waypoints';

export type WalkDirection = 'left' | 'right' | 'up' | 'down' | 'idle';

export interface PathSegment {
  fromKey: WaypointKey;
  toKey: WaypointKey;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  direction: WalkDirection;
  isStairTransition: boolean;
}

// Resolve the dominant walk direction between two points
function segmentDirection(dx: number, dy: number): WalkDirection {
  if (dx === 0 && dy === 0) return 'idle';
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

// Returns ordered path segments with pixel positions + directions.
// The stair_bottom ↔ meeting_entry edge is flagged as isStairTransition.
// `blocked` is forwarded to BFS for dynamic character avoidance.
export function buildPath(
  start: WaypointKey,
  end: WaypointKey,
  blocked?: ReadonlySet<WaypointKey>,
): PathSegment[] {
  const keys = findWaypointPath(start, end, blocked);
  if (keys.length < 2) return [];

  const segments: PathSegment[] = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const from = WAYPOINTS[keys[i]];
    const to   = WAYPOINTS[keys[i + 1]];
    const dx   = to.x - from.x;
    const dy   = to.y - from.y;

    const isStair =
      (keys[i] === 'stair_bottom' && keys[i + 1] === 'meeting_entry') ||
      (keys[i] === 'meeting_entry' && keys[i + 1] === 'stair_bottom');

    segments.push({
      fromKey:          keys[i],
      toKey:            keys[i + 1],
      fromX:            from.x,
      fromY:            from.y,
      toX:              to.x,
      toY:              to.y,
      direction:        segmentDirection(dx, dy),
      isStairTransition: isStair,
    });
  }
  return segments;
}
