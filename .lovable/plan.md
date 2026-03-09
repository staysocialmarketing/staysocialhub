

# Sort Tasks Under Projects by Date, Then Name, Then Recent

## Problem
Tasks grouped under projects are currently unsorted -- they appear in whatever order the database returns them.

## Fix

### File: `src/pages/team/Projects.tsx` (lines 113-119)

After grouping tasks by project, sort each group using this logic:

1. **Tasks with due dates** come first, sorted earliest to latest
2. **Tasks without dates** are sorted by title using natural sort (handles "PW 1.1", "PW 1.2", "PW 1.10" correctly)
3. **If titles don't contain numbering**, fall back to most recent (`created_at` descending)

```typescript
// After grouping, sort each project's tasks
Object.values(grouped).forEach((taskList) => {
  taskList.sort((a, b) => {
    // Tasks with due dates first, sorted by date ascending
    if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    if (a.due_at && !b.due_at) return -1;
    if (!a.due_at && b.due_at) return 1;
    // No dates: natural sort by title (handles "PW 1.1" vs "PW 1.2")
    const cmp = a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    // Fallback: most recent first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
});
```

This is a single insertion after line 119, no other files need changes.

