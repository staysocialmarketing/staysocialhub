

# Dashboard Greeting: "Hey" vs "Welcome Back" Logic

## Concept
- **First visit of the day**: "Hey, {firstName} 👋"
- **Return visit within same 24-hour period**: "Welcome back, {firstName} 👋"

Track the last login timestamp in `localStorage`. On dashboard load, check if a login was already recorded today. If yes → "Welcome back"; if no → "Hey" and store the current timestamp.

## Changes

### `src/pages/Dashboard.tsx`

**Both dashboards** (WorkQueueDashboard line ~182, ClientDashboard line ~487):

Add a helper that checks `localStorage` for a key like `last_dashboard_visit_{userId}`:
- If the stored timestamp is within the last 24 hours → return `true` (returning user)
- Otherwise → store current timestamp, return `false` (first visit today)

**WorkQueueDashboard** (line 182):
- Currently: `Hey, {firstName} 👋`
- Change to: if returning → `Welcome back, {firstName} 👋` / if first visit → `Hey, {firstName} 👋`

**ClientDashboard** (line 487-488):
- Currently: `Welcome back, {firstName} 👋`
- Change to: same logic — first visit → `Hey`, return visit → `Welcome back`

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Add localStorage-based 24h return detection; update both greeting headings |

