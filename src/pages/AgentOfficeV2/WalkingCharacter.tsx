/**
 * WalkingCharacter — renders a single agent's sprite at their animated position.
 *
 * When walking, swaps walk-cycle frames based on direction + frameIndex.
 * When idle, falls back to the agent's seated idle sprite.
 * Right walk = left frames + CSS scaleX(-1).
 */
import type { WalkAnimationState } from './hooks/useWalkAnimation';
import type { WalkDirection } from './hooks/usePathfinding';

// Sprite frame arrays per agent per direction
// Each entry: [down frames, left frames, up frames]
// Right = left + scaleX(-1)
type FrameSet = {
  down: Array<() => JSX.Element>;
  left: Array<() => JSX.Element>;
  up:   Array<() => JSX.Element>;
  idle: () => JSX.Element;
};

// Sprite dims (all characters share the same 48×60 spec)
const SPRITE_W = 48;
const SPRITE_H = 60;

interface WalkingCharacterProps {
  agentKey:  string;
  anim:      WalkAnimationState;
  frameSet:  FrameSet;
  zIndex?:   number;
}

function getFrame(
  frameSet: FrameSet,
  direction: WalkDirection,
  frameIndex: number,
  isWalking: boolean,
): { Component: () => JSX.Element; flipX: boolean } {
  if (!isWalking) return { Component: frameSet.idle, flipX: false };

  const idx = frameIndex % 4;
  switch (direction) {
    case 'left':  return { Component: frameSet.left[idx], flipX: false };
    case 'right': return { Component: frameSet.left[idx], flipX: true };
    case 'up':    return { Component: frameSet.up[idx],   flipX: false };
    case 'down':
    default:      return { Component: frameSet.down[idx], flipX: false };
  }
}

export function WalkingCharacter({ anim, frameSet, zIndex = 10 }: WalkingCharacterProps) {
  const isWalking = anim.walkState !== 'idle';
  const { Component, flipX } = getFrame(frameSet, anim.direction, anim.frameIndex, isWalking);

  // Centre the sprite on the waypoint coordinate
  const left = Math.round(anim.x - SPRITE_W / 2);
  const top  = Math.round(anim.y - SPRITE_H);   // anchor at feet

  return (
    <div
      style={{
        position:  'absolute',
        left,
        top,
        width:     SPRITE_W,
        height:    SPRITE_H,
        opacity:   anim.opacity,
        transform: flipX ? 'scaleX(-1)' : undefined,
        zIndex,
        imageRendering: 'pixelated',
        pointerEvents:  'none',
      }}
    >
      <Component />
    </div>
  );
}

export type { FrameSet };
