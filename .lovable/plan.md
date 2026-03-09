

# Task Completion Sync, Animations, and Status Colors

## Problems Found

1. **Status mismatch**: The Tasks page uses `"complete"` as the final status, but the Projects page uses `"done"` in its task status dropdown and filters tasks by `t.status !== "done"`. This means completed tasks never disappear from project counts, and the status dropdown options are inconsistent.
2. **No completion animations** on tasks or projects.
3. **No color-coded status badges** on task rows within projects -- only priority badges are colored.
4. **No auto-complete for projects** when all tasks finish.

## Changes

### 1. Fix status sync (Projects page)

**File: `src/pages/team/Projects.tsx`**

- Change the task status `<SelectItem>` values in `renderTaskRow` from `"todo"/"in_progress"/"done"` to match the full task lifecycle: `"backlog"/"todo"/"in_progress"/"waiting"/"review"/"complete"`.
- Update the task count filter from `t.status !== "done"` to `t.status !== "complete"` (appears twice, lines ~345-348).

### 2. Add color-coded status badges

**File: `src/pages/team/Tasks.tsx`** and **`src/pages/team/Projects.tsx`**

Add a shared `statusColors` map for task statuses:

```typescript
const taskStatusColors: Record<string, string> = {
  backlog: "bg-muted text-muted-foreground",
  todo: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  waiting: "bg-purple-500/15 text-purple-700 border-purple-500/20",
  review: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  complete: "bg-green-500/15 text-green-700 border-green-500/20",
};
```

Apply these colors to the status `<SelectTrigger>` on task cards (Tasks page) and task rows (Projects page) so the current status is visually color-coded.

### 3. Completion animation for tasks

**File: `src/index.css`** -- add a `@keyframes task-complete` animation (confetti-like scale-bounce or checkmark flash).

**File: `src/pages/team/Tasks.tsx`** -- when a task moves to `"complete"`, briefly apply an `animate-task-complete` class to the card before it moves columns.

**File: `src/pages/team/Projects.tsx`** -- same animation on the task row when status changes to `"complete"` via the dropdown. Show a celebratory toast with confetti emoji.

### 4. Auto-complete project when all tasks are done

**File: `src/pages/team/Projects.tsx`**

After `updateTaskStatus` sets a task to `"complete"`, check if all remaining tasks in that project are also `"complete"`. If so:
- Auto-update the project status to `"completed"`.
- Show a bigger celebratory toast ("Project complete! All tasks finished.").
- Apply a larger animation (scale + glow) on the project card.

### 5. Sync task completion animation (CSS)

**File: `src/index.css`**

```css
@keyframes task-complete {
  0% { transform: scale(1); }
  30% { transform: scale(1.05); background-color: hsl(var(--success) / 0.15); }
  100% { transform: scale(1); }
}

@keyframes project-complete {
  0% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--success) / 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 0 8px hsl(var(--success) / 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--success) / 0); }
}
```

## Summary of sync behavior
- Completing a task on Tasks page or Projects page uses the same `"complete"` status value.
- Projects page task count excludes `"complete"` tasks.
- When all project tasks reach `"complete"`, the project auto-marks as `"completed"`.
- Both pages share the same color scheme for task statuses.

