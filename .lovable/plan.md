

# Phase 5: AI-Powered Features — The Stay Social Brain Engine

This is the big one. We're adding the AI capabilities that transform the HUB from a project management tool into an intelligent content operating system — comparable to Pressmaster but built for your 3-layer model (Internal OS, Client Portal, DIY).

---

## What Pressmaster Does (and how we'll match/exceed it)

| Pressmaster Feature | HUB Equivalent (exists) | What We Need to Build |
|---|---|---|
| AI Twin (persona model) | Brand Twin (manual forms) | **AI Interview** that auto-populates the Brand Twin |
| AI Interview | Capture (voice/text) | **Chat-based AI interviewer** that extracts insights |
| Content Suite | Workflow + Strategy Brief | **AI Content Generator** — turn ideas into platform-ready drafts |
| Trendmaster | None | Future phase (requires external APIs) |
| AI Agent (autonomous) | Run Strategy button | **AI Draft Pipeline** — auto-generate drafts from captures |
| Image Generation | None | Future phase (Gemini image models) |
| Calendar + Auto-publish | Marketing Calendar | Future phase (social API integrations) |
| Agency white-label | Multi-client architecture | Already built (Layer 1 + 2) |

---

## Implementation Plan (3 Batches)

### Batch A: AI Interview Chat

A conversational AI that interviews the user (or client) to build their Brand Twin profile. Like speaking to a journalist — it asks smart follow-up questions, then extracts structured data back into the Brand Twin fields.

**New edge function: `ai-interview`**
- Accepts conversation history + client's current Brand Twin data
- System prompt: "You are a brand strategist interviewing a client. Ask focused questions about their business, voice, audience, offers, and content preferences. Extract actionable insights."
- Uses Lovable AI (Gemini) with streaming
- After the interview, a "Save to Brain" action extracts structured data and writes it back to `brand_twin` table

**New UI: Interview tab in Client Brain**
- Third tab alongside Brand Twin and Capture: "AI Interview"
- Chat interface with streaming responses
- Pre-built interview templates: "Brand Voice Discovery", "Audience Deep Dive", "Content Strategy Session"
- "Extract to Brand Twin" button that processes the conversation and auto-fills Brand Twin fields

**Database**: New `brain_interviews` table to store conversation history per client

```text
brain_interviews
├── id (uuid)
├── client_id (uuid)
├── started_by_user_id (uuid)
├── template (text) — e.g. 'brand_voice', 'audience', 'full_onboarding'
├── messages (jsonb) — array of {role, content, timestamp}
├── extracted_data (jsonb) — structured output after extraction
├── status (text) — 'active', 'completed', 'extracted'
├── created_at, updated_at
```

**Files**:
- `supabase/functions/ai-interview/index.ts` — streaming chat + extraction
- `src/components/brain/InterviewTab.tsx` — chat UI
- `src/pages/admin/ClientBrain.tsx` — add third tab
- Database migration for `brain_interviews`

---

### Batch B: AI Content Generator

Turn any capture, idea, or interview insight into platform-ready content drafts — using the Brand Twin as context for voice matching.

**New edge function: `generate-content`**
- Accepts: source text (capture, idea, interview excerpt), target platform(s), content type, client_id
- Pulls Brand Twin + Strategy data as context
- Returns: structured draft(s) with caption, hashtags, CTA, formatted per platform
- Supports multi-platform output (LinkedIn post, Instagram caption, X thread) from one input

**New UI: "Generate Content" action**
- Available from: Capture cards, Think Tank items, Request details, Interview excerpts
- Opens a panel: select platform(s), content type, tone adjustments
- Shows generated draft(s) with inline editing
- "Send to Workflow" creates a post in the production pipeline (status: `ai_draft`)

**Files**:
- `supabase/functions/generate-content/index.ts`
- `src/components/brain/GenerateContentPanel.tsx`
- Update `CaptureTab.tsx`, `ThinkTank.tsx` with generate action

---

### Batch C: AI Draft Pipeline (Auto-triage + Draft)

Connect the full loop: Capture → Inbox → AI Processing → Draft in Workflow.

**Enhanced edge function: `ai-triage`**
- Processes new Universal Inbox items automatically
- Suggests: client, priority, content type, assignee
- Optionally auto-generates a draft post using Brand Twin context
- Writes suggestions back to `universal_inbox` AI fields

**New UI: "AI Process" button in Universal Inbox**
- One-click AI triage for individual items or batch
- Shows AI suggestions with accept/edit/reject controls
- "Generate Draft" creates an `ai_draft` post directly

**Files**:
- `supabase/functions/ai-triage/index.ts`
- Update `src/pages/team/UniversalInbox.tsx`

---

## Layer 3 Consideration (DIY / Self-Serve)

For the future productized version, the AI Interview becomes the onboarding flow — new users complete an interview instead of filling forms, and the system builds their Brand Twin automatically. The Content Generator becomes their primary creation tool. This batch lays the infrastructure for that.

---

## Summary

| Batch | Scope | Key Deliverables |
|---|---|---|
| **A** | AI Interview | Edge function, chat UI, brain_interviews table, extraction |
| **B** | Content Generator | Edge function, generate panel, multi-platform drafts |
| **C** | AI Draft Pipeline | Auto-triage, inbox AI processing, draft creation |

Batch A is the highest-impact starting point — it's the feature Pressmaster users rave about most ("the interview functionality is actually quite useful"), and it directly feeds your existing Brand Twin with richer data.

