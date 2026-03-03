import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Plus, ImageIcon } from 'lucide-react';
import {
	useSundriesQuery,
	useCreateSundryMutation,
	type CreateSundryInput,
} from '@/hooks/use-sundries';
import { useSuppliersQuery } from '@/hooks/use-suppliers';
import { useSignedUrls } from '@/hooks/use-uploads';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router';

export function SundriesTab() {
	const { data: sundries, isLoading, error } = useSundriesQuery();
	const { data: suppliers } = useSuppliersQuery({});
	const sundryImageUrls = sundries?.map((s) => s.imageUrl) || [];
	const { data: signedSundryImages } = useSignedUrls(sundryImageUrls);
	const createMutation = useCreateSundryMutation();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [formName, setFormName] = useState('');
	const [formPrice, setFormPrice] = useState('0');
	const [formSupplierId, setFormSupplierId] = useState<string | null>(null);

	const resetForm = () => {
		setFormName('');
		setFormPrice('0');
		setFormSupplierId(null);
		setMutationError(null);
	};

	const handleCreate = () => {
		resetForm();
		setFormDialogOpen(true);
	};

	const handleFormSubmit = async () => {
		setMutationError(null);
		const data: CreateSundryInput = {
			name: formName,
			price: parseFloat(formPrice) || 0,
			supplierId: formSupplierId,
		};

		try {
			await createMutation.mutateAsync(data);
			setFormDialogOpen(false);
			resetForm();
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading sundries...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading sundries: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold">Sundries</h3>
					<p className="text-sm text-muted-foreground">
						Manage add-on items like ceramic flowers and photo plaques
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Sundry
				</Button>
			</div>

			{sundries && sundries.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No sundries yet. Add your first sundry to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[60px]">Image</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Supplier</TableHead>
								<TableHead>Description</TableHead>
								<TableHead>Price</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[70px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sundries?.map((item) => (
								<TableRow key={item.id}>
									<TableCell>
										{item.imageUrl ? (
											<img
												src={
													(signedSundryImages?.get(item.imageUrl)) ||
													item.imageUrl
												}
												alt={item.name}
												className="w-10 h-10 object-cover rounded"
											/>
										) : (
											<div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
												<ImageIcon className="w-4 h-4 text-muted-foreground" />
											</div>
										)}
									</TableCell>
									<TableCell className="font-medium">{item.name}</TableCell>
									<TableCell>
										{item.supplierName ? (
											<Link
												to={`/app/suppliers/${item.supplierId}`}
												className="text-primary hover:underline"
											>
												{item.supplierName}
											</Link>
										) : (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell className="max-w-[200px] truncate">
										{item.description || <span className="text-muted-foreground">-</span>}
									</TableCell>
									<TableCell>&pound;{item.price}</TableCell>
									<TableCell>
										<Badge variant={item.isActive ? 'default' : 'secondary'}>
											{item.isActive ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell>
										<Link to={`/app/sundries/${item.id}`}>
											<Button variant="ghost" size="sm">View</Button>
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Create Dialog */}
			<Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Add Sundry</DialogTitle>
						<DialogDescription>
							Add a new sundry item with pricing.
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
								placeholder="e.g., Ceramic Rose (Red), Oval Photo Plaque"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="supplier">Supplier (optional)</FieldLabel>
							<Select
								value={formSupplierId || 'none'}
								onValueChange={(value) =>
									setFormSupplierId(value === 'none' ? null : value)
								}
							>
								<SelectTrigger id="supplier">
									<SelectValue placeholder="Select a supplier" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No supplier</SelectItem>
									{suppliers?.map((supplier) => (
										<SelectItem key={supplier.id} value={supplier.id}>
											{supplier.tradingName || supplier.businessName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="price">Price (&pound;)</FieldLabel>
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
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setFormDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleFormSubmit}
							disabled={!formName || createMutation.isPending}
						>
							{createMutation.isPending ? 'Creating...' : 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
