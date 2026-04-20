/**
 * CharacterLayer — single source of truth for all character sprite rendering.
 *
 * Walkable agents (7) each own a useWalkAnimation hook. When idle they render at
 * their desk seated position; when walking they follow the animated position.
 *
 * Static placeholder agents (forge, pixel) are rendered as ghost sprites at
 * fixed desk positions.
 *
 * Walk test (?walk_test=<char>): runs that character's round-trip to meeting room.
 * ?walk_test=all: all 7 walk simultaneously with staggered starts.
 * ?walk_test=scout: runs the original Scout full-route loop.
 */
import { useEffect, useRef } from 'react';
import { DESKS, TIER_DIMS } from './constants/desks';
import { SPRITE_MAP, SPRITE_DIMS } from './sprites';
import { AGENT_HOME_WAYPOINT } from './constants/waypoints';
import { useWalkAnimation } from './hooks/useWalkAnimation';
import { WalkingCharacter } from './WalkingCharacter';
import { StatusLabel } from './StatusLabel';
import { CoreySprite }   from './sprites/CoreySprite';
import { LevSprite }     from './sprites/LevSprite';
import { ScoutSprite }   from './sprites/ScoutSprite';
import { QuillSprite }   from './sprites/QuillSprite';
import { EmberSprite }   from './sprites/EmberSprite';
import { GavinSprite }   from './sprites/GavinSprite';
import { TristanSprite } from './sprites/TristanSprite';
import { ScoutWalkDown, ScoutWalkLeft, ScoutWalkUp } from './sprites/ScoutWalkFrames';
import { CoreyWalkDown, CoreyWalkLeft, CoreyWalkUp } from './sprites/CoreyWalkFrames';
import { LevWalkDown, LevWalkLeft, LevWalkUp }       from './sprites/LevWalkFrames';
import { QuillWalkDown, QuillWalkLeft, QuillWalkUp } from './sprites/QuillWalkFrames';
import { EmberWalkDown, EmberWalkLeft, EmberWalkUp } from './sprites/EmberWalkFrames';
import { GavinWalkDown, GavinWalkLeft, GavinWalkUp } from './sprites/GavinWalkFrames';
import { TristanWalkDown, TristanWalkLeft, TristanWalkUp } from './sprites/TristanWalkFrames';
import type { FrameSet } from './WalkingCharacter';
import type { WaypointKey } from './constants/waypoints';

const WALK_TEST_CHAR = new URLSearchParams(window.location.search).get('walk_test') ?? '';
const WALK_TEST      = WALK_TEST_CHAR !== '';

function idleFrameSet(Sprite: () => JSX.Element): FrameSet {
  const frames = [Sprite, Sprite, Sprite, Sprite] as Array<() => JSX.Element>;
  return { down: frames, left: frames, up: frames, idle: Sprite };
}

const FRAME_SETS: Record<string, FrameSet> = {
  corey:   { down: CoreyWalkDown,   left: CoreyWalkLeft,   up: CoreyWalkUp,   idle: CoreySprite },
  lev:     { down: LevWalkDown,     left: LevWalkLeft,     up: LevWalkUp,     idle: LevSprite },
  scout:   { down: ScoutWalkDown,   left: ScoutWalkLeft,   up: ScoutWalkUp,   idle: ScoutSprite },
  quill:   { down: QuillWalkDown,   left: QuillWalkLeft,   up: QuillWalkUp,   idle: QuillSprite },
  ember:   { down: EmberWalkDown,   left: EmberWalkLeft,   up: EmberWalkUp,   idle: EmberSprite },
  gavin:   { down: GavinWalkDown,   left: GavinWalkLeft,   up: GavinWalkUp,   idle: GavinSprite },
  tristan: { down: TristanWalkDown, left: TristanWalkLeft, up: TristanWalkUp, idle: TristanSprite },
};

// Scout's original full-route loop (used when ?walk_test=scout)
const SCOUT_ROUTE: WaypointKey[] = [
  'desk_scout', 'an_l', 'an_c', 'an_stair', 'stair_bottom',
  'meeting_entry', 'mr_corridor', 'table_corridor', 'seat_0',
  'table_corridor', 'mr_corridor', 'meeting_entry', 'stair_bottom',
  'an_stair', 'an_c', 'an_l', 'desk_scout',
];

// Per-character meeting-room round-trips (BFS fills segments automatically)
const CHAR_ROUTES: Record<string, WaypointKey[]> = {
  corey:   ['desk_corey',   'seat_4', 'desk_corey'],
  lev:     ['desk_lev',     'seat_5', 'desk_lev'],
  scout:   SCOUT_ROUTE,
  quill:   ['desk_quill',   'seat_6', 'desk_quill'],
  ember:   ['desk_ember',   'seat_7', 'desk_ember'],
  gavin:   ['desk_gavin',   'seat_1', 'desk_gavin'],
  tristan: ['desk_tristan', 'seat_2', 'desk_tristan'],
};

const GHOST_KEYS = ['forge', 'pixel'];
const DESK_MAP   = Object.fromEntries(DESKS.map(d => [d.key, d]));

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

  const mountedRef = useRef(false);

  useEffect(() => {
    if (!WALK_TEST) return;
    if (mountedRef.current) return;
    mountedRef.current = true;

    const walkMap: Record<string, typeof coreyWalk> = {
      corey:   coreyWalk,
      lev:     levWalk,
      scout:   scoutWalk,
      quill:   quillWalk,
      ember:   emberWalk,
      gavin:   gavinWalk,
      tristan: tristanWalk,
    };

    function runLoop(key: string) {
      const walkHook = walkMap[key];
      const route    = CHAR_ROUTES[key];
      if (!walkHook || !route) return;
      let idx = 0;
      const step = () => {
        idx = (idx + 1) % route.length;
        walkHook.walkTo(route[idx], () => setTimeout(step, 800));
      };
      step();
    }

    if (WALK_TEST_CHAR === 'all') {
      const keys = ['corey', 'lev', 'scout', 'quill', 'ember', 'gavin', 'tristan'];
      keys.forEach((key, i) => setTimeout(() => runLoop(key), 800 + i * 1400));
    } else {
      setTimeout(() => runLoop(WALK_TEST_CHAR), 800);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* ── Status labels — rendered after sprites so they always sit on top ── */}
      {walkers.map(({ key, walk }) => (
        <StatusLabel
          key={`lbl-${key}`}
          agentKey={key}
          walkState={walk.anim.walkState}
          x={walk.anim.x}
          y={walk.anim.y}
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

export { AGENT_HOME_WAYPOINT };
