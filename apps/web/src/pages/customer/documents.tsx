import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { FileTypeIcon } from '@/components/documents/file-type-icon';
import { DocumentEditDialog } from '@/components/documents/document-edit-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useDocumentsQuery,
	useUpdateDocumentMutation,
	useDeleteDocumentMutation,
	DOCUMENT_ENTITY_LABELS,
	DOCUMENT_ENTITY_FILTER_LABELS,
	type DocumentEntityType,
	type DocumentEntityTypeFilter,
	type Document,
	type UpdateDocumentInput,
} from '@/hooks/use-documents';
import { GlobalDocumentUploadDialog } from '@/components/documents/global-document-upload-dialog';
import {
	formatFileSize,
	parseTags,
	getFileTypeLabel,
	isPreviewable,
} from '@/lib/file-utils';
import {
	Search,
	Download,
	ExternalLink,
	MoreHorizontal,
	Pencil,
	Trash2,
	ChevronLeft,
	ChevronRight,
	Upload,
} from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ENTITY_ROUTES: Record<DocumentEntityType, string> = {
	customer: '/app/customers',
	quote: '/app/quotes',
	job: '/app/jobs',
	funeral_director: '/app/funeral-directors',
	supplier: '/app/suppliers',
	council: '/app/councils',
	memorial_site: '/app/memorial-sites',
	product: '/app/products',
};

// Demo documents to show email attachment integration
const DEMO_DOCUMENTS: Document[] = [
	{
		id: 'demo-1',
		tenantId: 'demo',
		entityType: 'quote',
		entityId: 'demo-quote-247',
		name: 'Quote #247 - Thompson',
		tags: 'email-attachment',
		notes: 'Attached from email: RE: Quote #247 - Gold lettering question',
		filename: 'Quote_247_Thompson.pdf',
		s3Key: 'demo/Quote_247_Thompson.pdf',
		contentType: 'application/pdf',
		size: 250880,
		uploadedBy: null,
		uploaderName: 'Email Import',
		publicUrl: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: 'demo-2',
		tenantId: 'demo',
		entityType: 'supplier',
		entityId: 'demo-supplier-1',
		name: 'Order SS-4521 Invoice',
		tags: 'email-attachment,invoice',
		notes: 'Attached from email: Marble delivery delayed to next week',
		filename: 'Order_SS-4521_Invoice.pdf',
		s3Key: 'demo/Order_SS-4521_Invoice.pdf',
		contentType: 'application/pdf',
		size: 131072,
		uploadedBy: null,
		uploaderName: 'Email Import',
		publicUrl: null,
		createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: 'demo-3',
		tenantId: 'demo',
		entityType: 'supplier',
		entityId: 'demo-supplier-1',
		name: 'Delivery Schedule - January 2025',
		tags: 'email-attachment,schedule',
		notes: 'Attached from email: Marble delivery delayed to next week',
		filename: 'Delivery_Schedule_Jan2025.xlsx',
		s3Key: 'demo/Delivery_Schedule_Jan2025.xlsx',
		contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		size: 43008,
		uploadedBy: null,
		uploaderName: 'Email Import',
		publicUrl: null,
		createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: 'demo-4',
		tenantId: 'demo',
		entityType: 'quote',
		entityId: 'demo-quote-243',
		name: 'Richardson Inscription Draft',
		tags: 'email-attachment,inscription',
		notes: 'Attached from email: Approved inscription wording',
		filename: 'Richardson_Inscription_Draft.pdf',
		s3Key: 'demo/Richardson_Inscription_Draft.pdf',
		contentType: 'application/pdf',
		size: 319488,
		uploadedBy: null,
		uploaderName: 'Email Import',
		publicUrl: null,
		createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: 'demo-5',
		tenantId: 'demo',
		entityType: 'quote',
		entityId: 'demo-quote-243',
		name: 'Headstone Design Preview',
		tags: 'email-attachment,design',
		notes: 'Attached from email: Approved inscription wording',
		filename: 'Headstone_Design_Preview.jpg',
		s3Key: 'demo/Headstone_Design_Preview.jpg',
		contentType: 'image/jpeg',
		size: 1258291,
		uploadedBy: null,
		uploaderName: 'Email Import',
		publicUrl: null,
		createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: 'demo-6',
		tenantId: 'demo',
		entityType: 'quote',
		entityId: 'demo-quote-243',
		name: 'Quote #243 - Richardson',
		tags: 'email-attachment',
		notes: 'Attached from email: Approved inscription wording',
		filename: 'Quote_243_Richardson.pdf',
		s3Key: 'demo/Quote_243_Richardson.pdf',
		contentType: 'application/pdf',
		size: 202752,
		uploadedBy: null,
		uploaderName: 'Email Import',
		publicUrl: null,
		createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
	},
];

export function DocumentsPage() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [entityTypeFilter, setEntityTypeFilter] = useState<DocumentEntityTypeFilter | 'all'>('all');
	const [tagsFilter, setTagsFilter] = useState('');
	const [page, setPage] = useState(0);
	const limit = 25;

	const [editingDocument, setEditingDocument] = useState<Document | null>(null);
	const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

	const updateMutation = useUpdateDocumentMutation();
	const deleteMutation = useDeleteDocumentMutation();

	// Debounce search
	useMemo(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
			setPage(0); // Reset to first page on search
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const { data, isLoading, error } = useDocumentsQuery({
		search: debouncedSearch || undefined,
		entityType: entityTypeFilter === 'all' ? undefined : entityTypeFilter,
		tags: tagsFilter || undefined,
		limit,
		offset: page * limit,
	});

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	const handleOpen = (doc: Document) => {
		if (doc.publicUrl) {
			window.open(doc.publicUrl, '_blank');
		}
	};

	const handleDownload = (doc: Document) => {
		if (doc.publicUrl) {
			const link = window.document.createElement('a');
			link.href = doc.publicUrl;
			link.download = doc.filename;
			link.target = '_blank';
			window.document.body.appendChild(link);
			link.click();
			window.document.body.removeChild(link);
		}
	};

	const handleEditSubmit = async (inputData: UpdateDocumentInput) => {
		if (!editingDocument) return;
		await updateMutation.mutateAsync({ id: editingDocument.id, ...inputData });
		setEditingDocument(null);
	};

	const handleDelete = async () => {
		if (!deletingDocument) return;
		await deleteMutation.mutateAsync(deletingDocument.id);
		setDeletingDocument(null);
	};

	const navigateToEntity = (doc: Document) => {
		if (!doc.entityType || !doc.entityId) return;
		const baseRoute = ENTITY_ROUTES[doc.entityType];
		if (baseRoute) {
			navigate(`${baseRoute}/${doc.entityId}`);
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Documents</h2>
					<p className="text-muted-foreground mt-1">
						Search and manage all uploaded documents
					</p>
				</div>
				<div className="text-muted-foreground">Loading documents...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Documents</h2>
					<p className="text-muted-foreground mt-1">
						Search and manage all uploaded documents
					</p>
				</div>
				<div className="text-destructive">
					Error loading documents: {error.message}
				</div>
			</div>
		);
	}

	// Merge demo documents with real documents
	const apiDocuments = data?.documents || [];

	// Apply filters to demo documents manually (API handles its own filtering)
	const filteredDemoDocuments = DEMO_DOCUMENTS.filter((doc) => {
		if (debouncedSearch) {
			const search = debouncedSearch.toLowerCase();
			if (!doc.name.toLowerCase().includes(search) && !doc.filename.toLowerCase().includes(search)) {
				return false;
			}
		}
		if (entityTypeFilter !== 'all' && doc.entityType !== entityTypeFilter) {
			return false;
		}
		if (tagsFilter && !doc.tags?.toLowerCase().includes(tagsFilter.toLowerCase())) {
			return false;
		}
		return true;
	});

	// Combine filtered demo docs with API results
	const documents = page === 0 ? [...filteredDemoDocuments, ...apiDocuments] : apiDocuments;
	const pagination = data?.pagination;

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Documents</h2>
				<p className="text-muted-foreground mt-1">
					Search and manage all uploaded documents
				</p>
			</div>

			<div className="flex items-center gap-4 mb-4 flex-wrap">
				<div className="relative flex-1 min-w-[200px]">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by document name..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select
					value={entityTypeFilter}
					onValueChange={(v) => {
						setEntityTypeFilter(v as DocumentEntityTypeFilter | 'all');
						setPage(0);
					}}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Filter by type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Types</SelectItem>
						{Object.entries(DOCUMENT_ENTITY_FILTER_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Input
					placeholder="Filter by tags..."
					value={tagsFilter}
					onChange={(e) => {
						setTagsFilter(e.target.value);
						setPage(0);
					}}
					className="w-[180px]"
				/>
				<Button onClick={() => setUploadDialogOpen(true)}>
					<Upload className="h-4 w-4 mr-2" />
					Upload
				</Button>
			</div>

			{documents.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground border rounded-lg">
					{searchQuery || entityTypeFilter !== 'all' || tagsFilter
						? 'No documents found matching your filters.'
						: 'No documents uploaded yet.'}
				</div>
			) : (
				<>
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[50px]"></TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Entity</TableHead>
									<TableHead>Tags</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Size</TableHead>
									<TableHead>Date</TableHead>
									<TableHead className="w-[100px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{documents.map((doc) => {
									const tags = parseTags(doc.tags);
									const canPreview = isPreviewable(doc.contentType);

									return (
										<TableRow key={doc.id}>
											<TableCell>
												<FileTypeIcon
													contentType={doc.contentType}
													previewUrl={doc.publicUrl}
													className="w-8 h-8"
												/>
											</TableCell>
											<TableCell className="font-medium">
												<button
													onClick={() => handleOpen(doc)}
													disabled={!doc.publicUrl}
													className="hover:underline text-left"
												>
													{doc.name}
												</button>
												{doc.notes && (
													<p className="text-xs text-muted-foreground truncate max-w-[200px]">
														{doc.notes}
													</p>
												)}
											</TableCell>
											<TableCell>
												{doc.entityType && doc.entityId ? (
													<button
														onClick={() => navigateToEntity(doc)}
														className="text-primary hover:underline"
													>
														{DOCUMENT_ENTITY_LABELS[doc.entityType]}
													</button>
												) : (
													<span className="text-muted-foreground">Unassigned</span>
												)}
											</TableCell>
											<TableCell>
												{tags.length > 0 ? (
													<div className="flex gap-1 flex-wrap">
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
												) : (
													<span className="text-muted-foreground">-</span>
												)}
											</TableCell>
											<TableCell>{getFileTypeLabel(doc.contentType)}</TableCell>
											<TableCell>{formatFileSize(doc.size)}</TableCell>
											<TableCell>{formatDate(doc.createdAt)}</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="sm">
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														{canPreview && (
															<DropdownMenuItem
																onClick={() => handleOpen(doc)}
																disabled={!doc.publicUrl}
															>
																<ExternalLink className="h-4 w-4 mr-2" />
																Open
															</DropdownMenuItem>
														)}
														<DropdownMenuItem
															onClick={() => handleDownload(doc)}
															disabled={!doc.publicUrl}
														>
															<Download className="h-4 w-4 mr-2" />
															Download
														</DropdownMenuItem>
														<DropdownMenuItem onClick={() => setEditingDocument(doc)}>
															<Pencil className="h-4 w-4 mr-2" />
															Edit Details
														</DropdownMenuItem>
														<DropdownMenuSeparator />
														<DropdownMenuItem
															className="text-destructive"
															onClick={() => setDeletingDocument(doc)}
														>
															<Trash2 className="h-4 w-4 mr-2" />
															Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{pagination && (
						<div className="flex items-center justify-between mt-4">
							<p className="text-sm text-muted-foreground">
								Showing {pagination.offset + 1} -{' '}
								{Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
								{pagination.total} documents
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.max(0, p - 1))}
									disabled={pagination.offset === 0}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => p + 1)}
									disabled={!pagination.hasMore}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</>
			)}

			{/* Edit Dialog */}
			{editingDocument && (
				<DocumentEditDialog
					open={!!editingDocument}
					onOpenChange={(open) => !open && setEditingDocument(null)}
					onSubmit={handleEditSubmit}
					document={editingDocument}
					isLoading={updateMutation.isPending}
				/>
			)}

			{/* Delete Dialog */}
			{deletingDocument && (
				<DeleteConfirmDialog
					open={!!deletingDocument}
					onOpenChange={(open) => !open && setDeletingDocument(null)}
					onConfirm={handleDelete}
					title="Delete Document"
					description={`Are you sure you want to delete "${deletingDocument.name}"? This will permanently remove the file.`}
					isLoading={deleteMutation.isPending}
				/>
			)}

			{/* Upload Dialog */}
			<GlobalDocumentUploadDialog
				open={uploadDialogOpen}
				onOpenChange={setUploadDialogOpen}
			/>
		</div>
	);
}
