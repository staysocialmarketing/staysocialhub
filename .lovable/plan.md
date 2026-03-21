

# Stay Social HUB — Roadmap: Next Build + Future Phases

## Current State Summary

**Built and functional:**
- Internal OS: Dashboard, Workflow board, Approvals (with batch system), Requests, Calendar, Tasks, Projects, Think Tank, Universal Inbox
- Client Portal: Success Center, Content Library, Plan view, AI Interview, Brand Twin, Content Generator (placeholder)
- Platform: Auth with domain whitelist, role-based access (6 roles), View As, notifications, versioning, Hub Assistant (text + voice), Global Capture, Command Palette
- Backend: Brain captures, brand twin, strategy engine, AI interviews, Hub Assistant with tool-calling

**Placeholder / incomplete:**
- Content Generator page (empty "Coming Soon")
- Voice agent pipeline (unstable — actions not reliably created)
- No reporting/analytics for clients
- No integrations with external platforms (social scheduling, email sending)
- No client onboarding wizard
- Marketplace page exists but likely thin

---

## Next Build (Phase 6A): Content Generator + Voice Reliability

### 1. AI Content Generator (the "Coming Soon" page)
Transform `ContentGenerator.tsx` from placeholder into a working tool that uses Brand Twin data to generate on-brand content.

- **Input form**: Content type picker (caption, email, blog intro, ad copy), optional topic/prompt, tone override
- **Generation**: Call a new `generate-content` edge function that fetches the client's `brand_twin` data (voice, audience, goals) and sends to Lovable AI with a structured prompt
- **Output**: Editable draft with copy button, "Save as Capture" button (saves to `brain_captures`), "Submit as Request" button
- **Brand context**: Pull `brand_twin.voice_json`, `audience_json`, `goals_json` to build the generation prompt
- **History**: Store generated drafts in a new `generated_content` table so users can revisit past generations

| File | Change |
|---|---|
| `src/pages/client/ContentGenerator.tsx` | Full page build with form, generation, output display |
| `supabase/functions/generate-content/index.ts` | New edge function for AI content generation |
| Migration | New `generated_content` table (id, client_id, user_id, content_type, prompt, output, created_at) |

### 2. Voice Agent Reliability Fix (carry-over)
The voice pipeline still fails silently. This build stabilizes it.

- Add comprehensive error logging to the edge function (log transcript received, extraction attempt, execution result)
- Add a `/test` endpoint to `hub-assistant` that creates a dummy task directly — use this to verify DB write path independently of voice
- Surface edge function logs in a debug toast (SS Admin only) so you can see exactly where it fails
- Ensure `create_task` tool actually inserts into `tasks` table with all fields

| File | Change |
|---|---|
| `supabase/functions/hub-assistant/index.ts` | Add logging, test endpoint, verify task insertion |
| `src/components/GlobalCaptureButton.tsx` | Debug toast for SS Admin, better error surfacing |

---

## Phase 6B: Client Experience Polish

### 3. Client Reporting Dashboard
Add a "My Results" or "Performance" tab to the Success Center showing content performance metrics.

- New `content_metrics` table (post_id, impressions, reach, engagement, clicks, reported_at)
- SS team manually enters or imports metrics per post
- Client sees charts: posts published over time, engagement trends, top-performing content
- Use recharts (already in project dependencies)

### 4. Client Onboarding Wizard
Guided first-time experience for new clients.

- Detect first login (no `brand_twin` record, no `brain_captures`)
- Step-through: Welcome → Brand Twin setup (simplified) → First AI Interview → First Capture → Done
- Progress tracked via `onboarding_progress` table or a JSON field on `users`

### 5. Request Status Tracking for Clients
Clients currently submit requests but have limited visibility into progress.

- Add a request timeline/activity log (reuse `ActivityTimeline` component pattern)
- Show status changes, comments, and estimated completion
- Push notification when status changes

---

## Phase 7: Integrations + Automation

### 6. Social Platform Connections
Connect to Meta (Instagram/Facebook), LinkedIn, X for scheduling and publishing.

- New `social_accounts` table linking clients to platform credentials
- Publish-to-platform action from the Workflow board
- Pull back published post URLs and basic metrics

### 7. Email Platform Integration
Connect to email sending (Mailchimp, Brevo, or built-in via backend functions).

- "Send" action for email-type posts from Workflow
- Template rendering with client branding
- Track open/click metrics back to `content_metrics`

### 8. Automation Rules Engine
Let SS team define rules like "when request is submitted, auto-assign to [producer]" or "when post reaches client_approval, notify client admin."

- New `automation_rules` table (trigger_event, conditions_json, action_type, action_config)
- Rule builder UI in Admin section
- Execution via database triggers or edge function webhooks

---

## Phase 8: DIY / Self-Serve Platform

### 9. Self-Serve Signup + Plan Selection
Open registration flow for DIY users (the third strategy layer).

- Public landing page with plan tiers
- Stripe integration for subscription billing
- Auto-provision client record, domain whitelist entry, and starter Brand Twin
- Guided onboarding (Phase 6B wizard, extended)

### 10. DIY Content Calendar
Self-serve users manage their own content calendar.

- Simplified workflow (no internal review stages)
- AI-generated content suggestions based on Brand Twin + calendar gaps
- Direct publish to connected social accounts

### 11. Marketplace Expansion
Productize add-on services (strategy sessions, custom designs, video production).

- Browse and purchase from Marketplace page
- Creates `addon_requests` with Stripe payment
- SS team fulfills and delivers through existing workflow

---

## Priority Order

```text
Phase 6A (Next Build)
  1. Content Generator        — high client value, Brand Twin already exists
  2. Voice Agent reliability   — carry-over fix

Phase 6B (Client Polish)
  3. Client Reporting          — retention driver
  4. Client Onboarding Wizard  — reduces manual setup
  5. Request Status Tracking   — client transparency

Phase 7 (Integrations)
  6. Social Platform Connections
  7. Email Platform Integration
  8. Automation Rules Engine

Phase 8 (DIY / Scale)
  9.  Self-Serve Signup + Billing
  10. DIY Content Calendar
  11. Marketplace Expansion
```

