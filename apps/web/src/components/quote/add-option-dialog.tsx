import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { type DimensionCombo, useDimensionCombosQuery } from '@/hooks/use-dimension-combos';
import { useProductsQuery } from '@/hooks/use-products';
import { type QuoteOption, useAddOptionMutation } from '@/hooks/use-quotes';

interface AddOptionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	packageId: string;
	existingOptions: QuoteOption[];
	onSuccess?: () => void;
}

type CreationMode = 'fresh' | 'clone';

export function AddOptionDialog({
	open,
	onOpenChange,
	packageId,
	existingOptions,
	onSuccess,
}: AddOptionDialogProps) {
	const [mode, setMode] = useState<CreationMode>('clone');
	const [sourceOptionId, setSourceOptionId] = useState<string>('');
	const [productId, setProductId] = useState<string>('');
	const [dimensionComboId, setDimensionComboId] = useState<string>('');
	const [optionLabel, setOptionLabel] = useState<string>('');
	const [error, setError] = useState<string | null>(null);

	const addOptionMutation = useAddOptionMutation();

	// Fetch products for selection
	const { data: productsData, isLoading: productsLoading } = useProductsQuery({
		isActive: 'true',
		limit: 100,
	});
	const products = productsData?.products || [];

	// Fetch dimension combos when a product is selected
	const { data: dimensionCombos, isLoading: combosLoading } = useDimensionCombosQuery(
		productId || undefined,
	);

	// Filter to only active dimension combos
	const activeCombos = dimensionCombos?.filter((c) => c.isActive) || [];

	// Reset form when dialog opens/closes
	useEffect(() => {
		if (open) {
			setMode(existingOptions.length > 0 ? 'clone' : 'fresh');
			setSourceOptionId(existingOptions[0]?.id || '');
			setProductId('');
			setDimensionComboId('');
			setOptionLabel('');
			setError(null);
		}
	}, [open, existingOptions]);

	// Reset dimension combo when product changes
	useEffect(() => {
		setDimensionComboId('');
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		try {
			await addOptionMutation.mutateAsync({
				packageId,
				copyFromOptionId: mode === 'clone' ? sourceOptionId : undefined,
				productId: productId && productId !== '__none__' ? productId : undefined,
				dimensionComboId:
					dimensionComboId && dimensionComboId !== '__none__' ? dimensionComboId : undefined,
				optionLabel: optionLabel || undefined,
			});
			onOpenChange(false);
			onSuccess?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create option');
		}
	};

	// Format dimension combo name for display
	const formatComboName = (combo: DimensionCombo) => {
		if (combo.name) return combo.name;
		// Generate a name from values
		const dimensions = combo.values
			.map((v) => `${v.dimension1}"×${v.dimension2}"×${v.dimension3}"`)
			.join(', ');
		return dimensions || 'Standard';
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add Quote Option</DialogTitle>
					<DialogDescription>Create a new pricing option for this quote</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-6 py-4">
						{error && (
							<div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
								{error}
							</div>
						)}

						{/* Creation Mode */}
						<div className="space-y-3">
							<Label>How do you want to create this option?</Label>
							<RadioGroup
								value={mode}
								onValueChange={(v) => setMode(v as CreationMode)}
								className="space-y-2"
							>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="fresh" id="mode-fresh" />
									<Label htmlFor="mode-fresh" className="font-normal cursor-pointer">
										Start fresh (blank option)
									</Label>
								</div>
								<div className="flex items-start space-x-2">
									<RadioGroupItem
										value="clone"
										id="mode-clone"
										disabled={existingOptions.length === 0}
									/>
									<div className="flex flex-col gap-2">
										<Label
											htmlFor="mode-clone"
											className={`font-normal cursor-pointer ${existingOptions.length === 0 ? 'text-muted-foreground' : ''}`}
										>
											Clone from existing option
										</Label>
										{mode === 'clone' && existingOptions.length > 0 && (
											<Select value={sourceOptionId} onValueChange={setSourceOptionId}>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Select option to clone" />
												</SelectTrigger>
												<SelectContent>
													{existingOptions.map((opt) => (
														<SelectItem key={opt.id} value={opt.id}>
															{opt.quoteNumber}
															{opt.optionLabel && ` (${opt.optionLabel})`}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									</div>
								</div>
							</RadioGroup>
						</div>

						<hr />

						{/* Product Selection */}
						<div className="space-y-2">
							<Label htmlFor="product">Product (optional)</Label>
							<Select value={productId} onValueChange={setProductId}>
								<SelectTrigger id="product">
									<SelectValue placeholder={productsLoading ? 'Loading...' : 'Select product...'} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">No product</SelectItem>
									{products.map((product) => (
										<SelectItem key={product.id} value={product.id}>
											{product.name}
											{product.sku && (
												<span className="text-muted-foreground ml-1">({product.sku})</span>
											)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								{mode === 'clone'
									? 'Leave empty to keep the product from the cloned option'
									: 'Select a product to associate with this option'}
							</p>
						</div>

						{/* Dimension Combo Selection - only show when product selected */}
						{productId && (
							<div className="space-y-2">
								<Label htmlFor="dimensions">Dimensions (optional)</Label>
								<Select
									value={dimensionComboId}
									onValueChange={setDimensionComboId}
									disabled={combosLoading || activeCombos.length === 0}
								>
									<SelectTrigger id="dimensions">
										<SelectValue
											placeholder={
												combosLoading
													? 'Loading...'
													: activeCombos.length === 0
														? 'No dimension options'
														: 'Select dimensions...'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__none__">No specific dimensions</SelectItem>
										{activeCombos.map((combo) => (
											<SelectItem key={combo.id} value={combo.id}>
												{formatComboName(combo)}
												{combo.priceAdjustment !== '0' && combo.priceAdjustment !== '0.00' && (
													<span className="text-muted-foreground ml-1">
														(+£{parseFloat(combo.priceAdjustment).toFixed(2)})
													</span>
												)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{/* Option Label */}
						<div className="space-y-2">
							<Label htmlFor="label">Option Label (optional)</Label>
							<Input
								id="label"
								value={optionLabel}
								onChange={(e) => setOptionLabel(e.target.value)}
								placeholder='e.g., "Premium Option", "Budget Option"'
							/>
							<p className="text-xs text-muted-foreground">
								A descriptive label to help identify this option
							</p>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={addOptionMutation.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={addOptionMutation.isPending}>
							{addOptionMutation.isPending ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Creating...
								</>
							) : (
								'Create Option'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
