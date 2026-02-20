import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { takepaymentsSettings } from '@griffiths-crm/shared/db/schema';
import { encrypt, decrypt } from '../lib/encryption';

const updateSchema = z.object({
	merchantId: z.string().min(1),
	gatewayPassword: z.string().min(1).optional(),
	preSharedKey: z.string().min(1).optional(),
	hashMethod: z.enum(['SHA1', 'HMACSHA1']),
	isActive: z.boolean().optional(),
});

const takepaymentsSettingsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// Get settings (masked credentials)
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const [settings] = await db
			.select()
			.from(takepaymentsSettings)
			.where(eq(takepaymentsSettings.tenantId, tenantId))
			.limit(1);

		if (!settings) {
			return c.json({ settings: null });
		}

		return c.json({
			settings: {
				merchantId: settings.merchantId,
				hashMethod: settings.hashMethod,
				isActive: settings.isActive,
				isConfigured: true,
				hasPassword: !!settings.gatewayPasswordEncrypted,
				hasPreSharedKey: !!settings.preSharedKeyEncrypted,
			},
		});
	})

	// Save/update settings
	.put('/', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(takepaymentsSettings)
			.where(eq(takepaymentsSettings.tenantId, tenantId))
			.limit(1);

		if (!existing) {
			// Create new — password and key required
			if (!data.gatewayPassword || !data.preSharedKey) {
				return c.json({ error: 'Gateway password and pre-shared key are required for initial setup' }, 400);
			}

			const [created] = await db
				.insert(takepaymentsSettings)
				.values({
					id: crypto.randomUUID(),
					tenantId,
					merchantId: data.merchantId,
					gatewayPasswordEncrypted: encrypt(data.gatewayPassword),
					preSharedKeyEncrypted: encrypt(data.preSharedKey),
					hashMethod: data.hashMethod,
					isActive: data.isActive ?? true,
				})
				.returning();

			return c.json({
				settings: {
					merchantId: created.merchantId,
					hashMethod: created.hashMethod,
					isActive: created.isActive,
					isConfigured: true,
					hasPassword: true,
					hasPreSharedKey: true,
				},
			});
		}

		// Update existing
		const updateData: Record<string, unknown> = {
			merchantId: data.merchantId,
			hashMethod: data.hashMethod,
			updatedAt: new Date(),
		};

		if (data.isActive !== undefined) {
			updateData.isActive = data.isActive;
		}

		if (data.gatewayPassword) {
			updateData.gatewayPasswordEncrypted = encrypt(data.gatewayPassword);
		}

		if (data.preSharedKey) {
			updateData.preSharedKeyEncrypted = encrypt(data.preSharedKey);
		}

		const [updated] = await db
			.update(takepaymentsSettings)
			.set(updateData)
			.where(eq(takepaymentsSettings.id, existing.id))
			.returning();

		return c.json({
			settings: {
				merchantId: updated.merchantId,
				hashMethod: updated.hashMethod,
				isActive: updated.isActive,
				isConfigured: true,
				hasPassword: !!updated.gatewayPasswordEncrypted,
				hasPreSharedKey: !!updated.preSharedKeyEncrypted,
			},
		});
	})

	// Test configuration
	.post('/test', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const [settings] = await db
			.select()
			.from(takepaymentsSettings)
			.where(eq(takepaymentsSettings.tenantId, tenantId))
			.limit(1);

		if (!settings) {
			return c.json({ error: 'No TakePayments settings configured' }, 400);
		}

		try {
			// Test decrypt round-trip
			const password = decrypt(settings.gatewayPasswordEncrypted);
			const preSharedKey = decrypt(settings.preSharedKeyEncrypted);

			if (!password || !preSharedKey) {
				return c.json({ error: 'Failed to decrypt credentials' }, 500);
			}

			return c.json({ success: true, message: 'Configuration valid — credentials decrypted successfully' });
		} catch (err) {
			return c.json({ error: 'Failed to decrypt credentials. The encryption key may have changed.' }, 500);
		}
	});

export { takepaymentsSettingsRoutes };
