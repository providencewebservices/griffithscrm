import {
	Check,
	ChevronDown,
	Eye,
	FileImage,
	FileText,
	History,
	Image,
	Loader2,
	MessageSquare,
	Upload,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
	type ProofStatus,
	useApproveProofMutation,
	useConfirmProofMutation,
	useJobProofsQuery,
	usePresignProofMutation,
	useRequestRevisionMutation,
	useSendProofMutation,
} from '@/hooks/use-job-proofs';
import { formatDate } from './types';

function getProofStatusBadge(status: ProofStatus) {
	const config: Record<
		ProofStatus,
		{
			label: string;
			variant: 'secondary' | 'default' | 'destructive' | 'outline';
			className?: string;
		}
	> = {
		draft: { label: 'Draft', variant: 'secondary' },
		sent_to_customer: { label: 'Sent to Customer', variant: 'default', className: 'bg-blue-500' },
		approved: { label: 'Approved', variant: 'default', className: 'bg-green-500' },
		revision_requested: {
			label: 'Revision Requested',
			variant: 'default',
			className: 'bg-orange-500',
		},
		superseded: { label: 'Superseded', variant: 'secondary', className: 'opacity-60' },
	};
	const c = config[status];
	return (
		<Badge variant={c.variant} className={c.className}>
			{c.label}
		</Badge>
	);
}

export function JobProofTab({ jobId }: { jobId: string }) {
	const [proofUploadProgress, setProofUploadProgress] = useState<
		'idle' | 'uploading' | 'confirming'
	>('idle');
	const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
	const [revisionProofId, setRevisionProofId] = useState<string | null>(null);
	const [revisionFeedback, setRevisionFeedback] = useState('');
	const [proofHistoryOpen, setProofHistoryOpen] = useState(false);

	const { data: jobProofs, isLoading: proofsLoading } = useJobProofsQuery(jobId);
	const presignProofMutation = usePresignProofMutation(jobId);
	const confirmProofMutation = useConfirmProofMutation(jobId);
	const sendProofMutation = useSendProofMutation(jobId);
	const approveProofMutation = useApproveProofMutation(jobId);
	const requestRevisionMutation = useRequestRevisionMutation(jobId);

	const currentProof = jobProofs?.find((p) => p.status !== 'superseded');
	const supersededProofs = jobProofs?.filter((p) => p.status === 'superseded') ?? [];

	const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || e.target.files.length === 0) return;

		const file = e.target.files[0];
		setProofUploadProgress('uploading');

		try {
			const presignResult = await presignProofMutation.mutateAsync({
				filename: file.name,
				contentType: file.type,
			});

			const uploadResponse = await fetch(presignResult.uploadUrl, {
				method: 'PUT',
				headers: { 'Content-Type': file.type },
				body: file,
			});

			if (!uploadResponse.ok) {
				throw new Error('Failed to upload file to storage');
			}

			setProofUploadProgress('confirming');
			await confirmProofMutation.mutateAsync({
				s3Key: presignResult.key,
				filename: file.name,
				contentType: file.type,
				size: file.size,
				proofId: presignResult.proofId,
			});

			setProofUploadProgress('idle');
			toast.success('Proof uploaded successfully');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to upload proof');
			setProofUploadProgress('idle');
		}
	};

	const handleSendProof = async (proofId: string) => {
		try {
			await sendProofMutation.mutateAsync(proofId);
			toast.success('Proof sent to customer');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to send proof');
		}
	};

	const handleApproveProof = async (proofId: string) => {
		try {
			await approveProofMutation.mutateAsync(proofId);
			toast.success('Proof approved');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to approve proof');
		}
	};

	const handleRequestRevision = async () => {
		if (!revisionProofId || !revisionFeedback.trim()) return;
		try {
			await requestRevisionMutation.mutateAsync({
				proofId: revisionProofId,
				customerFeedback: revisionFeedback.trim(),
			});
			setRevisionDialogOpen(false);
			setRevisionProofId(null);
			setRevisionFeedback('');
			toast.success('Revision requested');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to request revision');
		}
	};

	return (
		<div className="max-w-2xl space-y-6">
			{/* Current Proof */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Memorial Proof</CardTitle>
							<CardDescription>
								Upload and manage proof designs for customer approval
							</CardDescription>
						</div>
						<label>
							<Button disabled={proofUploadProgress !== 'idle'} asChild>
								<span>
									<Upload className="h-4 w-4 mr-2" />
									{currentProof ? 'Upload New Version' : 'Upload Proof'}
								</span>
							</Button>
							<input
								type="file"
								className="hidden"
								accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
								onChange={handleProofUpload}
								disabled={proofUploadProgress !== 'idle'}
							/>
						</label>
					</div>
				</CardHeader>
				<CardContent>
					{proofUploadProgress !== 'idle' && (
						<div className="flex items-center justify-center py-8 bg-muted rounded-lg mb-4">
							<Loader2 className="h-6 w-6 animate-spin mr-2" />
							<span>
								{proofUploadProgress === 'uploading' ? 'Uploading...' : 'Saving...'}
							</span>
						</div>
					)}

					{proofsLoading ? (
						<div className="text-muted-foreground flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading proofs...
						</div>
					) : !currentProof ? (
						<div className="text-center py-12 text-muted-foreground">
							<FileImage className="h-12 w-12 mx-auto mb-3 opacity-40" />
							<p className="font-medium">No proof uploaded yet</p>
							<p className="text-sm mt-1">
								Upload a proof design to begin the approval workflow
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{/* Proof preview */}
							<div className="flex items-start gap-4 p-4 border rounded-lg">
								<div className="flex-shrink-0">
									{currentProof.contentType.startsWith('image/') ? (
										<Image className="h-10 w-10 text-blue-500" />
									) : (
										<FileText className="h-10 w-10 text-red-500" />
									)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-medium truncate">{currentProof.filename}</span>
										{getProofStatusBadge(currentProof.status as ProofStatus)}
										<Badge variant="outline" className="text-xs">
											v{currentProof.version}
										</Badge>
									</div>
									<div className="text-sm text-muted-foreground mt-1 space-y-0.5">
										<div>
											Uploaded by {currentProof.createdByName || 'Unknown'} on{' '}
											{formatDate(currentProof.createdAt)}
										</div>
										{currentProof.sentAt && (
											<div>Sent {formatDate(currentProof.sentAt)}</div>
										)}
										{currentProof.approvedAt && (
											<div>Approved {formatDate(currentProof.approvedAt)}</div>
										)}
										{currentProof.size && (
											<div>{(currentProof.size / 1024).toFixed(1)} KB</div>
										)}
									</div>
									{currentProof.notes && (
										<div className="text-sm mt-2 text-muted-foreground italic">
											{currentProof.notes}
										</div>
									)}
								</div>
							</div>

							{/* Customer feedback */}
							{currentProof.status === 'revision_requested' &&
								currentProof.customerFeedback && (
									<div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
										<div className="flex items-center gap-2 text-sm font-medium text-orange-800 mb-1">
											<MessageSquare className="h-4 w-4" />
											Customer Feedback
										</div>
										<p className="text-sm text-orange-700">
											{currentProof.customerFeedback}
										</p>
									</div>
								)}

							{/* Action buttons */}
							<div className="flex items-center gap-2">
								{currentProof.status === 'draft' && (
									<Button
										onClick={() => handleSendProof(currentProof.id)}
										disabled={sendProofMutation.isPending}
									>
										{sendProofMutation.isPending ? (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										) : (
											<Eye className="h-4 w-4 mr-2" />
										)}
										Send to Customer
									</Button>
								)}
								{currentProof.status === 'sent_to_customer' && (
									<>
										<Button
											onClick={() => handleApproveProof(currentProof.id)}
											disabled={approveProofMutation.isPending}
											className="bg-green-600 hover:bg-green-700"
										>
											{approveProofMutation.isPending ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : (
												<Check className="h-4 w-4 mr-2" />
											)}
											Mark Approved
										</Button>
										<Button
											variant="outline"
											onClick={() => {
												setRevisionProofId(currentProof.id);
												setRevisionFeedback('');
												setRevisionDialogOpen(true);
											}}
										>
											<MessageSquare className="h-4 w-4 mr-2" />
											Request Revision
										</Button>
									</>
								)}
								{currentProof.status === 'revision_requested' && (
									<label>
										<Button asChild>
											<span>
												<Upload className="h-4 w-4 mr-2" />
												Upload New Version
											</span>
										</Button>
										<input
											type="file"
											className="hidden"
											accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
											onChange={handleProofUpload}
											disabled={proofUploadProgress !== 'idle'}
										/>
									</label>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Version History */}
			{supersededProofs.length > 0 && (
				<Collapsible open={proofHistoryOpen} onOpenChange={setProofHistoryOpen}>
					<Card>
						<CardHeader className="pb-3">
							<CollapsibleTrigger className="flex items-center justify-between w-full">
								<div className="flex items-center gap-2">
									<History className="h-4 w-4 text-muted-foreground" />
									<CardTitle className="text-base">Version History</CardTitle>
									<Badge variant="secondary" className="text-xs">
										{supersededProofs.length}
									</Badge>
								</div>
								<ChevronDown
									className={`h-4 w-4 text-muted-foreground transition-transform ${proofHistoryOpen ? 'rotate-180' : ''}`}
								/>
							</CollapsibleTrigger>
						</CardHeader>
						<CollapsibleContent>
							<CardContent className="pt-0">
								<div className="space-y-2">
									{supersededProofs.map((proof) => (
										<div
											key={proof.id}
											className="flex items-center justify-between p-3 border rounded-lg opacity-70"
										>
											<div className="flex items-center gap-3">
												{proof.contentType.startsWith('image/') ? (
													<Image className="h-5 w-5 text-blue-500" />
												) : (
													<FileText className="h-5 w-5 text-red-500" />
												)}
												<div>
													<div className="flex items-center gap-2">
														<span className="font-medium text-sm">{proof.filename}</span>
														<Badge variant="outline" className="text-xs">
															v{proof.version}
														</Badge>
														{getProofStatusBadge(proof.status as ProofStatus)}
													</div>
													<div className="text-xs text-muted-foreground mt-0.5">
														{proof.createdByName || 'Unknown'} &middot;{' '}
														{formatDate(proof.createdAt)}
														{proof.sentAt && <> &middot; Sent {formatDate(proof.sentAt)}</>}
														{proof.approvedAt && (
															<> &middot; Approved {formatDate(proof.approvedAt)}</>
														)}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</CollapsibleContent>
					</Card>
				</Collapsible>
			)}

			{/* Request Revision Dialog */}
			<Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Request Revision</DialogTitle>
						<DialogDescription>
							Enter the customer's feedback for the proof revision.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Textarea
							placeholder="Describe what changes the customer has requested..."
							value={revisionFeedback}
							onChange={(e) => setRevisionFeedback(e.target.value)}
							rows={4}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRevisionDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleRequestRevision}
							disabled={!revisionFeedback.trim() || requestRevisionMutation.isPending}
						>
							{requestRevisionMutation.isPending ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : null}
							Submit
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
