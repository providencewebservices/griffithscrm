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
	useCouncilQuery,
	useArchiveCouncilMutation,
	useUnarchiveCouncilMutation,
} from '@/hooks/use-councils';
import {
	Mail,
	Phone,
	MapPin,
	ArrowLeft,
	FileText,
	Ruler,
	CheckCircle,
	XCircle,
} from 'lucide-react';

export function CouncilDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const { data: council, isLoading, error } = useCouncilQuery(id);
	const archiveMutation = useArchiveCouncilMutation();
	const unarchiveMutation = useUnarchiveCouncilMutation();

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
			navigate('/app/councils');
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
				err instanceof Error ? err.message : 'Failed to restore council'
			);
		}
	};

	// Format currency
	const formatCurrency = (amount: string) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(parseFloat(amount));
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Council Details</h2>
				</div>
				<div className="text-muted-foreground">Loading council...</div>
			</div>
		);
	}

	if (error || !council) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Council Details</h2>
				</div>
				<div className="text-destructive">
					{error
						? `Error loading council: ${error.message}`
						: 'Council not found'}
				</div>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => navigate('/app/councils')}
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Councils
				</Button>
			</div>
		);
	}

	const getEmailContacts = () =>
		council.contactInfo.filter((c) => c.type === 'email');
	const getPhoneContacts = () =>
		council.contactInfo.filter(
			(c) => c.type === 'phone' || c.type === 'mobile'
		);

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/councils">Councils</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{council.councilName}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex justify-between items-start mb-6">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">{council.councilName}</h2>
						{council.archivedAt ? (
							<Badge variant="secondary">Archived</Badge>
						) : (
							<Badge variant="default">Active</Badge>
						)}
					</div>
					{council.cemeteryName && (
						<p className="text-muted-foreground mt-1">
							{council.cemeteryName}
						</p>
					)}
					{council.department && (
						<p className="text-sm text-muted-foreground">
							Department: {council.department}
						</p>
					)}
				</div>
				<div className="flex gap-2">
					<Link to={`/app/councils/${id}/edit`}>
						<Button variant="outline">Edit</Button>
					</Link>
					{council.archivedAt ? (
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
						{council.addresses.length === 0 ? (
							<p className="text-sm text-muted-foreground">No addresses</p>
						) : (
							<div className="space-y-4">
								{council.addresses.map((address) => (
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
						<FileText className="h-5 w-5" />
						Permit Requirements
					</CardTitle>
					<CardDescription>
						Memorial installation permit requirements for this council
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<p className="text-sm font-medium mb-1">Permit Required</p>
							<div className="flex items-center gap-2">
								{council.permitRequired ? (
									<>
										<CheckCircle className="h-4 w-4 text-green-600" />
										<span>Yes, permit required</span>
									</>
								) : (
									<>
										<XCircle className="h-4 w-4 text-muted-foreground" />
										<span className="text-muted-foreground">Not required</span>
									</>
								)}
							</div>
						</div>
						{council.permitFee && (
							<div>
								<p className="text-sm font-medium mb-1">Permit Fee</p>
								<p>{formatCurrency(council.permitFee)}</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card className="mt-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Ruler className="h-5 w-5" />
						Memorial Specifications
					</CardTitle>
					<CardDescription>
						Size limits and material requirements
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{council.maxHeadstoneHeight && (
							<div>
								<p className="text-sm font-medium mb-1">Max Height</p>
								<p>{council.maxHeadstoneHeight}</p>
							</div>
						)}
						{council.maxHeadstoneWidth && (
							<div>
								<p className="text-sm font-medium mb-1">Max Width</p>
								<p>{council.maxHeadstoneWidth}</p>
							</div>
						)}
						{council.foundationSpec && (
							<div className="md:col-span-2">
								<p className="text-sm font-medium mb-1">Foundation Specification</p>
								<p className="whitespace-pre-wrap">{council.foundationSpec}</p>
							</div>
						)}
					</div>

					{council.approvedMaterials && (
						<div className="mt-6">
							<p className="text-sm font-medium mb-1">Approved Materials</p>
							<p className="whitespace-pre-wrap">{council.approvedMaterials}</p>
						</div>
					)}

					{council.installationRules && (
						<div className="mt-6">
							<p className="text-sm font-medium mb-1">Installation Rules</p>
							<p className="whitespace-pre-wrap">{council.installationRules}</p>
						</div>
					)}
				</CardContent>
			</Card>

			{council.notes && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle>Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{council.notes}</p>
					</CardContent>
				</Card>
			)}

			<DeleteConfirmDialog
				open={archiveDialogOpen}
				onOpenChange={setArchiveDialogOpen}
				onConfirm={handleArchiveConfirm}
				title="Archive Council"
				description={`Are you sure you want to archive "${council.councilName}"? You can restore it later.`}
				isLoading={archiveMutation.isPending}
			/>
		</div>
	);
}
