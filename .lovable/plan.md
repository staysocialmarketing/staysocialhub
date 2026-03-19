

# Fix Mobile Menu Scroll + Connect Capture Pipeline

Two issues to address, plus a discussion on next features.

---

## Issue 1: Mobile Menu Cannot Scroll

**Root cause**: The `SheetContent` uses `max-h-[80vh]` but the Radix Sheet internally blocks body scroll and the `ScrollArea` component needs an explicit fixed height, not just `max-h`. On a 394px viewport, content overflows without scrolling.

**Fix**:
- In `BottomTabBar.tsx`: Add `overflow-hidden` to the `SheetContent`
- In `MobileMenu.tsx`: Replace `ScrollArea` with a plain `div` using `overflow-y-auto max-h-[65vh]` — Radix ScrollArea has known issues inside Sheet/Dialog on mobile touch devices. A native scrollable div works reliably.

**Files**: `src/components/MobileMenu.tsx`, `src/components/BottomTabBar.tsx`

---

## Issue 2: Captures Go Nowhere (No Pipeline Connection)

**Problem**: When a client (or SS user) records a voice note or captures anything via the Global Capture Button, it saves to `brain_captures` only. The internal team's **Universal Inbox** reads from `universal_inbox` — a completely separate table. There is no bridge between them.

**Fix — Database trigger to mirror captures into the inbox**:

Create a Postgres trigger on `brain_captures` that automatically inserts a corresponding row into `universal_inbox` whenever a new capture is created. This gives the internal team immediate visibility.

```sql
CREATE OR REPLACE FUNCTION public.mirror_capture_to_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _source text;
  _client_name text;
BEGIN
  -- Map brain_captures type to inbox source_type
  CASE NEW.type
    WHEN 'voice' THEN _source := 'voice_note';
    WHEN 'file' THEN _source := 'screenshot';
    WHEN 'link' THEN _source := 'quick_capture';
    ELSE _source := 'quick_capture';
  END CASE;

  -- Get client name for the suggested_client field
  SELECT name INTO _client_name FROM public.clients WHERE id = NEW.client_id;

  INSERT INTO public.universal_inbox (
    source_type, title, raw_input_text, attachment_url,
    voice_transcript, suggested_client, status,
    created_by_user_id
  ) VALUES (
    _source,
    COALESCE(NULLIF(NEW.content, ''), 'Capture from ' || COALESCE(_client_name, 'unknown')),
    NEW.content,
    NEW.attachment_url,
    NEW.voice_transcript,
    _client_name,
    'new',
    NEW.created_by_user_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mirror_capture_to_inbox
  AFTER INSERT ON public.brain_captures
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_capture_to_inbox();
```

**Also**: Add a notification for SS admins when a client submits a capture, so the team sees it immediately in their notification bell (not just the inbox).

**Files**: Database migration only (no code changes needed — Universal Inbox already reads from `universal_inbox`)

---

## Summary

| Change | Type | Impact |
|--------|------|--------|
| Fix mobile menu scroll | UI fix | MobileMenu.tsx, BottomTabBar.tsx |
| Bridge captures → Universal Inbox | DB trigger migration | Connects client captures to team workflow |
| Notify SS on client capture | DB trigger addition | Team awareness |

---

## Technical Details

- The trigger uses `SECURITY DEFINER` to bypass RLS when inserting into `universal_inbox` (which only allows SS roles)
- The notification is inserted for all `ss_admin` users with a dedup key to prevent duplicates
- No frontend code changes needed for the inbox connection — the existing Universal Inbox page already queries `universal_inbox` and will show new items automatically

