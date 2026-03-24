import { Layers, MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
	type ProductComponent,
	useCreateProductComponentMutation,
	useDeleteProductComponentMutation,
	useProductComponentsQuery,
	useUpdateProductComponentMutation,
} from '@/hooks/use-product-components';
import { COMPONENT_TYPE_LABELS, COMPONENT_TYPES } from '@/lib/product-utils';

type ProductComponentsCardProps = {
	productId: string;
};

export function ProductComponentsCard({ productId }: ProductComponentsCardProps) {
	const [formOpen, setFormOpen] = useState(false);
	const [selectedComponent, setSelectedComponent] = useState<ProductComponent | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [componentType, setComponentType] = useState<string>('headstone');
	const [name, setName] = useState('');
	const [quantity, setQuantity] = useState('1');

	const { data: components, isLoading } = useProductComponentsQuery(productId);
	const createMutation = useCreateProductComponentMutation();
	const updateMutation = useUpdateProductComponentMutation();
	const deleteMutation = useDeleteProductComponentMutation();

	const handleAdd = () => {
		setSelectedComponent(null);
		setComponentType('headstone');
		setName('');
		setQuantity('1');
		setMutationError(null);
		setFormOpen(true);
	};

	const handleEdit = (component: ProductComponent) => {
		setSelectedComponent(component);
		setComponentType(component.componentType);
		setName(component.name || '');
		setQuantity(String(component.quantity));
		setMutationError(null);
		setFormOpen(true);
	};

	const handleDelete = (component: ProductComponent) => {
		setSelectedComponent(component);
		setDeleteDialogOpen(true);
	};

	const handleSubmit = async () => {
		setMutationError(null);
		try {
			const data = {
				componentType,
				name: name.trim() || null,
				quantity: parseInt(quantity, 10) || 1,
			};

			if (selectedComponent) {
				await updateMutation.mutateAsync({ id: selectedComponent.id, ...data });
			} else {
				await createMutation.mutateAsync({ productId, ...data });
			}
			setFormOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteConfirm = async () => {
		if (!selectedComponent) return;
		try {
			await deleteMutation.mutateAsync(selectedComponent.id);
			setDeleteDialogOpen(false);
			setSelectedComponent(null);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	// Get used component types to filter available options
	const usedTypes = new Set(components?.map((c) => c.componentType) || []);
	const availableTypes = selectedComponent
		? COMPONENT_TYPES // When editing, show all types (will validate on server)
		: COMPONENT_TYPES.filter((t) => !usedTypes.has(t));

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Components</CardTitle>
							<CardDescription>Define the stone pieces that make up this product</CardDescription>
						</div>
						<Button onClick={handleAdd} disabled={availableTypes.length === 0}>
							<Plus className="h-4 w-4 mr-2" />
							Add Component
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="text-muted-foreground">Loading components...</div>
					) : !components || components.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground border rounded-lg">
							<Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
							No components defined. Add components to specify what stone pieces this product
							includes.
						</div>
					) : (
						<div className="border rounded-lg">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Type</TableHead>
										<TableHead>Display Name</TableHead>
										<TableHead>Quantity</TableHead>
										<TableHead className="w-[70px]"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{components.map((component) => (
										<TableRow key={component.id}>
											<TableCell>
												<Badge variant="outline">
													{COMPONENT_TYPE_LABELS[component.componentType] ||
														component.componentType}
												</Badge>
											</TableCell>
											<TableCell>
												{component.name || (
													<span className="text-muted-foreground">
														{COMPONENT_TYPE_LABELS[component.componentType]}
													</span>
												)}
											</TableCell>
											<TableCell>{component.quantity}</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="icon-sm">
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={() => handleEdit(component)}>
															Edit
														</DropdownMenuItem>
														<DropdownMenuItem
															className="text-destructive"
															onClick={() => handleDelete(component)}
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

			{/* Add/Edit Component Dialog */}
			<Dialog open={formOpen} onOpenChange={setFormOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{selectedComponent ? 'Edit Component' : 'Add Component'}</DialogTitle>
						<DialogDescription>
							{selectedComponent
								? 'Update the component details.'
								: 'Add a stone piece component to this product.'}
						</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="componentType">Component Type</FieldLabel>
							<Select value={componentType} onValueChange={setComponentType}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(selectedComponent ? COMPONENT_TYPES : availableTypes).map((type) => (
										<SelectItem key={type} value={type}>
											{COMPONENT_TYPE_LABELS[type] || type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldDescription>
								The type of stone piece (e.g., headstone, base, vase)
							</FieldDescription>
						</Field>

						<Field>
							<FieldLabel htmlFor="name">Display Name (optional)</FieldLabel>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={COMPONENT_TYPE_LABELS[componentType] || componentType}
							/>
							<FieldDescription>Override the default label for this component</FieldDescription>
						</Field>

						<Field>
							<FieldLabel htmlFor="quantity">Quantity</FieldLabel>
							<Input
								id="quantity"
								type="number"
								min="1"
								value={quantity}
								onChange={(e) => setQuantity(e.target.value)}
							/>
							<FieldDescription>
								Number of this component type (e.g., 2 for a pair of vases)
							</FieldDescription>
						</Field>
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
								: selectedComponent
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
				title="Delete Component"
				description={`Are you sure you want to delete the ${COMPONENT_TYPE_LABELS[selectedComponent?.componentType || ''] || selectedComponent?.componentType} component? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</>
	);
}
