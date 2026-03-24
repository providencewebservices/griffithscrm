import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
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
import { useLetteringColorsQuery } from '@/hooks/use-lettering-colors';
import {
	type CreateLetteringCostInput,
	type LetteringCost,
	type LetteringCostAppliesTo,
	useCreateLetteringCostMutation,
	useDeleteLetteringCostMutation,
	useUpdateLetteringCostMutation,
} from '@/hooks/use-lettering-costs';
import {
	type UpdateLetteringTechniqueInput,
	useDeleteLetteringTechniqueMutation,
	useLetteringTechniqueQuery,
	useUpdateLetteringTechniqueMutation,
} from '@/hooks/use-lettering-techniques';

const APPLIES_TO_LABELS: Record<LetteringCostAppliesTo, string> = {
	new_memorial: 'New Memorial',
	refurbishment: 'Refurbishment',
	both: 'Both',
};

export function LetteringTechniqueDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [costFormOpen, setCostFormOpen] = useState(false);
	const [deleteCostDialogOpen, setDeleteCostDialogOpen] = useState(false);
	const [selectedCost, setSelectedCost] = useState<LetteringCost | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Technique form state
	const [formName, setFormName] = useState('');

	// Cost form state
	const [costColorId, setCostColorId] = useState<string | null>(null);
	const [costAppliesTo, setCostAppliesTo] = useState<LetteringCostAppliesTo>('new_memorial');
	const [costFreeLetters, setCostFreeLetters] = useState('0');
	const [costPricePerLetter, setCostPricePerLetter] = useState('0');

	const { data: technique, isLoading, error } = useLetteringTechniqueQuery(id);
	const { data: colors } = useLetteringColorsQuery();
	const updateMutation = useUpdateLetteringTechniqueMutation();
	const deleteMutation = useDeleteLetteringTechniqueMutation();
	const createCostMutation = useCreateLetteringCostMutation();
	const updateCostMutation = useUpdateLetteringCostMutation();
	const deleteCostMutation = useDeleteLetteringCostMutation(id || '');

	const isEditingCost = !!selectedCost;

	const handleEdit = () => {
		if (!technique) return;
		setFormName(technique.name);
		setMutationError(null);
		setEditDialogOpen(true);
	};

	const handleEditSubmit = async () => {
		if (!id) return;
		setMutationError(null);
		const data: UpdateLetteringTechniqueInput = {
			name: formName,
		};

		try {
			await updateMutation.mutateAsync({ id, ...data });
			setEditDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleToggleActive = async () => {
		if (!technique || !id) return;
		try {
			await updateMutation.mutateAsync({
				id,
				isActive: !technique.isActive,
			});
		} catch (_err) {
			// Error handled by mutation
		}
	};

	const handleDelete = async () => {
		if (!id) return;
		try {
			await deleteMutation.mutateAsync(id);
			setDeleteDialogOpen(false);
			navigate('/app/settings?tab=lettering-techniques');
		} catch (_err) {
			// Error handled by mutation
		}
	};

	const handleAddCost = () => {
		setSelectedCost(null);
		setCostColorId(null);
		setCostAppliesTo('new_memorial');
		setCostFreeLetters('0');
		setCostPricePerLetter('0');
		setMutationError(null);
		setCostFormOpen(true);
	};

	const handleEditCost = (cost: LetteringCost) => {
		setSelectedCost(cost);
		setCostColorId(cost.colorId);
		setCostAppliesTo(cost.appliesTo);
		setCostFreeLetters(String(cost.freeLetters));
		setCostPricePerLetter(cost.pricePerLetter);
		setMutationError(null);
		setCostFormOpen(true);
	};

	const handleCostSubmit = async () => {
		if (!id) return;
		setMutationError(null);

		try {
			if (isEditingCost && selectedCost) {
				await updateCostMutation.mutateAsync({
					id: selectedCost.id,
					colorId: costColorId,
					appliesTo: costAppliesTo,
					freeLetters: parseInt(costFreeLetters, 10) || 0,
					pricePerLetter: parseFloat(costPricePerLetter) || 0,
				});
			} else {
				const data: CreateLetteringCostInput = {
					techniqueId: id,
					colorId: costColorId,
					appliesTo: costAppliesTo,
					freeLetters: parseInt(costFreeLetters, 10) || 0,
					pricePerLetter: parseFloat(costPricePerLetter) || 0,
				};
				await createCostMutation.mutateAsync(data);
			}
			setCostFormOpen(false);
			setSelectedCost(null);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	// Helper to get color name by id
	const getColorName = (colorId: string | null) => {
		if (!colorId) return 'Any / No Color';
		const color = colors?.find((c) => c.id === colorId);
		return color?.name || 'Unknown';
	};

	const handleDeleteCost = (cost: LetteringCost) => {
		setSelectedCost(cost);
		setDeleteCostDialogOpen(true);
	};

	const handleDeleteCostConfirm = async () => {
		if (!selectedCost) return;
		try {
			await deleteCostMutation.mutateAsync(selectedCost.id);
			setDeleteCostDialogOpen(false);
			setSelectedCost(null);
		} catch (_err) {
			// Error handled by mutation
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Technique Details</h2>
				</div>
				<div className="text-muted-foreground">Loading technique...</div>
			</div>
		);
	}

	if (error || !technique) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Technique Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error loading technique: ${error.message}` : 'Technique not found'}
				</div>
				<Link to="/app/settings?tab=lettering-techniques">
					<Button variant="outline" className="mt-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Techniques
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div>
			{/* Breadcrumb */}
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/settings?tab=lettering-techniques">Settings</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/settings?tab=lettering-techniques">Lettering Techniques</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{technique.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/settings?tab=lettering-techniques">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h2 className="text-2xl font-bold">{technique.name}</h2>
							<Badge variant={technique.isActive ? 'default' : 'secondary'}>
								{technique.isActive ? 'Active' : 'Inactive'}
							</Badge>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={handleToggleActive}>
						{technique.isActive ? 'Deactivate' : 'Activate'}
					</Button>
					<Button onClick={handleEdit}>Edit</Button>
					<Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
						Delete
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Costs */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Cost Rules</CardTitle>
									<CardDescription>
										Define pricing rules for this lettering technique
									</CardDescription>
								</div>
								<Button onClick={handleAddCost}>
									<Plus className="h-4 w-4 mr-2" />
									Add Cost
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							{technique.costs.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground border rounded-lg">
									No cost rules yet. Add a cost rule to define pricing.
								</div>
							) : (
								<div className="border rounded-lg">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Color</TableHead>
												<TableHead>Applies To</TableHead>
												<TableHead>Free Letters</TableHead>
												<TableHead>Price/Letter</TableHead>
												<TableHead className="w-[100px]"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{technique.costs.map((cost) => (
												<TableRow key={cost.id}>
													<TableCell className="font-medium">
														{getColorName(cost.colorId)}
													</TableCell>
													<TableCell>{APPLIES_TO_LABELS[cost.appliesTo]}</TableCell>
													<TableCell>{cost.freeLetters}</TableCell>
													<TableCell>£{cost.pricePerLetter}</TableCell>
													<TableCell>
														<div className="flex gap-1">
															<Button
																variant="ghost"
																size="sm"
																onClick={() => handleEditCost(cost)}
															>
																Edit
															</Button>
															<Button
																variant="ghost"
																size="sm"
																className="text-destructive"
																onClick={() => handleDeleteCost(cost)}
															>
																Delete
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Status</p>
								<p>{technique.isActive ? 'Active' : 'Inactive'}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Cost Rules</p>
								<p>{technique.costs.length}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created</p>
								<p>{new Date(technique.createdAt).toLocaleDateString()}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Updated</p>
								<p>{new Date(technique.updatedAt).toLocaleDateString()}</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Edit Technique Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Technique</DialogTitle>
						<DialogDescription>Update the technique details.</DialogDescription>
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
								placeholder="e.g., Sandblast, V-Cut"
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleEditSubmit} disabled={!formName || updateMutation.isPending}>
							{updateMutation.isPending ? 'Saving...' : 'Update'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Technique Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDelete}
				title="Delete Technique"
				description={`Are you sure you want to delete "${technique.name}"? This will also delete all associated cost rules. This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>

			{/* Cost Form Dialog */}
			<Dialog open={costFormOpen} onOpenChange={setCostFormOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{isEditingCost ? 'Edit Cost Rule' : 'Add Cost Rule'}</DialogTitle>
						<DialogDescription>
							{isEditingCost
								? 'Update the cost rule details.'
								: 'Define a new pricing rule for this technique.'}
						</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="colorId">Color</FieldLabel>
							<Select
								value={costColorId || '__none__'}
								onValueChange={(val) => setCostColorId(val === '__none__' ? null : val)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a color (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">Any / No Color (Default)</SelectItem>
									{colors
										?.filter((c) => c.isActive)
										.map((color) => (
											<SelectItem key={color.id} value={color.id}>
												{color.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
							<p className="text-sm text-muted-foreground mt-1">
								Select a specific color for color-specific pricing, or leave as default for base
								pricing.
							</p>
						</Field>

						<Field>
							<FieldLabel htmlFor="appliesTo">Applies To</FieldLabel>
							<Select
								value={costAppliesTo}
								onValueChange={(val) => setCostAppliesTo(val as LetteringCostAppliesTo)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="new_memorial">New Memorial</SelectItem>
									<SelectItem value="refurbishment">Refurbishment</SelectItem>
									<SelectItem value="both">Both</SelectItem>
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="freeLetters">Free Letters</FieldLabel>
							<Input
								id="freeLetters"
								type="number"
								min="0"
								value={costFreeLetters}
								onChange={(e) => setCostFreeLetters(e.target.value)}
								placeholder="0"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="pricePerLetter">Price Per Letter (£)</FieldLabel>
							<Input
								id="pricePerLetter"
								type="number"
								min="0"
								step="0.01"
								value={costPricePerLetter}
								onChange={(e) => setCostPricePerLetter(e.target.value)}
								placeholder="0.00"
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setCostFormOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCostSubmit}
							disabled={createCostMutation.isPending || updateCostMutation.isPending}
						>
							{createCostMutation.isPending || updateCostMutation.isPending
								? 'Saving...'
								: isEditingCost
									? 'Update'
									: 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Cost Dialog */}
			<DeleteConfirmDialog
				open={deleteCostDialogOpen}
				onOpenChange={setDeleteCostDialogOpen}
				onConfirm={handleDeleteCostConfirm}
				title="Delete Cost Rule"
				description={`Are you sure you want to delete the "${selectedCost ? APPLIES_TO_LABELS[selectedCost.appliesTo] : ''}" cost rule? This action cannot be undone.`}
				isLoading={deleteCostMutation.isPending}
			/>
		</div>
	);
}
