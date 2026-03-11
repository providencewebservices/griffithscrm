import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Plus, Check } from 'lucide-react';
import {
	useLineItemPresetsQuery,
	useCreateLineItemPresetMutation,
	useUpdateLineItemPresetMutation,
	useDeleteLineItemPresetMutation,
	type LineItemPreset,
	type CreateLineItemPresetInput,
} from '@/hooks/use-line-item-presets';

export function LineItemsTab() {
	const { data: presets, isLoading, error } = useLineItemPresetsQuery();
	const createMutation = useCreateLineItemPresetMutation();
	const updateMutation = useUpdateLineItemPresetMutation();
	const deleteMutation = useDeleteLineItemPresetMutation();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<LineItemPreset | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [formName, setFormName] = useState('');
	const [formPrice, setFormPrice] = useState('0');
	const [formVatExempt, setFormVatExempt] = useState(false);
	const [formVisibleToCustomer, setFormVisibleToCustomer] = useState(true);
	const [formPriceVisibleToCustomer, setFormPriceVisibleToCustomer] = useState(true);

	const isEditing = !!selectedItem;

	const resetForm = () => {
		setFormName('');
		setFormPrice('0');
		setFormVatExempt(false);
		setFormVisibleToCustomer(true);
		setFormPriceVisibleToCustomer(true);
		setMutationError(null);
	};

	const handleCreate = () => {
		setSelectedItem(null);
		resetForm();
		setFormDialogOpen(true);
	};

	const handleEdit = (item: LineItemPreset) => {
		setSelectedItem(item);
		setFormName(item.name);
		setFormPrice(item.defaultPrice);
		setFormVatExempt(item.vatExempt);
		setFormVisibleToCustomer(item.visibleToCustomer);
		setFormPriceVisibleToCustomer(item.priceVisibleToCustomer);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleToggleActive = async () => {
		if (!selectedItem) return;
		try {
			await updateMutation.mutateAsync({
				id: selectedItem.id,
				isActive: !selectedItem.isActive,
			});
			setFormDialogOpen(false);
			resetForm();
		} catch {
			// Error handled by mutation
		}
	};

	const handleFormSubmit = async () => {
		setMutationError(null);
		const data: CreateLineItemPresetInput = {
			name: formName,
			defaultPrice: parseFloat(formPrice) || 0,
			vatExempt: formVatExempt,
			visibleToCustomer: formVisibleToCustomer,
			priceVisibleToCustomer: formPriceVisibleToCustomer,
		};

		try {
			if (isEditing && selectedItem) {
				await updateMutation.mutateAsync({ id: selectedItem.id, ...data });
			} else {
				await createMutation.mutateAsync(data);
			}
			setFormDialogOpen(false);
			resetForm();
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteConfirm = async () => {
		if (!selectedItem) return;
		try {
			await deleteMutation.mutateAsync(selectedItem.id);
			setDeleteDialogOpen(false);
			setFormDialogOpen(false);
			setSelectedItem(null);
		} catch {
			// Error handled by mutation
		}
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading line items...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading line items: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold">Common Line Items</h3>
					<p className="text-sm text-muted-foreground">
						Reusable line items for quotes (delivery, installation, permits, etc.)
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Line Item
				</Button>
			</div>

			{presets && presets.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No line items yet. Add your first line item to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead className="text-right">Default Price</TableHead>
								<TableHead>VAT Exempt</TableHead>
								<TableHead>Show on Quote</TableHead>
								<TableHead>Show Price</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{presets?.map((item) => (
								<TableRow
									key={item.id}
									className="cursor-pointer"
									onClick={() => handleEdit(item)}
								>
									<TableCell className="font-medium">
										{item.name}
										{!item.isActive && (
											<Badge variant="secondary" className="ml-2">
												Inactive
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-right">£{item.defaultPrice}</TableCell>
									<TableCell>
										{item.vatExempt ? (
											<Check className="h-4 w-4" />
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell>
										{item.visibleToCustomer ? (
											<span>Shown</span>
										) : (
											<span className="text-muted-foreground">Hidden</span>
										)}
									</TableCell>
									<TableCell>
										{item.visibleToCustomer ? (
											item.priceVisibleToCustomer ? (
												<span>Shown</span>
											) : (
												<span className="text-muted-foreground">Hidden</span>
											)
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												handleEdit(item);
											}}
										>
											Edit
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Form Dialog */}
			<Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{isEditing ? 'Edit Line Item' : 'Add Line Item'}
						</DialogTitle>
						<DialogDescription>
							{isEditing
								? 'Update the line item details.'
								: 'Add a reusable line item for quotes.'}
						</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="name">Name</FieldLabel>
							<Input
								id="name"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								placeholder="e.g., Delivery, Installation, Church Permit"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="price">Default Price (£)</FieldLabel>
							<Input
								id="price"
								type="number"
								min="0"
								step="0.01"
								value={formPrice}
								onChange={(e) => setFormPrice(e.target.value)}
								placeholder="0.00"
							/>
						</Field>

						<Field>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="vatExempt"
									checked={formVatExempt}
									onCheckedChange={(checked) => setFormVatExempt(checked === true)}
								/>
								<FieldLabel htmlFor="vatExempt" className="!mb-0 cursor-pointer">
									VAT Exempt (e.g., church fees, permits)
								</FieldLabel>
							</div>
						</Field>

						<Field>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="visibleToCustomer"
									checked={formVisibleToCustomer}
									onCheckedChange={(checked) => {
										setFormVisibleToCustomer(checked === true);
										// When line item visibility is disabled, also disable price visibility
										if (checked !== true) {
											setFormPriceVisibleToCustomer(false);
										}
									}}
								/>
								<FieldLabel htmlFor="visibleToCustomer" className="!mb-0 cursor-pointer">
									Line Item Visible to Customer
								</FieldLabel>
							</div>
						</Field>

						<Field>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="priceVisibleToCustomer"
									checked={formPriceVisibleToCustomer}
									onCheckedChange={(checked) => setFormPriceVisibleToCustomer(checked === true)}
									disabled={!formVisibleToCustomer}
								/>
								<FieldLabel htmlFor="priceVisibleToCustomer" className={`!mb-0 cursor-pointer ${!formVisibleToCustomer ? 'text-muted-foreground' : ''}`}>
									Price Visible to Customer
								</FieldLabel>
							</div>
						</Field>
					</FieldGroup>

					<DialogFooter className="flex-col sm:flex-row gap-2">
						{isEditing && selectedItem && (
							<div className="flex gap-2 mr-auto">
								<Button
									variant="outline"
									size="sm"
									onClick={handleToggleActive}
									disabled={updateMutation.isPending}
								>
									{selectedItem.isActive ? 'Deactivate' : 'Activate'}
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setDeleteDialogOpen(true)}
								>
									Delete
								</Button>
							</div>
						)}
						<Button variant="outline" onClick={() => setFormDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleFormSubmit}
							disabled={!formName || createMutation.isPending || updateMutation.isPending}
						>
							{createMutation.isPending || updateMutation.isPending
								? 'Saving...'
								: isEditing
									? 'Update'
									: 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirm Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				title="Delete Line Item"
				description={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
