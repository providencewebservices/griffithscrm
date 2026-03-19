import { eq, and } from 'drizzle-orm';
import { db } from './auth';
import { workflowTemplates, workflowSteps } from '@griffiths-crm/shared/db/schema';

type StepDef = {
	name: string;
	category: 'admin' | 'production' | 'installation' | 'invoicing' | 'review';
	requiresDate?: boolean;
	dateFieldLabel?: string;
};

type TemplateDef = {
	name: string;
	quoteType: string;
	productionMethod: string | null;
	steps: StepDef[];
};

const DEFAULT_TEMPLATES: TemplateDef[] = [
	{
		name: 'New Memorial (In-House)',
		quoteType: 'new_memorial',
		productionMethod: 'in_house',
		steps: [
			{ name: 'Deposit', category: 'admin' },
			{ name: 'Forms & Fees', category: 'admin' },
			{ name: 'Prepare Worksheet', category: 'admin' },
			{ name: 'Create Memorial Proof', category: 'production' },
			{ name: 'Proof Approval', category: 'production' },
			{ name: 'Set Delivery Date', category: 'production', requiresDate: true, dateFieldLabel: 'Proposed Delivery Date' },
			{ name: 'Installation Worksheet', category: 'installation' },
			{ name: 'Fixing', category: 'installation', requiresDate: true, dateFieldLabel: 'Fixing Date' },
			{ name: 'Invoice', category: 'invoicing' },
			{ name: 'Post-Sales Review', category: 'review' },
		],
	},
	{
		name: 'New Memorial (External)',
		quoteType: 'new_memorial',
		productionMethod: 'external',
		steps: [
			{ name: 'Deposit', category: 'admin' },
			{ name: 'Forms & Fees', category: 'admin' },
			{ name: 'Prepare Worksheet', category: 'admin' },
			{ name: 'Supplier Coordination', category: 'production' },
			{ name: 'Create Memorial Proof', category: 'production' },
			{ name: 'Proof Approval', category: 'production' },
			{ name: 'Set Delivery Date', category: 'production', requiresDate: true, dateFieldLabel: 'Proposed Delivery Date' },
			{ name: 'Installation Worksheet', category: 'installation' },
			{ name: 'Fixing', category: 'installation', requiresDate: true, dateFieldLabel: 'Fixing Date' },
			{ name: 'Invoice', category: 'invoicing' },
			{ name: 'Post-Sales Review', category: 'review' },
		],
	},
	{
		name: 'Additional Inscriptions',
		quoteType: 'additional_inscription',
		productionMethod: null,
		steps: [
			{ name: 'Prepare Worksheet', category: 'admin' },
			{ name: 'Forms & Fees', category: 'admin' },
			{ name: 'Installation Worksheet', category: 'installation' },
			{ name: 'Re-Fixing', category: 'installation', requiresDate: true, dateFieldLabel: 'Re-Fixing Date' },
			{ name: 'Invoice', category: 'invoicing' },
			{ name: 'Post-Sales Review', category: 'review' },
		],
	},
	{
		name: 'Refurbishment',
		quoteType: 'refurbishment',
		productionMethod: null,
		steps: [
			{ name: 'Installation Worksheet', category: 'installation' },
			{ name: 'Start Work', category: 'installation', requiresDate: true, dateFieldLabel: 'Job Start Date' },
			{ name: 'Complete Work', category: 'installation' },
			{ name: 'Invoice', category: 'invoicing' },
			{ name: 'Post-Sales Review', category: 'review' },
		],
	},
	{
		name: 'Ashes',
		quoteType: 'ashes',
		productionMethod: null,
		steps: [
			{ name: 'Installation Worksheet', category: 'installation' },
			{ name: 'Ashes Interment', category: 'installation', requiresDate: true, dateFieldLabel: 'Date of Ashes' },
			{ name: 'Invoice', category: 'invoicing' },
		],
	},
];

/**
 * Seed default workflow templates for a tenant if none exist.
 * Idempotent — skips if active templates already exist.
 */
export async function seedDefaultWorkflowTemplates(tenantId: string) {
	// Check if any active templates exist for this tenant
	const existing = await db
		.select({ id: workflowTemplates.id })
		.from(workflowTemplates)
		.where(and(eq(workflowTemplates.tenantId, tenantId), eq(workflowTemplates.isActive, true)))
		.limit(1);

	if (existing.length > 0) {
		return { seeded: false, message: 'Templates already exist for this tenant' };
	}

	const createdTemplates: { id: string; name: string; stepCount: number }[] = [];

	for (const def of DEFAULT_TEMPLATES) {
		const templateId = crypto.randomUUID();

		await db.insert(workflowTemplates).values({
			id: templateId,
			tenantId,
			name: def.name,
			quoteType: def.quoteType,
			productionMethod: def.productionMethod,
			isActive: true,
		});

		const stepValues = def.steps.map((step, index) => ({
			id: crypto.randomUUID(),
			tenantId,
			templateId,
			name: step.name,
			sortOrder: index,
			category: step.category,
			requiresDate: step.requiresDate ?? false,
			dateFieldLabel: step.dateFieldLabel ?? null,
		}));

		if (stepValues.length > 0) {
			await db.insert(workflowSteps).values(stepValues);
		}

		createdTemplates.push({
			id: templateId,
			name: def.name,
			stepCount: def.steps.length,
		});
	}

	return { seeded: true, templates: createdTemplates };
}
