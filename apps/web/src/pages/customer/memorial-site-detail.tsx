import {
	ArrowLeft,
	Building,
	Building2,
	Church,
	Clock,
	CreditCard,
	FileText,
	Flame,
	Mail,
	MapPin,
	Phone,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { DocumentsCard } from '@/components/documents';
import { EmailThreadsCard } from '@/components/inbox/email-threads-card';
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
import { Separator } from '@/components/ui/separator';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	type MemorialSitePaymentMethod,
	PAYMENT_METHOD_LABELS,
	SITE_TYPE_LABELS,
	useArchiveMemorialSiteMutation,
	useMemorialSiteQuery,
	useUnarchiveMemorialSiteMutation,
} from '@/hooks/use-memorial-sites';
import { formatPriceRange, formatQuoteNumberWithOptions, useQuotesQuery } from '@/hooks/use-quotes';

export function MemorialSiteDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const { data: site, isLoading, error } = useMemorialSiteQuery(id);
	const archiveMutation = useArchiveMemorialSiteMutation();
	const unarchiveMutation = useUnarchiveMemorialSiteMutation();
	const { data: siteQuotes, isLoading: quotesLoading } = useQuotesQuery(
		id ? { memorialSiteId: id } : undefined,
	);

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
			navigate('/app/contacts?tab=memorial-sites');
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
			setMutationError(err instanceof Error ? err.message : 'Failed to restore memorial site');
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Memorial Site Details</h2>
				</div>
				<div className="text-muted-foreground">Loading memorial site...</div>
			</div>
		);
	}

	if (error || !site) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Memorial Site Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error loading memorial site: ${error.message}` : 'Memorial site not found'}
				</div>
				<Button variant="outline" className="mt-4" onClick={() => navigate('/app/memorial-sites')}>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Memorial Sites
				</Button>
			</div>
		);
	}

	const getEmailContacts = () => site.contactInfo.filter((c) => c.type === 'email');
	const getPhoneContacts = () =>
		site.contactInfo.filter((c) => c.type === 'phone' || c.type === 'mobile');

	const getSiteTypeIcon = () => {
		if (site.siteType === 'churchyard') return <Church className="h-3 w-3" />;
		if (site.siteType === 'council_cemetery') return <Building2 className="h-3 w-3" />;
		if (site.siteType === 'chapel') return <Building className="h-3 w-3" />;
		return <Flame className="h-3 w-3" />;
	};

	const getBadgeVariant = () => {
		if (site.siteType === 'churchyard' || site.siteType === 'chapel') return 'default';
		if (site.siteType === 'council_cemetery') return 'outline';
		return 'secondary'; // crematorium uses secondary
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	};

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

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/contacts?tab=memorial-sites">Memorial Sites</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{site.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex justify-between items-start mb-6">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">{site.name}</h2>
						<Badge variant={getBadgeVariant()} className="gap-1">
							{getSiteTypeIcon()}
							{SITE_TYPE_LABELS[site.siteType]}
						</Badge>
						{site.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
					</div>
					<p className="text-muted-foreground mt-1">Added {formatDate(site.createdAt)}</p>
				</div>
				<div className="flex gap-2">
					<Link to={`/app/memorial-sites/${id}/edit`}>
						<Button variant="outline">Edit</Button>
					</Link>
					{site.archivedAt ? (
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

			{/* Interaction History - elevated to top */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Interaction History
					</CardTitle>
					<CardDescription>Quotes linked to this memorial site</CardDescription>
				</CardHeader>
				<CardContent>
					{quotesLoading ? (
						<p className="text-muted-foreground">Loading history...</p>
					) : !siteQuotes?.packages || siteQuotes.packages.length === 0 ? (
						<div className="text-center py-8">
							<FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
							<p className="text-muted-foreground">No quotes yet</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Quote #</TableHead>
									<TableHead>Customer</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{siteQuotes.packages.map((quote) => (
									<TableRow key={quote.id}>
										<TableCell className="font-medium">
											{formatQuoteNumberWithOptions(quote.firstQuoteNumber, quote.optionCount)}
										</TableCell>
										<TableCell>
											{quote.customerFirstName || quote.customerLastName
												? `${quote.customerFirstName ?? ''} ${quote.customerLastName ?? ''}`.trim()
												: '-'}
										</TableCell>
										<TableCell>{formatDate(quote.createdAt)}</TableCell>
										<TableCell>
											<Badge variant={getStatusVariant(quote.status)}>
												{quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
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
								<p className="text-sm text-muted-foreground">No email addresses</p>
							) : (
								<div className="space-y-2">
									{getEmailContacts().map((contact) => (
										<div key={contact.id} className="flex items-center gap-2">
											<a href={`mailto:${contact.value}`} className="text-primary hover:underline">
												{contact.value}
											</a>
											{contact.label && (
												<span className="text-xs text-muted-foreground">({contact.label})</span>
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
											<a href={`tel:${contact.value}`} className="text-primary hover:underline">
												{contact.value}
											</a>
											{contact.label && (
												<span className="text-xs text-muted-foreground">({contact.label})</span>
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
						{site.addresses.length === 0 ? (
							<p className="text-sm text-muted-foreground">No addresses</p>
						) : (
							<div className="space-y-4">
								{site.addresses.map((address) => (
									<div key={address.id} className="flex items-start gap-2">
										<MapPin className="h-4 w-4 mt-0.5 shrink-0" />
										<div>
											<p>{address.formattedAddress}</p>
											<div className="flex items-center gap-2 mt-1">
												{address.label && (
													<span className="text-xs text-muted-foreground">({address.label})</span>
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

			{(site.preferredPaymentMethod || site.paymentDetails) && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CreditCard className="h-4 w-4" />
							Payment Information
						</CardTitle>
						<CardDescription>How this site prefers to receive payments</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{site.preferredPaymentMethod && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground">
									Preferred Payment Method
								</h4>
								<p>
									{PAYMENT_METHOD_LABELS[site.preferredPaymentMethod as MemorialSitePaymentMethod]}
								</p>
							</div>
						)}
						{site.paymentDetails && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground">Payment Details</h4>
								<p className="whitespace-pre-wrap">{site.paymentDetails}</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			<Card className="mt-6">
				<CardHeader>
					<CardTitle>Notes</CardTitle>
				</CardHeader>
				<CardContent>
					{site.notes ? (
						<p className="whitespace-pre-wrap">{site.notes}</p>
					) : (
						<p className="text-sm text-muted-foreground">No notes</p>
					)}
				</CardContent>
			</Card>

			{/* Email Threads */}
			<div className="mt-6">
				<EmailThreadsCard entityType="memorial_site" entityId={site.id} entityName={site.name} />
			</div>

			{/* Documents - tabbed layout */}
			<div className="mt-6">
				<Card>
					<CardHeader>
						<CardTitle>Documents</CardTitle>
						<CardDescription>Files and documents for this memorial site</CardDescription>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="rules">
							<TabsList>
								<TabsTrigger value="rules">Rules & Regs</TabsTrigger>
								<TabsTrigger value="applications">Application Forms</TabsTrigger>
								<TabsTrigger value="other">Other</TabsTrigger>
							</TabsList>
							<TabsContent value="rules">
								<DocumentsCard
									entityType="memorial_site"
									entityId={site.id}
									title="Rules & Regulations"
									description="PDF documents containing site rules and regulations"
									tagFilter="rules-and-regulations"
									defaultTags="rules-and-regulations"
									embedded
								/>
							</TabsContent>
							<TabsContent value="applications">
								<DocumentsCard
									entityType="memorial_site"
									entityId={site.id}
									title="Application Forms"
									description="Permit and faculty application forms"
									tagFilter="application-form"
									defaultTags="application-form"
									embedded
								/>
							</TabsContent>
							<TabsContent value="other">
								<DocumentsCard
									entityType="memorial_site"
									entityId={site.id}
									title="Other Documents"
									description="Other files and documents for this memorial site"
									excludeTags={['rules-and-regulations', 'application-form']}
									embedded
								/>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>

			<DeleteConfirmDialog
				open={archiveDialogOpen}
				onOpenChange={setArchiveDialogOpen}
				onConfirm={handleArchiveConfirm}
				title="Archive Memorial Site"
				description={`Are you sure you want to archive "${site.name}"? You can restore it later.`}
				isLoading={archiveMutation.isPending}
			/>
		</div>
	);
}
