import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { tenantPricingSettings } from '@griffiths-crm/shared/db/schema';

// Validation schema
const updateSchema = z.object({
	defaultMarkupPercent: z.number().min(0).optional(), // 100 = 100% markup = 2x multiplier
	vatRate: z.number().min(0).max(1).optional(), // 0.20 = 20%
	defaultDepositPercent: z.number().min(0).max(100).optional(), // 50 = 50% deposit
});

// Create tenant pricing settings routes
const tenantPricingSettingsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// Get pricing settings for tenant (creates default if not exists)
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		let [settings] = await db
			.select()
			.from(tenantPricingSettings)
			.where(eq(tenantPricingSettings.tenantId, tenantId))
			.limit(1);

		// Create default settings if none exist
		if (!settings) {
			[settings] = await db
				.insert(tenantPricingSettings)
				.values({
					id: crypto.randomUUID(),
					tenantId,
					defaultMarkupPercent: '100', // 100% markup = 2x multiplier
					vatRate: '0',
					defaultDepositPercent: '50', // 50% deposit
				})
				.returning();
		}

		return c.json({ pricingSettings: settings });
	})

	// Update pricing settings
	.put('/', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Get existing or create default
		let [existing] = await db
			.select()
			.from(tenantPricingSettings)
			.where(eq(tenantPricingSettings.tenantId, tenantId))
			.limit(1);

		if (!existing) {
			// Create with provided values
			[existing] = await db
				.insert(tenantPricingSettings)
				.values({
					id: crypto.randomUUID(),
					tenantId,
					defaultMarkupPercent:
						data.defaultMarkupPercent !== undefined ? String(data.defaultMarkupPercent) : '100',
					vatRate: data.vatRate !== undefined ? String(data.vatRate) : '0',
					defaultDepositPercent:
						data.defaultDepositPercent !== undefined ? String(data.defaultDepositPercent) : '50',
				})
				.returning();

			return c.json({ pricingSettings: existing });
		}

		// Update existing
		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.defaultMarkupPercent !== undefined)
			updateData.defaultMarkupPercent = String(data.defaultMarkupPercent);
		if (data.vatRate !== undefined) updateData.vatRate = String(data.vatRate);
		if (data.defaultDepositPercent !== undefined)
			updateData.defaultDepositPercent = String(data.defaultDepositPercent);

		const [updated] = await db
			.update(tenantPricingSettings)
			.set(updateData)
			.where(eq(tenantPricingSettings.id, existing.id))
			.returning();

		return c.json({ pricingSettings: updated });
	});

export { tenantPricingSettingsRoutes };
