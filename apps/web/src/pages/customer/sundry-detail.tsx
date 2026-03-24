import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
	useDeleteSundryMutation,
	useSundryQuery,
	useUpdateSundryMutation,
} from '@/hooks/use-sundries';
import { useSuppliersQuery } from '@/hooks/use-suppliers';
import { useSignedUrls } from '@/hooks/use-uploads';

export function SundryDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const { data: sundry, isLoading, error } = useSundryQuery(id);
	const { data: suppliers } = useSuppliersQuery({});
	const updateMutation = useUpdateSundryMutation();
	const deleteMutation = useDeleteSundryMutation();

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [formName, setFormName] = useState('');
	const [formDescription, setFormDescription] = useState('');
	const [formPrice, setFormPrice] = useState('0');
	const [formSupplierId, setFormSupplierId] = useState<string | null>(null);
	const [formImageUrl, setFormImageUrl] = useState<string | null>(null);

	// Signed URL for image display in sidebar
	const imageUrls = sundry?.imageUrl ? [sundry.imageUrl] : [];
	const { data: signedImages } = useSignedUrls(imageUrls);

	// Populate form when data loads
	useEffect(() => {
		if (sundry) {
			setFormName(sundry.name);
			setFormDescription(sundry.description || '');
			setFormPrice(sundry.price);
			setFormSupplierId(sundry.supplierId);
			setFormImageUrl(sundry.imageUrl);
		}
	}, [sundry]);

	const handleSave = async () => {
		if (!id) return;
		setMutationError(null);

		try {
			await updateMutation.mutateAsync({
				id,
				name: formName,
				description: formDescription || null,
				price: parseFloat(formPrice) || 0,
				supplierId: formSupplierId,
				imageUrl: formImageUrl,
			});
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleToggleActive = async () => {
		if (!sundry || !id) return;
		try {
			await updateMutation.mutateAsync({
				id,
				isActive: !sundry.isActive,
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
			navigate('/app/products?tab=sundries');
		} catch (_err) {
			// Error handled by mutation
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Sundry Details</h2>
				</div>
				<div className="text-muted-foreground">Loading sundry...</div>
			</div>
		);
	}

	if (error || !sundry) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Sundry Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error loading sundry: ${error.message}` : 'Sundry not found'}
				</div>
				<Link to="/app/products?tab=sundries">
					<Button variant="outline" className="mt-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Sundries
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
							<Link to="/app/products?tab=sundries">Products</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/products?tab=sundries">Sundries</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{sundry.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/products?tab=sundries">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h2 className="text-2xl font-bold">{sundry.name}</h2>
							<Badge variant={sundry.isActive ? 'default' : 'secondary'}>
								{sundry.isActive ? 'Active' : 'Inactive'}
							</Badge>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={handleToggleActive}>
						{sundry.isActive ? 'Deactivate' : 'Activate'}
					</Button>
					<Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
						Delete
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content - Edit Form */}
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Sundry Details</CardTitle>
							<CardDescription>Update the sundry information</CardDescription>
						</CardHeader>
						<CardContent>
							{mutationError && (
								<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
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
										onValueChange={(value) => setFormSupplierId(value === 'none' ? null : value)}
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
									<FieldLabel htmlFor="description">Description</FieldLabel>
									<Textarea
										id="description"
										value={formDescription}
										onChange={(e) => setFormDescription(e.target.value)}
										placeholder="Optional description"
										rows={3}
									/>
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
						</CardContent>
						<CardFooter className="flex justify-end">
							<Button onClick={handleSave} disabled={!formName || updateMutation.isPending}>
								{updateMutation.isPending ? 'Saving...' : 'Save Changes'}
							</Button>
						</CardFooter>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Image */}
					<Card>
						<CardHeader>
							<CardTitle>Image</CardTitle>
						</CardHeader>
						<CardContent>
							<ImageUpload
								value={formImageUrl}
								onChange={(url) => {
									setFormImageUrl(url);
								}}
								category="sundries"
								entityId={id!}
							/>
						</CardContent>
					</Card>

					{/* Details */}
					<Card>
						<CardHeader>
							<CardTitle>Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Status</p>
								<p>{sundry.isActive ? 'Active' : 'Inactive'}</p>
							</div>
							{sundry.supplierName && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Supplier</p>
									<Link
										to={`/app/suppliers/${sundry.supplierId}`}
										className="text-primary hover:underline"
									>
										{sundry.supplierName}
									</Link>
								</div>
							)}
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created</p>
								<p>{new Date(sundry.createdAt).toLocaleDateString()}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Updated</p>
								<p>{new Date(sundry.updatedAt).toLocaleDateString()}</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Delete Confirm Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDelete}
				title="Delete Sundry"
				description={`Are you sure you want to delete "${sundry.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
