/**
 * CharacterLayer — single source of truth for all character sprite rendering.
 *
 * Walkable agents (7) each own a useWalkAnimation hook. When idle they render at
 * their desk seated position; when walking they follow the animated position.
 *
 * Static placeholder agents (forge, pixel) are rendered as ghost sprites at
 * fixed desk positions.
 *
 * Walk test (?walk_test in URL): Scout loops desk→aisle→stair→aisle→desk.
 */
import { useEffect, useRef } from 'react';
import { DESKS, TIER_DIMS } from './constants/desks';
import { SPRITE_MAP, SPRITE_DIMS } from './sprites';
import { AGENT_HOME_WAYPOINT } from './constants/waypoints';
import { useWalkAnimation } from './hooks/useWalkAnimation';
import { WalkingCharacter } from './WalkingCharacter';
import { CoreySprite }   from './sprites/CoreySprite';
import { LevSprite }     from './sprites/LevSprite';
import { ScoutSprite }   from './sprites/ScoutSprite';
import { QuillSprite }   from './sprites/QuillSprite';
import { EmberSprite }   from './sprites/EmberSprite';
import { GavinSprite }   from './sprites/GavinSprite';
import { TristanSprite } from './sprites/TristanSprite';
import { ScoutWalkDown, ScoutWalkLeft, ScoutWalkUp } from './sprites/ScoutWalkFrames';
import type { FrameSet } from './WalkingCharacter';
import type { WaypointKey } from './constants/waypoints';

const WALK_TEST = new URLSearchParams(window.location.search).has('walk_test');

// Frame set for agents without dedicated walk frames yet — idle sprite fills all slots
function idleFrameSet(Sprite: () => JSX.Element): FrameSet {
  const frames = [Sprite, Sprite, Sprite, Sprite] as Array<() => JSX.Element>;
  return { down: frames, left: frames, up: frames, idle: Sprite };
}

const FRAME_SETS: Record<string, FrameSet> = {
  corey:   idleFrameSet(CoreySprite),
  lev:     idleFrameSet(LevSprite),
  scout:   { down: ScoutWalkDown, left: ScoutWalkLeft, up: ScoutWalkUp, idle: ScoutSprite },
  quill:   idleFrameSet(QuillSprite),
  ember:   idleFrameSet(EmberSprite),
  gavin:   idleFrameSet(GavinSprite),
  tristan: idleFrameSet(TristanSprite),
};

// Scout walk-test route — full round-trip including stair transition to upper floor.
// BFS fills segments between each checkpoint; stair_bottom↔meeting_entry triggers the climb animation.
const SCOUT_ROUTE: WaypointKey[] = [
  'desk_scout',    // (340, 583) start
  'an_l',          // (340, 415) north to aisle
  'an_c',          // (480, 415) east along aisle
  'an_stair',      // (700, 415) east to staircase aisle node
  'stair_bottom',  // (700, 284) north up stair
  'meeting_entry', // (700, 228) ← ASCENDING STAIR TRANSITION triggers here
  'mr_corridor',   // (480, 228) west to meeting room hub
  'table_corridor',// (480, 138) north
  'seat_0',        // (376, 138) west — seated at meeting table
  'table_corridor',// return north corridor
  'mr_corridor',   // south to hub
  'meeting_entry', // east back to stair landing
  'stair_bottom',  // ← DESCENDING STAIR TRANSITION triggers here
  'an_stair',      // (700, 415) south back to aisle
  'an_c',          // (480, 415) west
  'an_l',          // (340, 415) west
  'desk_scout',    // (340, 583) south home
];

// Placeholder (ghost) agent keys that are static — no walk hook needed
const GHOST_KEYS = ['forge', 'pixel'];

// Lookup desk config by key
const DESK_MAP = Object.fromEntries(DESKS.map(d => [d.key, d]));

export function CharacterLayer() {
  // ── Walk animation hooks — one per walkable agent (hooks must be unconditional) ──
  const coreyWalk   = useWalkAnimation('desk_corey');
  const levWalk     = useWalkAnimation('desk_lev');
  const scoutWalk   = useWalkAnimation('desk_scout');
  const quillWalk   = useWalkAnimation('desk_quill');
  const emberWalk   = useWalkAnimation('desk_ember');
  const gavinWalk   = useWalkAnimation('desk_gavin');
  const tristanWalk = useWalkAnimation('desk_tristan');

  const walkers = [
    { key: 'corey',   walk: coreyWalk   },
    { key: 'lev',     walk: levWalk     },
    { key: 'scout',   walk: scoutWalk   },
    { key: 'quill',   walk: quillWalk   },
    { key: 'ember',   walk: emberWalk   },
    { key: 'gavin',   walk: gavinWalk   },
    { key: 'tristan', walk: tristanWalk },
  ];

  // ── Walk test — Scout loops when ?walk_test is present ────────────────────
  const routeIdxRef = useRef(0);
  const mountedRef  = useRef(false);

  useEffect(() => {
    if (!WALK_TEST) return;
    if (mountedRef.current) return;
    mountedRef.current = true;
    const timer = setTimeout(step, 800);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function step() {
    routeIdxRef.current = (routeIdxRef.current + 1) % SCOUT_ROUTE.length;
    scoutWalk.walkTo(SCOUT_ROUTE[routeIdxRef.current], () => setTimeout(step, 800));
  }

  return (
    <>
      {/* ── Walkable agents ─────────────────────────────────────────────── */}
      {walkers.map(({ key, walk }) => (
        <WalkingCharacter
          key={key}
          agentKey={key}
          anim={walk.anim}
          frameSet={FRAME_SETS[key]}
          zIndex={20}
        />
      ))}

      {/* ── Static ghost sprites (placeholders) ─────────────────────────── */}
      {GHOST_KEYS.map(key => {
        const desk = DESK_MAP[key];
        if (!desk) return null;
        const SpriteComp = SPRITE_MAP[key];
        if (!SpriteComp) return null;
        const { w: dw } = TIER_DIMS[desk.tier];
        const dims = SPRITE_DIMS[key] ?? SPRITE_DIMS['_default'];
        return (
          <div
            key={key}
            style={{
              position: 'absolute',
              left: desk.x + Math.floor((dw - dims.w) / 2),
              top:  desk.y - dims.visibleH,
              width: dims.w,
              height: dims.h,
              opacity: 0.55,
              filter: 'grayscale(0.5)',
              imageRendering: 'pixelated',
              pointerEvents: 'none',
            }}
          >
            <SpriteComp />
          </div>
        );
      })}
    </>
  );
}

// Re-export home waypoint map for convenience
export { AGENT_HOME_WAYPOINT };
