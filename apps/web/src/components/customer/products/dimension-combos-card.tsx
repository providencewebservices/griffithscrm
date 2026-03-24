import { MoreHorizontal, Plus, Ruler } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	type DimensionCombo,
	type DimensionValueInput,
	useCreateDimensionComboMutation,
	useDeleteDimensionComboMutation,
	useDimensionCombosQuery,
	useUpdateDimensionComboMutation,
} from '@/hooks/use-dimension-combos';
import { useProductComponentsQuery } from '@/hooks/use-product-components';
import {
	COMPONENT_TYPE_LABELS,
	formatPriceAdjustment,
	getDimensionLabels,
} from '@/lib/product-utils';

function formatComboDisplay(combo: DimensionCombo): string {
	return combo.values
		.map((v) => {
			const label = v.componentName || COMPONENT_TYPE_LABELS[v.componentType] || v.componentType;
			return `${label} ${v.dimension1} x ${v.dimension2} x ${v.dimension3}`;
		})
		.join(', ');
}

type DimensionCombosCardProps = {
	productId: string;
};

export function DimensionCombosCard({ productId }: DimensionCombosCardProps) {
	const [formOpen, setFormOpen] = useState(false);
	const [selectedCombo, setSelectedCombo] = useState<DimensionCombo | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [name, setName] = useState('');
	const [priceAdjustment, setPriceAdjustment] = useState('0');
	const [dimensionValues, setDimensionValues] = useState<
		Record<string, { dim1: string; dim2: string; dim3: string }>
	>({});

	const { data: combos, isLoading: combosLoading } = useDimensionCombosQuery(productId);
	const { data: components, isLoading: componentsLoading } = useProductComponentsQuery(productId);
	const createMutation = useCreateDimensionComboMutation();
	const updateMutation = useUpdateDimensionComboMutation();
	const deleteMutation = useDeleteDimensionComboMutation();

	// Initialize dimension values when components load or form opens
	useEffect(() => {
		if (formOpen && components) {
			if (selectedCombo) {
				// Populate from existing combo
				const values: Record<string, { dim1: string; dim2: string; dim3: string }> = {};
				for (const v of selectedCombo.values) {
					values[v.productComponentId] = {
						dim1: v.dimension1,
						dim2: v.dimension2,
						dim3: v.dimension3,
					};
				}
				setDimensionValues(values);
			} else {
				// Initialize empty values for all components
				const values: Record<string, { dim1: string; dim2: string; dim3: string }> = {};
				for (const c of components) {
					values[c.id] = { dim1: '', dim2: '', dim3: '' };
				}
				setDimensionValues(values);
			}
		}
	}, [formOpen, components, selectedCombo]);

	const handleAdd = () => {
		setSelectedCombo(null);
		setName('');
		setPriceAdjustment('0');
		setMutationError(null);
		setFormOpen(true);
	};

	const handleEdit = (combo: DimensionCombo) => {
		setSelectedCombo(combo);
		setName(combo.name || '');
		setPriceAdjustment(combo.priceAdjustment);
		setMutationError(null);
		setFormOpen(true);
	};

	const handleDelete = (combo: DimensionCombo) => {
		setSelectedCombo(combo);
		setDeleteDialogOpen(true);
	};

	const handleDimensionChange = (
		componentId: string,
		field: 'dim1' | 'dim2' | 'dim3',
		value: string,
	) => {
		setDimensionValues((prev) => ({
			...prev,
			[componentId]: {
				...prev[componentId],
				[field]: value,
			},
		}));
	};

	const handleSubmit = async () => {
		if (!components) return;
		setMutationError(null);

		// Build values array
		const values: DimensionValueInput[] = components.map((c) => ({
			productComponentId: c.id,
			dimension1: parseFloat(dimensionValues[c.id]?.dim1 || '0'),
			dimension2: parseFloat(dimensionValues[c.id]?.dim2 || '0'),
			dimension3: parseFloat(dimensionValues[c.id]?.dim3 || '0'),
		}));

		// Validate all dimensions are provided
		for (const v of values) {
			if (v.dimension1 <= 0 || v.dimension2 <= 0 || v.dimension3 <= 0) {
				setMutationError('All dimensions must be greater than 0');
				return;
			}
		}

		try {
			const data = {
				name: name.trim() || null,
				priceAdjustment: parseFloat(priceAdjustment) || 0,
				values,
			};

			if (selectedCombo) {
				await updateMutation.mutateAsync({ id: selectedCombo.id, ...data });
			} else {
				await createMutation.mutateAsync({ productId, ...data });
			}
			setFormOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteConfirm = async () => {
		if (!selectedCombo) return;
		try {
			await deleteMutation.mutateAsync(selectedCombo.id);
			setDeleteDialogOpen(false);
			setSelectedCombo(null);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const isLoading = combosLoading || componentsLoading;
	const hasComponents = components && components.length > 0;

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Dimension Combos</CardTitle>
							<CardDescription>Predefined size configurations for this product</CardDescription>
						</div>
						<Button onClick={handleAdd} disabled={!hasComponents}>
							<Plus className="h-4 w-4 mr-2" />
							Add Combo
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="text-muted-foreground">Loading...</div>
					) : !hasComponents ? (
						<div className="text-center py-8 text-muted-foreground border rounded-lg">
							<Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
							Add components first before defining dimension combos.
						</div>
					) : !combos || combos.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground border rounded-lg">
							<Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
							No dimension combos defined. Add combos to specify available sizes.
						</div>
					) : (
						<div className="border rounded-lg">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Dimensions</TableHead>
										<TableHead>Name</TableHead>
										<TableHead>Price Adj.</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="w-[70px]"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{combos.map((combo) => (
										<TableRow key={combo.id}>
											<TableCell className="font-mono text-sm">
												{formatComboDisplay(combo)}
											</TableCell>
											<TableCell>
												{combo.name || <span className="text-muted-foreground">-</span>}
											</TableCell>
											<TableCell>{formatPriceAdjustment(combo.priceAdjustment)}</TableCell>
											<TableCell>
												<Badge variant={combo.isActive ? 'default' : 'secondary'}>
													{combo.isActive ? 'Active' : 'Inactive'}
												</Badge>
											</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="icon-sm">
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={() => handleEdit(combo)}>
															Edit
														</DropdownMenuItem>
														<DropdownMenuItem
															className="text-destructive"
															onClick={() => handleDelete(combo)}
														>
															Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Add/Edit Dimension Combo Dialog */}
			<Dialog open={formOpen} onOpenChange={setFormOpen}>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle>
							{selectedCombo ? 'Edit Dimension Combo' : 'Add Dimension Combo'}
						</DialogTitle>
						<DialogDescription>
							{selectedCombo
								? 'Update the dimensions for this combo.'
								: 'Define a new size configuration for this product.'}
						</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<div className="grid grid-cols-2 gap-4">
							<Field>
								<FieldLabel htmlFor="name">Display Name (optional)</FieldLabel>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g., Small, Medium, Large"
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor="priceAdjustment">Price Adjustment (£)</FieldLabel>
								<Input
									id="priceAdjustment"
									type="number"
									step="0.01"
									value={priceAdjustment}
									onChange={(e) => setPriceAdjustment(e.target.value)}
									placeholder="0.00"
								/>
							</Field>
						</div>

						<Separator className="my-4" />

						<div className="text-sm font-medium mb-2">Dimensions (inches)</div>

						{components?.map((component) => {
							const labels = getDimensionLabels(component.componentType);
							const displayName =
								component.name ||
								COMPONENT_TYPE_LABELS[component.componentType] ||
								component.componentType;

							return (
								<div key={component.id} className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">
										{displayName}
										{component.quantity > 1 && ` (×${component.quantity})`}
									</div>
									<div className="grid grid-cols-3 gap-3">
										<Field>
											<FieldLabel className="text-xs">{labels[0]}</FieldLabel>
											<Input
												type="number"
												step="0.01"
												min="0"
												value={dimensionValues[component.id]?.dim1 || ''}
												onChange={(e) =>
													handleDimensionChange(component.id, 'dim1', e.target.value)
												}
												placeholder="0"
											/>
										</Field>
										<Field>
											<FieldLabel className="text-xs">{labels[1]}</FieldLabel>
											<Input
												type="number"
												step="0.01"
												min="0"
												value={dimensionValues[component.id]?.dim2 || ''}
												onChange={(e) =>
													handleDimensionChange(component.id, 'dim2', e.target.value)
												}
												placeholder="0"
											/>
										</Field>
										<Field>
											<FieldLabel className="text-xs">{labels[2]}</FieldLabel>
											<Input
												type="number"
												step="0.01"
												min="0"
												value={dimensionValues[component.id]?.dim3 || ''}
												onChange={(e) =>
													handleDimensionChange(component.id, 'dim3', e.target.value)
												}
												placeholder="0"
											/>
										</Field>
									</div>
								</div>
							);
						})}
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setFormOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={createMutation.isPending || updateMutation.isPending}
						>
							{createMutation.isPending || updateMutation.isPending
								? 'Saving...'
								: selectedCombo
									? 'Update'
									: 'Add'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				title="Delete Dimension Combo"
				description="Are you sure you want to delete this dimension combo? This action cannot be undone."
				isLoading={deleteMutation.isPending}
			/>
		</>
	);
}
