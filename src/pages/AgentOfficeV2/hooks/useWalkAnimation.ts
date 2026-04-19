import { useRef, useState, useEffect, useCallback } from 'react';
import { buildPath } from './usePathfinding';
import { WAYPOINTS } from '../constants/waypoints';
import type { WaypointKey } from '../constants/waypoints';
import type { WalkDirection } from './usePathfinding';

const WALK_SPEED        = 200;   // px / second — ~4 s to cross the full floor
const FRAME_INTERVAL_MS = 125;   // 8 fps walk cycle
const STAIR_DURATION_MS = 700;   // total fade-out + fade-in for stair climb

export type WalkState = 'idle' | 'walking' | 'stair_up' | 'stair_down';

export interface WalkAnimationState {
  x:          number;
  y:          number;
  direction:  WalkDirection;
  frameIndex: number;   // 0-3, which walk frame is showing
  walkState:  WalkState;
  opacity:    number;   // 0-1, dips during stair transition
}

type Cb = () => void;

export function useWalkAnimation(homeKey: WaypointKey) {
  const home = WAYPOINTS[homeKey];

  const [anim, setAnim] = useState<WalkAnimationState>({
    x:          home.x,
    y:          home.y,
    direction:  'down',
    frameIndex: 0,
    walkState:  'idle',
    opacity:    1,
  });

  // All mutable walk state lives in refs — never inside setAnim updaters
  const rafRef        = useRef<number | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameIdxRef   = useRef(0);
  const currentKeyRef = useRef<WaypointKey>(homeKey);
  const posRef        = useRef({ x: home.x, y: home.y });

  const cancel = useCallback(() => {
    if (rafRef.current        !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (frameTimerRef.current !== null) { clearInterval(frameTimerRef.current); frameTimerRef.current = null; }
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  const startFrameCycle = useCallback(() => {
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    frameTimerRef.current = setInterval(() => {
      frameIdxRef.current = (frameIdxRef.current + 1) % 4;
      setAnim(prev => ({ ...prev, frameIndex: frameIdxRef.current }));
    }, FRAME_INTERVAL_MS);
  }, []);

  const stopFrameCycle = useCallback(() => {
    if (frameTimerRef.current) { clearInterval(frameTimerRef.current); frameTimerRef.current = null; }
    frameIdxRef.current = 0;
  }, []);

  // ── walkTo ──────────────────────────────────────────────────────────────────
  const walkTo = useCallback((targetKey: WaypointKey, onArrival?: Cb) => {
    cancel();

    const segments = buildPath(currentKeyRef.current, targetKey);
    if (segments.length === 0) { onArrival?.(); return; }

    startFrameCycle();

    // Advance through segments recursively (each segment starts its own RAF or stair anim)
    function advanceToSegment(idx: number) {
      if (idx >= segments.length) {
        // All done — settle into idle
        stopFrameCycle();
        setAnim(prev => ({ ...prev, direction: 'down', walkState: 'idle', frameIndex: 0, opacity: 1 }));
        onArrival?.();
        return;
      }

      const seg = segments[idx];
      setAnim(prev => ({ ...prev, direction: seg.direction, walkState: 'walking', opacity: 1 }));

      if (seg.isStairTransition) {
        stopFrameCycle();
        const kind: WalkState = seg.fromKey === 'stair_bottom' ? 'stair_up' : 'stair_down';
        doStairTransition(kind, seg.toX, seg.toY, () => {
          currentKeyRef.current = seg.toKey;
          posRef.current        = { x: seg.toX, y: seg.toY };
          startFrameCycle();
          advanceToSegment(idx + 1);
        });
        return;
      }

      // Normal walk segment — RAF-driven position interpolation
      let prevT = 0;

      function tick(timestamp: number) {
        if (prevT === 0) prevT = timestamp;
        const dt        = Math.min((timestamp - prevT) / 1000, 0.05); // cap at 50 ms
        prevT           = timestamp;

        const { x, y } = posRef.current;
        const dx        = seg.toX - x;
        const dy        = seg.toY - y;
        const remaining = Math.sqrt(dx * dx + dy * dy);
        const step      = WALK_SPEED * dt;

        if (remaining <= step + 0.5) {
          // Snapped to waypoint
          posRef.current        = { x: seg.toX, y: seg.toY };
          currentKeyRef.current = seg.toKey;
          setAnim(prev => ({ ...prev, x: seg.toX, y: seg.toY, direction: seg.direction }));
          advanceToSegment(idx + 1);
        } else {
          const ratio   = step / remaining;
          const nx      = x + dx * ratio;
          const ny      = y + dy * ratio;
          posRef.current = { x: nx, y: ny };
          setAnim(prev => ({ ...prev, x: nx, y: ny, direction: seg.direction, walkState: 'walking' }));
          rafRef.current = requestAnimationFrame(tick);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    advanceToSegment(0);
  }, [cancel, startFrameCycle, stopFrameCycle]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stair transition — opacity fade-out, position teleport, fade-in ─────────
  function doStairTransition(kind: WalkState, toX: number, toY: number, cb: Cb) {
    const start = performance.now();
    const half  = STAIR_DURATION_MS / 2;

    function tick(now: number) {
      const elapsed = now - start;
      if (elapsed < half) {
        const opacity = 1 - elapsed / half;
        setAnim(prev => ({ ...prev, walkState: kind, opacity, frameIndex: 0 }));
        rafRef.current = requestAnimationFrame(tick);
      } else if (elapsed < STAIR_DURATION_MS) {
        const opacity = (elapsed - half) / half;
        setAnim(prev => ({ ...prev, x: toX, y: toY, walkState: kind, opacity }));
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setAnim(prev => ({ ...prev, x: toX, y: toY, walkState: kind, opacity: 1 }));
        cb();
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  // ── Teleport (no animation) ──────────────────────────────────────────────────
  const teleport = useCallback((key: WaypointKey) => {
    cancel();
    const wp = WAYPOINTS[key];
    currentKeyRef.current = key;
    posRef.current        = { x: wp.x, y: wp.y };
    setAnim({ x: wp.x, y: wp.y, direction: 'down', frameIndex: 0, walkState: 'idle', opacity: 1 });
  }, [cancel]);

  return { anim, walkTo, teleport, currentKey: currentKeyRef };
}
