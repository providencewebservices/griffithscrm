import {
	ExternalLink,
	FileText,
	Image,
	Loader2,
	Trash2,
	Upload,
	X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	formatAttachmentCategory,
	type JobAttachmentCategory,
	useAttachmentsQuery,
	useConfirmAttachmentMutation,
	useDeleteAttachmentMutation,
	usePresignAttachmentMutation,
} from '@/hooks/use-jobs';
import { formatDate } from './types';

function getFileIcon(contentType: string) {
	if (contentType.startsWith('image/')) {
		return <Image className="h-5 w-5 text-blue-500" />;
	}
	return <FileText className="h-5 w-5 text-red-500" />;
}

export function JobFilesTab({ jobId }: { jobId: string }) {
	const [showUpload, setShowUpload] = useState(false);
	const [uploadCategory, setUploadCategory] = useState<JobAttachmentCategory>('artwork');
	const [uploadNotes, setUploadNotes] = useState('');
	const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'confirming'>('idle');
	const [categoryFilter, setCategoryFilter] = useState<JobAttachmentCategory | 'all'>('all');
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

	const { data: attachments, isLoading: attachmentsLoading } = useAttachmentsQuery(jobId);
	const presignMutation = usePresignAttachmentMutation();
	const confirmMutation = useConfirmAttachmentMutation();
	const deleteAttachmentMutation = useDeleteAttachmentMutation();

	const filteredAttachments =
		attachments?.filter((a) => categoryFilter === 'all' || a.category === categoryFilter) || [];

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || e.target.files.length === 0) return;

		const file = e.target.files[0];
		setUploadProgress('uploading');

		try {
			const presignResult = await presignMutation.mutateAsync({
				jobId,
				input: {
					filename: file.name,
					contentType: file.type,
					category: uploadCategory,
				},
			});

			const uploadResponse = await fetch(presignResult.uploadUrl, {
				method: 'PUT',
				headers: { 'Content-Type': file.type },
				body: file,
			});

			if (!uploadResponse.ok) {
				throw new Error('Failed to upload file to storage');
			}

			setUploadProgress('confirming');
			await confirmMutation.mutateAsync({
				jobId,
				input: {
					s3Key: presignResult.key,
					filename: file.name,
					contentType: file.type,
					category: uploadCategory,
					size: file.size,
					notes: uploadNotes || undefined,
				},
			});

			setShowUpload(false);
			setUploadNotes('');
			setUploadProgress('idle');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to upload file');
			setUploadProgress('idle');
		}
	};

	const handleDeleteAttachment = async () => {
		if (!deletingAttachmentId) return;
		try {
			await deleteAttachmentMutation.mutateAsync({ jobId, attachmentId: deletingAttachmentId });
			setDeleteConfirmOpen(false);
			setDeletingAttachmentId(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete file');
		}
	};

	return (
		<div className="max-w-2xl space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Files & Attachments</CardTitle>
							<CardDescription>Artwork, proofs, and documents for this job</CardDescription>
						</div>
						<Button onClick={() => setShowUpload(true)} disabled={uploadProgress !== 'idle'}>
							<Upload className="h-4 w-4 mr-2" />
							Upload File
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{/* Upload Form */}
					{showUpload && (
						<div className="mb-6 p-4 border rounded-lg bg-muted/50">
							<div className="flex items-center justify-between mb-4">
								<h4 className="font-medium">Upload New File</h4>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setShowUpload(false);
										setUploadNotes('');
									}}
									disabled={uploadProgress !== 'idle'}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>

							<div className="space-y-4">
								<div>
									<label className="text-sm text-muted-foreground block mb-1">Category</label>
									<Select
										value={uploadCategory}
										onValueChange={(v) => setUploadCategory(v as JobAttachmentCategory)}
										disabled={uploadProgress !== 'idle'}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="artwork">Artwork</SelectItem>
											<SelectItem value="proof">Proof</SelectItem>
											<SelectItem value="document">Document</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<label className="text-sm text-muted-foreground block mb-1">
										Notes (optional)
									</label>
									<Input
										placeholder="Add a description..."
										value={uploadNotes}
										onChange={(e) => setUploadNotes(e.target.value)}
										disabled={uploadProgress !== 'idle'}
									/>
								</div>

								<div>
									<label className="text-sm text-muted-foreground block mb-1">File</label>
									{uploadProgress === 'idle' ? (
										<label className="flex items-center justify-center w-full h-24 px-4 transition bg-white border-2 border-dashed rounded-lg cursor-pointer hover:border-primary">
											<div className="flex flex-col items-center">
												<Upload className="h-8 w-8 text-muted-foreground mb-2" />
												<span className="text-sm text-muted-foreground">
													Click to select file (Images, PDFs)
												</span>
											</div>
											<input
												type="file"
												className="hidden"
												accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
												onChange={handleFileSelect}
											/>
										</label>
									) : (
										<div className="flex items-center justify-center h-24 bg-muted rounded-lg">
											<Loader2 className="h-6 w-6 animate-spin mr-2" />
											<span>
												{uploadProgress === 'uploading' ? 'Uploading...' : 'Saving...'}
											</span>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Filter */}
					{!attachmentsLoading && attachments && attachments.length > 0 && (
						<div className="flex items-center gap-2 mb-4">
							<span className="text-sm text-muted-foreground">Filter:</span>
							<Select
								value={categoryFilter}
								onValueChange={(v) => setCategoryFilter(v as JobAttachmentCategory | 'all')}
							>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="artwork">Artwork</SelectItem>
									<SelectItem value="proof">Proof</SelectItem>
									<SelectItem value="document">Document</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Files List */}
					{attachmentsLoading ? (
						<div className="text-muted-foreground flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading files...
						</div>
					) : filteredAttachments.length === 0 ? (
						<div className="text-muted-foreground text-center py-8">
							{attachments && attachments.length > 0
								? 'No files match the selected filter.'
								: 'No files uploaded yet.'}
						</div>
					) : (
						<div className="space-y-2">
							{filteredAttachments.map((attachment) => (
								<div
									key={attachment.id}
									className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
								>
									<div className="flex items-center gap-3">
										{getFileIcon(attachment.contentType)}
										<div>
											<div className="font-medium text-sm">{attachment.filename}</div>
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
												<Badge variant="outline" className="text-xs">
													{formatAttachmentCategory(attachment.category)}
												</Badge>
												<span>{formatDate(attachment.createdAt)}</span>
												{attachment.size && (
													<span>{(attachment.size / 1024).toFixed(1)} KB</span>
												)}
											</div>
											{attachment.notes && (
												<div className="text-xs text-muted-foreground mt-1">
													{attachment.notes}
												</div>
											)}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<a href={attachment.publicUrl} target="_blank" rel="noopener noreferrer">
											<Button variant="ghost" size="sm">
												<ExternalLink className="h-4 w-4" />
											</Button>
										</a>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												setDeletingAttachmentId(attachment.id);
												setDeleteConfirmOpen(true);
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}

					{/* File Count */}
					{attachments && attachments.length > 0 && (
						<div className="text-sm text-muted-foreground mt-4 pt-4 border-t">
							{filteredAttachments.length} of {attachments.length} file
							{attachments.length !== 1 ? 's' : ''}
						</div>
					)}
				</CardContent>
			</Card>

			<DeleteConfirmDialog
				open={deleteConfirmOpen}
				onOpenChange={setDeleteConfirmOpen}
				onConfirm={handleDeleteAttachment}
				title="Delete File"
				description="Are you sure you want to delete this file? This action cannot be undone."
				isLoading={deleteAttachmentMutation.isPending}
			/>
		</div>
	);
}
