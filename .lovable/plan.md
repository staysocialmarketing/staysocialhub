

# Remove Client Switcher from Header

## Change: `src/components/AppLayout.tsx`

Remove the client switcher `Select` dropdown and its related imports (`useClientFilter`, `useQuery`, `supabase`, `Select*` components) from the header. The `ClientFilterProvider` and `ClientFilterContext` remain untouched for future use.

| File | Change |
|------|--------|
| `src/components/AppLayout.tsx` | Remove client switcher UI + unused imports |

No other files changed.

