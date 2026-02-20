import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useSupplierQuery,
	useSupplierMaterialsQuery,
	useSupplierSundriesQuery,
	useArchiveSupplierMutation,
	useUnarchiveSupplierMutation,
	PAYMENT_TERM_LABELS,
	type PaymentTerms,
} from '@/hooks/use-suppliers';
import {
	Mail,
	Phone,
	MapPin,
	Globe,
	ArrowLeft,
	CreditCard,
	Package,
	ShoppingBag,
	BookOpen,
} from 'lucide-react';
import { DocumentsCard } from '@/components/documents';
import { EmailThreadsCard } from '@/components/inbox/email-threads-card';
import {
	useSupplierCollectionsQuery,
	useCreateSupplierCollectionMutation,
} from '@/hooks/use-supplier-collections';
import { CollectionFormDialog } from '@/components/customer/supplier-catalog/collection-form-dialog';
import { CsvImportDialog } from '@/components/customer/supplier-catalog/csv-import-dialog';

export function SupplierDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
	const [collectionError, setCollectionError] = useState<string | null>(null);

	const { data: supplier, isLoading, error } = useSupplierQuery(id);
	const { data: materials } = useSupplierMaterialsQuery(id);
	const { data: sundries } = useSupplierSundriesQuery(id);
	const { data: collections } = useSupplierCollectionsQuery(id);
	const archiveMutation = useArchiveSupplierMutation();
	const unarchiveMutation = useUnarchiveSupplierMutation();
	const createCollectionMutation = useCreateSupplierCollectionMutation();

	const formatCurrency = (amount: string) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(parseFloat(amount));
	};

	const handleArchive = () => {
		setMutationError(null);
		setArchiveDialogOpen(true);
	};

	const handleArchiveConfirm = async () => {
		if (!id) return;
		setMutationError(null);
		try {
			await archiveMutation.mutateAsync(id);
			setArchiveDialogOpen(false);
			navigate('/app/suppliers');
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleUnarchive = async () => {
		if (!id) return;
		setMutationError(null);
		try {
			await unarchiveMutation.mutateAsync(id);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : 'Failed to restore supplier'
			);
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Supplier Details</h2>
				</div>
				<div className="text-muted-foreground">Loading supplier...</div>
			</div>
		);
	}

	if (error || !supplier) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Supplier Details</h2>
				</div>
				<div className="text-destructive">
					{error
						? `Error loading supplier: ${error.message}`
						: 'Supplier not found'}
				</div>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => navigate('/app/suppliers')}
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Suppliers
				</Button>
			</div>
		);
	}

	const getEmailContacts = () =>
		supplier.contactInfo.filter((c) => c.type === 'email');
	const getPhoneContacts = () =>
		supplier.contactInfo.filter(
			(c) => c.type === 'phone' || c.type === 'mobile'
		);

	const displayName = supplier.tradingName || supplier.businessName;

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/suppliers">Suppliers</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{displayName}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex justify-between items-start mb-6">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">{displayName}</h2>
						{supplier.archivedAt ? (
							<Badge variant="secondary">Archived</Badge>
						) : (
							<Badge variant="default">Active</Badge>
						)}
					</div>
					{supplier.tradingName && supplier.tradingName !== supplier.businessName && (
						<p className="text-sm text-muted-foreground">
							Legal name: {supplier.businessName}
						</p>
					)}
				</div>
				<div className="flex gap-2">
					<Link to={`/app/suppliers/${id}/edit`}>
						<Button variant="outline">Edit</Button>
					</Link>
					{supplier.archivedAt ? (
						<Button
							variant="outline"
							onClick={handleUnarchive}
							disabled={unarchiveMutation.isPending}
						>
							{unarchiveMutation.isPending ? 'Restoring...' : 'Restore'}
						</Button>
					) : (
						<Button variant="destructive" onClick={handleArchive}>
							Archive
						</Button>
					)}
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Contact Information</CardTitle>
						<CardDescription>Email addresses and phone numbers</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
								<Mail className="h-4 w-4" />
								Email Addresses
							</h4>
							{getEmailContacts().length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No email addresses
								</p>
							) : (
								<div className="space-y-2">
									{getEmailContacts().map((contact) => (
										<div key={contact.id} className="flex items-center gap-2">
											<span>{contact.value}</span>
											{contact.label && (
												<span className="text-xs text-muted-foreground">
													({contact.label})
												</span>
											)}
											{contact.isPrimary && (
												<Badge variant="secondary" className="text-xs">
													Primary
												</Badge>
											)}
										</div>
									))}
								</div>
							)}
						</div>

						<Separator />

						<div>
							<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
								<Phone className="h-4 w-4" />
								Phone Numbers
							</h4>
							{getPhoneContacts().length === 0 ? (
								<p className="text-sm text-muted-foreground">No phone numbers</p>
							) : (
								<div className="space-y-2">
									{getPhoneContacts().map((contact) => (
										<div key={contact.id} className="flex items-center gap-2">
											<span>{contact.value}</span>
											{contact.label && (
												<span className="text-xs text-muted-foreground">
													({contact.label})
												</span>
											)}
											{contact.isPrimary && (
												<Badge variant="secondary" className="text-xs">
													Primary
												</Badge>
											)}
										</div>
									))}
								</div>
							)}
						</div>

						{supplier.website && (
							<>
								<Separator />
								<div>
									<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
										<Globe className="h-4 w-4" />
										Website
									</h4>
									<a
										href={supplier.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary hover:underline"
									>
										{supplier.website}
									</a>
								</div>
							</>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Addresses</CardTitle>
						<CardDescription>Physical locations</CardDescription>
					</CardHeader>
					<CardContent>
						{supplier.addresses.length === 0 ? (
							<p className="text-sm text-muted-foreground">No addresses</p>
						) : (
							<div className="space-y-4">
								{supplier.addresses.map((address) => (
									<div key={address.id} className="flex items-start gap-2">
										<MapPin className="h-4 w-4 mt-0.5 shrink-0" />
										<div>
											<p>{address.formattedAddress}</p>
											<div className="flex items-center gap-2 mt-1">
												{address.label && (
													<span className="text-xs text-muted-foreground">
														({address.label})
													</span>
												)}
												{address.isPrimary && (
													<Badge variant="secondary" className="text-xs">
														Primary
													</Badge>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<Card className="mt-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CreditCard className="h-5 w-5" />
						Account Details
					</CardTitle>
					<CardDescription>
						Your account terms with this supplier
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
						<div>
							<p className="text-sm font-medium mb-1">Account Number</p>
							<p>{supplier.accountNumber || '-'}</p>
						</div>
						<div>
							<p className="text-sm font-medium mb-1">Payment Terms</p>
							<p>
								{supplier.paymentTerms
									? PAYMENT_TERM_LABELS[supplier.paymentTerms as PaymentTerms]
									: '-'}
							</p>
						</div>
						<div>
							<p className="text-sm font-medium mb-1">Default Lead Time</p>
							<p>
								{supplier.defaultLeadTimeDays
									? `${supplier.defaultLeadTimeDays} days`
									: '-'}
							</p>
						</div>
						<div>
							<p className="text-sm font-medium mb-1">Minimum Order Value</p>
							<p>
								{supplier.minimumOrderValue
									? formatCurrency(supplier.minimumOrderValue)
									: '-'}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Package className="h-5 w-5" />
							Materials from Supplier
						</CardTitle>
						<CardDescription>
							Stone materials sourced from this supplier
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!materials || materials.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No materials linked to this supplier
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{materials.map((material) => (
										<TableRow key={material.id}>
											<TableCell className="font-medium">
												{material.name}
											</TableCell>
											<TableCell>
												<Badge variant={material.isActive ? 'default' : 'secondary'}>
													{material.isActive ? 'Active' : 'Inactive'}
												</Badge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ShoppingBag className="h-5 w-5" />
							Sundries from Supplier
						</CardTitle>
						<CardDescription>
							Add-on items sourced from this supplier
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!sundries || sundries.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No sundries linked to this supplier
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead className="text-right">Price</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sundries.map((sundry) => (
										<TableRow key={sundry.id}>
											<TableCell className="font-medium">
												{sundry.name}
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(sundry.price)}
											</TableCell>
											<TableCell>
												<Badge variant={sundry.isActive ? 'default' : 'secondary'}>
													{sundry.isActive ? 'Active' : 'Inactive'}
												</Badge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>

			<Card className="mt-6">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<BookOpen className="h-5 w-5" />
								Supplier Catalog
							</CardTitle>
							<CardDescription>
								Browse and manage this supplier's product collections
							</CardDescription>
						</div>
						<Button onClick={() => {
							setCollectionError(null);
							setCollectionDialogOpen(true);
						}}>
							Add Collection
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{!collections || collections.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No collections yet. Add a collection to start organizing this supplier's products.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="text-right">Categories</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-[80px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{collections.map((collection) => (
									<TableRow key={collection.id}>
										<TableCell className="font-medium">
											{collection.name}
										</TableCell>
										<TableCell className="text-right">
											{collection.categoryCount}
										</TableCell>
										<TableCell>
											<Badge variant={collection.isActive ? 'default' : 'secondary'}>
												{collection.isActive ? 'Active' : 'Inactive'}
											</Badge>
										</TableCell>
										<TableCell>
											<Link to={`/app/suppliers/${id}/collections/${collection.id}`}>
												<Button variant="ghost" size="sm">View</Button>
											</Link>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{id && (
				<CollectionFormDialog
					open={collectionDialogOpen}
					onOpenChange={setCollectionDialogOpen}
					supplierId={id}
					onSubmit={async (data) => {
						setCollectionError(null);
						try {
							await createCollectionMutation.mutateAsync(data);
							setCollectionDialogOpen(false);
						} catch (err) {
							setCollectionError(err instanceof Error ? err.message : 'Failed to create collection');
						}
					}}
					isLoading={createCollectionMutation.isPending}
					error={collectionError}
				/>
			)}

			{supplier.notes && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle>Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{supplier.notes}</p>
					</CardContent>
				</Card>
			)}

			{/* Email Threads */}
			<div className="mt-6">
				<EmailThreadsCard
					entityType="supplier"
					entityId={supplier.id}
					entityName={displayName}
				/>
			</div>

			{/* Documents */}
			<div className="mt-6">
				<DocumentsCard
					entityType="supplier"
					entityId={supplier.id}
					title="Documents"
					description="Files and documents for this supplier"
				/>
			</div>

			<DeleteConfirmDialog
				open={archiveDialogOpen}
				onOpenChange={setArchiveDialogOpen}
				onConfirm={handleArchiveConfirm}
				title="Archive Supplier"
				description={`Are you sure you want to archive "${displayName}"? You can restore them later.`}
				isLoading={archiveMutation.isPending}
			/>
		</div>
	);
}
