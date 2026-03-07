

# Storage & Data Management Strategy

## Current State

You have 3 storage buckets (creative-assets, request-attachments, profile-assets) with a 10MB per-file limit. Files are uploaded but **never cleaned up** — archived/deleted posts leave orphaned files in storage. There's also no image compression or thumbnail generation, so raw full-size uploads accumulate indefinitely.

## What This Means Long-Term

As clients grow, storage will balloon — especially with video. A single client uploading 5 videos/week at 10MB each = ~2.5GB/year per client. Without cleanup or optimization, this becomes costly and slow.

## Recommended Plan (Incremental, Won't Break Anything)

### Phase 1 — Image Compression on Upload (Now, V1)
- **Client-side image resize** before uploading: compress images to max 1920px wide and ~80% quality using canvas API. This alone can reduce image storage by 60-80%.
- Apply to all upload points: ContentLibrary, Workflow, AdminContent, PostDetail, Profile, Requests.
- Extract into a shared `compressImage()` utility.
- Videos stay as-is (already capped at 10MB).

### Phase 2 — Orphan Cleanup on Delete/Archive (Now, V1)
- When a post is deleted or archived in AdminMedia, also delete the corresponding file from the `creative-assets` bucket.
- Same for request attachments when requests are deleted.
- This prevents dead files from accumulating.

### Phase 3 — Lazy Loading & Pagination (Now, V1)
- Media library queries currently fetch ALL published posts. Add `.limit(50)` with a "Load More" button or infinite scroll to avoid loading hundreds of thumbnails at once.
- Already important for mobile performance.

### Phase 4 — Future Versions (V2+)
- **Thumbnail generation**: Edge function that creates small preview thumbnails on upload, serving those in grids instead of full-size images.
- **Storage quotas per client**: Track usage and enforce limits.
- **CDN caching**: Lovable Cloud storage already serves via CDN, but adding cache headers can improve repeat load times.
- **Video transcoding**: Convert uploaded videos to optimized web formats.

## Files to Change

| File | Change |
|------|--------|
| `src/lib/imageUtils.ts` (new) | Shared `compressImage()` utility — resizes to max 1920px, outputs WebP/JPEG at 80% quality |
| `src/pages/ContentLibrary.tsx` | Use `compressImage()` before upload |
| `src/pages/Workflow.tsx` | Use `compressImage()` before upload |
| `src/pages/admin/AdminContent.tsx` | Use `compressImage()` before upload |
| `src/pages/PostDetail.tsx` | Use `compressImage()` before upload |
| `src/pages/Profile.tsx` | Use `compressImage()` before upload |
| `src/components/MakeRequestDialog.tsx` | Use `compressImage()` before upload |
| `src/components/RequestDetailDialog.tsx` | Use `compressImage()` before upload |
| `src/pages/Requests.tsx` | Use `compressImage()` before upload |
| `src/pages/admin/AdminMedia.tsx` | Delete storage file on post delete; add pagination (limit 50 + Load More) |
| `src/pages/ContentLibrary.tsx` | Add pagination (limit 50 + Load More) |

## Security Note
Your RLS policies are solid — all tables enforce `is_ss_role()` or `can_access_client()`. The `SECURITY DEFINER` functions properly bypass RLS for role checks without exposing data. No changes needed there. The compression and cleanup work is purely about resource efficiency, not security.

