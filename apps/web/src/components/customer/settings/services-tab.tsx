import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { MoreHorizontal, Plus } from 'lucide-react';
import {
	useServicesQuery,
	useCreateServiceMutation,
	useUpdateServiceMutation,
	useDeleteServiceMutation,
	type Service,
	type CreateServiceInput,
	type ServicePricingType,
} from '@/hooks/use-services';

const PRICING_TYPES: { value: ServicePricingType; label: string }[] = [
	{ value: 'fixed', label: 'Fixed Price' },
	{ value: 'quoted', label: 'Quoted (Per Job)' },
	{ value: 'hourly', label: 'Hourly Rate' },
];

export function ServicesTab() {
	const { data: services, isLoading, error } = useServicesQuery();
	const createMutation = useCreateServiceMutation();
	const updateMutation = useUpdateServiceMutation();
	const deleteMutation = useDeleteServiceMutation();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<Service | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [formName, setFormName] = useState('');
	const [formDescription, setFormDescription] = useState('');
	const [formBasePrice, setFormBasePrice] = useState('');
	const [formPricingType, setFormPricingType] = useState<ServicePricingType>('fixed');

	const isEditing = !!selectedItem;

	const resetForm = () => {
		setFormName('');
		setFormDescription('');
		setFormBasePrice('');
		setFormPricingType('fixed');
		setMutationError(null);
	};

	const handleCreate = () => {
		setSelectedItem(null);
		resetForm();
		setFormDialogOpen(true);
	};

	const handleEdit = (item: Service) => {
		setSelectedItem(item);
		setFormName(item.name);
		setFormDescription(item.description || '');
		setFormBasePrice(item.basePrice || '');
		setFormPricingType(item.pricingType);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleDelete = (item: Service) => {
		setSelectedItem(item);
		setDeleteDialogOpen(true);
	};

	const handleToggleActive = async (item: Service) => {
		try {
			await updateMutation.mutateAsync({
				id: item.id,
				isActive: !item.isActive,
			});
		} catch (err) {
			// Error handled by mutation
		}
	};

	const handleFormSubmit = async () => {
		setMutationError(null);
		const data: CreateServiceInput = {
			name: formName,
			description: formDescription || undefined,
			basePrice: formBasePrice ? parseFloat(formBasePrice) : null,
			pricingType: formPricingType,
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
			setSelectedItem(null);
		} catch (err) {
			// Error handled by mutation
		}
	};

	const getPricingTypeLabel = (type: ServicePricingType) => {
		return PRICING_TYPES.find((t) => t.value === type)?.label || type;
	};

	const formatPrice = (item: Service) => {
		if (item.pricingType === 'quoted') {
			return 'Per Quote';
		}
		if (!item.basePrice) {
			return '-';
		}
		if (item.pricingType === 'hourly') {
			return `$${item.basePrice}/hr`;
		}
		return `$${item.basePrice}`;
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading services...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading services: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold">Services</h3>
					<p className="text-sm text-muted-foreground">
						Manage labor services like cleaning and installation
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Service
				</Button>
			</div>

			{services && services.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No services yet. Add your first service to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Description</TableHead>
								<TableHead>Pricing Type</TableHead>
								<TableHead>Price</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[70px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{services?.map((item) => (
								<TableRow key={item.id}>
									<TableCell className="font-medium">{item.name}</TableCell>
									<TableCell className="max-w-[200px] truncate">
										{item.description || <span className="text-muted-foreground">-</span>}
									</TableCell>
									<TableCell>{getPricingTypeLabel(item.pricingType)}</TableCell>
									<TableCell>{formatPrice(item)}</TableCell>
									<TableCell>
										<Badge variant={item.isActive ? 'default' : 'secondary'}>
											{item.isActive ? 'Active' : 'Inactive'}
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
												<DropdownMenuItem onClick={() => handleEdit(item)}>
													Edit
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleToggleActive(item)}>
													{item.isActive ? 'Deactivate' : 'Activate'}
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-destructive"
													onClick={() => handleDelete(item)}
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

			{/* Form Dialog */}
			<Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{isEditing ? 'Edit Service' : 'Add Service'}
						</DialogTitle>
						<DialogDescription>
							{isEditing
								? 'Update the service details.'
								: 'Add a new service with pricing.'}
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
								placeholder="e.g., Memorial Cleaning, Installation"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="description">Description</FieldLabel>
							<Textarea
								id="description"
								value={formDescription}
								onChange={(e) => setFormDescription(e.target.value)}
								placeholder="Optional description"
								rows={2}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="pricingType">Pricing Type</FieldLabel>
							<Select
								value={formPricingType}
								onValueChange={(value) => setFormPricingType(value as ServicePricingType)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PRICING_TYPES.map((type) => (
										<SelectItem key={type.value} value={type.value}>
											{type.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>

						{formPricingType !== 'quoted' && (
							<Field>
								<FieldLabel htmlFor="basePrice">
									{formPricingType === 'hourly' ? 'Hourly Rate ($)' : 'Price ($)'}
								</FieldLabel>
								<Input
									id="basePrice"
									type="number"
									min="0"
									step="0.01"
									value={formBasePrice}
									onChange={(e) => setFormBasePrice(e.target.value)}
									placeholder="0.00"
								/>
							</Field>
						)}
					</FieldGroup>

					<DialogFooter>
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
				title="Delete Service"
				description={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
