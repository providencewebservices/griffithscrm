import {
	ArrowLeft,
	BookOpen,
	ChevronsUpDown,
	FileText,
	ImageIcon,
	Mail,
	Package,
	Phone,
	User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { CustomerFormDialog } from '@/components/customer/customer-form-dialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
	type ContactInfoInput,
	type CreateCustomerInput,
	useCreateCustomerMutation,
	useCustomersQuery,
} from '@/hooks/use-customers';
import {
	useArchiveInquiryMutation,
	useInquiryQuery,
	useLinkCustomerMutation,
	useUnlinkCustomerMutation,
	useUpdateInquiryMutation,
} from '@/hooks/use-inquiries';
import { useTenantSettingsQuery } from '@/hooks/use-tenant-settings';
import { useSignedUrls } from '@/hooks/use-uploads';

const SOURCE_LABELS: Record<string, string> = {
	walk_in: 'Walk-in',
	phone: 'Phone',
	email: 'Email',
	website: 'Website',
	facebook: 'Facebook',
	instagram: 'Instagram',
	whatsapp: 'WhatsApp',
	referral: 'Referral',
	other: 'Other',
};

const STATUS_OPTIONS = [
	{ value: 'new', label: 'New' },
	{ value: 'contacted', label: 'Contacted' },
	{ value: 'converted', label: 'Converted' },
	{ value: 'closed', label: 'Closed' },
];

function getStatusBadgeVariant(status: string) {
	switch (status) {
		case 'new':
			return 'default' as const;
		case 'contacted':
			return 'secondary' as const;
		case 'converted':
			return 'outline' as const;
		case 'closed':
			return 'outline' as const;
		default:
			return 'outline' as const;
	}
}

export function InquiryDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [isEditing, setIsEditing] = useState(false);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [customerComboOpen, setCustomerComboOpen] = useState(false);
	const [createCustomerDialogOpen, setCreateCustomerDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [createCustomerError, setCreateCustomerError] = useState<string | null>(null);

	// Edit form state
	const [editFirstName, setEditFirstName] = useState('');
	const [editLastName, setEditLastName] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [editPhone, setEditPhone] = useState('');
	const [editMessage, setEditMessage] = useState('');

	const { data: inquiry, isLoading, error } = useInquiryQuery(id);
	const { data: customers } = useCustomersQuery();
	const updateMutation = useUpdateInquiryMutation();
	const archiveMutation = useArchiveInquiryMutation();
	const linkCustomerMutation = useLinkCustomerMutation();
	const unlinkCustomerMutation = useUnlinkCustomerMutation();
	const createCustomerMutation = useCreateCustomerMutation();
	const { data: tenantSettings } = useTenantSettingsQuery();
	const defaultCountry = tenantSettings?.address?.country || 'GB';
	const inquiryProductPhotoUrls =
		inquiry?.products.map((product) => product.customerPhotoUrl) ?? [];
	const { data: signedInquiryProductPhotoUrls } = useSignedUrls(inquiryProductPhotoUrls);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	};

	function startEditing() {
		if (!inquiry) return;
		setEditFirstName(inquiry.firstName);
		setEditLastName(inquiry.lastName);
		setEditEmail(inquiry.email || '');
		setEditPhone(inquiry.phone || '');
		setEditMessage(inquiry.message || '');
		setIsEditing(true);
	}

	async function saveEdit() {
		if (!inquiry || !id) return;
		setMutationError(null);
		try {
			await updateMutation.mutateAsync({
				id,
				firstName: editFirstName.trim(),
				lastName: editLastName.trim(),
				email: editEmail.trim() || null,
				phone: editPhone.trim() || null,
				message: editMessage.trim() || null,
			});
			setIsEditing(false);
		} catch (err: unknown) {
			setMutationError(err instanceof Error ? err.message : 'Failed to update');
		}
	}

	async function handleStatusChange(newStatus: string) {
		if (!id) return;
		setMutationError(null);
		try {
			await updateMutation.mutateAsync({ id, status: newStatus });
		} catch (err: unknown) {
			setMutationError(err instanceof Error ? err.message : 'Failed to update status');
		}
	}

	async function handleArchive() {
		if (!id) return;
		setMutationError(null);
		try {
			await archiveMutation.mutateAsync(id);
			navigate('/app/inquiries');
		} catch (err: unknown) {
			setMutationError(err instanceof Error ? err.message : 'Failed to archive');
		}
	}

	async function handleLinkCustomer(customerId: string) {
		if (!id) return;
		setMutationError(null);
		try {
			await linkCustomerMutation.mutateAsync({ inquiryId: id, customerId });
			setCustomerComboOpen(false);
		} catch (err: unknown) {
			setMutationError(err instanceof Error ? err.message : 'Failed to link customer');
		}
	}

	async function handleUnlinkCustomer() {
		if (!id) return;
		setMutationError(null);
		try {
			await unlinkCustomerMutation.mutateAsync(id);
		} catch (err: unknown) {
			setMutationError(err instanceof Error ? err.message : 'Failed to unlink customer');
		}
	}

	const createCustomerInitialValues = useMemo(() => {
		if (!inquiry) return undefined;
		const contactInfo: ContactInfoInput[] = [];
		if (inquiry.email) {
			contactInfo.push({ type: 'email', value: inquiry.email, label: '', isPrimary: true });
		}
		if (inquiry.phone) {
			contactInfo.push({
				type: 'phone',
				value: inquiry.phone,
				label: '',
				isPrimary: !inquiry.email,
			});
		}
		return { firstName: inquiry.firstName, lastName: inquiry.lastName, contactInfo };
	}, [inquiry]);

	async function handleCreateAndLinkCustomer(data: CreateCustomerInput) {
		if (!id) return;
		setCreateCustomerError(null);
		try {
			const newCustomer = await createCustomerMutation.mutateAsync(data);
			await linkCustomerMutation.mutateAsync({ inquiryId: id, customerId: newCustomer.id });
			setCreateCustomerDialogOpen(false);
		} catch (err: unknown) {
			setCreateCustomerError(err instanceof Error ? err.message : 'Failed to create customer');
		}
	}

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Inquiry</h2>
				</div>
				<div className="text-muted-foreground">Loading inquiry...</div>
			</div>
		);
	}

	if (error || !inquiry) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Inquiry</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error: ${error.message}` : 'Inquiry not found'}
				</div>
			</div>
		);
	}

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/inquiries">Inquiries</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>
							{inquiry.firstName} {inquiry.lastName}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="mb-6 flex items-center gap-3">
				<Link to="/app/inquiries">
					<Button variant="ghost" size="icon" className="h-8 w-8">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">
							{inquiry.firstName} {inquiry.lastName}
						</h2>
						<Badge variant={getStatusBadgeVariant(inquiry.status)}>
							{inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
						</Badge>
						{inquiry.archivedAt && <Badge variant="outline">Archived</Badge>}
					</div>
					<p className="text-sm text-muted-foreground mt-1">
						Created {formatDate(inquiry.createdAt)} &middot;{' '}
						{SOURCE_LABELS[inquiry.source] || inquiry.source}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{/* Status change */}
					<Select value={inquiry.status} onValueChange={handleStatusChange}>
						<SelectTrigger className="w-[140px] h-8">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{STATUS_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{!isEditing ? (
						<Button variant="outline" size="sm" onClick={startEditing}>
							Edit
						</Button>
					) : (
						<>
							<Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
								{updateMutation.isPending ? 'Saving...' : 'Save'}
							</Button>
							<Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
								Cancel
							</Button>
						</>
					)}
					<Link
						to={`/app/brochures/new?inquiryId=${id}${inquiry.customerId ? `&customerId=${inquiry.customerId}` : ''}`}
					>
						<Button variant="outline" size="sm">
							<BookOpen className="h-3.5 w-3.5 mr-1.5" />
							Create Brochure
						</Button>
					</Link>
					<Link
						to={`/app/quotes/new?inquiryId=${id}${inquiry.customerId ? `&customerId=${inquiry.customerId}` : ''}`}
					>
						<Button variant="outline" size="sm">
							<FileText className="h-3.5 w-3.5 mr-1.5" />
							Create Quote
						</Button>
					</Link>
					{!inquiry.archivedAt && (
						<Button variant="outline" size="sm" onClick={() => setArchiveDialogOpen(true)}>
							Archive
						</Button>
					)}
				</div>
			</div>

			{mutationError && <p className="text-sm text-destructive mb-4">{mutationError}</p>}

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2 space-y-6">
					{/* Contact Details */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Contact Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{isEditing ? (
								<div className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1">
											<label className="text-sm font-medium">First Name</label>
											<Input
												value={editFirstName}
												onChange={(e) => setEditFirstName(e.target.value)}
											/>
										</div>
										<div className="space-y-1">
											<label className="text-sm font-medium">Last Name</label>
											<Input
												value={editLastName}
												onChange={(e) => setEditLastName(e.target.value)}
											/>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1">
											<label className="text-sm font-medium">Email</label>
											<Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
										</div>
										<div className="space-y-1">
											<label className="text-sm font-medium">Phone</label>
											<Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
										</div>
									</div>
								</div>
							) : (
								<>
									<div className="flex items-center gap-2 text-sm">
										<User className="h-4 w-4 text-muted-foreground" />
										<span>
											{inquiry.firstName} {inquiry.lastName}
										</span>
									</div>
									{inquiry.email && (
										<div className="flex items-center gap-2 text-sm">
											<Mail className="h-4 w-4 text-muted-foreground" />
											<span>{inquiry.email}</span>
										</div>
									)}
									{inquiry.phone && (
										<div className="flex items-center gap-2 text-sm">
											<Phone className="h-4 w-4 text-muted-foreground" />
											<span>{inquiry.phone}</span>
										</div>
									)}
									{!inquiry.email && !inquiry.phone && (
										<p className="text-sm text-muted-foreground">No contact details provided</p>
									)}
								</>
							)}
						</CardContent>
					</Card>

					{/* Message / Notes */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Message / Notes</CardTitle>
						</CardHeader>
						<CardContent>
							{isEditing ? (
								<Textarea
									value={editMessage}
									onChange={(e) => setEditMessage(e.target.value)}
									rows={4}
									placeholder="Notes about this inquiry..."
								/>
							) : (
								<p className="text-sm whitespace-pre-wrap">
									{inquiry.message || <span className="text-muted-foreground">No message</span>}
								</p>
							)}
						</CardContent>
					</Card>

					{inquiry.proposedInscription && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Proposed Inscription</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm whitespace-pre-wrap">{inquiry.proposedInscription}</p>
							</CardContent>
						</Card>
					)}

					{/* Products of Interest */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<Package className="h-4 w-4" />
								Products of Interest
							</CardTitle>
						</CardHeader>
						<CardContent>
							{inquiry.products.length === 0 ? (
								<p className="text-sm text-muted-foreground">No products specified</p>
							) : (
								<div className="space-y-2">
									{inquiry.products.map((product) => (
										<div key={product.id} className="flex items-center gap-3 p-2 border rounded-md">
											<div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
												<ImageIcon className="h-4 w-4 text-muted-foreground" />
											</div>
											<div className="flex-1 min-w-0">
												<Link
													to={`/app/products/${product.productId}`}
													className="text-sm font-medium hover:underline"
												>
													{product.productName}
												</Link>
												{product.productCategoryName && (
													<p className="text-xs text-muted-foreground">
														{product.productCategoryName}
													</p>
												)}
												{product.materialName && (
													<p className="text-xs text-muted-foreground">
														Material: {product.materialName}
													</p>
												)}
												{product.flowerHoles && (
													<p className="text-xs text-muted-foreground">
														Flower holes: {product.flowerHoles}
														{product.flowerTopColor ? ` (${product.flowerTopColor} top)` : ''}
													</p>
												)}
												{product.customerPhotoFilename && (
													<p className="text-xs text-muted-foreground">
														Customer photo: {product.customerPhotoFilename}
													</p>
												)}
											</div>
											{product.customerPhotoUrl && (
												<a
													href={
														signedInquiryProductPhotoUrls?.get(product.customerPhotoUrl) ||
														product.customerPhotoUrl
													}
													target="_blank"
													rel="noreferrer"
													className="shrink-0"
												>
													<img
														src={
															signedInquiryProductPhotoUrls?.get(product.customerPhotoUrl) ||
															product.customerPhotoUrl
														}
														alt={product.customerPhotoFilename || `${product.productName} upload`}
														className="h-16 w-16 rounded-md border object-cover"
													/>
												</a>
											)}
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Sundries of Interest */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<Package className="h-4 w-4" />
								Sundries of Interest
							</CardTitle>
						</CardHeader>
						<CardContent>
							{inquiry.sundries.length === 0 ? (
								<p className="text-sm text-muted-foreground">No sundries specified</p>
							) : (
								<div className="space-y-2">
									{inquiry.sundries.map((sundry) => (
										<div key={sundry.id} className="flex items-center gap-3 p-2 border rounded-md">
											<div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
												<ImageIcon className="h-4 w-4 text-muted-foreground" />
											</div>
											<div className="flex-1 min-w-0">
												{sundry.sundryId ? (
													<Link
														to={`/app/sundries/${sundry.sundryId}`}
														className="text-sm font-medium hover:underline"
													>
														{sundry.sundryName || 'Unnamed sundry'}
													</Link>
												) : (
													<p className="text-sm font-medium">
														{sundry.sundryName || 'Deleted sundry'}
													</p>
												)}
												{sundry.sundryDescription && (
													<p className="text-xs text-muted-foreground truncate">
														{sundry.sundryDescription}
													</p>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Conversions */}
					{((inquiry.linkedBrochures && inquiry.linkedBrochures.length > 0) ||
						(inquiry.linkedQuotePackages && inquiry.linkedQuotePackages.length > 0)) && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Conversions</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{inquiry.linkedBrochures && inquiry.linkedBrochures.length > 0 && (
									<div>
										<h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
											<BookOpen className="h-3.5 w-3.5" />
											Brochures
										</h4>
										<div className="space-y-1">
											{inquiry.linkedBrochures.map((b) => (
												<Link
													key={b.id}
													to={`/app/brochures/${b.id}`}
													className="flex items-center justify-between p-2 rounded-md border hover:bg-accent text-sm"
												>
													<span>Brochure &middot; {formatDate(b.createdAt)}</span>
													{b.archivedAt && (
														<Badge variant="outline" className="text-xs">
															Archived
														</Badge>
													)}
												</Link>
											))}
										</div>
									</div>
								)}
								{inquiry.linkedQuotePackages && inquiry.linkedQuotePackages.length > 0 && (
									<div>
										<h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
											<FileText className="h-3.5 w-3.5" />
											Quotes
										</h4>
										<div className="space-y-1">
											{inquiry.linkedQuotePackages.map((q) => (
												<Link
													key={q.id}
													to={`/app/quotes/${q.id}`}
													className="flex items-center justify-between p-2 rounded-md border hover:bg-accent text-sm"
												>
													<span>{q.packageNumber}</span>
													<Badge variant="outline" className="text-xs">
														{q.status.charAt(0).toUpperCase() + q.status.slice(1)}
													</Badge>
												</Link>
											))}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}
				</div>

				<div className="space-y-6">
					{/* Customer Association */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Customer</CardTitle>
						</CardHeader>
						<CardContent>
							{inquiry.customerId ? (
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<User className="h-4 w-4 text-muted-foreground" />
										<Link
											to={`/app/customers/${inquiry.customerId}`}
											className="text-sm font-medium hover:underline"
										>
											{inquiry.customerName}
										</Link>
									</div>
									<Button
										variant="outline"
										size="sm"
										className="w-full"
										onClick={handleUnlinkCustomer}
										disabled={unlinkCustomerMutation.isPending}
									>
										Unlink Customer
									</Button>
								</div>
							) : (
								<div className="space-y-3">
									<p className="text-sm text-muted-foreground">No customer linked</p>

									{/* Link to existing customer */}
									<Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
										<PopoverTrigger asChild>
											<Button variant="outline" size="sm" className="w-full justify-between">
												Link to Existing Customer
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search customers..." />
												<CommandList>
													<CommandEmpty>No customers found.</CommandEmpty>
													<CommandGroup>
														{customers?.map((customer) => (
															<CommandItem
																key={customer.id}
																value={`${customer.firstName} ${customer.lastName}`}
																onSelect={() => handleLinkCustomer(customer.id)}
															>
																{customer.firstName} {customer.lastName}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>

									<Separator />

									{/* Create new customer */}
									<Button
										variant="secondary"
										size="sm"
										className="w-full"
										onClick={() => setCreateCustomerDialogOpen(true)}
									>
										Create Customer
									</Button>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Inquiry Info */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Source</span>
								<span>{SOURCE_LABELS[inquiry.source] || inquiry.source}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Status</span>
								<Badge variant={getStatusBadgeVariant(inquiry.status)} className="text-xs">
									{inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
								</Badge>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Created</span>
								<span>{formatDate(inquiry.createdAt)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Updated</span>
								<span>{formatDate(inquiry.updatedAt)}</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Archive dialog */}
			<DeleteConfirmDialog
				open={archiveDialogOpen}
				onOpenChange={setArchiveDialogOpen}
				onConfirm={handleArchive}
				title="Archive Inquiry"
				description={`Are you sure you want to archive this inquiry from ${inquiry.firstName} ${inquiry.lastName}? It will be hidden from the main list.`}
				confirmLabel="Archive"
				isLoading={archiveMutation.isPending}
			/>

			{/* Create customer dialog */}
			<CustomerFormDialog
				open={createCustomerDialogOpen}
				onOpenChange={setCreateCustomerDialogOpen}
				onSubmit={handleCreateAndLinkCustomer}
				customer={null}
				initialValues={createCustomerInitialValues}
				isLoading={createCustomerMutation.isPending || linkCustomerMutation.isPending}
				error={createCustomerError}
				defaultCountry={defaultCountry}
			/>
		</div>
	);
}
