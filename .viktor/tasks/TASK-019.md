# TASK-019: Add send email and copy link actions to brochure detail page

## Objective

Add "Send Email" and "Copy Link" buttons to the brochure detail page, completing the staff workflow for sharing brochures with customers.

## Why

Staff need to deliver brochures to customers. The send button triggers the email, and the copy-link button lets staff share via other channels (WhatsApp, text, etc.). This completes Phase 2 of the brochure feature.

## Requirements

- Add to `apps/web/src/pages/customer/brochure-detail.tsx`:

  - **"Send Email" button** in the header/actions area:
    - Calls `useSendBrochureMutation()` from `use-brochures.ts`
    - Disabled if customer has no email (check from brochure detail data)
    - Shows loading state while sending
    - On success: toast notification "Brochure email sent"
    - On error: toast notification with error message

  - **"Copy Link" button** in the header/actions area:
    - Constructs the public URL: `${window.location.origin}/brochure/${accessToken}`
    - Copies to clipboard using `navigator.clipboard.writeText()`
    - On success: toast notification "Link copied to clipboard"

  - **Email status display**:
    - Below the header or in a metadata section
    - Show "Last sent: [date]" if `emailSentAt` is set
    - Show "Sent [N] times" if `emailSentCount > 0`
    - Show "Not yet sent" if `emailSentCount === 0`

- Update `useSendBrochureMutation()` in `apps/web/src/hooks/use-brochures.ts` if needed (it was stubbed in TASK-013)

## Constraints

- Only show send/copy actions for non-archived brochures
- The send button should be clearly distinguished from the copy button (e.g., different icons: `Mail` for send, `Link` for copy)
- Use `sonner` toast for notifications (already configured globally in App.tsx via `<Toaster>`)

## Implementation Notes

For the copy-to-clipboard pattern:
```typescript
const handleCopyLink = async () => {
  const url = `${window.location.origin}/brochure/${brochure.accessToken}`;
  await navigator.clipboard.writeText(url);
  toast.success('Link copied to clipboard');
};
```

For the send button, use the `useSendBrochureMutation` hook:
```typescript
const sendMutation = useSendBrochureMutation();
const handleSend = () => {
  sendMutation.mutate(brochure.id, {
    onSuccess: () => toast.success('Brochure email sent'),
    onError: (err) => toast.error(err.message || 'Failed to send email'),
  });
};
```

For icons, use `Mail` and `Link` from `lucide-react`.

Place the buttons in the header area alongside the existing edit/archive actions. Consider grouping: primary action (Send Email) as a prominent button, Copy Link as a secondary/ghost button.

## Validation

1. Start dev server: `bun run dev`
2. Navigate to a brochure detail page
3. Click "Copy Link" — verify toast shows and URL is in clipboard
4. Open the copied URL in a new tab — verify public brochure page loads
5. Click "Send Email" — verify toast shows success
6. Check Mailpit — verify email received
7. Verify email status updates (sent count, last sent date)
8. Verify archived brochures don't show send/copy actions
9. Run `bun run build:web` — no TypeScript errors

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
