import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type {
	QuoteOption,
	QuotePackageWithOptions,
	useAddSundryMutation,
	useDeleteSundryMutation,
	useUpdateSundryPricingMutation,
} from '@/hooks/use-quotes';
import { useSundriesQuery } from '@/hooks/use-sundries';
import { EditableNumber } from './editable-number';

export function SundriesSection({
	pkg,
	option,
	canEditPricing,
	formatCurrency,
	updateSundryPricing,
	addSundryMutation,
	deleteSundryMutation,
}: {
	pkg: QuotePackageWithOptions;
	option: QuoteOption;
	canEditPricing: boolean;
	formatCurrency: (value: string | number) => string;
	updateSundryPricing: ReturnType<typeof useUpdateSundryPricingMutation>;
	addSundryMutation: ReturnType<typeof useAddSundryMutation>;
	deleteSundryMutation: ReturnType<typeof useDeleteSundryMutation>;
}) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	// Form state
	const [selectedSundryId, setSelectedSundryId] = useState('');
	const [quantity, setQuantity] = useState('1');

	// Fetch available sundries
	const { data: availableSundries } = useSundriesQuery();
	const activeSundries = availableSundries?.filter((s) => s.isActive) ?? [];

	const resetForm = () => {
		setSelectedSundryId('');
		setQuantity('1');
	};

	const handleAdd = async () => {
		if (!selectedSundryId || !quantity) return;
		await addSundryMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			sundryId: selectedSundryId,
			quantity: parseInt(quantity, 10),
		});
		resetForm();
		setShowAddForm(false);
	};

	const handleDelete = async (itemId: string) => {
		await deleteSundryMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			itemId,
		});
		setDeleteConfirmId(null);
	};

	const sundries = option.sundries || [];

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<h4 className="font-medium">
					Sundries
					{sundries.length > 0 && ` (${sundries.length} item${sundries.length !== 1 ? 's' : ''})`}
				</h4>
				{canEditPricing && !showAddForm && (
					<Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
						<Plus className="h-4 w-4 mr-1" />
						Add Sundry
					</Button>
				)}
			</div>

			{/* Add Form */}
			{showAddForm && canEditPricing && (
				<div className="border rounded-lg p-4 mb-4 bg-muted/50">
					<div className="grid grid-cols-12 gap-3 mb-4">
						<div className="col-span-12 md:col-span-6">
							<Label className="text-sm mb-1 block">Sundry</Label>
							<Select value={selectedSundryId} onValueChange={setSelectedSundryId}>
								<SelectTrigger>
									<SelectValue placeholder="Select a sundry..." />
								</SelectTrigger>
								<SelectContent>
									{activeSundries.map((s) => (
										<SelectItem key={s.id} value={s.id}>
											{s.name} ({formatCurrency(s.price)})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="col-span-12 md:col-span-3">
							<Label className="text-sm mb-1 block">Quantity</Label>
							<Input
								type="number"
								min="1"
								step="1"
								value={quantity}
								onChange={(e) => setQuantity(e.target.value)}
							/>
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
							disabled={!selectedSundryId || !quantity || addSundryMutation.isPending}
						>
							{addSundryMutation.isPending ? (
								<Loader2 className="h-4 w-4 mr-1 animate-spin" />
							) : (
								<Plus className="h-4 w-4 mr-1" />
							)}
							Add
						</Button>
					</div>
				</div>
			)}

			{/* Table */}
			{sundries.length > 0 && (
				<div className="border rounded-lg overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Item</TableHead>
								<TableHead className="text-center w-14">Qty</TableHead>
								<TableHead className="text-right w-28">Supplier</TableHead>
								<TableHead className="text-center w-24">Markup</TableHead>
								<TableHead className="text-right w-24">Retail</TableHead>
								<TableHead className="text-right w-24">Total</TableHead>
								{canEditPricing && <TableHead className="w-16" />}
							</TableRow>
						</TableHeader>
						<TableBody>
							{sundries.map((sundry) => (
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
											align="center"
											formatValue={(val) => `${val.toFixed(0)}%`}
										/>
									</TableCell>
									<TableCell className="text-right">{formatCurrency(sundry.unitPrice)}</TableCell>
									<TableCell className="text-right font-medium">
										{formatCurrency(sundry.lineTotal)}
									</TableCell>
									{canEditPricing && (
										<TableCell>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground/60 hover:text-destructive transition-colors"
												onClick={() => setDeleteConfirmId(sundry.id)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</TableCell>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteConfirmId !== null}
				onOpenChange={(open) => !open && setDeleteConfirmId(null)}
				onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
				title="Delete Sundry"
				description="Are you sure you want to delete this sundry? This action cannot be undone."
				isLoading={deleteSundryMutation.isPending}
			/>
		</div>
	);
}
