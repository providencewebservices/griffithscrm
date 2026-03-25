import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div className="lg:col-span-2 space-y-6">
				{/* Product Info */}
				{sectionConfig.showProductSelection && option.product && (
					<div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
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

				{/* Sundries */}
				{sectionConfig.showSundries && (
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

				{/* Custom Line Items - always shown */}
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
			</div>

			{/* Pricing Summary - Sidebar */}
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Pricing</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Subtotal</span>
							<span>{formatCurrency(option.subtotal)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								VAT ({(parseFloat(option.vatRate) * 100).toFixed(0)}%)
							</span>
							<span>{formatCurrency(option.vatAmount)}</span>
						</div>
						<div className="border-t pt-2 flex justify-between font-bold text-lg">
							<span>Total</span>
							<span>{formatCurrency(option.total)}</span>
						</div>

						<div className="border-t pt-3 mt-3 space-y-2">
							<p className="text-sm font-medium text-muted-foreground">Internal Metrics</p>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Total Cost</span>
								<span className="text-orange-600">{formatCurrency(option.totalCost)}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Gross Margin</span>
								<span className="text-green-600">
									{formatCurrency(
										parseFloat(option.total) -
											parseFloat(option.vatAmount) -
											parseFloat(option.totalCost),
									)}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Margin %</span>
								<span className="text-green-600">
									{(
										((parseFloat(option.total) -
											parseFloat(option.vatAmount) -
											parseFloat(option.totalCost)) /
											(parseFloat(option.total) - parseFloat(option.vatAmount) || 1)) *
										100
									).toFixed(1)}
									%
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
