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
	useFuneralDirectorQuery,
	useArchiveFuneralDirectorMutation,
	useUnarchiveFuneralDirectorMutation,
} from '@/hooks/use-funeral-directors';
import {
	Mail,
	Phone,
	MapPin,
	Globe,
	ArrowLeft,
	Handshake,
} from 'lucide-react';
import { DocumentsCard } from '@/components/documents';

const REFERRAL_LABELS: Record<string, string> = {
	none: 'None',
	informal: 'Informal',
	commission: 'Commission Based',
	preferred_partner: 'Preferred Partner',
};

export function FuneralDirectorDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const { data: funeralDirector, isLoading, error } = useFuneralDirectorQuery(id);
	const archiveMutation = useArchiveFuneralDirectorMutation();
	const unarchiveMutation = useUnarchiveFuneralDirectorMutation();

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
			navigate('/app/funeral-directors');
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
				err instanceof Error ? err.message : 'Failed to restore funeral director'
			);
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Funeral Director Details</h2>
				</div>
				<div className="text-muted-foreground">Loading funeral director...</div>
			</div>
		);
	}

	if (error || !funeralDirector) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Funeral Director Details</h2>
				</div>
				<div className="text-destructive">
					{error
						? `Error loading funeral director: ${error.message}`
						: 'Funeral director not found'}
				</div>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => navigate('/app/funeral-directors')}
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Funeral Directors
				</Button>
			</div>
		);
	}

	const getEmailContacts = () =>
		funeralDirector.contactInfo.filter((c) => c.type === 'email');
	const getPhoneContacts = () =>
		funeralDirector.contactInfo.filter(
			(c) => c.type === 'phone' || c.type === 'mobile'
		);

	const displayName = funeralDirector.tradingName || funeralDirector.businessName;

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/funeral-directors">Funeral Directors</Link>
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
						{funeralDirector.archivedAt ? (
							<Badge variant="secondary">Archived</Badge>
						) : (
							<Badge variant="default">Active</Badge>
						)}
					</div>
					{funeralDirector.branchName && (
						<p className="text-muted-foreground mt-1">
							{funeralDirector.branchName}
						</p>
					)}
					{funeralDirector.tradingName && (
						<p className="text-sm text-muted-foreground">
							Legal name: {funeralDirector.businessName}
						</p>
					)}
				</div>
				<div className="flex gap-2">
					<Link to={`/app/funeral-directors/${id}/edit`}>
						<Button variant="outline">Edit</Button>
					</Link>
					{funeralDirector.archivedAt ? (
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

						{funeralDirector.website && (
							<>
								<Separator />
								<div>
									<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
										<Globe className="h-4 w-4" />
										Website
									</h4>
									<a
										href={funeralDirector.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary hover:underline"
									>
										{funeralDirector.website}
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
						{funeralDirector.addresses.length === 0 ? (
							<p className="text-sm text-muted-foreground">No addresses</p>
						) : (
							<div className="space-y-4">
								{funeralDirector.addresses.map((address) => (
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
						<Handshake className="h-5 w-5" />
						Referral Arrangement
					</CardTitle>
					<CardDescription>
						Commercial relationship with this funeral director
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<p className="text-sm font-medium mb-1">Arrangement Type</p>
							<p>{REFERRAL_LABELS[funeralDirector.referralArrangement] || 'None'}</p>
						</div>
						{funeralDirector.commissionRate && (
							<div>
								<p className="text-sm font-medium mb-1">Commission Rate</p>
								<p>{funeralDirector.commissionRate}%</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{funeralDirector.notes && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle>Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{funeralDirector.notes}</p>
					</CardContent>
				</Card>
			)}

			{/* Documents */}
			<div className="mt-6">
				<DocumentsCard
					entityType="funeral_director"
					entityId={funeralDirector.id}
					title="Documents"
					description="Files and documents for this funeral director"
				/>
			</div>

			<DeleteConfirmDialog
				open={archiveDialogOpen}
				onOpenChange={setArchiveDialogOpen}
				onConfirm={handleArchiveConfirm}
				title="Archive Funeral Director"
				description={`Are you sure you want to archive "${displayName}"? You can restore them later.`}
				isLoading={archiveMutation.isPending}
			/>
		</div>
	);
}
