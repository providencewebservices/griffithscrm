import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { tenantPricingSettings } from '@griffiths-crm/shared/db/schema';

// Validation schema
const updateSchema = z.object({
	priceMultiplier: z.number().min(0).optional(),
	priceFixedAmount: z.number().min(0).optional(),
	vatRate: z.number().min(0).max(1).optional(), // 0.20 = 20%
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
					priceMultiplier: '1',
					priceFixedAmount: '0',
					vatRate: '0',
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
					priceMultiplier: data.priceMultiplier !== undefined ? String(data.priceMultiplier) : '1',
					priceFixedAmount:
						data.priceFixedAmount !== undefined ? String(data.priceFixedAmount) : '0',
					vatRate: data.vatRate !== undefined ? String(data.vatRate) : '0',
				})
				.returning();

			return c.json({ pricingSettings: existing });
		}

		// Update existing
		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.priceMultiplier !== undefined) updateData.priceMultiplier = String(data.priceMultiplier);
		if (data.priceFixedAmount !== undefined)
			updateData.priceFixedAmount = String(data.priceFixedAmount);
		if (data.vatRate !== undefined) updateData.vatRate = String(data.vatRate);

		const [updated] = await db
			.update(tenantPricingSettings)
			.set(updateData)
			.where(eq(tenantPricingSettings.id, existing.id))
			.returning();

		return c.json({ pricingSettings: updated });
	});

export { tenantPricingSettingsRoutes };
