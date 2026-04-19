/**
 * ScoutWalkTest — dev-only walk proof-of-concept.
 * Active when URL contains ?walk_test=1.
 * Scout loops: desk → north-aisle centre → stair_bottom → back to desk.
 */
import { useEffect, useRef } from 'react';
import { ScoutSprite } from './sprites/ScoutSprite';
import { ScoutWalkDown, ScoutWalkLeft, ScoutWalkUp } from './sprites/ScoutWalkFrames';
import { WalkingCharacter } from './WalkingCharacter';
import { useWalkAnimation } from './hooks/useWalkAnimation';
import type { FrameSet } from './WalkingCharacter';

const scoutFrameSet: FrameSet = {
  down: ScoutWalkDown,
  left: ScoutWalkLeft,
  up:   ScoutWalkUp,
  idle: ScoutSprite,
};

const ROUTE: ['desk_scout', 'an_c', 'stair_bottom', 'an_c', 'desk_scout'] = [
  'desk_scout', 'an_c', 'stair_bottom', 'an_c', 'desk_scout',
];

export function ScoutWalkTest() {
  const { anim, walkTo } = useWalkAnimation('desk_scout');
  const routeIdxRef = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    // Start loop after brief delay so the page paints first
    const timer = setTimeout(step, 800);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function step() {
    routeIdxRef.current = (routeIdxRef.current + 1) % ROUTE.length;
    const next = ROUTE[routeIdxRef.current];
    walkTo(next, () => setTimeout(step, 600));
  }

  return (
    <WalkingCharacter
      agentKey="scout"
      anim={anim}
      frameSet={scoutFrameSet}
      zIndex={20}
    />
  );
}
