# Agent Office v2 — Claude Code Prompt Pack

Copy/paste each phase in order. Start every session with:

```bash
cd ~/staysocialhub && claude
```

Each prompt is self-contained but assumes previous phases are complete.

---

## PHASE 1 — Static layout + desks

```
I'm rebuilding the Agent Office at src/pages/AgentOffice (or wherever it currently lives — find it first). This is a full redesign. Please do not preserve the current layout's structure — we're replacing it.

The reference docs are agent-office-v2-build-spec.md and pixel-agent-definition.md in the repo root (paste them in if they're not there).

PHASE 1 GOAL: Get all 9 desks statically placed in the correct pod structure. No animation, no status logic, no sprites yet — just the floor plan geometry with placeholder rectangles for characters.

Please do the following:

1. Read the existing Agent Office code to understand the current structure, components, and where it renders.

2. Create a new constants file at src/pages/AgentOffice/constants/desks.ts with coordinates and dimensions for every desk:
   - Corey: command tier, 140px wide, 3 monitors, centered in AI pod, row 1
   - Lev: chief of staff tier, 120px wide, 3 monitors, centered in AI pod, row 2 (below Corey)
   - Scout, Quill, Ember: sub-agent tier, 60px wide, 2 monitors, AI pod row 3 (left to right)
   - Forge, Pixel: sub-agent tier, 60px wide, placeholder styling (greyed), AI pod row 4 (left and center)
   - [future slot]: placeholder, AI pod row 4 (right)
   - Gavin: director tier, 90px wide, 2 monitors, Creative Studio pod
   - Future creative hire slot: Creative Studio pod, middle
   - Tristan: director tier, 90px wide, 2 monitors, Sales pod
   - Future sales hire slot: Sales pod, middle

3. Layout structure on main floor (left to right):
   - Left wing: Creative Studio pod (140px wide container)
   - Center: Corey + AI Team pod (300px wide container — widened from previous 280 to fit 6 agents in 2 rows)
   - Right wing: Sales & CS pod (120px wide container)

4. Upper floor: meeting room with 8-seat long table, whiteboard on left wall, 3 windows at back, staircase connecting down to main floor center.

5. Build out component structure:
   src/pages/AgentOffice/
   ├── AgentOffice.tsx         (main container, orchestrates MainFloor + UpperFloor)
   ├── MainFloor.tsx
   ├── UpperFloor.tsx
   ├── Staircase.tsx
   ├── pods/
   │   ├── CreativeStudioPod.tsx
   │   ├── AICorePod.tsx
   │   └── SalesPod.tsx
   ├── Desk.tsx                (reusable, accepts tier/size/monitors props)
   └── constants/
       └── desks.ts

6. For now, each Desk component renders:
   - The desk rectangle at correct size
   - N monitor rectangles on top
   - The agent's name label below
   - A placeholder circle where the character sprite will go
   - NO lamp, NO indicator, NO status behavior yet

7. Make sure the layout is responsive to the current Agent Office container width. Preserve existing page routing and access controls (only ss_team should see this page).

When done, show me the new layout in the browser so I can confirm before Phase 2. Don't touch sprite assets, status logic, or animations — that's explicitly NOT this phase.

Do not push to Vercel or commit until I confirm the layout looks right.
```

---

## PHASE 2 — Character sprites

```
Phase 1 is complete — static layout is in place with 9 placeholder circles where characters will go.

PHASE 2 GOAL: Create or update pixel art character sprites for all 9 team members and render them at their desks (still static, no walking animation yet).

Reference the sprite specs in agent-office-v2-build-spec.md. Here's the summary:

EXISTING SPRITES TO KEEP:
- Lev (chief of staff, steel blue palette) — keep current sprite
- Scout (research, forest green/cream) — keep current sprite

EXISTING SPRITE TO UPDATE:
- Quill (now Social Media Strategist, was Copywriter)
  - Keep burgundy/off-white palette
  - Desk updates to 2 screens: left shows social post drafts, right shows scheduling calendar
  - Replace quill indicator with IG/FB/LI icon stack

NEW SPRITES TO CREATE:
- Corey (founder): medium-tall, stocky, white skin, short dark-brown hair. Grounded energy. Sits at 3-monitor command desk.
- Ember (email strategist): lean, composed, upright posture. Warm medium-brown skin. Neat hair pulled back or clean cut. Business casual polished. Deep amber + cream palette. 2 monitors: email draft | open rate analytics. Ceramic mug on desk.
- Forge (lead developer, PLACEHOLDER): solid grounded build, short low-maintenance hair. Tech casual hoodie/crew. Industrial blue + charcoal palette (muted, technical). 3 monitors: code | terminal | GitHub. Mechanical keyboard, water bottle. Greyed out for placeholder state.
- Pixel (ads strategist, PLACEHOLDER): lean, sharp, forward-leaning posture. Short clean hair. Smart casual tech edge. Electric blue + slate (vibrant — distinct from Forge's muted blue). 2 monitors: Meta Ads dashboard | ad creative review. Greyed out for placeholder state.
- Gavin (creative director): tall, thin, brown skin, bald. Quiet creative authority. 2 monitors. Video camera on tripod nearby.
- Tristan (sales director): short, stocky, Black, medium-short black afro. Outward-facing confident energy. 2 monitors with CRM dashboard visible.

VISUAL DIFFERENTIATION NOTE: Forge and Pixel both have blue palettes. Make sure they're clearly distinct — Forge leans industrial/grey/muted, Pixel leans neon/electric/data-driven. Different enough to read as different characters at a glance.

TASKS:
1. Create a src/pages/AgentOffice/sprites/ directory with one file per character
2. Each sprite should be pixel art matching the existing Lev/Scout/Quill art style (same resolution, same scale)
3. Create idle pose for each character (front-facing, seated at desk)
4. Create a constants file src/pages/AgentOffice/constants/agents.ts with each agent's full config:
   - name, role, memberType (ai | human), isPlaceholder (boolean), colour palette, sprite reference, indicator type
5. Update Desk.tsx to render the actual sprite instead of placeholder circle
6. For Forge and Pixel, render sprite with reduced opacity (0.4) and greyed colour filter to show placeholder state
7. Add a "coming soon" label below Forge and Pixel desks

Do NOT build walking animation frames yet (that's Phase 6). Only idle poses.

When done, show me the office with all 9 sprites in place. Don't commit until I confirm.
```

---

## PHASE 3 — Desk indicators + lamps

```
Phase 2 is complete — all 9 sprites are rendered at their desks.

PHASE 3 GOAL: Add the desk indicator icon badges and the warm lamp glow ellipses. All static for now — no reactive behavior yet.

DESK INDICATORS (small icon badge on back-right corner of each desk):
- Corey: crown/star in gold
- Lev: briefcase in steel blue
- Scout: magnifying glass in forest green
- Quill: IG/FB/LI icon stack in burgundy
- Ember: envelope in amber
- Forge: </> code brackets in industrial blue (greyed for placeholder)
- Pixel: bullseye/target in electric blue (greyed for placeholder)
- Gavin: video camera in warm earth tone
- Tristan: handshake/two-people icon in sales green
- All future slots: question mark ? in grey

TASKS:
1. Create src/pages/AgentOffice/DeskIndicator.tsx — renders a small circular badge with an icon inside
2. Create src/pages/AgentOffice/DeskLamp.tsx — renders an ellipse glow beneath the desk, accepts an opacity prop
3. Update src/pages/AgentOffice/constants/agents.ts to include indicator type for each agent
4. Update Desk.tsx to render both the lamp (behind the desk) and the indicator (on top of the desk)

LAMP SIZING (idle state for now):
- Corey (command): width 120, opacity 0.75 — brightest
- Lev (chief of staff): width 116, opacity 0.65 with slight amber shift vs cool white
- Gavin/Tristan (directors): width 90, opacity 0.5
- Sub-agents (Scout/Quill/Ember): width 64, opacity 0.5
- Forge/Pixel (placeholder): width 64, opacity 0 — no lamp until activated

LAMP COLOUR: warm amber gradient — var(--lamp-gradient) in CSS, top stop #ffd88a at 0.9 alpha, bottom stop #ffd88a at 0 alpha. For Lev, boost the top stop toward #ffc870 to give him the slightly more amber-saturated glow.

INDICATOR SIZING:
- ~14px circle, 10px icon inside
- Placed at desk's back-right corner, slightly above desk surface
- For placeholders (Forge, Pixel, future slots): same size but reduced opacity (0.4) and desaturated

When done, show me the office with all lamps glowing and all indicators visible. Still no status reactivity — that's Phase 4.
```

---

## PHASE 4 — Status lighting system

```
Phase 3 is complete — all desks have static lamps and indicators.

PHASE 4 GOAL: Wire lamps and monitors to the agent_status table so they react to real agent state.

REQUIRED STATES:
- idle: lamp opacity 0.3, monitors dim
- active: lamp opacity 0.7, monitors show scrolling content
- processing: lamp opacity 0.9, monitors pulse with animation
- offline: lamp opacity 0, monitors dark
- placeholder: lamp opacity 0, monitors dark, sprite greyed, "coming soon" label visible

TASKS:

1. DATABASE — check if agent_status table already has a `state` column with those 5 values. If it only has a subset, extend it:

   alter table agent_status add column if not exists task_tags text[];
   alter table agents add column if not exists is_placeholder boolean default false;
   alter table agents add column if not exists activation_criteria text;
   alter table agents add column if not exists member_type text check (member_type in ('ai', 'human')) default 'ai';

2. SEED DATA — insert/update rows for all 9 team members:
   - Corey, Lev, Scout, Quill: existing (verify they're there)
   - Ember: new, member_type='ai', is_placeholder=false
   - Forge: new, member_type='ai', is_placeholder=true, activation_criteria='when built as NanoClaw agent'
   - Pixel: new, member_type='ai', is_placeholder=true, activation_criteria='when built as NanoClaw agent'
   - Gavin: new, member_type='human', is_placeholder=false
   - Tristan: new, member_type='human', is_placeholder=false

3. HOOK — create src/pages/AgentOffice/hooks/useAgentPositions.ts that subscribes to agent_status via Supabase realtime, returns current state for each agent keyed by agent_id.

4. UPDATE DeskLamp — accept a `state` prop, animate opacity based on state, with smooth transition (300ms).

5. UPDATE Desk monitors — each monitor should render different content based on state:
   - idle: dim solid colour
   - active: scrolling text animation (fake content, just visual)
   - processing: pulse animation (brightness oscillating 0.6 → 1.0 at 1Hz)
   - offline: black
   - placeholder: dark grey with no animation

6. COREY <> LEV LINK — when Corey's state is 'active' or 'processing', Lev's lamp gets a +0.1 opacity boost on top of his own state. Implement this as a useEffect that watches Corey's state and applies the boost to Lev's rendered opacity.

7. PLACEHOLDER HANDLING — if agent.is_placeholder is true, force state to 'placeholder' regardless of what's in agent_status. Show the greyed sprite and "coming soon" label always.

When done, change an agent's state in Supabase manually and watch the lamp + monitors react. Show me a demo before committing.
```

---

## PHASE 5 — Meeting room structure

```
Phase 4 is complete — all desks are status-reactive.

PHASE 5 GOAL: Build out the upper floor meeting room with functional structure (still no walking animation or triggers — that's Phase 6-7).

TASKS:

1. Create src/pages/AgentOffice/UpperFloor.tsx (if not already stubbed from Phase 1). Should render:
   - Floor background with a different tile pattern than main floor (cool neutral vs main floor's blue)
   - 3 windows along back wall, each ~50px wide, evenly spaced
   - Windows use the same time-of-day gradient as main floor (we'll wire the dynamic part in Phase 9 — for now, hardcode a daytime blue-to-amber gradient)
   - A whiteboard on the left wall (~12px × 40px, cream colour)
   - A long meeting table (~240px × 40px, brown wood) centered
   - 8 chairs around the table (4 on top edge, 4 on bottom edge)
   - 2 small plants near window edges

2. Create src/pages/AgentOffice/Staircase.tsx — renders a small stair graphic that visually connects the upper floor to the main floor. Should be centered horizontally on both floors.

3. Create src/pages/AgentOffice/constants/campaigns.ts:

   export const ACTIVE_CAMPAIGN = 'Premiere · Punta Cana Contest';

4. Render the ACTIVE_CAMPAIGN string on the whiteboard. Small text (~8px), centered vertically on the whiteboard rectangle.

5. In AgentOffice.tsx, ensure UpperFloor renders ABOVE MainFloor in the layout (literally higher on screen). Add visual separation between the two floors (e.g., a thin horizontal divider or subtle shadow under the upper floor).

6. No characters in the meeting room yet — that comes with Phase 7 triggers. Table stays empty until then.

When done, show me the full office with upper + main floors visible. The meeting room should look ready to host a meeting, just empty.
```

---

## PHASE 6 — Walking animation

```
Phase 5 is complete — meeting room is built but empty.

PHASE 6 GOAL: Build the walking animation system. Characters can walk between desks and to/from the meeting room. No trigger logic yet — just the ability to animate movement on command.

TASKS:

1. SPRITE FRAMES — for each of the 9 characters, create walk cycle frames:
   - Walking left (4 frames)
   - Walking right (4 frames)
   - Walking up (4 frames)
   - Walking down (4 frames)
   - Keep the existing idle pose as the 5th "direction" (seated at desk)

   For Forge and Pixel (placeholders), skip walk frames — they never move. If activated later, we'll generate their frames in that build-out session.

2. PATHFINDING — create src/pages/AgentOffice/hooks/usePathfinding.ts:
   - Accepts a start (x,y) and end (x,y) coordinate
   - Returns an array of waypoints the character walks through
   - Uses simple A* or Manhattan-distance pathfinding on a pixel grid
   - Defines "walkable" areas: open floor space, not through desks or walls
   - Special path: main floor center → staircase → upper floor meeting room seats

3. POSITIONS TABLE — create the agent_office_positions table if it doesn't exist:

   create table if not exists agent_office_positions (
     agent_id uuid primary key references agents(id),
     current_x int not null,
     current_y int not null,
     target_x int,
     target_y int,
     state text check (state in ('idle', 'walking', 'seated_desk', 'seated_meeting', 'placeholder')),
     last_moved_at timestamptz default now()
   );

   Seed each agent with their current desk coordinates and state='seated_desk'. For Forge and Pixel, state='placeholder'.

4. CHARACTER COMPONENT — update src/pages/AgentOffice/Character.tsx to:
   - Accept current position and target position props
   - When target changes, compute path via usePathfinding
   - Animate sprite along the path at ~4 seconds for a full-floor traversal
   - Cycle through walk frames based on direction of motion (16fps)
   - When target reached, switch to idle pose

5. MANUAL TEST MODE — add a dev-only debug UI (behind a ?debug=true query param) that lets me click any agent and send them to any desk or to the meeting room. This is how we'll test Phase 6 before Phase 7's automated triggers.

6. SAFETY — if an agent is a placeholder, ignore any move command. They never walk.

When done, show me the debug UI and let me manually walk an agent from their desk to the meeting room and back. Don't commit until I confirm the animation feels right.
```

---

## PHASE 7 — Meeting room triggers

```
Phase 6 is complete — walking animation works, testable via debug UI.

PHASE 7 GOAL: Wire the real trigger logic that sends agents to the meeting room based on task tags.

THE RULES:

Rule 1 — Lev goes up:
When Lev's agent_status has a task_tags array containing 'meeting', 'briefing', or 'standup', Lev walks from his desk up the staircase to a seat at the meeting table.

Rule 2 — Sub-agents summoned:
While Lev is seated at the meeting table (state='seated_meeting'), any other AI agent (not placeholder) whose task_tags contain 'strategy', 'review', or 'planning' walks up and joins him. They sit at the next available seat.

Rule 3 — Corey joins on strategic tasks:
When Corey's task_tags contain 'strategy' or 'meeting', Corey walks up to the meeting table too.

Rule 4 — Meeting ends:
When Lev's task_tags no longer contain meeting/briefing/standup, everyone currently in the meeting room walks back to their own desks.

TASKS:

1. Create src/pages/AgentOffice/hooks/useMeetingRoom.ts:
   - Subscribes to agent_status changes via Supabase realtime
   - Evaluates rules 1-4 on every change
   - Updates agent_office_positions with new target coordinates when rules fire
   - Tracks which seats at the meeting table are occupied (8 seats total)
   - Assigns next-available seat to each arriving agent

2. SEAT POSITIONS — hardcode the 8 meeting table seat coordinates in constants/desks.ts as MEETING_SEATS array.

3. CONCURRENCY — handle the case where multiple agents are triggered at the same time. Stagger their walk start times by ~500ms so they don't all move in lockstep.

4. STATE TRANSITIONS — each agent's state in agent_office_positions should cleanly transition:
   - seated_desk → walking (when trigger fires)
   - walking → seated_meeting (when they reach their seat)
   - seated_meeting → walking (when meeting ends)
   - walking → seated_desk (when back home)

5. VISUAL POLISH — when an agent is seated_meeting, render them at the meeting table in a seated pose. When seated_desk, render them at their desk in idle pose.

6. FORGE & PIXEL — explicitly excluded from all meeting triggers because they're placeholders. Even if someone wrote a task with matching tags to their row, they don't move.

7. EDGE CASES:
   - If Lev's meeting tag is removed but other agents are still upstairs with review/planning tags, they stay until their own tags clear
   - If all 8 seats fill (unlikely with 7 possible attendees), log a warning and queue the next arrival

TEST IT: in Supabase, update Lev's agent_status to have task_tags = '{meeting}'. Watch him walk up. Then update Quill's to task_tags = '{strategy}' and watch her join. Remove both tags and watch them walk back.

Don't commit until I see this work end-to-end.
```

---

## PHASE 8 — Atmosphere polish

```
Phase 7 is complete — meeting triggers work automatically from task tags.

PHASE 8 GOAL: Layer in the atmospheric details that make the office feel alive.

TASKS:

1. CREATIVE STUDIO NOOK (left wing, below Gavin's desk):
   - Small rectangle representing a recording setup
   - Green screen panel (~60px × 22px, black with faint grid)
   - "Recording nook" label at top
   - Camera on a tripod positioned between Gavin's desk and the nook

2. COFFEE STATION (right wing, below Tristan's area):
   - Rectangle ~50px × 40px, dark grey
   - Two coffee cup circles on top
   - "Coffee" label

3. PLANTS — add small potted plant sprites (green circle + brown pot rectangle):
   - Main floor: near left window corner, right window corner, near coffee station
   - Meeting room: one on each side of the windows
   - Total: ~5 plants

4. EMBER'S MUG — on her desk, small ceramic mug sprite (circle ~4px, cream colour with dark rim)

5. FORGE'S WATER BOTTLE — on his desk (when active in future), small tall rectangle. For now in placeholder state, still render it but greyed out to foreshadow his real workspace.

6. PIXEL'S DESK DETAIL — monitor edges should have subtle "multi-tab" indicators (tiny tab-like rectangles at the top of each monitor) to suggest the data-heavy dashboard workflow. Greyed for placeholder state.

7. CRM DASHBOARD ON TRISTAN'S MONITOR — the right monitor (when he's active) should show:
   - "CLIENT DASHBOARD" text at top
   - 5-6 small vertical bars of varying heights (fake metrics)
   - "18 active clients" text at bottom
   - Query the actual count from the clients table if possible, fall back to 18 if not

8. WHITEBOARD POLISH — in the meeting room, the whiteboard should have:
   - The campaign name (already hardcoded from Phase 5)
   - A few faint horizontal lines above and below suggesting notes written on it

9. SUBTLE WEAR/LIFE DETAILS:
   - Corey's desk: a small coffee cup sprite (he's the night owl)
   - Scout's desk: a stack of small paper sprites
   - Quill's desk: a phone sprite (she's in the platforms)
   - Gavin's desk: a small camera lens icon

Keep all of these proportional and subtle — they should add texture, not clutter. The goal is "this office is lived in" not "every desk is a diorama."

When done, show me the office with all the polish layered in.
```

---

## PHASE 9 — Time-of-day window gradient

```
Phase 8 is complete — office is atmospherically polished.

PHASE 9 GOAL: Make the back-wall windows dynamic based on Halifax local time.

TIME WINDOWS (Halifax local, Atlantic Time):
- 5-8am: soft amber/pink (dawn) — top stop #f4c4a0, bottom stop #e8a878
- 8-11am: bright blue (morning) — top stop #a8d0e8, bottom stop #7ab5d8
- 11am-3pm: saturated blue (midday) — top stop #7ab5d8, bottom stop #5a9ac8
- 3-6pm: warm gold (afternoon) — top stop #d8b878, bottom stop #b89858
- 6-9pm: deep amber/orange (evening) — top stop #d88858, bottom stop #b86838
- 9pm-5am: dark blue + faint harbour lights (night) — top stop #1a2540, bottom stop #0a1525, plus a few tiny yellow dots scattered in lower half simulating boat/dock lights

TASKS:

1. Create src/pages/AgentOffice/hooks/useTimeOfDay.ts:
   - Returns current "time bucket" as a string ('dawn', 'morning', 'midday', 'afternoon', 'evening', 'night')
   - Uses Halifax timezone (America/Halifax) explicitly, not browser local time
   - Updates every 30 minutes via setInterval

2. Create src/pages/AgentOffice/HarbourWindow.tsx component:
   - Accepts a time bucket prop
   - Renders the appropriate gradient
   - For 'night', also renders 3-5 small yellow dots in the lower half (harbour lights)

3. Apply HarbourWindow to:
   - Main floor back wall (spans full floor width)
   - Meeting room back wall (3 separate window panels use the same gradient)

4. TRANSITION SMOOTHING — when the bucket changes (e.g., 5:59am → 6:00am), transition the gradient over 60 seconds rather than snapping. Makes sunrise/sunset feel natural.

5. DEV OVERRIDE — add a ?time=evening query param that lets me force any time bucket for testing.

When done, show me the morning, afternoon, and night versions by using the dev override. Confirm the gradient looks good in each.
```

---

## PHASE 10 — Placeholder handling + activation system

```
Phase 9 is complete — windows shift with time of day.

PHASE 10 GOAL: Finalize the Forge and Pixel placeholder treatment and build the activation flow for when they come online.

TASKS:

1. PLACEHOLDER VISUAL — confirm from previous phases that Forge and Pixel desks:
   - Sprite rendered at 0.4 opacity
   - Desk colour desaturated (greyed filter)
   - Monitors dark with no animation
   - No lamp glow
   - "Coming soon" label visible below the desk name
   - Indicator badge greyed out (desaturated)

2. ACTIVATION MECHANISM — create an admin-only toggle in the Agent Office settings:
   - Only visible to ss_admin role
   - Lists all agents where is_placeholder=true
   - Each has an "Activate" button
   - Clicking sets is_placeholder=false in the agents table
   - The UI should react immediately (placeholder treatment drops, normal state takes over)

3. ACTIVATION CONFIRMATION MODAL — when clicking Activate, show a modal:
   - Warning: "Activating [Agent] will make them visible as an active team member. The NanoClaw agent should be built and running before this is flipped."
   - Checklist (non-blocking, informational):
     [ ] NanoClaw agent container built and deployed
     [ ] API keys provisioned
     [ ] System prompt loaded
     [ ] Shadow mode test completed
   - "Cancel" and "Activate Anyway" buttons

4. FORGE-SPECIFIC ACTIVATION CHECKLIST (shown in modal for Forge):
   - Repo write access configured
   - Deployment guardrails defined
   - Corey approval required for prod pushes

5. PIXEL-SPECIFIC ACTIVATION CHECKLIST (shown in modal for Pixel):
   - Google Ads API access provisioned
   - Meta Ads API access provisioned
   - GA4 properties connected
   - Cornwall Capital ad accounts linked

6. Once activated:
   - Placeholder label disappears
   - Sprite renders at full opacity
   - Lamp and monitors come online (idle state by default)
   - Agent immediately available for task tag triggers

7. DEACTIVATION — include a "Return to placeholder" option in case we need to pull an agent back offline for maintenance.

8. LOGS — every activation/deactivation writes a row to a new audit log table:

   create table if not exists agent_activation_log (
     id uuid primary key default gen_random_uuid(),
     agent_id uuid references agents(id),
     action text check (action in ('activated', 'deactivated')),
     triggered_by uuid references agents(id),
     triggered_at timestamptz default now(),
     notes text
   );

When done, show me the admin panel and walk me through activating Pixel as a test. Then deactivate to return to placeholder state.
```

---

## PHASE 11 (OPTIONAL) — Polish pass

```
All 10 phases are complete. Agent Office v2 is functionally done.

OPTIONAL POLISH ITEMS — pick any combination I ask for:

1. Character breathing animation — idle sprites subtly rise/fall 1 pixel every 2 seconds
2. Monitor content variety — each agent's monitors show role-appropriate content when active (Scout: web search results, Quill: Instagram feed, Ember: Mailchimp-style interface, Corey: Claude chat + HUB dashboard)
3. Sound design — subtle office ambient audio, footsteps on walking, chair creak when seated (toggleable, default off)
4. Click interactions — clicking any character opens a small info card showing their current task, status, and last activity timestamp
5. Meeting room camera pan — when a meeting starts, briefly zoom the view to the meeting room for 2 seconds then return to full office
6. Day/night lamp behavior — during night hours, all lamps get slightly brighter (since the windows are dark)
7. Weather system — rain drops on windows when Halifax weather API returns rain, etc.
8. Weekend mode — reduced activity on weekends, most agents offline unless explicitly working
9. Mobile responsive — rework layout for narrow viewports (currently desktop-only)
10. Screenshot mode — hide UI chrome for clean office screenshots

Pick whatever you want me to tackle and I'll do it.
```

---

## Deployment checklist after all phases

```
Before pushing to Vercel:

1. Run all Supabase migrations in order:
   - agent_office_positions table
   - agent_status extensions (task_tags)
   - agents table extensions (is_placeholder, activation_criteria, member_type)
   - agent_activation_log table

2. Seed data:
   - Ember as active AI
   - Forge as placeholder AI
   - Pixel as placeholder AI
   - Gavin as active human
   - Tristan as active human

3. Environment variables:
   - Confirm Halifax timezone is configured if backend uses server time anywhere
   - Confirm Supabase realtime is enabled on agent_status and agent_office_positions

4. Access control:
   - Agent Office route is restricted to ss_team role
   - Admin activation panel is restricted to ss_admin role

5. Test checklist:
   [ ] All 9 sprites render at correct desks
   [ ] Lamps react to status changes
   [ ] Corey → Lev lamp sync works
   [ ] Meeting room triggers on task tags
   [ ] Walking animation smooth in both directions
   [ ] Windows shift with time of day
   [ ] Placeholder activation flow works
   [ ] Forge and Pixel stay placeholder through all normal triggers

6. git add, commit with message: "Agent Office v2: full team redesign with meeting room, walking animation, and time-of-day atmosphere"

7. Push to main → Vercel auto-deploys to hub.staysocial.ca

8. Verify live on hub.staysocial.ca/agent-office
```

---

## Emergency rollback

```
If anything breaks in production:

1. git log --oneline | head -20
2. Find the last known-good commit SHA
3. git revert [SHA] or git reset --hard [SHA] depending on severity
4. git push origin main --force-with-lease (only if reset, not revert)
5. Vercel will redeploy

If database migrations need rollback:
- Supabase → SQL Editor → run reverse migrations
- Keep a rollback.sql file in the repo with the drop/alter statements ready to go
```
