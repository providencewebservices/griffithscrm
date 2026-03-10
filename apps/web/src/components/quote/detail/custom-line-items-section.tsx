import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { EditableNumber } from './editable-number';
import { EditableText } from './editable-text';
import {
	Plus,
	Loader2,
	Eye,
	EyeOff,
	Trash2,
} from 'lucide-react';
import type {
	QuotePackageWithOptions,
	QuoteOption,
} from '@/hooks/use-quotes';
import type {
	useAddLineItemMutation,
	useUpdateLineItemMutation,
	useDeleteLineItemMutation,
} from '@/hooks/use-quotes';

export function CustomLineItemsSection({
	pkg,
	option,
	canEditPricing,
	formatCurrency,
	addLineItem,
	updateLineItem,
	deleteLineItem,
	activePresets,
}: {
	pkg: QuotePackageWithOptions;
	option: QuoteOption;
	canEditPricing: boolean;
	formatCurrency: (value: string | number) => string;
	addLineItem: ReturnType<typeof useAddLineItemMutation>;
	updateLineItem: ReturnType<typeof useUpdateLineItemMutation>;
	deleteLineItem: ReturnType<typeof useDeleteLineItemMutation>;
	activePresets: { id: string; name: string; defaultPrice: string; vatExempt: boolean; visibleToCustomer: boolean; priceVisibleToCustomer: boolean }[];
}) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	// New line item form state
	const [newPresetId, setNewPresetId] = useState('');
	const [newDesc, setNewDesc] = useState('');
	const [newPrice, setNewPrice] = useState('');
	const [newVatExempt, setNewVatExempt] = useState(false);
	const [newVisibleToCustomer, setNewVisibleToCustomer] = useState(true);
	const [newPriceVisibleToCustomer, setNewPriceVisibleToCustomer] = useState(true);

	const handlePresetSelect = (presetId: string) => {
		setNewPresetId(presetId);
		if (presetId === 'custom') {
			setNewDesc('');
			setNewPrice('');
			setNewVatExempt(false);
			setNewVisibleToCustomer(true);
			setNewPriceVisibleToCustomer(true);
		} else {
			const preset = activePresets.find((p) => p.id === presetId);
			if (preset) {
				setNewDesc(preset.name);
				setNewPrice(preset.defaultPrice);
				setNewVatExempt(preset.vatExempt);
				setNewVisibleToCustomer(preset.visibleToCustomer);
				setNewPriceVisibleToCustomer(preset.priceVisibleToCustomer);
			}
		}
	};

	const resetForm = () => {
		setNewPresetId('');
		setNewDesc('');
		setNewPrice('');
		setNewVatExempt(false);
		setNewVisibleToCustomer(true);
		setNewPriceVisibleToCustomer(true);
	};

	const handleAdd = async () => {
		if (!newDesc.trim() || !newPrice) return;
		await addLineItem.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			description: newDesc.trim(),
			price: parseFloat(newPrice),
			vatExempt: newVatExempt,
			visibleToCustomer: newVisibleToCustomer,
			priceVisibleToCustomer: newPriceVisibleToCustomer,
		});
		resetForm();
		setShowAddForm(false);
	};

	const handleDelete = async (itemId: string) => {
		await deleteLineItem.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			itemId,
		});
		setDeleteConfirmId(null);
	};

	const lineItems = option.lineItems || [];

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<h4 className="font-medium">
					Custom Line Items{lineItems.length > 0 && ` (${lineItems.length} item${lineItems.length !== 1 ? 's' : ''})`}
				</h4>
				{canEditPricing && !showAddForm && lineItems.length > 0 && (
					<Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
						<Plus className="h-4 w-4 mr-1" />
						Add Line Item
					</Button>
				)}
			</div>

			{/* Add Form */}
			{showAddForm && canEditPricing && (
				<div className="border rounded-lg p-4 mb-4 bg-muted/50">
					<div className="grid grid-cols-12 gap-3 mb-4">
						<div className="col-span-12 md:col-span-4">
							<Label className="text-sm mb-1 block">Line Item</Label>
							<Select value={newPresetId} onValueChange={handlePresetSelect}>
								<SelectTrigger>
									<SelectValue placeholder="Select a line item..." />
								</SelectTrigger>
								<SelectContent>
									{activePresets.map((preset) => (
										<SelectItem key={preset.id} value={preset.id}>
											{preset.name} ({formatCurrency(preset.defaultPrice)})
										</SelectItem>
									))}
									<SelectItem value="custom">Custom (free-form)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{newPresetId === 'custom' && (
							<div className="col-span-12 md:col-span-5">
								<Label className="text-sm mb-1 block">Description</Label>
								<Input
									placeholder="e.g., Labour, Delivery"
									value={newDesc}
									onChange={(e) => setNewDesc(e.target.value)}
								/>
							</div>
						)}
						<div className={`col-span-12 ${newPresetId === 'custom' ? 'md:col-span-3' : 'md:col-span-3'}`}>
							<Label className="text-sm mb-1 block">Price</Label>
							<Input
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								value={newPrice}
								onChange={(e) => setNewPrice(e.target.value)}
							/>
						</div>
					</div>
					<div className="flex items-center gap-4 mb-4">
						<div className="flex items-center gap-2">
							<Checkbox
								id="newLineItemVatExempt"
								checked={newVatExempt}
								onCheckedChange={(checked) => setNewVatExempt(checked === true)}
							/>
							<Label htmlFor="newLineItemVatExempt" className="text-sm whitespace-nowrap">
								VAT Exempt
							</Label>
						</div>
						<Separator orientation="vertical" className="h-5" />
						<div className="flex items-center gap-2">
							<Checkbox
								id="newLineItemVisible"
								checked={newVisibleToCustomer}
								onCheckedChange={(checked) => {
									setNewVisibleToCustomer(checked === true);
									if (checked !== true) {
										setNewPriceVisibleToCustomer(false);
									}
								}}
							/>
							<Label htmlFor="newLineItemVisible" className="text-sm whitespace-nowrap">
								Show on Quote
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="newLineItemPriceVisible"
								checked={newPriceVisibleToCustomer}
								onCheckedChange={(checked) => setNewPriceVisibleToCustomer(checked === true)}
								disabled={!newVisibleToCustomer}
							/>
							<Label htmlFor="newLineItemPriceVisible" className={`text-sm whitespace-nowrap ${!newVisibleToCustomer ? 'text-muted-foreground' : ''}`}>
								Show Price
							</Label>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								resetForm();
								setShowAddForm(false);
							}}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleAdd}
							disabled={!newDesc.trim() || !newPrice || addLineItem.isPending}
						>
							{addLineItem.isPending ? (
								<Loader2 className="h-4 w-4 mr-1 animate-spin" />
							) : (
								<Plus className="h-4 w-4 mr-1" />
							)}
							Add
						</Button>
					</div>
				</div>
			)}

			{/* Empty State */}
			{lineItems.length === 0 && !showAddForm && (
				<div className="border rounded-lg p-8 text-center text-muted-foreground border-dashed">
					No custom line items added yet.
					{canEditPricing && (
						<>
							{' '}
							<Button
								variant="link"
								size="sm"
								className="p-0 h-auto"
								onClick={() => setShowAddForm(true)}
							>
								Add one now
							</Button>
						</>
					)}
				</div>
			)}

			{/* Table */}
			{lineItems.length > 0 && (
				<div className="border rounded-lg overflow-x-auto">
					<TooltipProvider>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Description</TableHead>
									<TableHead className="text-right w-32">Price</TableHead>
									<TableHead className="text-center w-24">VAT Exempt</TableHead>
									<TableHead className="text-center w-20">
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="inline-flex items-center gap-1 cursor-help">
													<Eye className="h-3.5 w-3.5" /> Line
												</span>
											</TooltipTrigger>
											<TooltipContent>Show line item on customer quote</TooltipContent>
										</Tooltip>
									</TableHead>
									<TableHead className="text-center w-24">
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="inline-flex items-center gap-1 cursor-help">
													<Eye className="h-3.5 w-3.5" /> Price
												</span>
											</TooltipTrigger>
											<TooltipContent>Show price on customer quote</TooltipContent>
										</Tooltip>
									</TableHead>
									{canEditPricing && <TableHead className="w-16"></TableHead>}
								</TableRow>
							</TableHeader>
							<TableBody>
								{lineItems.map((item) => (
									<TableRow key={item.id}>
										<TableCell>
											<EditableText
												value={item.description}
												onSave={async (value) => {
													await updateLineItem.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: item.id,
														description: value,
													});
												}}
												disabled={!canEditPricing}
											/>
										</TableCell>
										<TableCell className="text-right">
											<EditableNumber
												value={parseFloat(item.price)}
												onSave={async (value) => {
													await updateLineItem.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: item.id,
														price: value,
													});
												}}
												disabled={!canEditPricing}
												isCurrency
											/>
										</TableCell>
										<TableCell className="text-center">
											<Checkbox
												checked={item.vatExempt}
												onCheckedChange={async (checked) => {
													await updateLineItem.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: item.id,
														vatExempt: checked === true,
													});
												}}
												disabled={!canEditPricing}
											/>
										</TableCell>
										<TableCell className="text-center">
											{canEditPricing ? (
												<Checkbox
													checked={item.visibleToCustomer}
													onCheckedChange={async (checked) => {
														await updateLineItem.mutateAsync({
															packageId: pkg.id,
															optionId: option.id,
															itemId: item.id,
															visibleToCustomer: checked === true,
															...(checked !== true ? { priceVisibleToCustomer: false } : {}),
														});
													}}
												/>
											) : item.visibleToCustomer ? (
												<Eye className="h-4 w-4 mx-auto text-green-600" />
											) : (
												<EyeOff className="h-4 w-4 mx-auto text-muted-foreground" />
											)}
										</TableCell>
										<TableCell className="text-center">
											{canEditPricing ? (
												<Checkbox
													checked={item.priceVisibleToCustomer}
													onCheckedChange={async (checked) => {
														await updateLineItem.mutateAsync({
															packageId: pkg.id,
															optionId: option.id,
															itemId: item.id,
															priceVisibleToCustomer: checked === true,
														});
													}}
													disabled={!item.visibleToCustomer}
												/>
											) : item.visibleToCustomer ? (
												item.priceVisibleToCustomer ? (
													<Eye className="h-4 w-4 mx-auto text-green-600" />
												) : (
													<EyeOff className="h-4 w-4 mx-auto text-muted-foreground" />
												)
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										{canEditPricing && (
											<TableCell>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 text-destructive"
													onClick={() => setDeleteConfirmId(item.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</TableCell>
										)}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TooltipProvider>
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteConfirmId !== null}
				onOpenChange={(open) => !open && setDeleteConfirmId(null)}
				onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
				title="Delete Line Item"
				description="Are you sure you want to delete this line item? This action cannot be undone."
				isLoading={deleteLineItem.isPending}
			/>
		</div>
	);
}
