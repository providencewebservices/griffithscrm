import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, asc, sql } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { jobs, jobForms, FORM_STATUSES } from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createFormSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	status: z.enum(FORM_STATUSES).optional().default('not_started'),
	fee: z.string().nullable().optional().default(null),
	notes: z.string().nullable().optional().default(null),
});

const updateFormSchema = z.object({
	status: z.enum(FORM_STATUSES).optional(),
	fee: z.string().nullable().optional(),
	submittedAt: z.string().nullable().optional(),
	approvedAt: z.string().nullable().optional(),
	referenceNumber: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
});

const jobFormsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// Form name suggestions (must be before /:jobId routes)
	.get('/form-suggestions', async (c) => {
		const tenantId = c.get('user').tenantId!;

		const suggestions = await db
			.selectDistinct({ name: jobForms.name })
			.from(jobForms)
			.where(eq(jobForms.tenantId, tenantId))
			.orderBy(asc(jobForms.name));

		return c.json({ suggestions: suggestions.map((s) => s.name) });
	})

	// List all forms for a job
	.get('/:jobId/forms', async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		const forms = await db
			.select()
			.from(jobForms)
			.where(eq(jobForms.jobId, jobId))
			.orderBy(asc(jobForms.sortOrder));

		return c.json({ forms });
	})

	// Add a form
	.post('/:jobId/forms', zValidator('json', createFormSchema), async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');
		const data = c.req.valid('json');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Get max sort order
		const [maxSort] = await db
			.select({ maxOrder: sql<number>`COALESCE(MAX(${jobForms.sortOrder}), -1)` })
			.from(jobForms)
			.where(eq(jobForms.jobId, jobId));

		const newForm = {
			id: crypto.randomUUID(),
			tenantId,
			jobId,
			name: data.name,
			status: data.status,
			fee: data.fee,
			notes: data.notes,
			sortOrder: (maxSort?.maxOrder ?? -1) + 1,
		};

		const [created] = await db.insert(jobForms).values(newForm).returning();

		return c.json({ form: created }, 201);
	})

	// Update a form
	.put('/:jobId/forms/:formId', zValidator('json', updateFormSchema), async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');
		const formId = c.req.param('formId');
		const data = c.req.valid('json');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		const [existing] = await db
			.select()
			.from(jobForms)
			.where(and(eq(jobForms.id, formId), eq(jobForms.jobId, jobId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Form not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.status !== undefined) updateData.status = data.status;
		if (data.fee !== undefined) updateData.fee = data.fee;
		if (data.submittedAt !== undefined) updateData.submittedAt = data.submittedAt ? new Date(data.submittedAt) : null;
		if (data.approvedAt !== undefined) updateData.approvedAt = data.approvedAt ? new Date(data.approvedAt) : null;
		if (data.referenceNumber !== undefined) updateData.referenceNumber = data.referenceNumber;
		if (data.notes !== undefined) updateData.notes = data.notes;

		const [updated] = await db
			.update(jobForms)
			.set(updateData)
			.where(eq(jobForms.id, formId))
			.returning();

		return c.json({ form: updated });
	})

	// Delete a form
	.delete('/:jobId/forms/:formId', async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');
		const formId = c.req.param('formId');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		const [existing] = await db
			.select()
			.from(jobForms)
			.where(and(eq(jobForms.id, formId), eq(jobForms.jobId, jobId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Form not found' }, 404);
		}

		await db.delete(jobForms).where(eq(jobForms.id, formId));

		return c.json({ success: true });
	});

export { jobFormsRoutes };
