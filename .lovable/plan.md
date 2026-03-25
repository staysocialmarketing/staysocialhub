

# Fix: Dashboard Stuck on "Loading..."

## Root Cause

The `AuthContext` sets `loading = false` only after `applySession` completes, which calls `fetchProfile`, which makes 3 sequential database queries (`allowed_domains`, `users`, `user_roles`). If any of these queries stall (common in the Lovable preview proxy environment), `loading` stays `true` forever and the entire app shows "Loading..."

The Lovable preview fetch proxy is known to intermittently break Supabase data requests. The published URL (`hub.staysocial.ca`) should work fine.

## Fix

### `src/contexts/AuthContext.tsx`

1. **Add a loading timeout safety net** — if `loading` is still `true` after 8 seconds, force it to `false`. This prevents the infinite loading state regardless of cause.

2. **Wrap `fetchProfile` in try/catch** — ensure that if any query throws, `applySession` still completes rather than hanging silently.

3. **Add `setLoading(false)` after the `onAuthStateChange` callback's `applySession` too** — currently only `initializeAuth` sets loading to false, but if the auth state change callback runs first and takes a long time, the user sees loading until it finishes. Both paths should guarantee loading ends.

```typescript
// In initializeAuth, add timeout:
const timeout = setTimeout(() => {
  if (isMounted) setLoading(false);
}, 8000);

// In finally block:
clearTimeout(timeout);
if (isMounted) setLoading(false);
```

Also wrap `fetchProfile` body in try/catch so a failed query doesn't prevent completion.

## Files Changed

| File | Change |
|---|---|
| `src/contexts/AuthContext.tsx` | Add loading timeout, wrap fetchProfile in try/catch |

