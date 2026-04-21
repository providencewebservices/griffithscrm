import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

	// Session-scoped visibility toggle so the operator can hide internal margin data
	// before a screen-share. Resets on reload.
	const [showInternal, setShowInternal] = useState(true);

	const grossMargin =
		parseFloat(option.total) - parseFloat(option.vatAmount) - parseFloat(option.totalCost);
	const marginBase = parseFloat(option.total) - parseFloat(option.vatAmount) || 1;
	const marginPercent = (grossMargin / marginBase) * 100;

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div className="lg:col-span-2 space-y-6">
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
					<CardContent className="space-y-6">
						{/* Customer-facing totals */}
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Subtotal</span>
								<span className="tabular-nums">{formatCurrency(option.subtotal)}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">
									VAT ({(parseFloat(option.vatRate) * 100).toFixed(0)}%)
								</span>
								<span className="tabular-nums">{formatCurrency(option.vatAmount)}</span>
							</div>
							<div className="flex items-baseline justify-between border-t border-border/60 pt-3">
								<span className="font-semibold">Total</span>
								<span className="text-xl font-semibold tabular-nums">
									{formatCurrency(option.total)}
								</span>
							</div>
						</div>

						{/* Internal metrics — toggleable for screen-share safety */}
						<div className="rounded-md bg-muted/50 p-3">
							<div className="flex items-center justify-between mb-2">
								<p className="text-sm font-medium text-muted-foreground">Internal</p>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 -mr-1"
									onClick={() => setShowInternal((v) => !v)}
									aria-label={showInternal ? 'Hide internal metrics' : 'Show internal metrics'}
								>
									{showInternal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</Button>
							</div>
							<div className="space-y-1.5">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Cost</span>
									<span className="tabular-nums text-orange-600">
										{showInternal ? formatCurrency(option.totalCost) : '••••'}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Gross margin</span>
									<span className="tabular-nums text-green-600">
										{showInternal ? formatCurrency(grossMargin) : '••••'}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Margin %</span>
									<span className="tabular-nums text-green-600">
										{showInternal ? `${marginPercent.toFixed(1)}%` : '••••'}
									</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
