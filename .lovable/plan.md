
# Stay Social HUB — Roadmap

## ✅ Phase 6A: Content Generator + Voice Reliability (Complete)
- AI Content Generator with Brand Twin integration
- Voice agent logging and test endpoint

## ✅ Phase 6B: Client Experience Polish (Complete)
- Client Reporting Dashboard (content_metrics table + charts in Success Center)
- Client Onboarding Wizard (multi-step modal for first-time clients)
- Request Status Tracking (activity timeline + notification trigger on status change)

## 🔨 Phase 7: Integrations + Automation (In Progress)

### ✅ 8. Automation Rules Engine
- `automation_rules` table (trigger_event, conditions_json, action_type, action_config_json)
- `process-automation-rules` edge function for rule evaluation + execution
- Admin UI at `/admin/automations` with rule builder

### 6. Social Platform Connections
- New `social_accounts` table linking clients to platform credentials
- Publish-to-platform action from the Workflow board

### 7. Email Platform Integration
- "Send" action for email-type posts from Workflow
- Template rendering with client branding

---

## Phase 8: DIY / Self-Serve Platform

### 9. Self-Serve Signup + Plan Selection
- Public landing page with plan tiers
- Stripe integration for subscription billing

### 10. DIY Content Calendar
- Simplified workflow (no internal review stages)
- AI-generated content suggestions

### 11. Marketplace Expansion
- Browse and purchase add-on services
- Stripe payment integration
