# Feature: Job Workflow System

## Overview

Implement a structured workflow system that models how Griffiths CRM's team actually tracks jobs through their lifecycle. Each job type (new memorial in-house, new memorial external, additional inscription, refurbishment, ashes) follows a distinct sequence of steps. The system replaces the current generic job status progression with a richer model that includes role-based task assignments, proof approval workflows, forms/fees checklists, financial tracking fields, and post-sales review.

## Background & Motivation

The client provided workflow notes showing how they currently track jobs on paper/spreadsheets. Each workflow is a linear sequence of named fields, each representing a checkpoint or piece of information that must be captured at that stage. The existing app has a quote-to-job pipeline with type-aware status sequences, but it lacks the granularity these workflows describe — specifically around who does what, proof approvals, required paperwork, invoicing, and post-completion review.

An earlier planning document exists at `docs/WORKFLOW-SYSTEM-PLAN.md` (January 2026) that captured the initial analysis. This feature description supersedes it with full implementation specifications.

## Client Workflow Definitions

These are the five workflows the client uses, shown as ordered sequences of steps:

### New Memorial — Sandblasted (In-House)
Reference Number → Client Name → Date Quoted → Expiry Date → Quote Status → Deposit Status → Order Status → Rhys Worksheet → Forms & Fees → Memorial Proof → Memorial Proof Status → Proposed Delivery Date → Mark Worksheet → Fixing Date → Job Status → Invoiced Date → Account Status → Review (Post Sales)

### New Memorial — Hand Cut (External)
Reference Number → Client Name → Date Quoted → Expiry Date → Quote Status → Deposit Status → Order Status → Rhys Worksheet → Forms & Fees → Rich Worksheet → Memorial Proof → Memorial Proof Status → Proposed Delivery Date → Mark Worksheet → Fixing Date → Job Status → Invoiced Date → Account Status → Review (Post Sales)

### Additional Inscriptions
Reference Number → Client Name → Date Quoted → Expiry Date → Quote Status → Rhys Worksheet → Forms & Fees → Mark Worksheet → Re-Fixing Date → Job Status → Invoiced Date → Account Status → Review (Post Sales)

### Refurbishment
Reference Number → Client Name → Date Quoted → Expiry Date → Quote Status → Mark Worksheet → Job Start Date → Job Status → Invoiced Date → Account Status → Review (Post Sales)

### Ashes
Reference Number → Client Name → Date Quoted → Expiry Date → Quote Status → Mark Worksheet → Date of Ashes → Invoiced Date → Account Status

## Existing System — What Already Works

These workflow fields already map to existing functionality and need no changes:

| Workflow Field | Existing Implementation | Location |
|---|---|---|
| Reference Number | `jobNumber` (J-00001) and `quoteNumber` (Q-00001) | `jobs.jobNumber`, `quotes.quoteNumber` |
| Client Name | Customer linked via quote → customer relationship | `quotes.customerId` → `customers` |
| Date Quoted | Quote creation timestamp | `quotes.createdAt` |
| Expiry Date | Quote validity period | `quotes.validUntil`, `quotePackages.validUntil` |
| Quote Status | Full status workflow (draft → review → ready → presented → accepted/rejected) | `quotePackages.status` |
| Order Status | Job status progression with type-aware sequences | `jobs.status` with `STATUS_SEQUENCES` in `apps/api/src/routes/jobs.ts:89-95` |
| Job Status | Same as Order Status — tracked via `jobs.status` | Same |
| Fixing Date | Installation date field on jobs | `jobs.installationDate` |

## What Needs to Be Built

### 1. Production Method Field

**Problem**: The client distinguishes "Sandblasted (In-House)" from "Hand Cut (External)" new memorials. These follow different workflows — external jobs need a supplier coordination step ("Rich Worksheet") that in-house jobs don't.

**Solution**: Add a `productionMethod` field to quotes and jobs.

**Schema changes** (in `packages/shared/src/db/schema.ts`):

- Add enum constant: `PRODUCTION_METHODS = ['in_house', 'external'] as const`
- Add to `quotePackages` table: `productionMethod: text('production_method')` — nullable, only relevant for `new_memorial` quote type
- Add to `quotes` table: `productionMethod: text('production_method')` — nullable, copied from package
- Add to `jobs` table: `productionMethod: text('production_method')` — nullable, copied from quote at job creation

**API changes**:
- `apps/api/src/routes/quotes.ts` — accept `productionMethod` in quote package creation/update; copy to quote; copy to job on acceptance
- `apps/api/src/routes/jobs.ts` — include `productionMethod` in job responses; use it to determine which workflow template applies

**UI changes**:
- Quote builder (`apps/web/src/pages/customer/quote-detail.tsx`) — add production method selector when quote type is `new_memorial`. Radio group or select with "In-House (Sandblasted)" and "External (Hand Cut)" options.

**Behavior**:
- Only shown/applicable when `quoteType === 'new_memorial'`
- Defaults to `null` (unset) — user must choose before quote can move to `ready` status
- Determines which workflow tasks are auto-created when the job is created

---

### 2. Additional Date Fields on Jobs

**Problem**: The client tracks several workflow-specific dates that the current `jobs` table doesn't have. Currently only `installationDate` and `deadline` exist.

**Schema changes** — add to `jobs` table in `packages/shared/src/db/schema.ts`:

| Field | Type | Purpose | Used By Workflows |
|---|---|---|---|
| `proposedDeliveryDate` | `timestamp` | When the memorial will be delivered to site (before installation) | New Memorial (both) |
| `refixingDate` | `timestamp` | When memorial is re-fixed after additional inscription work | Additional Inscriptions |
| `jobStartDate` | `timestamp` | When refurbishment work begins on site | Refurbishment |
| `ashesDate` | `timestamp` | Date of ashes interment | Ashes |

Note: `installationDate` already exists and maps to "Fixing Date". `deadline` already exists for general deadlines.

**API changes**:
- `apps/api/src/routes/jobs.ts` — accept and return these fields in job detail and update endpoints. Add a dedicated `PUT /:id/dates` endpoint (or extend the existing update mechanism) to update any of these dates.

**UI changes**:
- Job detail page (`apps/web/src/pages/customer/job-detail.tsx`) — show the relevant date fields based on quote type:
  - `new_memorial`: Proposed Delivery Date, Fixing Date (existing `installationDate`)
  - `additional_inscription`: Re-Fixing Date
  - `refurbishment`: Job Start Date
  - `ashes`: Date of Ashes
- Each date should be editable via a date picker inline or in a dates section of the job detail page.

---

### 3. Invoicing & Account Status Fields

**Problem**: The client tracks "Invoiced Date" and "Account Status" as separate workflow steps. The current system tracks payments via `jobPaymentScheduleItems` but has no concept of when an invoice was sent or whether the account is settled.

**Schema changes** — add to `jobs` table:

| Field | Type | Purpose |
|---|---|---|
| `invoicedAt` | `timestamp` | When the final invoice was sent to the customer |
| `invoiceNumber` | `text` | Optional invoice reference number |
| `accountStatus` | `text` | Enum: `not_invoiced`, `invoiced`, `partially_paid`, `paid`, `overdue` |

**Behavior**:
- `accountStatus` should default to `not_invoiced`
- When `invoicedAt` is set, `accountStatus` transitions to `invoiced`
- `accountStatus` can be manually overridden but should also be derivable from payment schedule items:
  - All items paid → `paid`
  - Some items paid → `partially_paid`
  - Any item past due date and unpaid → `overdue`
  - No items paid, invoice sent → `invoiced`
  - Invoice not sent → `not_invoiced`
- Ideally `accountStatus` is computed/derived on read from the payment schedule + `invoicedAt`, not stored. But a stored field allows manual override for edge cases. **Decision: store it, but provide a "recalculate" action that derives it from payment data.**

**API changes**:
- `apps/api/src/routes/jobs.ts`:
  - Add `PUT /:id/invoice` endpoint — sets `invoicedAt`, `invoiceNumber`, and transitions `accountStatus` to `invoiced`
  - Add `PUT /:id/account-status` endpoint — manually set account status
  - Modify job list endpoint to include `accountStatus` and `invoicedAt` in responses
  - Add a `POST /:id/recalculate-account-status` endpoint that derives status from payment schedule

**UI changes**:
- Job detail page — add "Invoicing" section showing:
  - "Mark as Invoiced" button (sets `invoicedAt` to now, optional invoice number input)
  - Invoice date display once set
  - Account Status badge (color-coded: not_invoiced=gray, invoiced=blue, partially_paid=yellow, paid=green, overdue=red)
  - Manual override dropdown for account status
- Job list page — add `accountStatus` badge column
- Pipeline board (`apps/api/src/routes/pipeline.ts`) — show account status on job cards

---

### 4. Workflow Task Templates & Job Tasks

**Problem**: The client's workflows reference named worksheets (Rhys Worksheet, Rich Worksheet, Mark Worksheet). These represent role-based task assignments — specific team members responsible for specific stages. The current app has a generic tasks system (`worksheets` + `tasks` tables in the schema) but no structured way to say "when a new memorial in-house job is created, automatically create these tasks and assign them to these people."

**Solution**: A two-layer system — configurable workflow templates that auto-generate job-specific tasks when a job is created.

#### 4a. Workflow Templates (Settings/Configuration)

**New tables** in `packages/shared/src/db/schema.ts`:

```
workflow_templates:
  id, tenantId, name, quoteType, productionMethod (nullable),
  isActive, createdAt, updatedAt

  - quoteType + productionMethod together determine which template applies
  - e.g. ("new_memorial", "in_house"), ("new_memorial", "external"), ("additional_inscription", null), etc.
  - One active template per (quoteType, productionMethod) combination per tenant

workflow_steps:
  id, tenantId, templateId (FK → workflow_templates),
  name, description, sortOrder,
  defaultAssigneeId (FK → users, nullable),
  category (enum: 'admin', 'production', 'installation', 'invoicing', 'review'),
  requiresDate (boolean) — whether this step has a date field,
  dateFieldLabel (text, nullable) — e.g. "Re-Fixing Date", "Date of Ashes"
  createdAt, updatedAt
```

**Seed data**: When a tenant is created (or on first access of the settings page), seed default templates matching the client's five workflows. The step names should map to the workflow fields:

**New Memorial (In-House) template steps:**
1. Deposit (admin) — assigned to: configurable
2. Forms & Fees (admin)
3. Prepare Worksheet (admin) — maps to "Rhys Worksheet"
4. Create Memorial Proof (production)
5. Proof Approval (production) — linked to proof workflow
6. Set Delivery Date (production) — requiresDate: true, label: "Proposed Delivery Date"
7. Installation Worksheet (installation) — maps to "Mark Worksheet"
8. Fixing (installation) — requiresDate: true, label: "Fixing Date"
9. Invoice (invoicing)
10. Post-Sales Review (review)

**New Memorial (External) template steps:**
Same as in-house but with an additional step between Forms & Fees and Create Memorial Proof:
- Supplier Coordination (production) — maps to "Rich Worksheet"

**Additional Inscriptions template steps:**
1. Prepare Worksheet (admin) — "Rhys Worksheet"
2. Forms & Fees (admin)
3. Installation Worksheet (installation) — "Mark Worksheet"
4. Re-Fixing (installation) — requiresDate: true, label: "Re-Fixing Date"
5. Invoice (invoicing)
6. Post-Sales Review (review)

**Refurbishment template steps:**
1. Installation Worksheet (installation) — "Mark Worksheet"
2. Start Work (installation) — requiresDate: true, label: "Job Start Date"
3. Complete Work (installation)
4. Invoice (invoicing)
5. Post-Sales Review (review)

**Ashes template steps:**
1. Installation Worksheet (installation) — "Mark Worksheet"
2. Ashes Interment (installation) — requiresDate: true, label: "Date of Ashes"
3. Invoice (invoicing)

#### 4b. Job Workflow Tasks (Per-Job Instances)

**New table** in `packages/shared/src/db/schema.ts`:

```
job_workflow_tasks:
  id, tenantId, jobId (FK → jobs),
  workflowStepId (FK → workflow_steps, nullable — null if manually added),
  name, description, sortOrder,
  status (enum: 'pending', 'in_progress', 'completed', 'skipped'),
  assigneeId (FK → users, nullable),
  category,
  dueDate (timestamp, nullable),
  completedAt (timestamp, nullable),
  completedBy (FK → users, nullable),
  taskDate (timestamp, nullable) — for steps with requiresDate (e.g., the actual ashes date),
  notes (text, nullable),
  createdAt, updatedAt
```

**Behavior**:
- When a job is created (quote accepted), look up the matching workflow template for (quoteType, productionMethod)
- Auto-create `job_workflow_tasks` from the template's `workflow_steps`, copying name, description, sortOrder, defaultAssigneeId, category
- Tasks are displayed on the job detail page as an ordered checklist/stepper
- Users can mark tasks as in_progress, completed, or skipped
- Users can add ad-hoc tasks not from the template
- The overall job progress can be derived from task completion percentage
- When a step has `requiresDate`, completing it should prompt for or require that date

**Relationship to existing tasks system**: The existing `tasks` and `worksheets` tables are a separate, generic task management system. This new `job_workflow_tasks` system is specific to the job lifecycle workflow. They coexist — a user might still create ad-hoc tasks using the generic system, but the structured workflow lives in `job_workflow_tasks`.

**API endpoints** (new route file `apps/api/src/routes/job-workflow-tasks.ts` or nested under `apps/api/src/routes/jobs.ts`):
- `GET /api/jobs/:id/workflow-tasks` — list all workflow tasks for a job, ordered by sortOrder
- `POST /api/jobs/:id/workflow-tasks` — add an ad-hoc workflow task
- `PUT /api/jobs/:id/workflow-tasks/:taskId` — update task (status, assignee, notes, taskDate)
- `PUT /api/jobs/:id/workflow-tasks/:taskId/complete` — mark complete (sets completedAt, completedBy)
- `PUT /api/jobs/:id/workflow-tasks/:taskId/skip` — mark as skipped
- `DELETE /api/jobs/:id/workflow-tasks/:taskId` — remove ad-hoc task (cannot delete template-generated tasks, only skip them)

**Settings API** (new route file `apps/api/src/routes/workflow-templates.ts`):
- `GET /api/workflow-templates` — list all templates for the tenant
- `GET /api/workflow-templates/:id` — get template with its steps
- `PUT /api/workflow-templates/:id` — update template metadata
- `POST /api/workflow-templates/:id/steps` — add a step
- `PUT /api/workflow-templates/:id/steps/:stepId` — update a step
- `PUT /api/workflow-templates/:id/steps/reorder` — reorder steps
- `DELETE /api/workflow-templates/:id/steps/:stepId` — remove a step

**UI — Job Detail Page** (`apps/web/src/pages/customer/job-detail.tsx`):
- Add a "Workflow" tab (or make it the primary view) showing:
  - Vertical stepper/checklist of workflow tasks in order
  - Each task shows: name, assigned user avatar/name, status badge, category pill, due date if set
  - Clicking a task expands it to show description, notes, date field (if applicable), and action buttons
  - "Complete" button transitions pending/in_progress → completed
  - "Skip" option for irrelevant steps
  - "Add Task" button at the bottom for ad-hoc tasks
  - Overall progress indicator (e.g., "7 of 10 steps complete")

**UI — Settings Page** (new page `apps/web/src/pages/customer/settings/workflow-templates.tsx`):
- List workflow templates with their quote type and production method
- Click into a template to see and edit its steps
- Drag-to-reorder steps
- Add/remove steps
- Set default assignee per step (dropdown of tenant team members)
- Follow the existing settings page patterns (e.g., `apps/web/src/pages/customer/settings/lettering-techniques.tsx`)

---

### 5. Deposit Status (Derived/Surfaced)

**Problem**: The client tracks "Deposit Status" as its own workflow step. The app has payment schedule items but doesn't surface deposit status prominently.

**Solution**: This is primarily a UI/display concern, not a new data model. Derive deposit status from the payment schedule.

**Logic**:
- Find the first payment schedule item with description containing "Deposit" (case-insensitive) or the first item by sort order
- If no deposit item exists → "No Deposit Required"
- If deposit item exists and `paidAmount >= amount` → "Deposit Paid"
- If deposit item exists and `paidAmount > 0` but `< amount` → "Partially Paid"
- If deposit item exists and `paidAmount === 0` → "Awaiting Deposit"

**UI changes**:
- Job detail page — show "Deposit Status" badge prominently in the job header/summary area
- Job list page — add deposit status as a column or badge
- Pipeline board — show deposit status on job cards (already shows basic payment status, refine it)

**API changes**:
- Modify `apps/api/src/routes/jobs.ts` list endpoint to compute and include `depositStatus` in job list responses (already partially there as `paymentStatus` in pipeline.ts — refine and standardize)

---

### 6. Forms & Fees Checklist

**Problem**: Most workflows include a "Forms & Fees" step. This represents a checklist of required permits, applications, and associated fees that must be completed before work can proceed. Different memorial sites require different forms (e.g., church faculty vs council permit).

**Solution**: A per-job checklist of required forms, each with a status and optional fee/date.

**New table** in `packages/shared/src/db/schema.ts`:

```
FORM_STATUSES = ['not_started', 'submitted', 'approved', 'received', 'not_required'] as const

job_forms:
  id, tenantId, jobId (FK → jobs),
  name (text) — e.g. "Council Permit", "Church Faculty", "BRAMM Registration"
  status (text, from FORM_STATUSES),
  fee (numeric, nullable) — associated cost if any
  submittedAt (timestamp, nullable),
  approvedAt (timestamp, nullable),
  referenceNumber (text, nullable) — permit/application reference
  notes (text, nullable),
  sortOrder (integer),
  createdAt, updatedAt
```

**Optional: Form presets** (for quick-adding common forms):
- Could reuse the existing `line_item_presets` concept or add a simple `form_presets` table
- Or just let users type the form name manually with autocomplete from previously used names
- **Decision: Start simple — manual entry with autocomplete from history. No preset table needed initially.**

**API endpoints** (nested under jobs):
- `GET /api/jobs/:id/forms` — list forms for a job
- `POST /api/jobs/:id/forms` — add a form to the checklist
- `PUT /api/jobs/:id/forms/:formId` — update form (status, fee, dates, etc.)
- `DELETE /api/jobs/:id/forms/:formId` — remove a form

**UI — Job Detail Page**:
- Add a "Forms & Fees" section (either as its own tab or as a section within the workflow tab)
- Checklist view: each form shows name, status badge, fee amount, submitted/approved dates
- Quick-add input with autocomplete from previously used form names in the tenant
- Status transitions via dropdown or buttons
- Total fees calculated and displayed

**Integration with workflow tasks**: The "Forms & Fees" workflow task (from the template) should link to this checklist. Completing the "Forms & Fees" workflow task could require all forms to have status of `approved`, `received`, or `not_required`.

---

### 7. Memorial Proof Workflow

**Problem**: The client tracks "Memorial Proof" and "Memorial Proof Status" as distinct workflow steps. The current app allows uploading files categorized as "proof" via job attachments, but there's no formal approval workflow.

**Solution**: A dedicated proof tracking system with versioning and status.

**New table** in `packages/shared/src/db/schema.ts`:

```
PROOF_STATUSES = ['draft', 'sent_to_customer', 'approved', 'revision_requested', 'superseded'] as const

job_proofs:
  id, tenantId, jobId (FK → jobs),
  version (integer) — auto-incrementing per job, starts at 1
  status (text, from PROOF_STATUSES),
  s3Key (text) — the proof file in S3
  filename (text),
  contentType (text),
  size (integer, nullable),
  sentAt (timestamp, nullable) — when sent to customer
  approvedAt (timestamp, nullable),
  customerFeedback (text, nullable) — customer's notes on revision
  notes (text, nullable) — internal notes
  createdBy (FK → users),
  createdAt, updatedAt
```

**Behavior**:
- A job can have multiple proof versions
- Only the latest version should be in `draft`, `sent_to_customer`, or `approved` status
- When a new version is uploaded, the previous version's status becomes `superseded`
- When a proof is sent to the customer, status → `sent_to_customer`, `sentAt` is set
- Customer can approve or request revision (initially just internal tracking, not customer-facing)
- When approved, status → `approved`, `approvedAt` is set

**API endpoints** (nested under jobs):
- `GET /api/jobs/:id/proofs` — list all proof versions for a job
- `POST /api/jobs/:id/proofs/presign` — get presigned upload URL (follows existing attachment pattern in `apps/api/src/routes/jobs.ts:885-931`)
- `POST /api/jobs/:id/proofs` — confirm upload and create proof record
- `PUT /api/jobs/:id/proofs/:proofId/send` — mark as sent to customer
- `PUT /api/jobs/:id/proofs/:proofId/approve` — mark as approved
- `PUT /api/jobs/:id/proofs/:proofId/request-revision` — mark as revision requested, accept feedback text
- `PUT /api/jobs/:id/proofs/:proofId` — update notes

**UI — Job Detail Page**:
- Add a "Proof" tab or section showing:
  - Current proof with large preview (image/PDF)
  - Status badge and action buttons (Send to Customer, Mark Approved, Request Revision)
  - Version history (expandable list of previous versions)
  - Upload new version button
  - Customer feedback display when revision requested
- The proof status should also be visible in the workflow task stepper (the "Memorial Proof" and "Proof Approval" tasks should reflect the proof's actual status)

**Integration with workflow tasks**: The "Create Memorial Proof" task should be completable once a proof is uploaded. The "Proof Approval" task should auto-complete when a proof reaches `approved` status.

---

### 8. Post-Sales Review

**Problem**: All workflows except Ashes end with "Review (Post Sales)" — a quality/satisfaction step after job completion.

**Solution**: Add review fields to the job and a simple review UI.

**Schema changes** — add to `jobs` table:

| Field | Type | Purpose |
|---|---|---|
| `reviewCompletedAt` | `timestamp` | When the post-sales review was done |
| `reviewCompletedBy` | `text` (FK → users) | Who did the review |
| `reviewNotes` | `text` | Notes from the review |
| `reviewOutcome` | `text` | Enum: `satisfied`, `issue_reported`, `follow_up_needed`, `no_response` |

**API changes**:
- `PUT /api/jobs/:id/review` — submit review (sets all review fields)

**UI — Job Detail Page**:
- When job status is `completed`, show a "Post-Sales Review" section
- Simple form: outcome dropdown, notes textarea, submit button
- Once submitted, show the review summary with date and reviewer

**Integration with workflow tasks**: The "Post-Sales Review" workflow task should be completable when the review is submitted.

---

### 9. Updated Job Status Progression

**Problem**: The current job status sequence (`pending` → `materials_ordered` → `in_production` → `ready_for_install` → `installed` → `completed`) is a parallel tracking mechanism to the new workflow tasks. With workflow tasks providing the detailed step-by-step tracking, the job status becomes a higher-level summary.

**Solution**: Keep the existing job statuses but consider them a coarse-grained status. The workflow tasks provide the fine-grained tracking. Don't change the existing status values — they still make sense as an overall job state.

**No schema changes needed** — the existing statuses work well as a summary. The workflow tasks add detail underneath.

**Behavioral note**: The job status can be advanced independently of workflow tasks (as it does today), but the UI should encourage using workflow tasks as the primary tracking mechanism and show the status as derived context.

---

## Constraints & Considerations

### Multi-Tenancy
All new tables must include `tenantId` with foreign key to `tenants.id` and `onDelete: 'cascade'`. All queries must filter by tenant. Follow the existing pattern in `packages/shared/src/db/schema.ts`.

### Migrations
Use `bun run db:generate` to create migration files, then `bun run db:migrate` to apply. Never use `db:push`.

### Existing Data
When adding new columns to the `jobs` table, all must be nullable or have sensible defaults. Existing jobs should continue to work without workflow tasks — the workflow system should be additive, not break existing jobs.

### API Patterns
Follow the existing Hono route patterns in `apps/api/src/routes/`. Use `zValidator` from `@hono/zod-validator` for input validation. Use `requireAuth` and `requireTenant` middleware. Return consistent JSON shapes.

### UI Patterns
Follow existing patterns:
- Tables: Use simple "View" button pattern per CLAUDE.md
- Detail pages: Tabs with related data, edit/delete in header
- Settings pages: List → detail pattern (see `apps/web/src/pages/customer/settings/`)
- Forms: Use shadcn components already in the project
- Hooks: Create dedicated hooks files in `apps/web/src/hooks/`

### Seed/Default Data
When a new tenant is created, workflow templates should be auto-seeded with the default workflows described above. Also provide a "Reset to Defaults" action in the settings UI.

When a tenant first accesses workflow templates (or on migration), existing tenants should also get default templates seeded. Handle this via an API endpoint that checks if templates exist and seeds them if not.

### Performance
The job detail page will now load more data (workflow tasks, forms, proofs). Use parallel queries where possible. The workflow task list for a single job is expected to be small (5-15 items) so no pagination needed.

### Proof File Storage
Follow the existing S3 upload pattern used by job attachments (`apps/api/src/routes/jobs.ts:885-931`). Presign → upload → confirm.

## Files That Will Be Modified

### Schema & Database
- `packages/shared/src/db/schema.ts` — new tables and columns

### API Routes (new files)
- `apps/api/src/routes/workflow-templates.ts` — template CRUD
- `apps/api/src/routes/job-workflow-tasks.ts` — per-job task management
- `apps/api/src/routes/job-forms.ts` — forms & fees checklist
- `apps/api/src/routes/job-proofs.ts` — proof workflow

### API Routes (modified)
- `apps/api/src/routes/jobs.ts` — new fields, invoice endpoint, review endpoint, date fields
- `apps/api/src/routes/pipeline.ts` — enhanced job cards with deposit/account status
- `apps/api/src/index.ts` — register new route files

### Frontend Hooks (new files)
- `apps/web/src/hooks/use-workflow-templates.ts`
- `apps/web/src/hooks/use-job-workflow-tasks.ts`
- `apps/web/src/hooks/use-job-forms.ts`
- `apps/web/src/hooks/use-job-proofs.ts`

### Frontend Hooks (modified)
- `apps/web/src/hooks/use-jobs.ts` — new fields, types, deposit status helper

### Frontend Pages (new files)
- `apps/web/src/pages/customer/settings/workflow-templates.tsx` — template settings list
- `apps/web/src/pages/customer/settings/workflow-template-detail.tsx` — template detail/edit

### Frontend Pages (modified)
- `apps/web/src/pages/customer/job-detail.tsx` — new tabs (workflow, forms, proofs, review)
- `apps/web/src/pages/customer/jobs.tsx` — new columns (deposit status, account status)
- `apps/web/src/pages/customer/quote-detail.tsx` — production method selector

### Frontend Components (new)
- Workflow task stepper component
- Proof viewer/uploader component
- Forms checklist component
- Review form component
- Production method selector component

## Implementation Phases (Suggested)

### Phase 1: Schema Foundation
Add all new columns to `jobs` table (dates, invoice, review fields, productionMethod). Add production method to quotes/quotePackages. Generate and apply migration. Update API responses to include new fields.

### Phase 2: Production Method UI
Add production method selector to quote builder. Ensure it copies through to jobs on acceptance.

### Phase 3: Workflow Templates
Create template and step tables. Seed default templates. Build settings UI for managing templates. Build API routes.

### Phase 4: Job Workflow Tasks
Create job_workflow_tasks table. Auto-create tasks from templates on job creation. Build API routes. Build workflow tab UI on job detail page.

### Phase 5: Forms & Fees
Create job_forms table. Build API routes. Build forms checklist UI on job detail page.

### Phase 6: Proof Workflow
Create job_proofs table. Build API routes with S3 upload. Build proof tab UI on job detail page.

### Phase 7: Invoicing & Account Status
Build invoice marking UI. Add account status derivation. Update job list and pipeline views.

### Phase 8: Post-Sales Review
Build review form and display on completed jobs.

### Phase 9: Deposit Status & Polish
Surface deposit status on job list/pipeline. Connect workflow tasks to proof status and forms completion. Overall polish and testing.
