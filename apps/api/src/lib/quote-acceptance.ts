import crypto from 'node:crypto';
import {
	jobPaymentScheduleItems,
	jobWorkflowTasks,
	jobs,
	quotePackages,
	quotes,
	tenantPricingSettings,
	workflowSteps,
	workflowTemplates,
} from '@griffiths-crm/shared/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from './auth';
import { seedDefaultWorkflowTemplates } from './workflow-seed';
import { generateJobNumber } from '../routes/jobs';

/**
 * Shared logic for creating a job from an accepted quote option.
 * Used by both the internal staff acceptance endpoint and the public customer acceptance endpoint.
 */
export async function createJobFromAcceptedQuote(params: {
	tenantId: string;
	packageId: string;
	optionId: string;
	quoteType: string;
	feedback?: string | null;
}): Promise<{ jobId: string; jobNumber: string }> {
	const { tenantId, packageId, optionId, quoteType, feedback } = params;
	const now = new Date();

	// Fetch the accepted option
	const [option] = await db
		.select()
		.from(quotes)
		.where(and(eq(quotes.id, optionId), eq(quotes.packageId, packageId)))
		.limit(1);

	if (!option) {
		throw new Error('Option not found in this package');
	}

	// Update package status and record accepted option
	await db
		.update(quotePackages)
		.set({
			status: 'accepted',
			acceptedOptionId: optionId,
			customerDecisionAt: now,
			customerFeedback: feedback || null,
			customerFeedbackAt: feedback ? now : null,
			updatedAt: now,
		})
		.where(eq(quotePackages.id, packageId));

	// Update all options status to accepted
	await db
		.update(quotes)
		.set({ status: 'accepted', updatedAt: now })
		.where(eq(quotes.packageId, packageId));

	// Create job from the accepted option
	const jobNumber = await generateJobNumber(tenantId);
	const jobId = crypto.randomUUID();

	await db.insert(jobs).values({
		id: jobId,
		tenantId,
		quoteId: optionId,
		jobNumber,
		status: 'pending',
		productionMethod: option.productionMethod,
	});

	// Get tenant's deposit percentage setting
	let depositPercent = 50;
	const [pricingSettingsRow] = await db
		.select()
		.from(tenantPricingSettings)
		.where(eq(tenantPricingSettings.tenantId, tenantId))
		.limit(1);

	if (pricingSettingsRow?.defaultDepositPercent) {
		depositPercent = parseFloat(pricingSettingsRow.defaultDepositPercent);
	}

	// Calculate deposit and balance amounts
	const total = parseFloat(option.total);
	const depositAmount = (total * depositPercent) / 100;
	const balanceAmount = total - depositAmount;

	// Create payment schedule items
	await db.insert(jobPaymentScheduleItems).values({
		id: crypto.randomUUID(),
		tenantId,
		jobId,
		description: 'Deposit',
		amount: depositAmount.toFixed(2),
		dueDate: now,
		paidAmount: '0',
		sortOrder: 0,
	});

	await db.insert(jobPaymentScheduleItems).values({
		id: crypto.randomUUID(),
		tenantId,
		jobId,
		description: 'Balance',
		amount: balanceAmount.toFixed(2),
		dueDate: null,
		paidAmount: '0',
		sortOrder: 1,
	});

	// Auto-create workflow tasks from matching template
	await seedDefaultWorkflowTemplates(tenantId);

	const templateCondition = option.productionMethod
		? eq(workflowTemplates.productionMethod, option.productionMethod)
		: isNull(workflowTemplates.productionMethod);

	const [template] = await db
		.select()
		.from(workflowTemplates)
		.where(
			and(
				eq(workflowTemplates.tenantId, tenantId),
				eq(workflowTemplates.quoteType, quoteType),
				templateCondition,
				eq(workflowTemplates.isActive, true),
			),
		)
		.limit(1);

	if (template) {
		const steps = await db
			.select()
			.from(workflowSteps)
			.where(eq(workflowSteps.templateId, template.id))
			.orderBy(asc(workflowSteps.sortOrder));

		if (steps.length > 0) {
			await db.insert(jobWorkflowTasks).values(
				steps.map((step) => ({
					id: crypto.randomUUID(),
					tenantId,
					jobId,
					workflowStepId: step.id,
					name: step.name,
					description: step.description,
					sortOrder: step.sortOrder,
					status: 'pending' as const,
					assigneeId: step.defaultAssigneeId,
					category: step.category,
				})),
			);
		}
	}

	return { jobId, jobNumber };
}
