import { DESKS, TIER_DIMS, CANVAS_W, CANVAS_H, AI_CORE_POD_X, AI_CORE_POD_W, MAIN_FLOOR_Y } from '../constants/desks';
import { Desk } from '../Desk';
import { useAgentStatuses } from '../hooks/useAgentStatus';

const AI_KEYS = ['corey', 'lev', 'scout', 'quill', 'ember', 'forge', 'pixel', 'future_ai'];
const aiDesks = DESKS.filter(d => AI_KEYS.includes(d.key));

// Hierarchy connector line coordinates (derived from desk constants)
const coreyDesk = DESKS.find(d => d.key === 'corey')!;
const levDesk   = DESKS.find(d => d.key === 'lev')!;
const subRow3   = DESKS.filter(d => ['scout', 'quill', 'ember'].includes(d.key));

const cW  = TIER_DIMS.command.w;
const cH  = TIER_DIMS.command.h;
const lW  = TIER_DIMS.chief_of_staff.w;
const lH  = TIER_DIMS.chief_of_staff.h;
const sW  = TIER_DIMS.sub_agent.w;

const coreyBtm   = { x: coreyDesk.x + cW / 2, y: coreyDesk.y + cH };       // (480, 256)
const levTop     = { x: levDesk.x   + lW / 2, y: levDesk.y };               // (480, 276)
const levBtm     = { x: levDesk.x   + lW / 2, y: levDesk.y + lH };          // (480, 316)
const branchY    = levBtm.y + 19;                                             // 335
const subTopCtr  = subRow3.map(d => ({ x: d.x + sW / 2, y: d.y }));

export function AICorePod() {
  const statuses = useAgentStatuses();
  const coreyState = statuses['corey'] ?? 'offline';
  const levBoost = (coreyState === 'active' || coreyState === 'processing') ? 0.1 : 0;

  return (
    <>
      {/* Pod background */}
      <div
        style={{
          position: 'absolute',
          left: AI_CORE_POD_X,
          top: MAIN_FLOOR_Y,
          width: AI_CORE_POD_W,
          height: CANVAS_H - MAIN_FLOOR_Y,
          background: '#252c3c',
          borderLeft:  '1px solid #323e50',
          borderRight: '1px solid #323e50',
        }}
      />

      {/* Pod label */}
      <div
        style={{
          position: 'absolute',
          left: AI_CORE_POD_X + AI_CORE_POD_W / 2,
          top: MAIN_FLOOR_Y + 8,
          transform: 'translateX(-50%)',
          color: '#3a6080',
          fontSize: 8,
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        AI Core
      </div>

      {/* Hierarchy connector lines (SVG overlay) */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        width={CANVAS_W}
        height={CANVAS_H}
        overflow="visible"
      >
        <defs>
          <style>{`
            .hier-line {
              stroke: #2a6090;
              stroke-width: 1.5;
              stroke-dasharray: 4 3;
              fill: none;
            }
          `}</style>
        </defs>

        {/* Corey → Lev: stub below desk, resume below Corey's subtitle zone */}
        <line className="hier-line"
          x1={coreyBtm.x} y1={coreyBtm.y}
          x2={coreyBtm.x} y2={coreyBtm.y + 5}
        />
        <line className="hier-line"
          x1={levTop.x} y1={levTop.y - 42}
          x2={levTop.x} y2={levTop.y}
        />

        {/* Lev → branch */}
        <line className="hier-line"
          x1={levBtm.x} y1={levBtm.y}
          x2={levBtm.x} y2={branchY}
        />

        {/* Horizontal branch across row-3 sub-agents */}
        <line className="hier-line"
          x1={subTopCtr[0].x} y1={branchY}
          x2={subTopCtr[2].x} y2={branchY}
        />

        {/* Branch → Scout, Quill, Ember */}
        {subTopCtr.map((pt, i) => (
          <line key={i} className="hier-line"
            x1={pt.x} y1={branchY}
            x2={pt.x} y2={pt.y}
          />
        ))}
      </svg>

      {/* All AI desks — Lev gets Corey's sync boost */}
      {aiDesks.map(desk => (
        <Desk key={desk.key} desk={desk} lampBoost={desk.key === 'lev' ? levBoost : 0} />
      ))}
    </>
  );
}
