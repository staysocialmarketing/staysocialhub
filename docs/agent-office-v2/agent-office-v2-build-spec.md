# Agent Office v2 — Build Spec (FINAL)

**Location:** `hub.staysocial.ca/agent-office`
**Repo:** `staysocialmarketing/staysocialhub`
**Stack:** Vite + React + TypeScript + shadcn/ui + Supabase

## Overview

Rebuild the Agent Office from the current 3-agent layout into a full team floor plan with 9 characters (3 humans + 6 AI agents), 3 pods, natural light atmosphere, status-reactive lighting, time-of-day window gradient, a functional meeting room, and walking animations between desks.

## Team roster

| Name | Role | Type | Colour | Desk indicator | Status |
|---|---|---|---|---|---|
| Corey | Founder & AI Systems Architect | Human | Gold/amber | Crown/star | Active |
| Lev | Chief of Staff | AI | Steel blue | Briefcase | Active |
| Scout | Research Analyst | AI | Forest green / cream | Magnifier | Active |
| Quill | Social Media Strategist | AI | Burgundy / off-white | IG/FB/LI stack | Active |
| Ember | Email Strategist | AI | Deep amber / cream | Envelope | Active |
| Forge | Lead Developer | AI | Industrial blue / charcoal | `</>` code brackets | Placeholder |
| Pixel | Ads Strategist | AI | Electric blue / slate | Bullseye / target | Placeholder |
| Gavin | Director of Creative & AI Studio | Human | Warm earth tones | Video camera | Active |
| Tristan | Director of Sales & Client Success | Human | Sales green | Handshake | Active |

## Character sprite specs

### Corey (founder)
- Build: medium-tall, stocky · Skin: white · Hair: short, dark brown
- Desk: 3-monitor command desk

### Lev (chief of staff)
- Existing sprite — keep
- Desk upgrade: slightly wider than sub-agents, stronger amber lamp

### Scout (research analyst)
- Existing sprite — forest green/cream

### Quill (social media strategist — evolved)
- Existing body, updates: two screens (posts | scheduling calendar), IG/FB/LI indicator

### Ember (email strategist) — NEW
- Build: lean, composed, upright · Skin: warm medium-brown
- Hair: neat, structured, pulled back or clean cut
- Clothing: business casual polished, clean lines
- Colours: deep amber and cream
- Desk: 2 screens (email draft | open-rate analytics), ceramic mug
- Indicator: envelope in amber

### Forge (lead developer) — NEW · placeholder
- Build: solid, grounded · Hair: short, low maintenance
- Clothing: tech casual — hoodie or crew neck
- Colours: industrial blue and charcoal (muted, technical)
- Desk: 3 monitors (code | terminal | GitHub), mechanical keyboard, water bottle
- Indicator: `</>` code brackets in industrial blue
- State: greyed/placeholder until built out as real NanoClaw agent

### Pixel (ads strategist) — NEW · placeholder
- Build: lean, sharp, forward-leaning · Hair: short, clean, efficient
- Clothing: smart casual with tech edge — clean hoodie or sharp crew
- Colours: electric blue and slate (vibrant, data-driven)
- Desk: 2 monitors (Meta Ads dashboard with ROAS/CPL | ad creative in review)
- Indicator: bullseye/target in electric blue
- State: greyed/placeholder until built out as real NanoClaw agent
- **Visual differentiation from Forge:** Pixel leans neon/electric, Forge leans industrial/muted

### Gavin (creative & AI studio director)
- Build: tall, thin · Skin: brown · Hair: bald
- Vibe: quiet creative authority, not center of attention
- Accessories: video camera on tripod, green screen nook adjacent

### Tristan (sales & CS director)
- Build: short, stocky · Skin: Black · Hair: medium-short black afro
- Vibe: outward-facing, confident, people person
- Accessories: CRM dashboard on monitor, "18 active clients" counter

## Floor plan

### Upper floor — Meeting Room
- 8-seat long meeting table (center)
- Whiteboard on left wall — **hardcoded initial text:** "Premiere · Punta Cana Contest" (stored in constants/campaigns.ts for easy updates)
- 3 windows at back wall with time-of-day gradient
- Plants near window edges
- Staircase to main floor center

### Main floor — three pods (left to right)

**Left wing: Creative Studio (140px wide)**
- Gavin's desk (top)
- Future creative hire slot (middle)
- Recording nook with green screen (bottom)
- Video camera on tripod, plant

**Center: Corey + AI Team (300px wide — slightly widened to fit 6 agents)**
- **Row 1 (command):** Corey's 3-monitor command desk, raised lighting, centered
- **Row 2 (chief of staff):** Lev's desk, slightly wider than sub-agents, stronger amber lamp, directly below Corey
- **Row 3 (content creators):** Scout · Quill · Ember
- **Row 4 (infrastructure & performance):** Forge · Pixel · [future slot], Forge + Pixel greyed/placeholder
- Dashed connection lines Corey → Lev → all sub-agents

**Right wing: Sales & CS (120px wide)**
- Tristan's desk (top) with CRM dashboard
- Future sales hire slot (middle)
- Plant + coffee station (bottom)

### Back wall — time-of-day gradient window

Continuous window spanning entire floor width, dynamic colour:

| Time (Halifax local) | Gradient |
|---|---|
| 5-8am | Soft amber/pink (dawn) |
| 8-11am | Bright blue (morning) |
| 11am-3pm | Saturated blue (midday) |
| 3-6pm | Warm gold (afternoon) |
| 6-9pm | Deep amber/orange (evening) |
| 9pm-5am | Dark blue + faint harbour lights (night) |

Update every 30 min via `useTimeOfDay` hook reading `new Date()` with Halifax TZ.

## Desk sizing hierarchy

| Tier | Width | Lamp opacity (idle) | Monitors |
|---|---|---|---|
| Corey (command) | 140px | 0.75 | 3 |
| Lev (chief of staff) | 120px | 0.65 amber-shifted | 3 |
| Gavin / Tristan (directors) | 90px | 0.5 | 2 |
| Sub-agents | 60px | 0.5 | 2-3 |

## Status lighting system

```
idle       → lamp 0.3, monitors dim
active     → lamp 0.7, monitors scroll
processing → lamp 0.9, monitors pulse
offline    → lamp 0, monitors dark
placeholder→ lamp 0, monitors dark, desk greyed, "coming soon" label
```

**Corey ↔ Lev link:** When Corey goes active, Lev's lamp brightens in sync (+0.1 boost).

**Forge & Pixel:** permanent placeholder state until activation flag flips in DB.

## Walking animation system

- Pixel grid pathfinding between desks
- 4-frame walk cycles per direction
- ~4 seconds across the floor
- No warping

### Meeting room triggers

1. **Lev goes up:** task tag includes `meeting`, `briefing`, or `standup`
2. **Sub-agents summoned:** while Lev is upstairs, agents with `strategy`, `review`, or `planning` tags walk up
3. **Meeting ends:** when Lev's task completes, all return to desks
4. **Corey:** can join meetings when on a strategic task

## Atmosphere details

1. Harbour windows — time-of-day gradient
2. Per-desk warm lamps — opacity tied to status
3. Plants — near windows and corners
4. Coffee station — right wing, near Tristan
5. Green screen + recording nook — left wing, near Gavin
6. Whiteboard — hardcoded campaign name from constants
7. CRM dashboard — live client count on Tristan's monitor
8. Life details: Ember's mug, Forge's water bottle, Pixel's multi-tab feel

## Data model

### New table: `agent_office_positions`
```sql
create table agent_office_positions (
  agent_id uuid primary key references agents(id),
  current_x int not null,
  current_y int not null,
  target_x int,
  target_y int,
  state text check (state in ('idle', 'walking', 'seated_desk', 'seated_meeting', 'placeholder')),
  last_moved_at timestamptz default now()
);
```

### Extend existing tables
```sql
alter table agent_status add column if not exists task_tags text[];
alter table agents add column if not exists is_placeholder boolean default false;
alter table agents add column if not exists activation_criteria text;
alter table agents add column if not exists member_type text check (member_type in ('ai', 'human')) default 'ai';
```

### Seed data
- Add Ember as active AI agent
- Add Forge as AI agent with `is_placeholder: true`, activation: "when built as NanoClaw agent"
- Add Pixel as AI agent with `is_placeholder: true`, activation: "when built as NanoClaw agent"
- Add Gavin and Tristan as human team members

## Component structure

```
src/pages/AgentOffice/
├── AgentOffice.tsx
├── MainFloor.tsx
├── UpperFloor.tsx
├── Staircase.tsx
├── pods/
│   ├── CreativeStudioPod.tsx
│   ├── AICorePod.tsx
│   └── SalesPod.tsx
├── Character.tsx
├── Desk.tsx
├── DeskLamp.tsx
├── DeskIndicator.tsx
├── HarbourWindow.tsx
├── constants/
│   ├── agents.ts         # sprite specs, colours, indicators
│   ├── desks.ts          # coordinates + dimensions
│   └── campaigns.ts      # whiteboard text
└── hooks/
    ├── useAgentPositions.ts
    ├── useMeetingRoom.ts
    ├── usePathfinding.ts
    └── useTimeOfDay.ts
```

## Build phases

1. Static layout + desks (all 9 placed, no animation)
2. Character sprites (create/update all 9)
3. Desk indicators + lamps (static)
4. Status system (wire to agent_status)
5. Meeting room structure (stairs, table, whiteboard)
6. Walking animation (pathfinding + frame cycling)
7. Meeting triggers (task-tag detection)
8. Atmosphere polish (plants, recording nook, coffee)
9. Time-of-day window gradient
10. Placeholder handling (Forge + Pixel greyed with activation flags)

## Start-of-session command

```
cd ~/staysocialhub && claude
```

Reference this spec plus:
- `pixel-agent-definition.md`
- `forge-agent-definition.md` (to be written)
