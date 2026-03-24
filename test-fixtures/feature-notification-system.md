# Feature: In-App Notification System

## Context
Our CRM (griffiths-crm) currently has no way to notify users about events that matter to them — when a quote they're working on gets approved, when a job they're assigned to changes status, when someone comments on a quote. Users have to manually check or rely on asking colleagues.

## Goals
- Real-time in-app notifications for key events
- Notification bell in the header with unread count badge
- Dropdown panel showing recent notifications, grouped by today / earlier
- Mark as read (individual and bulk)
- Click a notification to navigate to the relevant entity (quote, job, etc.)
- Notification preferences per user (which event types to receive)

## Event Types
1. **Quote approved** — notify the quote creator when a quote is approved
2. **Quote needs review** — notify admins when a quote is submitted for review
3. **Job status changed** — notify the assigned user when a job moves to a new status
4. **Job assigned** — notify a user when they're assigned to a job
5. **Comment added** — notify participants on a quote/job when a new comment is posted
6. **Proof approved/revision requested** — notify the proof uploader

## Technical Constraints
- The app uses Hono on the backend, React + TanStack Query on the frontend
- WebSocket support is not currently set up — polling is acceptable for v1
- The existing layout component in `apps/web/src/components/layout/app-layout.tsx` renders the header
- User session is available via `useSession()` hook
- The app uses the same multi-tenant pattern everywhere: tenantId scoping on all queries

## Out of Scope
- Push notifications (browser or mobile)
- Email digests
- Notification channels (Slack, webhook) — future iteration
- Real-time WebSocket delivery — polling every 30s is fine for v1
