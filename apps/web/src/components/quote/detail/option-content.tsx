import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type {
	useAddComponentMutation,
	useAddLetteringMutation,
	useAddLineItemMutation,
	useAddSundryMutation,
	useDeleteComponentMutation,
	useDeleteLetteringMutation,
	useDeleteLineItemMutation,
	useDeleteSundryMutation,
	useUpdateComponentPricingMutation,
	useUpdateLetteringMutation,
	useUpdateLetteringPricingMutation,
	useUpdateLineItemMutation,
	useUpdateProductPricingMutation,
	useUpdateSundryPricingMutation,
} from '@/hooks/use-quotes';
import {
	QUOTE_TYPE_SECTION_CONFIG,
	type QuoteOption,
	type QuotePackageWithOptions,
	type QuoteType,
} from '@/hooks/use-quotes';
import { ComponentsSection } from './components-section';
import { CustomLineItemsSection } from './custom-line-items-section';
import { LetteringSection } from './lettering-section';
import { SundriesSection } from './sundries-section';

export function OptionContent({
	pkg,
	option,
	canEditPricing,
	formatCurrency,
	updateComponentPricing,
	updateLetteringPricing,
	updateSundryPricing,
	updateProductPricing,
	addLineItem,
	updateLineItem,
	deleteLineItem,
	addLetteringMutation,
	updateLetteringMutation,
	deleteLetteringMutation,
	addComponentMutation,
	deleteComponentMutation,
	addSundryMutation,
	deleteSundryMutation,
	activePresets,
}: {
	pkg: QuotePackageWithOptions;
	option: QuoteOption;
	canEditPricing: boolean;
	formatCurrency: (value: string | number) => string;
	updateComponentPricing: ReturnType<typeof useUpdateComponentPricingMutation>;
	updateLetteringPricing: ReturnType<typeof useUpdateLetteringPricingMutation>;
	updateSundryPricing: ReturnType<typeof useUpdateSundryPricingMutation>;
	updateProductPricing: ReturnType<typeof useUpdateProductPricingMutation>;
	addLineItem: ReturnType<typeof useAddLineItemMutation>;
	updateLineItem: ReturnType<typeof useUpdateLineItemMutation>;
	deleteLineItem: ReturnType<typeof useDeleteLineItemMutation>;
	addLetteringMutation: ReturnType<typeof useAddLetteringMutation>;
	updateLetteringMutation: ReturnType<typeof useUpdateLetteringMutation>;
	deleteLetteringMutation: ReturnType<typeof useDeleteLetteringMutation>;
	addComponentMutation: ReturnType<typeof useAddComponentMutation>;
	deleteComponentMutation: ReturnType<typeof useDeleteComponentMutation>;
	addSundryMutation: ReturnType<typeof useAddSundryMutation>;
	deleteSundryMutation: ReturnType<typeof useDeleteSundryMutation>;
	activePresets: {
		id: string;
		name: string;
		defaultPrice: string;
		vatExempt: boolean;
		visibleToCustomer: boolean;
		priceVisibleToCustomer: boolean;
	}[];
}) {
	const quoteType = (pkg.quoteType as QuoteType) || 'new_memorial';
	const sectionConfig = QUOTE_TYPE_SECTION_CONFIG[quoteType];

	// Optional sections (sundries + custom line items) collapse to chips when empty.
	// Expanding is per-option — switching tabs resets this state.
	const [expandedOptional, setExpandedOptional] = useState<{
		sundries: boolean;
		lineItems: boolean;
	}>({ sundries: false, lineItems: false });
	// biome-ignore lint/correctness/useExhaustiveDependencies: option.id is a reset trigger, not a dep used inside the effect
	useEffect(() => {
		setExpandedOptional({ sundries: false, lineItems: false });
	}, [option.id]);

	const sundriesVisible =
		sectionConfig.showSundries && (option.sundries.length > 0 || expandedOptional.sundries);
	const lineItemsVisible = option.lineItems.length > 0 || expandedOptional.lineItems;

	return (
		<div className="space-y-6">
			{/* Product Info */}
			{sectionConfig.showProductSelection && option.product && (
				<div className="flex items-center gap-8 pb-4 border-b border-border/60">
					<div>
						<p className="text-sm font-medium text-muted-foreground">Product</p>
						<p className="font-semibold">{option.product.name}</p>
					</div>
					{sectionConfig.showFlowerHoles && option.flowerHoles && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Flower Holes</p>
							<p>{option.flowerHoles.replace(/_/g, ' ')}</p>
						</div>
					)}
				</div>
			)}

			{/* Components */}
			{sectionConfig.showComponents && (
				<ComponentsSection
					pkg={pkg}
					option={option}
					canEditPricing={canEditPricing}
					formatCurrency={formatCurrency}
					updateComponentPricing={updateComponentPricing}
					updateProductPricing={updateProductPricing}
					addComponentMutation={addComponentMutation}
					deleteComponentMutation={deleteComponentMutation}
				/>
			)}

			{/* Lettering */}
			{sectionConfig.showLettering && (
				<LetteringSection
					pkg={pkg}
					option={option}
					canEditPricing={canEditPricing}
					formatCurrency={formatCurrency}
					updateLetteringPricing={updateLetteringPricing}
					addLetteringMutation={addLetteringMutation}
					updateLetteringMutation={updateLetteringMutation}
					deleteLetteringMutation={deleteLetteringMutation}
				/>
			)}

			{/* Sundries — only rendered when non-empty or user expanded */}
			{sundriesVisible && (
				<SundriesSection
					pkg={pkg}
					option={option}
					canEditPricing={canEditPricing}
					formatCurrency={formatCurrency}
					updateSundryPricing={updateSundryPricing}
					addSundryMutation={addSundryMutation}
					deleteSundryMutation={deleteSundryMutation}
				/>
			)}

			{/* Custom Line Items — only rendered when non-empty or user expanded */}
			{lineItemsVisible && (
				<CustomLineItemsSection
					pkg={pkg}
					option={option}
					canEditPricing={canEditPricing}
					formatCurrency={formatCurrency}
					addLineItem={addLineItem}
					updateLineItem={updateLineItem}
					deleteLineItem={deleteLineItem}
					activePresets={activePresets}
				/>
			)}

			{/* Collapsed chip row — adds an empty optional section without full-width clutter */}
			{canEditPricing && (!sundriesVisible || !lineItemsVisible) && (
				<div className="flex flex-wrap gap-2">
					{!sundriesVisible && sectionConfig.showSundries && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setExpandedOptional((prev) => ({ ...prev, sundries: true }))}
						>
							<Plus className="h-4 w-4 mr-1" />
							Sundries
						</Button>
					)}
					{!lineItemsVisible && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setExpandedOptional((prev) => ({ ...prev, lineItems: true }))}
						>
							<Plus className="h-4 w-4 mr-1" />
							Custom line
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
