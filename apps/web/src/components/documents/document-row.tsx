import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FileTypeIcon } from './file-type-icon';
import { DocumentEditDialog } from './document-edit-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	formatFileSize,
	parseTags,
	getFileTypeLabel,
	isPreviewable,
} from '@/lib/file-utils';
import { useUpdateDocumentMutation, useDeleteDocumentMutation } from '@/hooks/use-documents';
import type { Document, UpdateDocumentInput } from '@/hooks/use-documents';
import {
	MoreHorizontal,
	Download,
	ExternalLink,
	Pencil,
	Trash2,
} from 'lucide-react';

interface DocumentRowProps {
	document: Document;
	showEntity?: boolean;
	onEntityClick?: () => void;
}

export function DocumentRow({ document, showEntity, onEntityClick }: DocumentRowProps) {
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const updateMutation = useUpdateDocumentMutation();
	const deleteMutation = useDeleteDocumentMutation();

	const tags = parseTags(document.tags);
	const fileTypeLabel = getFileTypeLabel(document.contentType);
	const canPreview = isPreviewable(document.contentType);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	const handleOpen = () => {
		if (document.publicUrl) {
			window.open(document.publicUrl, '_blank');
		}
	};

	const handleDownload = () => {
		if (document.publicUrl) {
			const link = window.document.createElement('a');
			link.href = document.publicUrl;
			link.download = document.filename;
			link.target = '_blank';
			window.document.body.appendChild(link);
			link.click();
			window.document.body.removeChild(link);
		}
	};

	const handleEditSubmit = async (data: UpdateDocumentInput) => {
		await updateMutation.mutateAsync({ id: document.id, ...data });
		setEditDialogOpen(false);
	};

	const handleDelete = async () => {
		await deleteMutation.mutateAsync(document.id);
		setDeleteDialogOpen(false);
	};

	return (
		<>
			<div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
				<FileTypeIcon
					contentType={document.contentType}
					previewUrl={document.publicUrl}
				/>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<button
							onClick={handleOpen}
							disabled={!document.publicUrl}
							className="font-medium text-sm truncate hover:underline text-left"
						>
							{document.name}
						</button>
						{tags.length > 0 && (
							<div className="hidden sm:flex gap-1">
								{tags.slice(0, 2).map((tag, idx) => (
									<Badge key={idx} variant="secondary" className="text-xs">
										{tag}
									</Badge>
								))}
								{tags.length > 2 && (
									<Badge variant="outline" className="text-xs">
										+{tags.length - 2}
									</Badge>
								)}
							</div>
						)}
					</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
						<span>{fileTypeLabel}</span>
						<span>&middot;</span>
						<span>{formatFileSize(document.size)}</span>
						<span>&middot;</span>
						<span>{formatDate(document.createdAt)}</span>
						{showEntity && document.entityType && (
							<>
								<span>&middot;</span>
								<button
									onClick={onEntityClick}
									className="text-primary hover:underline"
								>
									{document.entityType.replace('_', ' ')}
								</button>
							</>
						)}
					</div>
					{document.notes && (
						<p className="text-xs text-muted-foreground mt-1 truncate">
							{document.notes}
						</p>
					)}
				</div>

				<div className="flex items-center gap-1">
					{canPreview && document.publicUrl && (
						<Button variant="ghost" size="icon" onClick={handleOpen} title="Open">
							<ExternalLink className="h-4 w-4" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon"
						onClick={handleDownload}
						disabled={!document.publicUrl}
						title="Download"
					>
						<Download className="h-4 w-4" />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
								<Pencil className="h-4 w-4 mr-2" />
								Edit Details
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleDownload} disabled={!document.publicUrl}>
								<Download className="h-4 w-4 mr-2" />
								Download
							</DropdownMenuItem>
							{canPreview && (
								<DropdownMenuItem onClick={handleOpen} disabled={!document.publicUrl}>
									<ExternalLink className="h-4 w-4 mr-2" />
									Open in New Tab
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive"
								onClick={() => setDeleteDialogOpen(true)}
							>
								<Trash2 className="h-4 w-4 mr-2" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<DocumentEditDialog
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				onSubmit={handleEditSubmit}
				document={document}
				isLoading={updateMutation.isPending}
			/>

			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDelete}
				title="Delete Document"
				description={`Are you sure you want to delete "${document.name}"? This will permanently remove the file.`}
				isLoading={deleteMutation.isPending}
			/>
		</>
	);
}
