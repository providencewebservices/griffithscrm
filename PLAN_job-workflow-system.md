# Feature Plan: Job Workflow System

## Overview
Implement a structured workflow system modeling how jobs progress through their lifecycle. Each job type (new memorial in-house, new memorial external, additional inscription, refurbishment, ashes) follows a distinct sequence of steps with role-based task assignments, proof approval workflows, forms/fees checklists, invoicing fields, and post-sales review.

## Source
`FEATURE-job-workflow-system.md`

## Phase 1: Schema Foundation — New Job Columns

- [x] **Task 1: Add production method field to schema**
  - In `packages/shared/src/db/schema.ts`:
    - Add constant: `export const PRODUCTION_METHODS = ['in_house', 'external'] as const`
    - Add `productionMethod: text('production_method')` to `quotePackages` table (nullable — applies to all options within a package since a package represents one customer inquiry)
    - Add `productionMethod: text('production_method')` to `quotes` table (nullable — copied from package)
    - Add `productionMethod: text('production_method')` to `jobs` table (nullable — copied from quote at acceptance)
  - Run `bun run db:generate` then `bun run db:migrate`
  - Validation: Verify migration file in `packages/shared/drizzle/`. Run migrate and confirm columns exist.

- [x] **Task 2: Add workflow-specific date fields to jobs table**
  - In `packages/shared/src/db/schema.ts`, add to `jobs` table:
    - `proposedDeliveryDate: timestamp('proposed_delivery_date')` — nullable, for new memorials
    - `refixingDate: timestamp('refixing_date')` — nullable, for additional inscriptions
    - `jobStartDate: timestamp('job_start_date')` — nullable, for refurbishments
    - `ashesDate: timestamp('ashes_date')` — nullable, for ashes jobs
  - Run `bun run db:generate` then `bun run db:migrate`
  - Validation: Verify migration and columns.

- [x] **Task 3: Add invoicing and account status fields to jobs table**
  - In `packages/shared/src/db/schema.ts`:
    - Add constant: `export const ACCOUNT_STATUSES = ['not_invoiced', 'invoiced', 'partially_paid', 'paid', 'overdue'] as const`
    - Add to `jobs` table:
      - `invoicedAt: timestamp('invoiced_at')` — nullable
      - `invoiceNumber: text('invoice_number')` — nullable
      - `accountStatus: text('account_status').default('not_invoiced')`
  - Run `bun run db:generate` then `bun run db:migrate`
  - Validation: Verify migration and columns.

- [x] **Task 4: Add post-sales review fields to jobs table**
  - In `packages/shared/src/db/schema.ts`:
    - Add constant: `export const REVIEW_OUTCOMES = ['satisfied', 'issue_reported', 'follow_up_needed', 'no_response'] as const`
    - Add to `jobs` table:
      - `reviewCompletedAt: timestamp('review_completed_at')` — nullable
      - `reviewCompletedBy: text('review_completed_by').references(() => users.id)` — nullable
      - `reviewNotes: text('review_notes')` — nullable
      - `reviewOutcome: text('review_outcome')` — nullable
  - Run `bun run db:generate` then `bun run db:migrate`
  - Validation: Verify migration and columns.

## Phase 2: Schema Foundation — New Tables

- [x] **Task 5: Create workflow_templates and workflow_steps tables**
  - In `packages/shared/src/db/schema.ts`:
    - Add constant: `export const WORKFLOW_STEP_CATEGORIES = ['admin', 'production', 'installation', 'invoicing', 'review'] as const`
    - Create `workflowTemplates` table:
      - `id: text('id').primaryKey()` (generated via `crypto.randomUUID()` in app code, matching existing pattern)
      - `tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' })`
      - `name: text('name').notNull()`
      - `quoteType: text('quote_type').notNull()`
      - `productionMethod: text('production_method')` — nullable
      - `isActive: boolean('is_active').notNull().default(true)`
      - `createdAt: timestamp('created_at').defaultNow().notNull()`
      - `updatedAt: timestamp('updated_at').defaultNow().notNull()`
    - Add filtered unique index: `uniqueIndex('wt_tenant_type_method_active_idx').on(tenantId, quoteType, productionMethod).where(eq(isActive, true))`
    - Create `workflowSteps` table:
      - `id: text('id').primaryKey()` (app-generated UUID)
      - `tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' })`
      - `templateId: text('template_id').notNull().references(() => workflowTemplates.id, { onDelete: 'cascade' })`
      - `name: text('name').notNull()`
      - `description: text('description')`
      - `sortOrder: integer('sort_order').notNull()`
      - `defaultAssigneeId: text('default_assignee_id').references(() => users.id)` — nullable
      - `category: text('category').notNull()` — from WORKFLOW_STEP_CATEGORIES
      - `requiresDate: boolean('requires_date').notNull().default(false)`
      - `dateFieldLabel: text('date_field_label')` — nullable
      - `createdAt: timestamp('created_at').defaultNow().notNull()`
      - `updatedAt: timestamp('updated_at').defaultNow().notNull()`
  - Run `bun run db:generate` then `bun run db:migrate`
  - Validation: Verify migration and both tables exist.

- [x] **Task 6: Create job_workflow_tasks table**
  - In `packages/shared/src/db/schema.ts`:
    - Add constant: `export const WORKFLOW_TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const`
    - Create `jobWorkflowTasks` table:
      - `id: text('id').primaryKey()` (app-generated UUID)
      - `tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' })`
      - `jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' })`
      - `workflowStepId: text('workflow_step_id').references(() => workflowSteps.id)` — nullable (null = ad-hoc task)
      - `name: text('name').notNull()`
      - `description: text('description')`
      - `sortOrder: integer('sort_order').notNull()`
      - `status: text('status').notNull().default('pending')` — from WORKFLOW_TASK_STATUSES
      - `assigneeId: text('assignee_id').references(() => users.id)` — nullable
      - `category: text('category').notNull()`
      - `dueDate: timestamp('due_date')` — nullable
      - `completedAt: timestamp('completed_at')` — nullable
      - `completedBy: text('completed_by').references(() => users.id)` — nullable
      - `taskDate: timestamp('task_date')` — nullable (for steps with requiresDate)
      - `notes: text('notes')` — nullable
      - `createdAt: timestamp('created_at').defaultNow().notNull()`
      - `updatedAt: timestamp('updated_at').defaultNow().notNull()`
    - Add index: `index('jwt_tenant_job_idx').on(tenantId, jobId)`
  - Run `bun run db:generate` then `bun run db:migrate`
  - Validation: Verify migration and table.

- [x] **Task 7: Create job_forms table**
  - In `packages/shared/src/db/schema.ts`:
    - Add constant: `export const FORM_STATUSES = ['not_started', 'submitted', 'approved', 'received', 'not_required'] as const`
    - Create `jobForms` table:
      - `id: text('id').primaryKey()` (app-generated UUID)
      - `tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' })`
      - `jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' })`
      - `name: text('name').notNull()`
      - `status: text('status').notNull().default('not_started')` — from FORM_STATUSES
      - `fee: numeric('fee', { precision: 10, scale: 2 })` — nullable
      - `submittedAt: timestamp('submitted_at')` — nullable
      - `approvedAt: timestamp('approved_at')` — nullable
      - `referenceNumber: text('reference_number')` — nullable
      - `notes: text('notes')` — nullable
      - `sortOrder: integer('sort_order').notNull()`
      - `createdAt: timestamp('created_at').defaultNow().notNull()`
      - `updatedAt: timestamp('updated_at').defaultNow().notNull()`
    - Add index: `index('jf_tenant_job_idx').on(tenantId, jobId)`
  - Run `bun run db:generate` then `bun run db:migrate`
  - Validation: Verify migration and table.

- [x] **Task 8: Create job_proofs table**
  - In `packages/shared/src/db/schema.ts`:
    - Add constant: `export const PROOF_STATUSES = ['draft', 'sent_to_customer', 'approved', 'revision_requested', 'superseded'] as const`
    - Create `jobProofs` table:
      - `id: text('id').primaryKey()` (app-generated UUID)
      - `tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' })`
      - `jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' })`
      - `version: integer('version').notNull()`
      - `status: text('status').notNull().default('draft')` — from PROOF_STATUSES
      - `s3Key: text('s3_key').notNull()` — pattern: `{tenantId}/jobs/{jobId}/proofs/{proofId}/{filename}`
      - `filename: text('filename').notNull()`
      - `contentType: text('content_type').notNull()`
      - `size: integer('size')` — nullable
      - `sentAt: timestamp('sent_at')` — nullable
      - `approvedAt: timestamp('approved_at')` — nullable
      - `customerFeedback: text('customer_feedback')` — nullable
      - `notes: text('notes')` — nullable
      - `createdBy: text('created_by').notNull().references(() => users.id)`
      - `createdAt: timestamp('created_at').defaultNow().notNull()`
      - `updatedAt: timestamp('updated_at').defaultNow().notNull()`
    - Add index: `index('jp_tenant_job_idx').on(tenantId, jobId)`
  - Run `bun run db:generate` then `bun run db:migrate`
  - Validation: Verify migration and table.

- [x] **Task 9: Export new constants and types from shared package**
  - In `packages/shared/src/types/index.ts`:
    - Import and re-export new constants: `PRODUCTION_METHODS`, `ACCOUNT_STATUSES`, `REVIEW_OUTCOMES`, `WORKFLOW_STEP_CATEGORIES`, `WORKFLOW_TASK_STATUSES`, `FORM_STATUSES`, `PROOF_STATUSES`
    - Add inferred types for new tables: `WorkflowTemplate`, `WorkflowStep`, `JobWorkflowTask`, `JobForm`, `JobProof`
    - Export relevant utility types (e.g., `ProductionMethod`, `AccountStatus`, `WorkflowTaskStatus`, etc.)
  - Validation: `bun run build` succeeds across all packages.

## Phase 3: Production Method — API & UI

- [x] **Task 10: Accept and store production method in quote API**
  - In `apps/api/src/routes/quotes.ts`:
    - Add `productionMethod` to the quote package creation/update validation schemas (optional, string from PRODUCTION_METHODS)
    - Store `productionMethod` on `quotePackages` when creating/updating
    - Copy `productionMethod` from package to `quotes` when creating/updating quote options
    - Include `productionMethod` in all quote and package API responses
  - Validation: `bun run build:api` succeeds. Create a quote package with `productionMethod: 'in_house'` via API, verify it persists on package and copies to quote.

- [x] **Task 11: Copy production method to job on quote acceptance**
  - In `apps/api/src/routes/quotes.ts` (the `POST /:id/accept/:optionId` handler, around line ~3274):
    - When creating the job from the accepted quote, copy `productionMethod` from the quote to the new job record
  - Validation: Accept a quote with `productionMethod: 'in_house'` via API, verify the created job has `productionMethod: 'in_house'`.

- [x] **Task 12: Expose new fields in job API responses**
  - In `apps/api/src/routes/jobs.ts`:
    - Update the job detail endpoint (`GET /:id`) to include: `productionMethod`, `proposedDeliveryDate`, `refixingDate`, `jobStartDate`, `ashesDate`, `invoicedAt`, `invoiceNumber`, `accountStatus`, `reviewCompletedAt`, `reviewCompletedBy`, `reviewNotes`, `reviewOutcome`
    - Update the job list endpoint to include: `productionMethod`, `accountStatus`, `invoicedAt`
    - Add job date update endpoint: accept `proposedDeliveryDate`, `refixingDate`, `jobStartDate`, `ashesDate`, `installationDate` in the existing update handler or a new `PUT /:id/dates`
  - Validation: `bun run build:api` succeeds. Fetch a job detail, verify new fields appear (as null for existing jobs).

- [x] **Task 13: Add production method selector to quote builder UI**
  - In `apps/web/src/pages/customer/quote-detail.tsx`:
    - In the shared context section of the quote package editor, when `quoteType === 'new_memorial'`, show a production method selector
    - Use a `<Select>` component with options: "In-House (Sandblasted)" → `in_house`, "External (Hand Cut)" → `external`
    - Wire into existing quote package creation/update mutations
  - Update `apps/web/src/hooks/use-quotes.ts` types to include `productionMethod` on package and quote types
  - Validation: `bun run dev`, create a new memorial quote, verify selector appears and saves correctly.

## Phase 4: Invoicing & Account Status — API & UI

- [x] **Task 14: Add invoicing API endpoints**
  - In `apps/api/src/routes/jobs.ts`:
    - Add `PUT /:id/invoice` — accepts `invoiceNumber` (optional), sets `invoicedAt` to now, transitions `accountStatus` to `'invoiced'`
    - Add `PUT /:id/account-status` — accepts `accountStatus` (validated against `ACCOUNT_STATUSES`), sets it directly (manual override)
    - Add `POST /:id/recalculate-account-status` — derives status from payment schedule:
      - Sum all `jobPaymentScheduleItems.amount` → `totalDue`
      - Sum all `jobPaymentScheduleItems.paidAmount` → `totalPaid`
      - If `invoicedAt` is null → `'not_invoiced'`
      - Else if `totalPaid >= totalDue` → `'paid'`
      - Else if any item has `dueDate < now` and `paidAmount < amount` → `'overdue'`
      - Else if `totalPaid > 0` → `'partially_paid'`
      - Else → `'invoiced'`
  - Validation: `bun run build:api` succeeds. Test invoice endpoint, verify status transitions. Test recalculate with various payment states.

- [x] **Task 15: Add invoicing section to job detail UI**
  - In `apps/web/src/pages/customer/job-detail.tsx`:
    - Add "Invoicing" section (in the existing tab structure or as a card in the overview):
      - "Mark as Invoiced" button with optional invoice number input (opens a small dialog or inline form)
      - Invoice date and number display once set
      - Account Status badge: `not_invoiced`=gray, `invoiced`=blue, `partially_paid`=yellow, `paid`=green, `overdue`=red
      - Manual override via `<Select>` dropdown for account status
      - "Recalculate" button that calls the recalculate endpoint
  - Add mutation hooks to `apps/web/src/hooks/use-jobs.ts`: `useMarkInvoicedMutation`, `useUpdateAccountStatusMutation`, `useRecalculateAccountStatusMutation`
  - Validation: `bun run dev`, open a job detail, verify invoicing section renders. Mark as invoiced, verify date displays and badge updates.

- [x] **Task 16: Add account status to job list and pipeline**
  - In `apps/web/src/pages/customer/jobs.tsx`: add `accountStatus` badge column to the job list table
  - In `apps/api/src/routes/pipeline.ts`: add `accountStatus` to the `select()` call in the pipeline job query, include in response
  - Update pipeline UI if needed to show account status badge on job cards
  - Validation: `bun run dev`, verify account status badge shows on job list page and pipeline board.

## Phase 5: Workflow-Specific Date Fields UI

- [x] **Task 17: Add workflow-specific date fields to job detail page**
  - In `apps/web/src/pages/customer/job-detail.tsx`:
    - Add a "Dates" card/section that shows relevant date fields based on `quoteType`:
      - `new_memorial`: Proposed Delivery Date, Fixing Date (existing `installationDate`)
      - `additional_inscription`: Re-Fixing Date
      - `refurbishment`: Job Start Date
      - `ashes`: Date of Ashes
    - All jobs: Installation Date (existing), Deadline (existing)
    - Each date editable via date picker, saving via the date update endpoint from Task 12
  - Validation: `bun run dev`, open jobs of different quote types, verify only the relevant date fields show. Edit and save dates.

## Phase 6: Workflow Templates — API & Settings UI

- [x] **Task 18: Create workflow templates API routes with seed logic**
  - Create `apps/api/src/routes/workflow-templates.ts` with `requireAuth`, `requireTenant` middleware:
    - `GET /` — list all templates for the tenant (with step count)
    - `GET /:id` — get template with its steps ordered by sortOrder
    - `POST /` — create a new template (name, quoteType, productionMethod)
    - `PUT /:id` — update template metadata (name, isActive)
    - `POST /:id/steps` — add a step (name, description, sortOrder, category, defaultAssigneeId, requiresDate, dateFieldLabel)
    - `PUT /:id/steps/:stepId` — update a step
    - `PUT /:id/steps/reorder` — accept array of `{ id, sortOrder }`, update all in transaction
    - `DELETE /:id/steps/:stepId` — remove a step
    - `POST /seed` — seed default templates if none exist for the tenant (idempotent)
  - **Extract the seed logic into a shared function** `seedDefaultWorkflowTemplates(tenantId: string)` in a utility file (e.g., `apps/api/src/lib/workflow-seed.ts`) so it can be called from both the API endpoint and the job creation handler (Task 22)
  - **Default template definitions** (canonical names used in Task 31 for integration):
    - **New Memorial (In-House)** — quoteType: `new_memorial`, productionMethod: `in_house`:
      1. "Deposit" (admin)
      2. "Forms & Fees" (admin)
      3. "Prepare Worksheet" (admin) — maps to "Rhys Worksheet"
      4. "Create Memorial Proof" (production)
      5. "Proof Approval" (production)
      6. "Set Delivery Date" (production) — requiresDate: true, label: "Proposed Delivery Date"
      7. "Installation Worksheet" (installation) — maps to "Mark Worksheet"
      8. "Fixing" (installation) — requiresDate: true, label: "Fixing Date"
      9. "Invoice" (invoicing)
      10. "Post-Sales Review" (review)
    - **New Memorial (External)** — quoteType: `new_memorial`, productionMethod: `external`:
      1. "Deposit" (admin)
      2. "Forms & Fees" (admin)
      3. "Prepare Worksheet" (admin)
      4. "Supplier Coordination" (production) — maps to "Rich Worksheet"
      5. "Create Memorial Proof" (production)
      6. "Proof Approval" (production)
      7. "Set Delivery Date" (production) — requiresDate: true, label: "Proposed Delivery Date"
      8. "Installation Worksheet" (installation)
      9. "Fixing" (installation) — requiresDate: true, label: "Fixing Date"
      10. "Invoice" (invoicing)
      11. "Post-Sales Review" (review)
    - **Additional Inscriptions** — quoteType: `additional_inscription`, productionMethod: null:
      1. "Prepare Worksheet" (admin)
      2. "Forms & Fees" (admin)
      3. "Installation Worksheet" (installation)
      4. "Re-Fixing" (installation) — requiresDate: true, label: "Re-Fixing Date"
      5. "Invoice" (invoicing)
      6. "Post-Sales Review" (review)
    - **Refurbishment** — quoteType: `refurbishment`, productionMethod: null:
      1. "Installation Worksheet" (installation)
      2. "Start Work" (installation) — requiresDate: true, label: "Job Start Date"
      3. "Complete Work" (installation)
      4. "Invoice" (invoicing)
      5. "Post-Sales Review" (review)
    - **Ashes** — quoteType: `ashes`, productionMethod: null:
      1. "Installation Worksheet" (installation)
      2. "Ashes Interment" (installation) — requiresDate: true, label: "Date of Ashes"
      3. "Invoice" (invoicing)
  - Register in `apps/api/src/index.ts` as `app.route('/api/tenant/workflow-templates', workflowTemplatesRoutes)` (matching existing tenant-scoped config route pattern)
  - Validation: `bun run build:api` succeeds. Call `POST /api/tenant/workflow-templates/seed`, verify 5 templates created with correct steps. Call again, verify idempotent (no duplicates).

- [x] **Task 19: Create workflow templates hook**
  - Create `apps/web/src/hooks/use-workflow-templates.ts`:
    - `useWorkflowTemplatesQuery()` — fetch all templates
    - `useWorkflowTemplateQuery(id)` — fetch single template with steps
    - `useCreateTemplateMutation()`, `useUpdateTemplateMutation()`
    - `useCreateStepMutation()`, `useUpdateStepMutation()`, `useDeleteStepMutation()`, `useReorderStepsMutation()`
    - `useSeedTemplatesMutation()` — calls the seed endpoint
  - Validation: `bun run build:web` succeeds.

- [x] **Task 20: Build workflow templates settings tab**
  - Create `apps/web/src/components/customer/settings/workflow-templates-tab.tsx`:
    - List all workflow templates showing: name, quoteType label, productionMethod label (if set), step count, isActive badge
    - Click a template to expand and show its ordered steps
    - Each step shows: name, category badge, default assignee (dropdown of team members from `GET /api/team`), requiresDate indicator
    - Add step: inline form with name, category select, optional assignee
    - Remove step: delete button with confirmation
    - Reorder steps: drag-to-reorder or up/down buttons
    - "Reset to Defaults" button that calls seed endpoint (with confirmation dialog)
  - Validation: `bun run dev`, navigate to Settings → Workflows, verify templates load. Add/remove/reorder steps. Reset to defaults.

- [x] **Task 21: Register workflow templates tab in settings page**
  - In `apps/web/src/pages/customer/settings.tsx`:
    - Import `WorkflowTemplatesTab` from `@/components/customer/settings/workflow-templates-tab`
    - Add a "Workflows" tab group with item: `{ value: 'workflows', label: 'Workflows', icon: ListChecks }` (import `ListChecks` from lucide-react)
    - Add `'workflows'` to `SettingsTab` type union
    - Add case in `SettingsContent` switch to render `<WorkflowTemplatesTab />`
  - Validation: `bun run dev`, navigate to Settings, verify "Workflows" tab appears in sidebar and renders correctly.

## Phase 7: Job Workflow Tasks — API & UI

- [x] **Task 22: Create job workflow tasks API routes**
  - Create `apps/api/src/routes/job-workflow-tasks.ts`:
    - Define routes relative to `/:jobId/workflow-tasks` (the file will be mounted at `/api/jobs` in index.ts, resulting in `/api/jobs/:jobId/workflow-tasks/*`)
    - `GET /:jobId/workflow-tasks` — list all workflow tasks for a job, ordered by sortOrder. Include assignee name via join.
    - `POST /:jobId/workflow-tasks` — add an ad-hoc task (name, description, category, assigneeId, dueDate). Set sortOrder to max+1.
    - `PUT /:jobId/workflow-tasks/:taskId` — update task fields (status, assignee, notes, taskDate, dueDate)
    - `PUT /:jobId/workflow-tasks/:taskId/complete` — set status='completed', completedAt=now, completedBy=session user
    - `PUT /:jobId/workflow-tasks/:taskId/skip` — set status='skipped'
    - `DELETE /:jobId/workflow-tasks/:taskId` — only if `workflowStepId` is null (ad-hoc). Return 400 for template-generated tasks with message "Template tasks can only be skipped, not deleted."
  - Register in `apps/api/src/index.ts`: `app.route('/api/jobs', jobWorkflowTasksRoutes)` (shares the `/api/jobs` prefix with the existing `jobsRouter` — Hono supports multiple route registrations on the same prefix)
  - Validation: `bun run build:api` succeeds. Test CRUD via API.

- [x] **Task 23: Auto-create workflow tasks on job creation**
  - In `apps/api/src/routes/quotes.ts` (the `POST /:id/accept/:optionId` handler, around line ~3274):
    - After inserting the job, import and call `seedDefaultWorkflowTemplates(tenantId)` from `apps/api/src/lib/workflow-seed.ts` to ensure templates exist
    - Look up the matching workflow template: `SELECT * FROM workflowTemplates WHERE tenantId = ? AND quoteType = ? AND productionMethod = ? AND isActive = true`
    - If `productionMethod` is null on the quote (e.g., non-new-memorial types), match where `productionMethod IS NULL`
    - If a template is found, batch-insert `jobWorkflowTasks` from its `workflowSteps`:
      - Copy: `name`, `description`, `sortOrder`, `category`, `defaultAssigneeId` → `assigneeId`
      - Set: `workflowStepId` = step.id, `status` = 'pending', `tenantId`, `jobId`
  - Validation: Accept a quote via API, verify workflow tasks auto-created on the new job matching the template steps.

- [x] **Task 24: Build workflow tasks hook**
  - Create `apps/web/src/hooks/use-job-workflow-tasks.ts`:
    - `useJobWorkflowTasksQuery(jobId)` — fetch workflow tasks for a job
    - `useCompleteWorkflowTaskMutation(jobId)`, `useSkipWorkflowTaskMutation(jobId)`
    - `useUpdateWorkflowTaskMutation(jobId)` — for editing notes, assignee, dates
    - `useAddWorkflowTaskMutation(jobId)` — for ad-hoc tasks
    - `useDeleteWorkflowTaskMutation(jobId)` — for removing ad-hoc tasks
  - Validation: `bun run build:web` succeeds.

- [x] **Task 25: Build read-only workflow task list on job detail page**
  - In `apps/web/src/pages/customer/job-detail.tsx`:
    - Add a "Workflow" tab to the existing `<Tabs>` component
    - Render a vertical stepper/checklist of workflow tasks ordered by sortOrder
    - Each task row shows: name, assigned user (avatar/name or "Unassigned"), status badge (pending=gray, in_progress=blue, completed=green, skipped=gray/strikethrough), category pill, due date if set
    - Overall progress indicator: "X of Y steps complete" with a progress bar
    - When job has no workflow tasks, show an empty state with "Generate Workflow" button (calls `POST /seed` then creates tasks, or prompts user to accept from a template)
  - Validation: `bun run dev`, open a job with workflow tasks, verify stepper renders with correct data. Open a pre-existing job (no tasks), verify empty state.

- [x] **Task 26: Add workflow task actions (complete, skip, edit, add)**
  - In `apps/web/src/pages/customer/job-detail.tsx` (extending the Workflow tab from Task 25):
    - Clicking a task expands it to show: description, notes (editable textarea), taskDate field (date picker, if step has requiresDate), assignee selector
    - "Complete" button for pending/in_progress tasks → calls complete endpoint
    - "Skip" option (in a dropdown or secondary button) → calls skip endpoint
    - "In Progress" option to mark a pending task as in_progress
    - "Add Task" button at the bottom: opens inline form with name, category select, optional assignee, optional due date
    - Delete button on ad-hoc tasks (no `workflowStepId`)
  - Validation: `bun run dev`, complete a task, skip a task, add an ad-hoc task, delete it. Verify progress indicator updates.

## Phase 8: Forms & Fees — API & UI

- [x] **Task 27: Create job forms API routes**
  - Create `apps/api/src/routes/job-forms.ts`:
    - Mount at `/api/jobs` prefix (same pattern as Task 22)
    - `GET /:jobId/forms` — list forms for a job, ordered by sortOrder
    - `POST /:jobId/forms` — add a form (name, status, fee, notes). Auto-set sortOrder to max+1.
    - `PUT /:jobId/forms/:formId` — update form (status, fee, submittedAt, approvedAt, referenceNumber, notes)
    - `DELETE /:jobId/forms/:formId` — remove a form
    - `GET /form-suggestions` — return distinct form names used by the tenant (for autocomplete): `SELECT DISTINCT name FROM job_forms WHERE tenantId = ? ORDER BY name`
  - Register in `apps/api/src/index.ts`
  - Validation: `bun run build:api` succeeds. Test CRUD and suggestions endpoint.

- [x] **Task 28: Build forms & fees section on job detail page**
  - Create `apps/web/src/hooks/use-job-forms.ts` with query and mutation hooks
  - In `apps/web/src/pages/customer/job-detail.tsx`:
    - Add a "Forms & Fees" tab (or section within the Workflow tab)
    - Checklist view: each form row shows name, status badge (not_started=gray, submitted=blue, approved=green, received=green, not_required=gray), fee amount, reference number, submitted/approved dates
    - Quick-add input: text input with autocomplete from `form-suggestions` endpoint, plus "Add" button
    - Status transitions: `<Select>` dropdown per form row
    - Fee editing: inline numeric input
    - Total fees: sum displayed at bottom of the list
    - Delete button per form
  - Validation: `bun run dev`, open a job, add forms, update statuses, verify totals compute correctly.

## Phase 9: Memorial Proof Workflow — API & UI

- [x] **Task 29: Create job proofs API routes**
  - Create `apps/api/src/routes/job-proofs.ts`:
    - Mount at `/api/jobs` prefix
    - `GET /:jobId/proofs` — list all proof versions, ordered by version desc
    - `POST /:jobId/proofs/presign` — get presigned upload URL. Follow the pattern from `apps/api/src/routes/jobs.ts` (`generatePresignedUploadUrl` from `apps/api/src/lib/s3.ts`). S3 key pattern: `{tenantId}/jobs/{jobId}/proofs/{proofId}/{filename}`
    - `POST /:jobId/proofs` — confirm upload: create proof record with auto-incremented version (SELECT MAX(version) + 1), mark any existing draft/sent/approved proof as `superseded`
    - `PUT /:jobId/proofs/:proofId/send` — set status='sent_to_customer', sentAt=now
    - `PUT /:jobId/proofs/:proofId/approve` — set status='approved', approvedAt=now
    - `PUT /:jobId/proofs/:proofId/request-revision` — set status='revision_requested', accept `customerFeedback` text
    - `PUT /:jobId/proofs/:proofId` — update notes
  - Register in `apps/api/src/index.ts`
  - Validation: `bun run build:api` succeeds. Test upload flow: presign → confirm → send → approve. Test versioning: upload v2, verify v1 becomes superseded.

- [x] **Task 30: Build proof workflow section on job detail page**
  - Create `apps/web/src/hooks/use-job-proofs.ts` with query and mutation hooks
  - In `apps/web/src/pages/customer/job-detail.tsx`:
    - Add a "Proof" tab (only visible for `new_memorial` quote type jobs)
    - Show current (latest non-superseded) proof with:
      - Preview: image thumbnail or PDF icon with filename
      - Status badge: draft=gray, sent_to_customer=blue, approved=green, revision_requested=orange, superseded=gray
      - Action buttons based on status:
        - draft: "Send to Customer"
        - sent_to_customer: "Mark Approved", "Request Revision" (opens dialog for feedback text)
        - revision_requested: Upload new version
      - Customer feedback display when revision_requested
    - Version history: collapsible list of all versions with status and dates
    - "Upload New Proof" button: file picker → presign → upload → confirm
  - Validation: `bun run dev`, open a new_memorial job. Upload proof, send it, approve it. Upload v2, verify v1 shows as superseded.

## Phase 10: Post-Sales Review — API & UI

- [x] **Task 31: Add post-sales review API endpoint**
  - In `apps/api/src/routes/jobs.ts`:
    - Add `PUT /:id/review` — validates `reviewOutcome` against `REVIEW_OUTCOMES`, accepts `reviewNotes` (optional text). Sets `reviewCompletedAt` = now, `reviewCompletedBy` = session user id.
    - Include all review fields in job detail response (already done in Task 12, verify)
  - Validation: `bun run build:api` succeeds. Submit a review, verify fields persist.

- [x] **Task 32: Build post-sales review section on job detail page**
  - In `apps/web/src/pages/customer/job-detail.tsx`:
    - When job status is `installed` or `completed`, show a "Post-Sales Review" card/section
    - If not yet reviewed: form with outcome `<Select>` (Satisfied, Issue Reported, Follow-Up Needed, No Response), notes `<Textarea>`, "Submit Review" button
    - If already reviewed: read-only display showing outcome badge, notes, review date, reviewer name
  - Add `useSubmitReviewMutation` to `apps/web/src/hooks/use-jobs.ts`
  - Validation: `bun run dev`, mark a job as completed, verify review section appears. Submit review, verify it displays correctly.

## Phase 11: Deposit Status & Integration

- [ ] **Task 33: Compute and surface deposit status in API**
  - In `apps/api/src/routes/jobs.ts` (list endpoint):
    - For each job, find the first `jobPaymentScheduleItems` record (by lowest sortOrder or id) or one with description containing "deposit" (case-insensitive)
    - Compute `depositStatus`:
      - No deposit item → `"no_deposit_required"`
      - `paidAmount >= amount` → `"deposit_paid"`
      - `paidAmount > 0` but `< amount` → `"partially_paid"`
      - `paidAmount === 0` → `"awaiting_deposit"`
    - Include `depositStatus` in job list and detail responses
  - In `apps/api/src/routes/pipeline.ts`: include `depositStatus` in pipeline job card responses
  - Validation: `bun run build:api` succeeds. Create jobs with different payment states, verify correct deposit status values.

- [ ] **Task 34: Display deposit status in UI**
  - In `apps/web/src/pages/customer/job-detail.tsx`: show deposit status badge prominently in the job header area
  - In `apps/web/src/pages/customer/jobs.tsx`: add deposit status badge column to job list
  - Badge colors: no_deposit_required=gray, awaiting_deposit=orange, partially_paid=yellow, deposit_paid=green
  - Validation: `bun run dev`, verify deposit status shows on job list and job detail.

- [ ] **Task 35: Connect workflow tasks to proof and forms completion**
  - In `apps/api/src/routes/job-proofs.ts`:
    - When a proof is uploaded (POST confirm), find the job's workflow task named **"Create Memorial Proof"** (exact match) and if its status is `pending` or `in_progress`, set it to `completed`
    - When a proof is approved (PUT approve), find the job's workflow task named **"Proof Approval"** and auto-complete it
  - In `apps/api/src/routes/job-forms.ts`:
    - On every form status update (PUT), check if ALL forms for the job have status in `['approved', 'received', 'not_required']`. If so, find the job's workflow task named **"Forms & Fees"** and auto-complete it.
  - Validation: Upload a proof → verify "Create Memorial Proof" task auto-completes. Approve a proof → verify "Proof Approval" task auto-completes. Mark all forms as approved → verify "Forms & Fees" task auto-completes.

- [ ] **Task 36: Add "Generate Workflow" action for existing jobs**
  - In `apps/api/src/routes/job-workflow-tasks.ts`:
    - Add `POST /:jobId/workflow-tasks/generate` — looks up the matching template for the job's (quoteType, productionMethod), generates tasks from it. Only works if the job currently has zero workflow tasks (return 400 otherwise with "Job already has workflow tasks").
    - Calls `seedDefaultWorkflowTemplates(tenantId)` first to ensure templates exist
  - In the job detail Workflow tab (from Task 25): the empty state "Generate Workflow" button calls this endpoint
  - Validation: Open an existing job with no workflow tasks, click "Generate Workflow", verify tasks appear.
