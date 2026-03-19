# Feature Plan: Email Folders & Trash

## Overview

Add Gmail folder navigation (Inbox, Trash) and the ability to trash/untrash email threads. The Inbox view continues using the existing sync-and-cache approach, and Trash is also DB-backed via a new `isTrashed` column. Sent and Spam folders are deferred to a future iteration to avoid introducing an inconsistent hybrid DB/API data model.

## Source

`email-folders-spec.md`

## Notes

- **Why DB-backed trash only (no on-demand Sent/Spam)?** Threads fetched on-demand from Gmail would lack entity links, CRM-enriched metadata, and search/filter consistency. Performance would also suffer (N+1 API calls). Keeping everything DB-backed for v1 ensures a consistent UX. Sent/Spam can be added later with proper caching.
- **Existing gap:** `GET /threads` does not filter out archived threads (`isArchived`). This is addressed as part of Task 4.
- **Edge case — trashing an archived thread:** Trashing sets `isTrashed = true`. The `isArchived` flag is left as-is since it's orthogonal. The inbox query excludes both archived and trashed threads, and the trash query only checks `isTrashed`.
- **Edge case — untrash label restoration:** After calling Gmail's `untrash()`, we re-fetch the thread from Gmail to get accurate labels rather than assuming INBOX.

---

## Phase 1: Backend — Provider Methods

- [X] **Task 1: Add `trashThread` and `untrashThread` to IEmailProvider and GmailProvider**
  - In `apps/api/src/lib/email-providers/types.ts`: Add method signatures to `IEmailProvider`:
    ```typescript
    trashThread(params: { accessToken: string; threadId: string }): Promise<void>;
    untrashThread(params: { accessToken: string; threadId: string }): Promise<void>;
    ```
  - In `apps/api/src/lib/email-providers/gmail.ts`: Implement both methods:
    - `trashThread`: calls `gmail.users.threads.trash({ userId: 'me', id: threadId })`
    - `untrashThread`: calls `gmail.users.threads.untrash({ userId: 'me', id: threadId })`
  - Validation: `bun run build:api` passes

---

## Phase 2: Database Schema

- [X] **Task 2: Add `isTrashed` column to `emailThreads` table**
  - In `packages/shared/src/db/schema.ts`: Add to `emailThreads` table definition:
    ```typescript
    isTrashed: boolean('is_trashed').notNull().default(false),
    ```
    Place it after the existing `isArchived` column (line ~1457).
  - Generate migration: `bun run db:generate`
  - Apply migration: `bun run db:migrate`
  - Validation: Migration applies cleanly; verify column exists in the database

---

## Phase 3: API Routes

- [ ] **Task 3: Add `POST /threads/:threadId/trash` and `POST /threads/:threadId/untrash` endpoints**
  - In `apps/api/src/routes/inbox.ts`, add two endpoints following the existing archive endpoint pattern (lines 331-374):
  - **Trash endpoint:**
    1. Look up thread in DB by `id` + `tenantId`
    2. Get valid access token via `getValidAccessToken(thread.integrationId)`
    3. Call `provider.trashThread({ accessToken, threadId: thread.providerThreadId })`
    4. Update local DB: `set({ isTrashed: true, updatedAt: new Date() })`
    5. Return `{ success: true }`
  - **Untrash endpoint:**
    1. Look up thread in DB by `id` + `tenantId`
    2. Get valid access token
    3. Call `provider.untrashThread({ accessToken, threadId: thread.providerThreadId })`
    4. Re-fetch thread from provider via `provider.getThread()` to get accurate labels after untrash
    5. Update local DB: `set({ isTrashed: false, labelIds: JSON.stringify(freshLabels), updatedAt: new Date() })`
    6. Return `{ success: true }`
  - Validation: `bun run build:api` passes

- [ ] **Task 4: Add `folder` query param to `GET /threads` and fix archived/trashed filtering**
  - In `apps/api/src/routes/inbox.ts`:
  - Update `threadsQuerySchema` to include: `folder: z.enum(['inbox', 'trash']).optional().default('inbox')`
  - **When folder is `inbox`** (default):
    - Add `eq(emailThreads.isArchived, false)` to query conditions (fixes existing gap where archived threads are not excluded)
    - Add `eq(emailThreads.isTrashed, false)` to query conditions
    - Keep all existing filter logic (unread, customers, quotes, jobs, unlinked)
  - **When folder is `trash`**:
    - Add `eq(emailThreads.isTrashed, true)` to query conditions
    - Ignore the `filter` param (entity-link filters don't apply to trash view)
    - Keep search (`q`) and pagination working
  - Update `GET /unread-count` to also exclude trashed threads: add `eq(emailThreads.isTrashed, false)` alongside the existing `eq(emailThreads.isArchived, false)` condition
  - Validation: `bun run build:api` passes

---

## Phase 4: Sync Integration

- [ ] **Task 5: Handle `isTrashed` in full sync and incremental sync**
  - In `apps/api/src/lib/email-sync.ts`:
  - **Full sync** (line ~63-88):
    - When inserting threads, detect TRASH label in `thread.labelIds` and set `isTrashed` accordingly: `isTrashed: thread.labelIds.includes('TRASH')`
    - In `onConflictDoUpdate`, also update `isTrashed` based on labels
  - **Incremental sync — new thread creation** (line ~169-181):
    - Set `isTrashed: msg.labelIds.includes('TRASH')` on insert
  - **Incremental sync — label modifications** (line ~259-308):
    - Currently only checks for UNREAD label changes. Extend to also detect TRASH label:
    - If TRASH is in `addedLabels`: update the thread's `isTrashed = true`
    - If TRASH is in `removedLabels`: update the thread's `isTrashed = false`
    - Note: the `incrementalSync` in `gmail.ts` line 411 filters by `labelId: 'INBOX'`. When a thread is trashed externally (loses INBOX label), this may appear as a `labelsRemoved` event for INBOX rather than a `labelsAdded` for TRASH. Handle both cases:
      - INBOX removed + thread no longer in inbox → may indicate archive or trash. Check if thread's current labels include TRASH.
      - TRASH added → definitively trashed
    - For robustness: when INBOX label is removed during incremental sync, re-fetch the thread's current labels from Gmail via `provider.getThread()` to determine if it was trashed or archived
  - Validation: `bun run build:api` passes

---

## Phase 5: Frontend Hooks

- [ ] **Task 6: Add trash/untrash mutations and folder param to hooks**
  - In `apps/web/src/hooks/use-inbox.ts`:
  - Add `isTrashed: boolean` to the `EmailThread` type (after `isArchived`)
  - Add `folder` to `ThreadsQueryParams` type: `folder?: 'inbox' | 'trash'`
  - Update `fetchInboxThreads` to include `folder` in search params when set
  - Add `trashThread` fetch function: `POST` to `/api/inbox/threads/${threadId}/trash`
  - Add `untrashThread` fetch function: `POST` to `/api/inbox/threads/${threadId}/untrash`
  - Add `useTrashThreadMutation()` hook:
    ```typescript
    export function useTrashThreadMutation() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: trashThread,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-unread-count'] });
        },
      });
    }
    ```
  - Add `useUntrashThreadMutation()` hook (same pattern, same invalidations)
  - Validation: `bun run build:web` passes

---

## Phase 6: Frontend UI

- [ ] **Task 7: Add folder navigation to inbox page**
  - In `apps/web/src/pages/customer/inbox.tsx`:
  - Add `folder` state via URL search params (use existing `searchParams`/`setSearchParams` pattern, not local state) defaulting to `'inbox'`
  - Add folder navigation tabs above the thread list panel — two options: **Inbox** and **Trash**
    - Use simple button/tab styling, with active state indicator
    - Show unread count badge on Inbox tab
  - Pass `folder` to `useInboxThreadsQuery` via `queryParams`
  - When folder is `'trash'`:
    - Hide the filter dropdown (All, Unread, Customers, Quotes, Jobs, Unlinked)
    - Hide the contact filter combobox
    - Keep the search input functional
  - Update the "Messages" heading to show "Trash" when in trash folder
  - When switching folders, deselect any selected thread (`setSelectedThreadId(null)`)
  - Import `Trash2` icon from lucide-react for trash folder tab
  - Validation: `bun run dev`, navigate between Inbox and Trash tabs, verify thread lists change and filter controls show/hide correctly

- [ ] **Task 8: Add trash/untrash buttons to thread detail action bar**
  - In `apps/web/src/pages/customer/inbox.tsx`:
  - Import `useTrashThreadMutation` and `useUntrashThreadMutation` from hooks
  - Import `Trash2` and `Undo2` (or `ArchiveRestore`) icons from lucide-react
  - Add a `handleTrash` function (mirrors existing `handleArchive`):
    - Call `trashMutation.mutateAsync(selectedThreadId)`
    - On success: `setSelectedThreadId(null)`, toast "Thread moved to trash"
    - On error: toast "Failed to trash thread"
  - Add a `handleUntrash` function:
    - Call `untrashMutation.mutateAsync(selectedThreadId)`
    - On success: `setSelectedThreadId(null)`, toast "Thread moved to inbox"
    - On error: toast "Failed to restore thread"
  - **Action button visibility per folder:**
    - **Inbox folder:** Reply, Link to..., Archive, **Trash** (new)
    - **Trash folder:** Reply, **Move to Inbox** (untrash) — hide Archive and Trash buttons
  - Read current `folder` from search params to determine which buttons to show
  - Validation: `bun run dev`:
    1. Open inbox, select a thread, verify Trash button appears next to Archive
    2. Trash a thread, verify it disappears from inbox and toast shows
    3. Switch to Trash folder, select the trashed thread
    4. Verify "Move to Inbox" button appears (no Archive or Trash buttons)
    5. Click "Move to Inbox", verify thread disappears from trash and toast shows
    6. Switch back to Inbox, verify thread reappears

---

## Out of Scope (Future Work)

- Sent folder (requires on-demand Gmail API fetch + caching strategy)
- Spam folder (same as above)
- Custom Gmail labels / user-created labels
- Drafts folder
- Starred / Important views
- Permanent delete
- Bulk trash operations (select multiple threads)
- Bulk actions in general
