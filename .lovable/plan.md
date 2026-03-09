

# Fix: Project Edit Button Not Visible

## Problem
The edit (pencil) button on each project card uses `opacity-0 group-hover:opacity-100` to show on hover, but the parent `<Card>` element is missing the `group` class. This means the button is always invisible and cannot be clicked.

## Fix

**File: `src/pages/team/Projects.tsx` (line 329)**
- Add the `group` class to the `<Card>` element so that `group-hover:opacity-100` triggers correctly on the pencil button.

This is a one-line CSS class fix. No database or RLS changes needed -- the `projects` table already has an `ALL` policy for `is_ss_role()`, so updates will succeed once the button is clickable.

