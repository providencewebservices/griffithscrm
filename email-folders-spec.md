# Email Folders & Trash — Feature Spec

## Overview

Add Gmail folder navigation (Inbox, Sent, Trash, Spam) and the ability to trash/untrash emails. Currently the integration is inbox-only with no way to view sent mail, trashed items, or spam.

## Scope

### Folder Navigation

- Add a folder sidebar/navigation to the inbox page with: **Inbox, Sent, Trash, Spam**
- Inbox remains the default and primary view
- The existing filter tabs (All, Unread, Customers, Quotes, Jobs, Unlinked) are scoped to the Inbox folder only — hidden when viewing other folders
- Entity link badges remain visible in all folder views
- Search works across the active folder

### Trash Action

- Add a trash button to the thread detail view
- Calls Gmail's `users.threads.trash()` API
- Updates local cache: removes from inbox view, updates `labelIds`
- No permanent delete — only recoverable trash (30-day auto-delete by Gmail)

### Untrash Action

- Available when viewing a thread in the Trash folder
- Calls Gmail's `users.threads.untrash()` API
- Moves the thread back to Inbox

### Sync Strategy

- **Inbox**: Continues using the existing sync-and-cache approach (background sync, incremental via history API, push notifications)
- **Sent, Trash, Spam**: Fetched on-demand from Gmail API when the user navigates to that folder. Lightweight local caching optional but not required for v1
- This keeps the sync simple and avoids extra API quota for folders users rarely check

## Technical Changes

### Gmail Provider (`apps/api/src/lib/email-providers/gmail.ts`)

- Add `trashThread(threadId)` — calls `users.threads.trash`
- Add `untrashThread(threadId)` — calls `users.threads.untrash`
- Add `listThreadsByLabel(labelId, options)` — fetches threads filtered by Gmail label (used for Sent, Trash, Spam on-demand views)

### API Routes

**Inbox routes (`apps/api/src/routes/inbox.ts`):**

- `POST /threads/:threadId/trash` — trash a thread
- `POST /threads/:threadId/untrash` — untrash a thread
- Modify `GET /threads` — add a `folder` query param (inbox, sent, trash, spam)
  - `inbox` (default): existing cached behavior
  - `sent` / `trash` / `spam`: on-demand fetch from Gmail API, return directly

### Database Schema

- No new tables needed
- When a thread is trashed, update its `labelIds` in `emailThreads` and remove it from the inbox view
- Consider adding an `isTrashed` boolean to `emailThreads` for quick filtering (mirrors the `isArchived` pattern)

### Frontend

**Inbox page (`apps/web/src/pages/customer/inbox.tsx`):**

- Add folder navigation (sidebar or top-level tabs above the existing filter tabs)
- Active folder controls which thread list endpoint/params are used
- Existing filter tabs only visible for Inbox folder
- Thread detail: show Trash button (when in Inbox/Sent), show Untrash button (when in Trash)

**Hooks (`apps/web/src/hooks/use-inbox.ts`):**

- Add `useTrashThreadMutation()`
- Add `useUntrashThreadMutation()`
- Update `useInboxThreadsQuery()` to accept a `folder` param

## Out of Scope

- Custom Gmail labels / user-created labels
- Drafts folder (composing happens in the CRM, not Gmail)
- Starred / Important views
- Permanent delete
- Bulk trash operations (select multiple threads)
- Offline/cached views of Sent/Trash/Spam folders
