

# Request Intelligence System

## Summary
Expand the `request_type` enum from 2 values to 7, update all creation/display/filtering UIs, and set the correct `content_type` on auto-created workflow posts based on request type.

## Database Changes

### 1. Expand `request_type` enum
```sql
ALTER TYPE public.request_type ADD VALUE IF NOT EXISTS 'design';
ALTER TYPE public.request_type ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE public.request_type ADD VALUE IF NOT EXISTS 'automation';
ALTER TYPE public.request_type ADD VALUE IF NOT EXISTS 'strategy';
ALTER TYPE public.request_type ADD VALUE IF NOT EXISTS 'general';
```

### 2. Backfill legacy requests without type
Not needed — the `type` column already has `NOT NULL` and all existing records have a value.

### 3. Update `auto_create_post_from_request` trigger
Set `content_type` on the auto-created post based on request type:
- `social_post` → `image` (default social)
- `email_campaign` → `email_campaign`
- `video` → `video`
- `design` → `graphic_design`
- All others → `general_task`

```sql
CREATE OR REPLACE FUNCTION public.auto_create_post_from_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _ss_user record;
  _content_type text;
BEGIN
  CASE NEW.type::text
    WHEN 'social_post' THEN _content_type := 'image';
    WHEN 'email_campaign' THEN _content_type := 'email_campaign';
    WHEN 'video' THEN _content_type := 'video';
    WHEN 'design' THEN _content_type := 'graphic_design';
    ELSE _content_type := 'general_task';
  END CASE;

  INSERT INTO public.posts (client_id, title, caption, status_column, created_by_user_id, content_type, request_id)
  VALUES (NEW.client_id, NEW.topic, NEW.notes, 'idea', NEW.created_by_user_id, _content_type, NEW.id);

  -- notify SS users (unchanged)
  FOR _ss_user IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('ss_admin','ss_producer','ss_ops','ss_team')
      AND ur.user_id IS DISTINCT FROM NEW.created_by_user_id
  LOOP
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (_ss_user.user_id, 'New request', NEW.topic, '/requests');
  END LOOP;
  RETURN NEW;
END;
$$;
```

## Frontend Changes

### Shared: Request type config constant
Create a shared `REQUEST_TYPE_OPTIONS` array in `src/lib/workflowUtils.ts`:
```typescript
export const REQUEST_TYPE_OPTIONS = [
  { value: "social_post", label: "Social Post" },
  { value: "email_campaign", label: "Email Campaign" },
  { value: "design", label: "Design" },
  { value: "video", label: "Video" },
  { value: "automation", label: "Automation" },
  { value: "strategy", label: "Strategy" },
  { value: "general", label: "General" },
];
```

### File: `src/pages/Requests.tsx`
- Replace hardcoded type select (Social Post / Email Campaign) with full `REQUEST_TYPE_OPTIONS` list
- Add a **request type filter** dropdown above the request list (All / each type)
- Display request type as an **outline badge** in the top-right of each request card
- Remove email-specific conditional form fields (campaign_type, audience, deadline) — keep form simple: Title, Notes, Priority, Attachment, Type, Client
- Filter the `requests` query client-side by selected type filter

### File: `src/components/MakeRequestDialog.tsx`
- Replace 2-option type select with full `REQUEST_TYPE_OPTIONS`
- Remove email-specific conditional fields to keep form simple

### File: `src/components/RequestDetailDialog.tsx`
- Update type select to show all 7 options when editing
- Display type as outline badge in header

## Files Summary

| Action | File | Change |
|--------|------|--------|
| Migration | enum + trigger | Add 5 enum values, update trigger for content_type mapping |
| Edit | `src/lib/workflowUtils.ts` | Add `REQUEST_TYPE_OPTIONS` |
| Edit | `src/pages/Requests.tsx` | Full type list, type filter, type badge on cards |
| Edit | `src/components/MakeRequestDialog.tsx` | Full type list, simplified form |
| Edit | `src/components/RequestDetailDialog.tsx` | Full type list in edit mode, type badge |

