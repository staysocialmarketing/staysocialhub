

# Add Edit Buttons to Task Rows in Projects View

## Problem
Task rows inside the Projects view don't have a visible edit pencil button like sub-projects do. Users must click the row to open the detail dialog and then find the Edit button inside. This is not discoverable.

Additionally, the task row has a `group` class that interferes with the parent Card's `group-hover` behavior for the top-level project edit button.

## Changes

### File: `src/pages/team/Projects.tsx`

**1. Add pencil edit button to `renderTaskRow`**
- Add a pencil icon button (matching sub-project style) to each task row that opens the TaskDetailDialog
- This makes editing tasks as discoverable as editing sub-projects

**2. Remove stray `group` class from task row**
- The task row div has `group` which overrides the parent Card's group context but isn't used by anything inside the row

The result: hovering over any task row will show a pencil icon, and clicking it opens the task detail dialog for editing. Sub-projects already have this functionality and require no changes.

