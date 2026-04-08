import { useState } from 'react';
import type { DisplayOption } from '@/components/quote/detail/quote-document';
import { QuoteDocument } from '@/components/quote/detail/quote-document';
import type { QuotePackageWithOptions } from '@/hooks/use-quotes';
import type { TenantSettings } from '@/hooks/use-tenant-settings';

export function CustomerView({
	pkg,
	settings,
	formatCurrency,
	formatDate,
}: {
	pkg: QuotePackageWithOptions;
	settings?: TenantSettings;
	formatCurrency: (value: string | number) => string;
	formatDate: (dateString: string) => string;
}) {
	const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
		pkg.options?.[0]?.id || null,
	);

	if (!settings) return null;

	const customerName = pkg.customer
		? `${pkg.customer.firstName} ${pkg.customer.lastName}`
		: 'Walk-in Customer';

	const displayOptions: DisplayOption[] = (pkg.options || []).map((opt) => ({
		id: opt.id,
		label: opt.quoteNumber || opt.optionLabel || `Option ${String.fromCharCode(65 + opt.optionOrder)}`,
		total: opt.total,
		subtotal: opt.subtotal,
		vatAmount: opt.vatAmount,
		vatRate: opt.vatRate,
		flowerHoles: opt.flowerHoles,
		product: opt.product ? { name: opt.product.name } : null,
		components: opt.components.map((c) => ({
			key: c.id,
			componentType: c.componentType,
			height: c.height,
			width: c.width,
			depth: c.depth,
			materialName: c.materialName,
			finishName: c.finishName,
		})),
		lettering: opt.lettering.map((l) => ({
			key: l.id,
			text: l.text,
			letterCount: l.letterCount,
			techniqueName: l.techniqueName,
			colorName: l.colorName,
			fontId: l.fontId,
			fontName: l.fontName,
			fontS3Key: l.fontS3Key,
		})),
		sundries: opt.sundries.map((s) => ({
			key: s.id,
			sundryName: s.sundryName,
			quantity: s.quantity,
		})),
		lineItems: (opt.lineItems || [])
			.filter((item) => item.visibleToCustomer)
			.map((item) => ({
				key: item.id,
				description: item.description,
				price: item.price,
				vatExempt: item.vatExempt,
				showPrice: item.priceVisibleToCustomer,
			})),
	}));

	return (
		<QuoteDocument
			tenant={{
				id: settings.id,
				name: settings.name,
				hasLogo: !!settings.logoUrl,
				phone: settings.phone ?? null,
				email: settings.email ?? null,
				website: settings.website ?? null,
			}}
			customerName={customerName}
			createdAt={pkg.createdAt}
			validUntil={pkg.validUntil}
			isExpired={false}
			proposedInscription={pkg.proposedInscription}
			notes={pkg.notes}
			options={displayOptions}
			selectedOptionId={selectedOptionId}
			onSelectOption={setSelectedOptionId}
			formatCurrency={formatCurrency}
			formatDate={formatDate}
		/>
	);
}
