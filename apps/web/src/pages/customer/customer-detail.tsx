import { useState, useEffect } from 'react';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CustomerFormDialog } from '@/components/customer/customer-form-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useCustomerQuery,
	useUpdateCustomerMutation,
	useArchiveCustomerMutation,
	useUnarchiveCustomerMutation,
	useUpdateCommunicationPreferencesMutation,
	type CustomerWithRelations,
	type CreateCustomerInput,
	type PreferredContactMethod,
	type PreferredContactTime,
} from '@/hooks/use-customers';
import { useQuotesQuery, formatPriceRange, formatQuoteNumberWithOptions } from '@/hooks/use-quotes';
import { useTenantSettingsQuery } from '@/hooks/use-tenant-settings';
import {
	Mail,
	Phone,
	MapPin,
	FileText,
	MessageSquare,
	Bell,
	Clock,
	ArrowLeft,
	Check,
} from 'lucide-react';
import { DocumentsCard } from '@/components/documents';
import { EmailThreadsCard } from '@/components/inbox/email-threads-card';

export function CustomerDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Communication preferences state
	const [preferredContactMethod, setPreferredContactMethod] = useState<PreferredContactMethod | null>(null);
	const [preferredContactTime, setPreferredContactTime] = useState<PreferredContactTime | null>(null);
	const [doNotCall, setDoNotCall] = useState(false);
	const [doNotEmail, setDoNotEmail] = useState(false);
	const [doNotMail, setDoNotMail] = useState(false);
	const [communicationNotes, setCommunicationNotes] = useState('');
	const [preferencesSaved, setPreferencesSaved] = useState(false);

	const { data: customer, isLoading, error } = useCustomerQuery(id || '');
	const { data: tenantSettings } = useTenantSettingsQuery();
	const { data: customerQuotes, isLoading: quotesLoading } = useQuotesQuery(
		id ? { customerId: id } : undefined
	);
	const updateMutation = useUpdateCustomerMutation();
	const archiveMutation = useArchiveCustomerMutation();
	const unarchiveMutation = useUnarchiveCustomerMutation();
	const updatePreferencesMutation = useUpdateCommunicationPreferencesMutation();

	const defaultCountry = tenantSettings?.address?.country || 'US';

	// Sync form state with customer data
	useEffect(() => {
		if (customer) {
			setPreferredContactMethod(customer.preferredContactMethod);
			setPreferredContactTime(customer.preferredContactTime);
			setDoNotCall(customer.doNotCall);
			setDoNotEmail(customer.doNotEmail);
			setDoNotMail(customer.doNotMail);
			setCommunicationNotes(customer.communicationNotes || '');
		}
	}, [customer]);

	// Check if preferences have changed
	const preferencesChanged = customer && (
		preferredContactMethod !== customer.preferredContactMethod ||
		preferredContactTime !== customer.preferredContactTime ||
		doNotCall !== customer.doNotCall ||
		doNotEmail !== customer.doNotEmail ||
		doNotMail !== customer.doNotMail ||
		communicationNotes !== (customer.communicationNotes || '')
	);

	const handleSavePreferences = async () => {
		if (!id) return;
		setPreferencesSaved(false);
		try {
			await updatePreferencesMutation.mutateAsync({
				id,
				preferredContactMethod,
				preferredContactTime,
				doNotCall,
				doNotEmail,
				doNotMail,
				communicationNotes: communicationNotes || null,
			});
			setPreferencesSaved(true);
			setTimeout(() => setPreferencesSaved(false), 3000);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to save preferences');
		}
	};

	// Format currency
	const formatCurrency = (amount: string) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(parseFloat(amount));
	};

	// Format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	};

	// Get status badge variant
	const getStatusVariant = (status: string) => {
		switch (status) {
			case 'accepted':
				return 'default';
			case 'presented':
				return 'secondary';
			case 'draft':
			case 'review':
			case 'ready':
				return 'outline';
			case 'rejected':
			case 'expired':
				return 'destructive';
			default:
				return 'secondary';
		}
	};

	const handleEdit = () => {
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleFormSubmit = async (data: CreateCustomerInput) => {
		if (!id) return;
		setMutationError(null);
		try {
			await updateMutation.mutateAsync({ id, ...data });
			setFormDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
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
			navigate('/app/contacts');
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
				err instanceof Error ? err.message : 'Failed to restore customer'
			);
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Customer Details</h2>
				</div>
				<div className="text-muted-foreground">Loading customer...</div>
			</div>
		);
	}

	if (error || !customer) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Customer Details</h2>
				</div>
				<div className="text-destructive">
					{error
						? `Error loading customer: ${error.message}`
						: 'Customer not found'}
				</div>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => navigate('/app/customers')}
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Customers
				</Button>
			</div>
		);
	}

	const getEmailContacts = () =>
		customer.contactInfo.filter((c) => c.type === 'email');
	const getPhoneContacts = () =>
		customer.contactInfo.filter(
			(c) => c.type === 'phone' || c.type === 'mobile'
		);

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/contacts">Customers</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>
							{customer.firstName} {customer.lastName}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex justify-between items-start mb-6">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">
							{customer.firstName} {customer.lastName}
						</h2>
						{customer.archivedAt ? (
							<Badge variant="secondary">Archived</Badge>
						) : (
							<Badge variant="default">Active</Badge>
						)}
					</div>
					<p className="text-muted-foreground mt-1">
						Customer since {new Date(customer.createdAt).toLocaleDateString()}
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={handleEdit}>
						Edit
					</Button>
					{customer.archivedAt ? (
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
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Addresses</CardTitle>
						<CardDescription>Physical locations</CardDescription>
					</CardHeader>
					<CardContent>
						{customer.addresses.length === 0 ? (
							<p className="text-sm text-muted-foreground">No addresses</p>
						) : (
							<div className="space-y-4">
								{customer.addresses.map((address) => (
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

			{/* Communication Preferences */}
			<Card className="mt-6">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Bell className="h-5 w-5" />
								Communication Preferences
							</CardTitle>
							<CardDescription>
								How this customer prefers to be contacted
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							{preferencesSaved && (
								<span className="text-sm text-green-600 flex items-center gap-1">
									<Check className="h-4 w-4" />
									Preferences saved
								</span>
							)}
							{preferencesChanged && (
								<Button
									onClick={handleSavePreferences}
									disabled={updatePreferencesMutation.isPending}
									size="sm"
								>
									{updatePreferencesMutation.isPending ? 'Saving...' : 'Save Changes'}
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="preferred-contact-method">Preferred Contact Method</Label>
							<Select
								value={preferredContactMethod || 'none'}
								onValueChange={(value) =>
									setPreferredContactMethod(value === 'none' ? null : (value as PreferredContactMethod))
								}
							>
								<SelectTrigger id="preferred-contact-method">
									<SelectValue placeholder="No preference" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No preference</SelectItem>
									<SelectItem value="email">Email</SelectItem>
									<SelectItem value="phone">Phone</SelectItem>
									<SelectItem value="mobile">Mobile</SelectItem>
									<SelectItem value="post">Post</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="preferred-contact-time">Best Time to Contact</Label>
							<Select
								value={preferredContactTime || 'none'}
								onValueChange={(value) =>
									setPreferredContactTime(value === 'none' ? null : (value as PreferredContactTime))
								}
							>
								<SelectTrigger id="preferred-contact-time">
									<SelectValue placeholder="Any time" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Any time</SelectItem>
									<SelectItem value="morning">Morning (9am - 12pm)</SelectItem>
									<SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
									<SelectItem value="evening">Evening (5pm - 8pm)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-3">
						<Label>Contact Restrictions</Label>
						<div className="flex flex-wrap gap-6">
							<div className="flex items-center space-x-2">
								<Checkbox
									id="do-not-call"
									checked={doNotCall}
									onCheckedChange={(checked) => setDoNotCall(checked === true)}
								/>
								<label
									htmlFor="do-not-call"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Do not call
								</label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="do-not-email"
									checked={doNotEmail}
									onCheckedChange={(checked) => setDoNotEmail(checked === true)}
								/>
								<label
									htmlFor="do-not-email"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Do not email
								</label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="do-not-mail"
									checked={doNotMail}
									onCheckedChange={(checked) => setDoNotMail(checked === true)}
								/>
								<label
									htmlFor="do-not-mail"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Do not mail
								</label>
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="communication-notes">Special Instructions</Label>
						<Textarea
							id="communication-notes"
							placeholder="E.g., Call on weekdays only, prefers text messages..."
							value={communicationNotes}
							onChange={(e) => setCommunicationNotes(e.target.value)}
							rows={3}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Interaction History */}
			<Card className="mt-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Interaction History
					</CardTitle>
					<CardDescription>Quotes and enquiries from this customer</CardDescription>
				</CardHeader>
				<CardContent>
					{quotesLoading ? (
						<p className="text-muted-foreground">Loading history...</p>
					) : !customerQuotes || customerQuotes.length === 0 ? (
						<div className="text-center py-8">
							<FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
							<p className="text-muted-foreground">No quotes yet</p>
							<Link to={`/app/customers/${id}/quote/new`}>
								<Button variant="outline" className="mt-4">
									Create First Quote
								</Button>
							</Link>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Quote #</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{customerQuotes.map((quote) => (
									<TableRow key={quote.id}>
										<TableCell className="font-medium">
											{formatQuoteNumberWithOptions(quote.firstQuoteNumber, quote.optionCount)}
										</TableCell>
										<TableCell>{formatDate(quote.createdAt)}</TableCell>
										<TableCell>
											<Badge variant={getStatusVariant(quote.status)}>
												{quote.status.charAt(0).toUpperCase() +
													quote.status.slice(1)}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											{formatPriceRange(quote.priceRange)}
										</TableCell>
										<TableCell>
											<Link to={`/app/quotes/${quote.id}`}>
												<Button variant="ghost" size="sm">
													View
												</Button>
											</Link>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Email Threads */}
			<div className="mt-6">
				<EmailThreadsCard
					entityType="customer"
					entityId={customer.id}
					entityName={`${customer.firstName} ${customer.lastName}`}
				/>
			</div>

			{/* Documents */}
			<div className="mt-6">
				<DocumentsCard
					entityType="customer"
					entityId={customer.id}
					title="Documents"
					description="Files and documents for this customer"
				/>
			</div>

			<CustomerFormDialog
				open={formDialogOpen}
				onOpenChange={setFormDialogOpen}
				onSubmit={handleFormSubmit}
				customer={customer as CustomerWithRelations}
				isLoading={updateMutation.isPending}
				error={mutationError}
				defaultCountry={defaultCountry}
			/>

			<DeleteConfirmDialog
				open={archiveDialogOpen}
				onOpenChange={setArchiveDialogOpen}
				onConfirm={handleArchiveConfirm}
				title="Archive Customer"
				description={`Are you sure you want to archive "${customer.firstName} ${customer.lastName}"? You can restore them later.`}
				isLoading={archiveMutation.isPending}
			/>
		</div>
	);
}
