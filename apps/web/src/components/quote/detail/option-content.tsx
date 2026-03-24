import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { EditableNumber } from './editable-number';
import { LetteringSection } from './lettering-section';
import { CustomLineItemsSection } from './custom-line-items-section';
import {
	QUOTE_TYPE_SECTION_CONFIG,
	formatComponentType,
	type QuoteType,
	type QuotePackageWithOptions,
	type QuoteOption,
} from '@/hooks/use-quotes';
import type {
	useUpdateComponentPricingMutation,
	useUpdateLetteringPricingMutation,
	useUpdateSundryPricingMutation,
	useUpdateProductPricingMutation,
	useAddLineItemMutation,
	useUpdateLineItemMutation,
	useDeleteLineItemMutation,
	useAddLetteringMutation,
	useUpdateLetteringMutation,
	useDeleteLetteringMutation,
} from '@/hooks/use-quotes';

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
	activePresets: { id: string; name: string; defaultPrice: string; vatExempt: boolean; visibleToCustomer: boolean; priceVisibleToCustomer: boolean }[];
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
				{sectionConfig.showComponents && (() => {
					const isProductPricing = option.productRetailPrice !== null;
					return (
						<>
							<div className="flex items-center justify-between mb-3">
								<h4 className="font-medium">Stone Components</h4>
								{canEditPricing && (
									<div className="flex items-center rounded-lg border overflow-hidden">
										<button
											type="button"
											className={`px-3 py-1.5 text-sm font-medium transition-colors ${
												!isProductPricing
													? 'bg-primary text-primary-foreground'
													: 'bg-background text-muted-foreground hover:bg-muted'
											}`}
											onClick={async () => {
												if (!isProductPricing) return;
												await updateProductPricing.mutateAsync({
													packageId: pkg.id,
													optionId: option.id,
													supplierCost: null,
													retailPrice: null,
												});
											}}
										>
											Price by components
										</button>
										<button
											type="button"
											className={`px-3 py-1.5 text-sm font-medium transition-colors ${
												isProductPricing
													? 'bg-primary text-primary-foreground'
													: 'bg-background text-muted-foreground hover:bg-muted'
											}`}
											onClick={async () => {
												if (isProductPricing) return;
												await updateProductPricing.mutateAsync({
													packageId: pkg.id,
													optionId: option.id,
													supplierCost: 0,
													retailPrice: 0,
												});
											}}
										>
											Product price
										</button>
									</div>
								)}
							</div>
							{isProductPricing ? (
								<div className="border rounded-lg p-6 space-y-4">
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium text-muted-foreground">Supplier Cost</span>
										<EditableNumber
											value={parseFloat(option.productSupplierCost ?? '0')}
											onSave={async (value) => {
												await updateProductPricing.mutateAsync({
													packageId: pkg.id,
													optionId: option.id,
													supplierCost: value,
													retailPrice: parseFloat(option.productRetailPrice ?? '0'),
												});
											}}
											disabled={!canEditPricing}
											isCurrency
										/>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium text-muted-foreground">Retail Price</span>
										<EditableNumber
											value={parseFloat(option.productRetailPrice ?? '0')}
											onSave={async (value) => {
												await updateProductPricing.mutateAsync({
													packageId: pkg.id,
													optionId: option.id,
													supplierCost: parseFloat(option.productSupplierCost ?? '0'),
													retailPrice: value,
												});
											}}
											disabled={!canEditPricing}
											isCurrency
										/>
									</div>
								</div>
							) : (
								<>
									{option.components.length > 0 ? (
										<div>
											<p className="text-sm text-muted-foreground mb-3">
												{option.components.length} item{option.components.length !== 1 ? 's' : ''}
											</p>
											<div className="border rounded-lg overflow-x-auto">
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Type</TableHead>
															<TableHead>Material</TableHead>
															<TableHead>Dimensions</TableHead>
															<TableHead className="text-center">Qty</TableHead>
															<TableHead className="text-right">Supplier</TableHead>
															<TableHead className="text-center">Markup</TableHead>
															<TableHead className="text-right">Retail</TableHead>
															<TableHead className="text-right">Total</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{option.components.map((comp) => (
															<TableRow key={comp.id} className="[&_td]:py-3">
																<TableCell className="font-medium">{formatComponentType(comp.componentType)}</TableCell>
																<TableCell>
																	{comp.materialName || '-'}
																	{comp.finishName && (
																		<span className="text-muted-foreground text-xs block">{comp.finishName}</span>
																	)}
																</TableCell>
																<TableCell className="text-sm">
																	{comp.height && comp.width && comp.depth
																		? `${comp.height}" × ${comp.width}" × ${comp.depth}"`
																		: '-'}
																</TableCell>
																<TableCell className="text-center">{comp.quantity}</TableCell>
																<TableCell className="text-right">
																	<EditableNumber
																		value={parseFloat(comp.supplierCost)}
																		onSave={async (value) => {
																			await updateComponentPricing.mutateAsync({
																				packageId: pkg.id,
																				optionId: option.id,
																				itemId: comp.id,
																				supplierCost: value,
																			});
																		}}
																		disabled={!canEditPricing}
																		isCurrency
																	/>
																</TableCell>
																<TableCell className="text-center text-muted-foreground text-sm">
																	<EditableNumber
																		value={parseFloat(comp.markupPercent)}
																		onSave={async (value) => {
																			await updateComponentPricing.mutateAsync({
																				packageId: pkg.id,
																				optionId: option.id,
																				itemId: comp.id,
																				markupPercent: value,
																			});
																		}}
																		disabled={!canEditPricing}
																		min={0}
																		formatValue={(val) => `${val.toFixed(0)}%`}
																	/>
																</TableCell>
																<TableCell className="text-right">{formatCurrency(comp.unitPrice)}</TableCell>
																<TableCell className="text-right font-medium">{formatCurrency(comp.lineTotal)}</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</div>
										</div>
									) : (
										<div className="border rounded-lg p-8 text-center text-muted-foreground border-dashed">
											No stone components added yet.
										</div>
									)}
								</>
							)}
						</>
					);
				})()}

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
					<>
						{option.sundries.length > 0 ? (
							<div>
								<h4 className="font-medium mb-3">
									Sundries ({option.sundries.length} item{option.sundries.length !== 1 ? 's' : ''})
								</h4>
								<div className="border rounded-lg overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Item</TableHead>
												<TableHead className="text-center">Qty</TableHead>
												<TableHead className="text-right">Supplier</TableHead>
												<TableHead className="text-center">Markup</TableHead>
												<TableHead className="text-right">Retail</TableHead>
												<TableHead className="text-right">Total</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{option.sundries.map((sundry) => (
												<TableRow key={sundry.id} className="[&_td]:py-3">
													<TableCell className="font-medium">{sundry.sundryName || '-'}</TableCell>
													<TableCell className="text-center">{sundry.quantity}</TableCell>
													<TableCell className="text-right">
														<EditableNumber
															value={parseFloat(sundry.supplierCost)}
															onSave={async (value) => {
																await updateSundryPricing.mutateAsync({
																	packageId: pkg.id,
																	optionId: option.id,
																	itemId: sundry.id,
																	supplierCost: value,
																});
															}}
															disabled={!canEditPricing}
															isCurrency
														/>
													</TableCell>
													<TableCell className="text-center text-muted-foreground text-sm">
														<EditableNumber
															value={parseFloat(sundry.markupPercent)}
															onSave={async (value) => {
																await updateSundryPricing.mutateAsync({
																	packageId: pkg.id,
																	optionId: option.id,
																	itemId: sundry.id,
																	markupPercent: value,
																});
															}}
															disabled={!canEditPricing}
															min={0}
															formatValue={(val) => `${val.toFixed(0)}%`}
														/>
													</TableCell>
													<TableCell className="text-right">{formatCurrency(sundry.unitPrice)}</TableCell>
													<TableCell className="text-right font-medium">{formatCurrency(sundry.lineTotal)}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						) : (
							<div className="border rounded-lg p-8 text-center text-muted-foreground border-dashed">
								No sundries added yet.
							</div>
						)}
					</>
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
										parseFloat(option.total) - parseFloat(option.vatAmount) - parseFloat(option.totalCost)
									)}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Margin %</span>
								<span className="text-green-600">
									{(
										((parseFloat(option.total) - parseFloat(option.vatAmount) - parseFloat(option.totalCost)) /
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
