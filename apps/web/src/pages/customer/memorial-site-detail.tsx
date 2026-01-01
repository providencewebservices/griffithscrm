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
import { Separator } from '@/components/ui/separator';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useMemorialSiteQuery,
	useArchiveMemorialSiteMutation,
	useUnarchiveMemorialSiteMutation,
	SITE_TYPE_LABELS,
	DENOMINATION_LABELS,
} from '@/hooks/use-memorial-sites';
import {
	Mail,
	Phone,
	MapPin,
	ArrowLeft,
	Church,
	Flame,
	FileText,
	CheckCircle,
	XCircle,
} from 'lucide-react';

export function MemorialSiteDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const { data: site, isLoading, error } = useMemorialSiteQuery(id);
	const archiveMutation = useArchiveMemorialSiteMutation();
	const unarchiveMutation = useUnarchiveMemorialSiteMutation();

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
			navigate('/app/memorial-sites');
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
				err instanceof Error ? err.message : 'Failed to restore memorial site'
			);
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
					{error
						? `Error loading memorial site: ${error.message}`
						: 'Memorial site not found'}
				</div>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => navigate('/app/memorial-sites')}
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Memorial Sites
				</Button>
			</div>
		);
	}

	const getEmailContacts = () =>
		site.contactInfo.filter((c) => c.type === 'email');
	const getPhoneContacts = () =>
		site.contactInfo.filter((c) => c.type === 'phone' || c.type === 'mobile');

	const isChurchyard = site.siteType === 'churchyard';

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/memorial-sites">Memorial Sites</Link>
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
						<Badge
							variant={isChurchyard ? 'default' : 'secondary'}
							className="gap-1"
						>
							{isChurchyard ? (
								<Church className="h-3 w-3" />
							) : (
								<Flame className="h-3 w-3" />
							)}
							{SITE_TYPE_LABELS[site.siteType]}
						</Badge>
						{site.archivedAt ? (
							<Badge variant="outline">Archived</Badge>
						) : null}
					</div>
					{isChurchyard && site.denomination && (
						<p className="text-muted-foreground mt-1">
							{DENOMINATION_LABELS[site.denomination]}
						</p>
					)}
					{!isChurchyard && site.operatorName && (
						<p className="text-muted-foreground mt-1">
							Operated by: {site.operatorName}
						</p>
					)}
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

			{/* Site-specific details */}
			{isChurchyard ? (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Church className="h-5 w-5" />
							Churchyard Details
						</CardTitle>
						<CardDescription>
							Church-specific information and requirements
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{site.denomination && (
								<div>
									<p className="text-sm font-medium mb-1">Denomination</p>
									<p>{DENOMINATION_LABELS[site.denomination]}</p>
								</div>
							)}
							{site.diocese && (
								<div>
									<p className="text-sm font-medium mb-1">Diocese</p>
									<p>{site.diocese}</p>
								</div>
							)}
							{site.parish && (
								<div>
									<p className="text-sm font-medium mb-1">Parish</p>
									<p>{site.parish}</p>
								</div>
							)}
							<div>
								<p className="text-sm font-medium mb-1">Churchyard Status</p>
								<div className="flex items-center gap-2">
									{site.churchyardOpen ? (
										<>
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>Open</span>
										</>
									) : site.churchyardOpen === false ? (
										<>
											<XCircle className="h-4 w-4 text-amber-600" />
											<span>Closed</span>
										</>
									) : (
										<span className="text-muted-foreground">Unknown</span>
									)}
								</div>
							</div>
							<div>
								<p className="text-sm font-medium mb-1">Faculty Required</p>
								<div className="flex items-center gap-2">
									{site.facultyRequired ? (
										<>
											<CheckCircle className="h-4 w-4 text-amber-600" />
											<span>Yes</span>
										</>
									) : site.facultyRequired === false ? (
										<>
											<XCircle className="h-4 w-4 text-green-600" />
											<span>No</span>
										</>
									) : (
										<span className="text-muted-foreground">Unknown</span>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			) : (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Flame className="h-5 w-5" />
							Crematorium Details
						</CardTitle>
						<CardDescription>
							Crematorium-specific information and services
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{site.operatorName && (
								<div>
									<p className="text-sm font-medium mb-1">Operator</p>
									<p>{site.operatorName}</p>
								</div>
							)}
							<div>
								<p className="text-sm font-medium mb-1">Memorial Garden</p>
								<div className="flex items-center gap-2">
									{site.hasMemorialGarden ? (
										<>
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>Yes</span>
										</>
									) : site.hasMemorialGarden === false ? (
										<>
											<XCircle className="h-4 w-4 text-muted-foreground" />
											<span>No</span>
										</>
									) : (
										<span className="text-muted-foreground">Unknown</span>
									)}
								</div>
							</div>
							<div>
								<p className="text-sm font-medium mb-1">Plaques Offered</p>
								<div className="flex items-center gap-2">
									{site.plaquesOffered ? (
										<>
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>Yes</span>
										</>
									) : site.plaquesOffered === false ? (
										<>
											<XCircle className="h-4 w-4 text-muted-foreground" />
											<span>No</span>
										</>
									) : (
										<span className="text-muted-foreground">Unknown</span>
									)}
								</div>
							</div>
							<div>
								<p className="text-sm font-medium mb-1">Preferred Supplier</p>
								<div className="flex items-center gap-2">
									{site.preferredSupplier ? (
										<>
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>Yes</span>
										</>
									) : site.preferredSupplier === false ? (
										<>
											<XCircle className="h-4 w-4 text-muted-foreground" />
											<span>No</span>
										</>
									) : (
										<span className="text-muted-foreground">Unknown</span>
									)}
								</div>
							</div>
						</div>
						{site.memorialOptions && (
							<div className="mt-6">
								<p className="text-sm font-medium mb-1">Memorial Options</p>
								<p className="whitespace-pre-wrap">{site.memorialOptions}</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Regulations (common to both types) */}
			{(site.memorialRegulations || site.approvedMaterials) && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Regulations & Requirements
						</CardTitle>
						<CardDescription>
							Memorial regulations and approved materials
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{site.memorialRegulations && (
							<div>
								<p className="text-sm font-medium mb-1">Memorial Regulations</p>
								<p className="whitespace-pre-wrap">{site.memorialRegulations}</p>
							</div>
						)}
						{site.approvedMaterials && (
							<div>
								<p className="text-sm font-medium mb-1">Approved Materials</p>
								<p className="whitespace-pre-wrap">{site.approvedMaterials}</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{site.notes && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle>Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{site.notes}</p>
					</CardContent>
				</Card>
			)}

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
