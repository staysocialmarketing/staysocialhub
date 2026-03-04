

# Fix Uploads and Attachments in Request Flows

## Problems Identified

1. **Requests page upload**: The file upload works mechanically, but the error handler shows a generic "Failed to submit request" — if the upload fails (e.g. large file, network issue), users get no useful feedback and the entire submission is blocked.

2. **MakeRequestDialog has no attachment option at all** — the "Make This a Request" flow from Think Tank/Projects/Tasks doesn't let users attach files.

3. **RequestDetailDialog has no way to add/replace attachments** — once a request is created, you can only download the existing attachment but never upload a new one.

4. **No file validation** — no size limit check or accepted file type guidance before upload attempt.

5. **Generic error messages** — upload errors silently swallowed into a generic toast.

## Changes

### `src/pages/Requests.tsx`
- Add client-side file size validation (max 10MB) before submission
- Show actual error message in the `onError` callback instead of generic text
- Add accepted file types hint on the file input
- Make attachment upload non-blocking: if upload fails, still create the request without attachment and show a warning toast

### `src/components/MakeRequestDialog.tsx`
- Add an optional file attachment input
- Upload file to `request-attachments` bucket on submit, store path in `attachments_url`
- Same size validation (10MB)
- Non-blocking: if upload fails, create request anyway with a warning

### `src/components/RequestDetailDialog.tsx`
- Add an "Upload Attachment" button in edit mode to add/replace attachments
- Upload to `request-attachments` bucket, update `attachments_url` on the request
- Show upload progress/state feedback

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Requests.tsx` | Add file validation, better error messages, non-blocking upload |
| `src/components/MakeRequestDialog.tsx` | Add attachment file input + upload logic |
| `src/components/RequestDetailDialog.tsx` | Add attachment upload in edit mode |

