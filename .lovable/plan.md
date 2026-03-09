

# Fix: Include All Team Members in Projects Assignee Dropdown

## Problem
The Projects page (`src/pages/team/Projects.tsx` line 161) fetches staff users with roles `["ss_admin", "ss_producer", "ss_ops"]` but is **missing `"ss_team"`**. This means team members like Tristan and Gavin don't appear in the assignee dropdowns on the Projects page.

All other pages (Tasks, Requests, ThinkTank, Workflow, etc.) already include `"ss_team"` correctly.

## Fix

### File: `src/pages/team/Projects.tsx` (line 161)

Add `"ss_team"` to the role filter array:

```typescript
// Before:
.in("role", ["ss_admin", "ss_producer", "ss_ops"])

// After:
.in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"])
```

This is a one-line fix. The "🤝 Team (All Hands)" option is already present in the dropdown and will continue to work alongside individual team member options.

