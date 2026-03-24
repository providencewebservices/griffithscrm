import { jobProofs, jobs, users } from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { generatePresignedUploadUrl, isS3Configured } from '../lib/s3';
import { autoCompleteWorkflowTask } from '../lib/workflow-utils';
import { requireAuth, requireTenant } from '../middleware/auth';

// Allowed content types for proof uploads
const ALLOWED_PROOF_CONTENT_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'application/pdf',
] as const;

// Validation schemas
const presignProofSchema = z.object({
	filename: z.string().min(1),
	contentType: z.enum(ALLOWED_PROOF_CONTENT_TYPES, {
		errorMap: () => ({
			message: `Content type must be one of: ${ALLOWED_PROOF_CONTENT_TYPES.join(', ')}`,
		}),
	}),
});

const confirmProofSchema = z.object({
	s3Key: z.string().min(1),
	filename: z.string().min(1),
	contentType: z.string().min(1),
	size: z.number().nullable().optional().default(null),
	notes: z.string().nullable().optional().default(null),
	proofId: z.string().min(1),
});

const requestRevisionSchema = z.object({
	customerFeedback: z.string().min(1, 'Customer feedback is required'),
});

const updateProofSchema = z.object({
	notes: z.string().nullable().optional(),
});

const jobProofsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all proofs for a job
	.get('/:jobId/proofs', async (c) => {
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

		const proofs = await db
			.select({
				id: jobProofs.id,
				tenantId: jobProofs.tenantId,
				jobId: jobProofs.jobId,
				version: jobProofs.version,
				status: jobProofs.status,
				s3Key: jobProofs.s3Key,
				filename: jobProofs.filename,
				contentType: jobProofs.contentType,
				size: jobProofs.size,
				sentAt: jobProofs.sentAt,
				approvedAt: jobProofs.approvedAt,
				customerFeedback: jobProofs.customerFeedback,
				notes: jobProofs.notes,
				createdBy: jobProofs.createdBy,
				createdByName: users.name,
				createdAt: jobProofs.createdAt,
				updatedAt: jobProofs.updatedAt,
			})
			.from(jobProofs)
			.leftJoin(users, eq(jobProofs.createdBy, users.id))
			.where(eq(jobProofs.jobId, jobId))
			.orderBy(desc(jobProofs.version));

		return c.json({ proofs });
	})

	// Get presigned URL for proof upload
	.post('/:jobId/proofs/presign', zValidator('json', presignProofSchema), async (c) => {
		if (!isS3Configured()) {
			return c.json({ error: 'File storage is not configured.' }, 503);
		}

		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');
		const { filename, contentType } = c.req.valid('json');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		try {
			const proofId = crypto.randomUUID();
			const { uploadUrl, publicUrl, key } = await generatePresignedUploadUrl({
				tenantId,
				category: 'jobs',
				entityId: `${jobId}/proofs/${proofId}`,
				filename,
				contentType,
			});

			return c.json({ uploadUrl, publicUrl, key, proofId });
		} catch (error) {
			console.error('Error generating presigned URL:', error);
			return c.json({ error: 'Failed to generate upload URL' }, 500);
		}
	})

	// Confirm proof upload
	.post('/:jobId/proofs', zValidator('json', confirmProofSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('jobId');
		const { s3Key, filename, contentType, size, notes, proofId } = c.req.valid('json');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Verify s3Key belongs to this tenant and job
		if (!s3Key.startsWith(`${tenantId}/jobs/${jobId}/`)) {
			return c.json({ error: 'Invalid S3 key' }, 400);
		}

		// Get next version number
		const [maxVersion] = await db
			.select({ maxVer: sql<number>`COALESCE(MAX(${jobProofs.version}), 0)` })
			.from(jobProofs)
			.where(eq(jobProofs.jobId, jobId));

		const nextVersion = (maxVersion?.maxVer ?? 0) + 1;

		// Mark existing non-superseded proofs as superseded
		await db
			.update(jobProofs)
			.set({ status: 'superseded', updatedAt: new Date() })
			.where(and(eq(jobProofs.jobId, jobId), ne(jobProofs.status, 'superseded')));

		// Create new proof record
		const newProof = {
			id: proofId,
			tenantId,
			jobId,
			version: nextVersion,
			status: 'draft' as const,
			s3Key,
			filename,
			contentType,
			size,
			notes,
			createdBy: currentUser.id,
		};

		const [created] = await db.insert(jobProofs).values(newProof).returning();

		// Auto-complete "Create Memorial Proof" workflow task
		await autoCompleteWorkflowTask(jobId, 'Create Memorial Proof', currentUser.id);

		return c.json({ proof: created }, 201);
	})

	// Send proof to customer
	.put('/:jobId/proofs/:proofId/send', async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');
		const proofId = c.req.param('proofId');

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
			.from(jobProofs)
			.where(and(eq(jobProofs.id, proofId), eq(jobProofs.jobId, jobId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Proof not found' }, 404);
		}

		const [updated] = await db
			.update(jobProofs)
			.set({
				status: 'sent_to_customer',
				sentAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(jobProofs.id, proofId))
			.returning();

		return c.json({ proof: updated });
	})

	// Approve proof
	.put('/:jobId/proofs/:proofId/approve', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('jobId');
		const proofId = c.req.param('proofId');

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
			.from(jobProofs)
			.where(and(eq(jobProofs.id, proofId), eq(jobProofs.jobId, jobId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Proof not found' }, 404);
		}

		const [updated] = await db
			.update(jobProofs)
			.set({
				status: 'approved',
				approvedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(jobProofs.id, proofId))
			.returning();

		// Auto-complete "Proof Approval" workflow task
		await autoCompleteWorkflowTask(jobId, 'Proof Approval', currentUser.id);

		return c.json({ proof: updated });
	})

	// Request revision
	.put(
		'/:jobId/proofs/:proofId/request-revision',
		zValidator('json', requestRevisionSchema),
		async (c) => {
			const tenantId = c.get('user').tenantId!;
			const jobId = c.req.param('jobId');
			const proofId = c.req.param('proofId');
			const { customerFeedback } = c.req.valid('json');

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
				.from(jobProofs)
				.where(and(eq(jobProofs.id, proofId), eq(jobProofs.jobId, jobId)))
				.limit(1);

			if (!existing) {
				return c.json({ error: 'Proof not found' }, 404);
			}

			const [updated] = await db
				.update(jobProofs)
				.set({
					status: 'revision_requested',
					customerFeedback,
					updatedAt: new Date(),
				})
				.where(eq(jobProofs.id, proofId))
				.returning();

			return c.json({ proof: updated });
		},
	)

	// Update proof notes
	.put('/:jobId/proofs/:proofId', zValidator('json', updateProofSchema), async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');
		const proofId = c.req.param('proofId');
		const { notes } = c.req.valid('json');

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
			.from(jobProofs)
			.where(and(eq(jobProofs.id, proofId), eq(jobProofs.jobId, jobId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Proof not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (notes !== undefined) updateData.notes = notes;

		const [updated] = await db
			.update(jobProofs)
			.set(updateData)
			.where(eq(jobProofs.id, proofId))
			.returning();

		return c.json({ proof: updated });
	});

export { jobProofsRoutes };
