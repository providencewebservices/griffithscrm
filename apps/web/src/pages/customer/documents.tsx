import { useState, useMemo, useCallback } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { FileTypeIcon } from '@/components/documents/file-type-icon';
import { DocumentEditDialog } from '@/components/documents/document-edit-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { FolderTree } from '@/components/documents/folder-tree';
import { FolderBreadcrumb } from '@/components/documents/folder-breadcrumb';
import { CreateFolderDialog } from '@/components/documents/create-folder-dialog';
import { MoveItemDialog } from '@/components/documents/move-item-dialog';
import {
	useDocumentsQuery,
	useUpdateDocumentMutation,
	useDeleteDocumentMutation,
	useDownloadUrl,
	DOCUMENT_ENTITY_LABELS,
	DOCUMENT_ENTITY_FILTER_LABELS,
	type DocumentEntityType,
	type DocumentEntityTypeFilter,
	type Document,
	type UpdateDocumentInput,
} from '@/hooks/use-documents';
import {
	useFolderContentsQuery,
	useDeleteFolderMutation,
	type DocumentFolder,
	type BreadcrumbItem,
} from '@/hooks/use-document-folders';
import { GlobalDocumentUploadDialog } from '@/components/documents/global-document-upload-dialog';
import {
	formatFileSize,
	parseTags,
	getFileTypeLabel,
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
	FolderPlus,
	Folder,
	FolderOpen,
	Menu,
	ArrowRightLeft,
	PanelLeft,
	PanelLeftClose,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
} from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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

export function DocumentsPage() {
	const navigate = useNavigate();

	// Folder navigation state
	const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(true);

	// Search and filter state
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [entityTypeFilter, setEntityTypeFilter] = useState<DocumentEntityTypeFilter | 'all'>('all');
	const [tagsFilter, setTagsFilter] = useState('');
	const [page, setPage] = useState(0);
	const limit = 25;

	// Sorting state
	type SortColumn = 'name' | 'entity' | 'type' | 'size' | 'date';
	type SortDirection = 'asc' | 'desc';
	const [sortColumn, setSortColumn] = useState<SortColumn>('date');
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

	// Dialog state
	const [editingDocument, setEditingDocument] = useState<Document | null>(null);
	const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
	const [editingFolder, setEditingFolder] = useState<DocumentFolder | null>(null);
	const [deletingFolder, setDeletingFolder] = useState<DocumentFolder | null>(null);
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
	const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
	const [movingDocument, setMovingDocument] = useState<Document | null>(null);
	const [movingFolder, setMovingFolder] = useState<DocumentFolder | null>(null);
	const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
	const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);
	const [contentDragOver, setContentDragOver] = useState(false);

	// Mutations
	const updateMutation = useUpdateDocumentMutation();
	const deleteMutation = useDeleteDocumentMutation();
	const deleteFolderMutation = useDeleteFolderMutation();
	const downloadMutation = useDownloadUrl();

	// Debounce search
	useMemo(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
			setPage(0);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Use folder contents query when viewing a specific folder
	const folderContentsQuery = useFolderContentsQuery(
		selectedFolderId === 'all' ? null : selectedFolderId
	);

	// Use documents query when viewing 'all' documents or when searching
	const documentsQuery = useDocumentsQuery({
		search: debouncedSearch || undefined,
		entityType: entityTypeFilter === 'all' ? undefined : entityTypeFilter,
		folderId: selectedFolderId === 'all' ? 'all' : selectedFolderId === null ? 'root' : selectedFolderId,
		tags: tagsFilter || undefined,
		limit,
		offset: page * limit,
	});

	// Determine which data to show
	const isViewingAllDocuments = selectedFolderId === 'all';
	const isSearching = debouncedSearch || entityTypeFilter !== 'all' || tagsFilter;

	// When searching or viewing all, use documentsQuery; otherwise use folderContents
	const shouldUseFolderContents = !isViewingAllDocuments && !isSearching;

	const isLoading = shouldUseFolderContents
		? folderContentsQuery.isLoading
		: documentsQuery.isLoading;
	const error = shouldUseFolderContents
		? folderContentsQuery.error
		: documentsQuery.error;

	// Get folders and documents to display
	const subfolders = shouldUseFolderContents
		? folderContentsQuery.data?.subfolders || []
		: [];
	const documents = shouldUseFolderContents
		? (folderContentsQuery.data?.documents || []) as Document[]
		: (documentsQuery.data?.documents || []);
	const breadcrumb: BreadcrumbItem[] = shouldUseFolderContents
		? folderContentsQuery.data?.breadcrumb || []
		: [];
	const pagination = isSearching || isViewingAllDocuments ? documentsQuery.data?.pagination : null;

	// Sort toggle handler
	const handleSort = useCallback((column: SortColumn) => {
		if (sortColumn === column) {
			setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortColumn(column);
			setSortDirection('asc');
		}
	}, [sortColumn]);

	// Sorted documents
	const sortedDocuments = useMemo(() => {
		if (!documents.length) return documents;

		return [...documents].sort((a, b) => {
			let comparison = 0;

			switch (sortColumn) {
				case 'name':
					comparison = a.name.localeCompare(b.name);
					break;
				case 'entity':
					const entityA = a.entityType || '';
					const entityB = b.entityType || '';
					comparison = entityA.localeCompare(entityB);
					break;
				case 'type':
					comparison = a.contentType.localeCompare(b.contentType);
					break;
				case 'size':
					comparison = (a.size || 0) - (b.size || 0);
					break;
				case 'date':
					comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
					break;
			}

			return sortDirection === 'asc' ? comparison : -comparison;
		});
	}, [documents, sortColumn, sortDirection]);

	// Sort icon helper
	const SortIcon = ({ column }: { column: SortColumn }) => {
		if (sortColumn !== column) {
			return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
		}
		return sortDirection === 'asc'
			? <ArrowUp className="h-4 w-4 ml-1" />
			: <ArrowDown className="h-4 w-4 ml-1" />;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	const handleOpen = (doc: Document) => {
		navigate(`/app/documents/${doc.id}`);
	};

	const handleDownload = async (doc: Document) => {
		try {
			const downloadUrl = await downloadMutation.mutateAsync(doc.id);
			window.location.href = downloadUrl;
		} catch (error) {
			console.error('Download failed:', error);
		}
	};

	const handleEditSubmit = async (inputData: UpdateDocumentInput) => {
		if (!editingDocument) return;
		await updateMutation.mutateAsync({ id: editingDocument.id, ...inputData });
		setEditingDocument(null);
	};

	const handleDeleteDocument = async () => {
		if (!deletingDocument) return;
		await deleteMutation.mutateAsync(deletingDocument.id);
		setDeletingDocument(null);
	};

	const handleDeleteFolder = async () => {
		if (!deletingFolder) return;
		await deleteFolderMutation.mutateAsync(deletingFolder.id);
		setDeletingFolder(null);
		// If we were viewing the deleted folder, go to root
		if (selectedFolderId === deletingFolder.id) {
			setSelectedFolderId(null);
		}
	};

	const navigateToEntity = (doc: Document) => {
		if (!doc.entityType || !doc.entityId) return;
		const baseRoute = ENTITY_ROUTES[doc.entityType];
		if (baseRoute) {
			navigate(`${baseRoute}/${doc.entityId}`);
		}
	};

	const handleSelectFolder = (folderId: string | null) => {
		setSelectedFolderId(folderId);
		setPage(0);
		// Clear search when navigating folders
		if (!isSearching) {
			setSearchQuery('');
			setDebouncedSearch('');
		}
	};

	const handleBreadcrumbNavigate = (folderId: string | null) => {
		if (folderId === 'all') {
			setSelectedFolderId('all');
		} else {
			setSelectedFolderId(folderId);
		}
		setPage(0);
	};

	const handleFilesDropped = (files: File[], folderId: string | null) => {
		setDroppedFiles(files);
		setUploadTargetFolderId(folderId);
		setUploadDialogOpen(true);
	};

	const handleContentDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setContentDragOver(true);
	};

	const handleContentDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		// Only set false if leaving the container (not entering a child)
		if (e.currentTarget === e.target) {
			setContentDragOver(false);
		}
	};

	const handleContentDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setContentDragOver(false);
		if (e.dataTransfer.files.length > 0) {
			const files = Array.from(e.dataTransfer.files);
			// Use current folder, or null for unfiled if viewing 'all'
			const targetFolder = selectedFolderId === 'all' ? null : selectedFolderId;
			handleFilesDropped(files, targetFolder);
		}
	};

	if (error) {
		return (
			<div className="p-6">
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

	return (
		<div className="flex h-full">
			{/* Sidebar */}
			<div
				className={cn(
					'border-r bg-background shadow-sm transition-all duration-200 shrink-0',
					sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
				)}
			>
				<div className="p-3 border-b flex items-center justify-between">
					<h3 className="font-semibold text-sm">Folders</h3>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={() => setSidebarOpen(false)}
					>
						<PanelLeftClose className="h-4 w-4" />
					</Button>
				</div>
				<FolderTree
					selectedFolderId={selectedFolderId}
					onSelectFolder={handleSelectFolder}
					onFilesDropped={handleFilesDropped}
				/>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{/* Header */}
				<div className="p-4 border-b">
					<div className="flex items-center gap-2 mb-3">
						{!sidebarOpen && (
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setSidebarOpen(true)}
								className="shrink-0"
							>
								<PanelLeft className="h-4 w-4" />
							</Button>
						)}
						<FolderBreadcrumb
							breadcrumb={breadcrumb}
							onNavigate={handleBreadcrumbNavigate}
							showAllDocuments={isViewingAllDocuments}
						/>
					</div>

					{/* Actions Bar */}
					<div className="flex items-center gap-3 flex-wrap">
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
							<SelectTrigger className="w-[160px]">
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
							className="w-[150px]"
						/>
						<Button
							variant="outline"
							onClick={() => setCreateFolderDialogOpen(true)}
						>
							<FolderPlus className="h-4 w-4 mr-2" />
							New Folder
						</Button>
						<Button onClick={() => setUploadDialogOpen(true)}>
							<Upload className="h-4 w-4 mr-2" />
							Upload
						</Button>
					</div>
				</div>

				{/* Content Area */}
				<div
					className={cn(
						'flex-1 overflow-auto p-4 transition-colors',
						contentDragOver && 'bg-primary/5 ring-2 ring-primary ring-inset'
					)}
					onDragOver={handleContentDragOver}
					onDragLeave={handleContentDragLeave}
					onDrop={handleContentDrop}
				>
					{isLoading ? (
						<div className="text-muted-foreground">Loading...</div>
					) : (
						<>
							{/* Subfolders Grid (only when not searching and not viewing all) */}
							{subfolders.length > 0 && !isSearching && (
								<div className="mb-6">
									<h4 className="text-sm font-medium text-muted-foreground mb-3">
										Folders
									</h4>
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
										{subfolders.map((folder) => (
											<Card
												key={folder.id}
												className="cursor-pointer hover:bg-accent/50 transition-colors group"
												onClick={() => handleSelectFolder(folder.id)}
											>
												<CardContent className="p-3">
													<div className="flex items-start justify-between">
														<div className="flex items-center gap-2 min-w-0">
															<Folder
																className="h-8 w-8 shrink-0"
																style={{ color: folder.color || undefined }}
															/>
															<span className="font-medium truncate text-sm">
																{folder.name}
															</span>
														</div>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-6 w-6 opacity-0 group-hover:opacity-100"
																	onClick={(e) => e.stopPropagation()}
																>
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem
																	onClick={(e) => {
																		e.stopPropagation();
																		setEditingFolder(folder);
																		setCreateFolderDialogOpen(true);
																	}}
																>
																	<Pencil className="h-4 w-4 mr-2" />
																	Rename
																</DropdownMenuItem>
																<DropdownMenuItem
																	onClick={(e) => {
																		e.stopPropagation();
																		setMovingFolder(folder);
																	}}
																>
																	<ArrowRightLeft className="h-4 w-4 mr-2" />
																	Move
																</DropdownMenuItem>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	className="text-destructive"
																	onClick={(e) => {
																		e.stopPropagation();
																		setDeletingFolder(folder);
																	}}
																>
																	<Trash2 className="h-4 w-4 mr-2" />
																	Delete
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								</div>
							)}

							{/* Documents Table */}
							{documents.length === 0 && subfolders.length === 0 ? (
								<div className="text-center py-12 text-muted-foreground border rounded-lg">
									{isSearching
										? 'No documents found matching your filters.'
										: selectedFolderId === null
											? 'No unfiled documents. Upload documents or create folders to organize them.'
											: 'This folder is empty.'}
								</div>
							) : documents.length > 0 ? (
								<>
									{!isSearching && subfolders.length > 0 && (
										<h4 className="text-sm font-medium text-muted-foreground mb-3">
											Documents
										</h4>
									)}
									<div className="border rounded-lg">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="w-[50px]"></TableHead>
													<TableHead>
														<button
															className="flex items-center hover:text-foreground"
															onClick={() => handleSort('name')}
														>
															Name
															<SortIcon column="name" />
														</button>
													</TableHead>
													<TableHead>
														<button
															className="flex items-center hover:text-foreground"
															onClick={() => handleSort('entity')}
														>
															Entity
															<SortIcon column="entity" />
														</button>
													</TableHead>
													<TableHead>Tags</TableHead>
													<TableHead>
														<button
															className="flex items-center hover:text-foreground"
															onClick={() => handleSort('type')}
														>
															Type
															<SortIcon column="type" />
														</button>
													</TableHead>
													<TableHead>
														<button
															className="flex items-center hover:text-foreground"
															onClick={() => handleSort('size')}
														>
															Size
															<SortIcon column="size" />
														</button>
													</TableHead>
													<TableHead>
														<button
															className="flex items-center hover:text-foreground"
															onClick={() => handleSort('date')}
														>
															Date
															<SortIcon column="date" />
														</button>
													</TableHead>
													<TableHead className="w-[100px]">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{sortedDocuments.map((doc) => {
													const tags = parseTags(doc.tags);

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
																		<DropdownMenuItem
																			onClick={() => handleOpen(doc)}
																		>
																			<ExternalLink className="h-4 w-4 mr-2" />
																			View
																		</DropdownMenuItem>
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
																		<DropdownMenuItem onClick={() => setMovingDocument(doc)}>
																			<ArrowRightLeft className="h-4 w-4 mr-2" />
																			Move to Folder
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
								</>
							) : null}

							{/* Pagination (only when searching or viewing all) */}
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
				</div>
			</div>

			{/* Edit Document Dialog */}
			{editingDocument && (
				<DocumentEditDialog
					open={!!editingDocument}
					onOpenChange={(open) => !open && setEditingDocument(null)}
					onSubmit={handleEditSubmit}
					document={editingDocument}
					isLoading={updateMutation.isPending}
				/>
			)}

			{/* Delete Document Dialog */}
			{deletingDocument && (
				<DeleteConfirmDialog
					open={!!deletingDocument}
					onOpenChange={(open) => !open && setDeletingDocument(null)}
					onConfirm={handleDeleteDocument}
					title="Delete Document"
					description={`Are you sure you want to delete "${deletingDocument.name}"? This will permanently remove the file.`}
					isLoading={deleteMutation.isPending}
				/>
			)}

			{/* Create/Edit Folder Dialog */}
			<CreateFolderDialog
				open={createFolderDialogOpen}
				onOpenChange={(open) => {
					setCreateFolderDialogOpen(open);
					if (!open) setEditingFolder(null);
				}}
				parentId={selectedFolderId === 'all' ? null : selectedFolderId}
				editFolder={editingFolder}
			/>

			{/* Delete Folder Dialog */}
			{deletingFolder && (
				<DeleteConfirmDialog
					open={!!deletingFolder}
					onOpenChange={(open) => !open && setDeletingFolder(null)}
					onConfirm={handleDeleteFolder}
					title="Delete Folder"
					description={`Are you sure you want to delete the folder "${deletingFolder.name}"? The folder must be empty.`}
					isLoading={deleteFolderMutation.isPending}
				/>
			)}

			{/* Move Document Dialog */}
			{movingDocument && (
				<MoveItemDialog
					open={!!movingDocument}
					onOpenChange={(open) => !open && setMovingDocument(null)}
					itemType="document"
					itemId={movingDocument.id}
					itemName={movingDocument.name}
					currentFolderId={movingDocument.folderId}
				/>
			)}

			{/* Move Folder Dialog */}
			{movingFolder && (
				<MoveItemDialog
					open={!!movingFolder}
					onOpenChange={(open) => !open && setMovingFolder(null)}
					itemType="folder"
					itemId={movingFolder.id}
					itemName={movingFolder.name}
					currentFolderId={movingFolder.parentId}
					excludeFolderId={movingFolder.id}
				/>
			)}

			{/* Upload Dialog */}
			<GlobalDocumentUploadDialog
				open={uploadDialogOpen}
				onOpenChange={(open) => {
					setUploadDialogOpen(open);
					if (!open) {
						setDroppedFiles([]);
						setUploadTargetFolderId(null);
					}
				}}
				defaultFolderId={
					droppedFiles.length > 0
						? uploadTargetFolderId
						: selectedFolderId === 'all'
							? undefined
							: selectedFolderId
				}
				defaultFiles={droppedFiles.length > 0 ? droppedFiles : undefined}
			/>
		</div>
	);
}
