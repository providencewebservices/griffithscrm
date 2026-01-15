# Job Workflow System - Planning Document

> Created: January 2026
> Status: Planning - Not yet implemented

## Background

The client provided example workflows showing how they track jobs through their lifecycle. This document captures the analysis and proposed implementation plan.

## Client's Example Workflows

### New Memorial (Sandblasted - In House)
Reference Number → Client Name → Date Quoted → Expiry Date → Quote Status → Deposit Status → Order Status → Rhys Worksheet → Forms & Fees → Memorial Proof → Memorial Proof Status → Proposed Delivery Date → Mark Worksheet → Fixing Date → Job Status → Invoiced Date → Account Status → Review (Post Sales)

### New Memorial (Hand Cut - External)
Reference Number → Client Name → Date Quoted → Expiry Date → Quote Status → Deposit Status → Order Status → Rhys Worksheet → Forms & Fees → Rich Worksheet → Memorial Proof → Memorial Proof Status → Proposed Delivery Date → Mark Worksheet → Fixing Date → Job Status → Invoiced Date → Account Status → Review (Post Sales)

### Additional Inscriptions
Reference Number → Client Name → Date Quoted → Expiry Date → Quote Status → Rhys Worksheet → Forms & Fees → Mark Worksheet → Re-Fixing Date → Job Status → Invoiced Date → Account Status → Review (Post Sales)

### Refurbishment
Reference Number → Client Name → Date Quoted → Expiry Date → Quote Status → Mark Worksheet → Job Start Date → Job Status → Invoiced Date → Account Status → Review (Post Sales)

### Ashes
Reference Number → Client Name → Date Quoted → Expiry Date → Quote Status → Mark Worksheet → Date of Ashes → Invoiced Date → Account Status

---

## Current System Analysis

### What Already Exists ✅

| Client Field | Current System |
|--------------|----------------|
| Reference Number | Quote/Job ID |
| Client Name | Customer relationship |
| Date Quoted | `createdAt` |
| Expiry Date | `validUntil` |
| Quote Status | `status` (draft→review→ready→presented→accepted) |
| Deposit Status | Payment schedule items |
| Order Status | Job `status` |
| Memorial Proof | Job attachments (category: 'proof') |
| Fixing Date | `installationDate` |
| Job Status | `status` (pending→materials_ordered→in_production→...) |

### What's Missing ❌

| Client Field | Notes |
|--------------|-------|
| Worksheets (Rhys, Rich, Mark) | Need generic task assignment system |
| Forms & Fees | Need checklist for paperwork/permits |
| Memorial Proof Status | Need approval workflow (sent, approved, revision) |
| Proposed Delivery Date | Need dedicated field |
| Invoiced Date | Need `invoicedAt` field |
| Account Status | Need calculated status (pending/invoiced/paid/overdue) |
| Review (Post Sales) | Need follow-up tracking |
| Re-Fixing Date | Need for additional inscriptions |
| Job Start Date | Need for refurbishments |
| Date of Ashes | Need for ashes jobs |
| In-House vs External | Need production type field |

---

## Proposed Solution

### Key Decisions Made

1. **Worksheets** → Generic task system (not hardcoded names)
2. **In-House vs External** → Add `productionType` field to quotes/jobs
3. **Scope** → Full workflow rebuild (when ready to implement)

### New Database Tables Needed

1. **`workflow_templates`** - Defines what tasks are needed per quote type + production type
2. **`workflow_task_definitions`** - Template tasks for each workflow
3. **`job_tasks`** - Actual task instances on jobs with assignment/completion tracking
4. **`job_proofs`** - Enhanced proof tracking with approval workflow
5. **`job_forms_fees`** - Checklist for required paperwork

### Modifications to Existing Tables

**`jobs` table additions:**
- `productionType` (in_house | external)
- `invoicedAt`, `invoiceNumber`, `accountStatus`
- `proposedDeliveryDate`, `fixingDate`, `refixingDate`, `jobStartDate`, `ashesDate`
- `reviewCompletedAt`, `reviewNotes`, `reviewRating`

**`quotes` table additions:**
- `productionType` (in_house | external)

### New UI Components

- **Tasks Tab** on job detail page (kanban/list view)
- **Proofs Tab** with approval workflow
- **Forms & Fees Tab** with checklist
- **Review Tab** for post-sales follow-up
- **Workflows Settings** page for template configuration
- **Production Type** selector on quote form

---

## Suggested Phasing

### Phase 1: Foundation
- Schema changes + migrations
- Production type field on quotes/jobs
- Basic job fields (invoicedAt, accountStatus, workflow dates)
- ~2-3 hours

### Phase 2: Task System
- Workflow templates and task definitions tables
- Job tasks API and UI
- Task assignment and completion
- ~4-6 hours

### Phase 3: Proof Workflow
- Job proofs table
- Upload, send, approve workflow
- Proofs tab UI
- ~3-4 hours

### Phase 4: Forms & Fees
- Forms/fees table
- Checklist UI
- ~2-3 hours

### Phase 5: Review & Polish
- Post-sales review
- Settings page for workflow templates
- Refinements
- ~2-3 hours

---

## Critical Files for Implementation

1. `packages/shared/src/db/schema.ts` - Add new tables and fields
2. `apps/api/src/routes/jobs.ts` - Add task/proof/forms sub-routes
3. `apps/web/src/pages/customer/job-detail.tsx` - Add new tabs
4. `apps/web/src/hooks/use-jobs.ts` - Add hooks for new APIs
5. `apps/api/src/routes/quotes.ts` - Copy productionType on job creation

---

## Default Workflows to Seed

### New Memorial (In-House)
1. Admin: Deposit received
2. Forms & Fees: Council permit / Faculty
3. Admin: Order materials
4. Production: Create proof
5. Proof: Send to customer
6. Proof: Await approval
7. Production: Begin stonework
8. Install: Schedule installation
9. Install: Complete installation
10. Invoicing: Send final invoice
11. Review: Follow-up

### New Memorial (External)
Same as in-house but with "Order from supplier" instead of production tasks

### Additional Inscription
1. Admin: Deposit received
2. Forms & Fees: Check permits
3. Install: Re-fixing date [DATE FIELD]
4. Install: Complete work
5. Invoicing: Send invoice
6. Review: Follow-up

### Refurbishment
1. Admin: Confirm booking
2. Install: Job start date [DATE FIELD]
3. Install: Complete refurbishment
4. Invoicing: Send invoice
5. Review: Follow-up

### Ashes
1. Admin: Confirm booking
2. Install: Date of ashes [DATE FIELD]
3. Install: Complete interment
4. Invoicing: Send invoice

---

## Notes

- The "worksheets" in client examples (Rhys, Rich, Mark) are specific team members - we're building a generic task assignment system instead
- External production (hand cut memorials) needs supplier coordination tasks that in-house doesn't
- Forms & fees requirements often depend on the memorial site (church vs council cemetery)
- Proof approval could eventually have a customer-facing portal, but initially just internal tracking
