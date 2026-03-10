import { useState, useEffect, useRef, useMemo } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatFileSize, getFileExtension } from '@/lib/file-utils';
import {
	Upload,
	X,
	File,
	Users,
	Briefcase,
	MapPin,
	Package,
	Check,
	ChevronsUpDown,
	Clock,
	Folder,
	Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomersQuery } from '@/hooks/use-customers';
import { useFuneralDirectorsQuery } from '@/hooks/use-funeral-directors';
import { useSuppliersQuery } from '@/hooks/use-suppliers';
import { useQuotesQuery } from '@/hooks/use-quotes';
import { useJobsQuery } from '@/hooks/use-jobs';
import { useMemorialSitesQuery } from '@/hooks/use-memorial-sites';
import { useProductsQuery } from '@/hooks/use-products';
import { useUploadDocumentMutation, type DocumentEntityType } from '@/hooks/use-documents';
import { useRecentEntities, type RecentEntity } from '@/hooks/use-recent-entities';
import { useAllFoldersQuery, type DocumentFolder } from '@/hooks/use-document-folders';

// Entity categories with their types
type EntityCategory = 'contacts' | 'work' | 'sites' | 'items';

const CATEGORY_CONFIG: Record<
	EntityCategory,
	{
		label: string;
		icon: React.ElementType;
		entityTypes: DocumentEntityType[];
	}
> = {
	contacts: {
		label: 'Contacts',
		icon: Users,
		entityTypes: ['customer', 'funeral_director', 'supplier'],
	},
	work: {
		label: 'Work',
		icon: Briefcase,
		entityTypes: ['quote', 'job'],
	},
	sites: {
		label: 'Sites',
		icon: MapPin,
		entityTypes: ['memorial_site'],
	},
	items: {
		label: 'Items',
		icon: Package,
		entityTypes: ['product'],
	},
};

const ENTITY_TYPE_LABELS: Record<DocumentEntityType, string> = {
	customer: 'Customer',
	funeral_director: 'Funeral Director',
	supplier: 'Supplier',
	quote: 'Quote',
	job: 'Job',
	memorial_site: 'Memorial Site',
	product: 'Product',
	council: 'Council',
};

interface SelectedEntity {
	type: DocumentEntityType;
	id: string;
	label: string;
}

interface FileItem {
	file: File;
	name: string;
}

// Entity option type for the selection list
interface EntityOption {
	type: DocumentEntityType;
	id: string;
	label: string;
	sublabel?: string;
}

interface GlobalDocumentUploadDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
	defaultEntityType?: DocumentEntityType;
	defaultEntityId?: string;
	defaultEntityLabel?: string;
	defaultFolderId?: string | null;
	defaultFiles?: File[];
}

export function GlobalDocumentUploadDialog({
	open,
	onOpenChange,
	onSuccess,
	defaultEntityType,
	defaultEntityId,
	defaultEntityLabel,
	defaultFolderId,
	defaultFiles,
}: GlobalDocumentUploadDialogProps) {
	const [files, setFiles] = useState<FileItem[]>([]);
	const [tags, setTags] = useState('');
	const [isDragging, setIsDragging] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<number>(0);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Entity selection state
	const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
	const [activeCategory, setActiveCategory] = useState<EntityCategory>('contacts');
	const [entitySearchOpen, setEntitySearchOpen] = useState(false);
	const [entitySearch, setEntitySearch] = useState('');

	// Folder selection state
	const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
	const [folderSearchOpen, setFolderSearchOpen] = useState(false);

	// Hooks
	const uploadMutation = useUploadDocumentMutation();
	const { recentEntities, addRecentEntity } = useRecentEntities();
	const { data: allFolders } = useAllFoldersQuery();

	// Entity queries - fetch all for selection
	const { data: customers } = useCustomersQuery();
	const { data: funeralDirectors } = useFuneralDirectorsQuery();
	const { data: suppliers } = useSuppliersQuery();
	const { data: quotes } = useQuotesQuery({});
	const { data: jobs } = useJobsQuery({});
	const { data: memorialSites } = useMemorialSitesQuery();
	const { data: productsData } = useProductsQuery();

	// Reset state when dialog opens
	useEffect(() => {
		if (open) {
			setTags('');
			setUploadProgress(0);
			setUploadError(null);
			setEntitySearch('');
			setEntitySearchOpen(false);
			setFolderSearchOpen(false);

			// Set default folder if provided
			setSelectedFolderId(defaultFolderId ?? null);

			// Set default files if provided
			if (defaultFiles && defaultFiles.length > 0) {
				const initialFiles: FileItem[] = defaultFiles.map((file) => {
					const ext = getFileExtension(file.name);
					const nameWithoutExt = file.name.replace(`.${ext}`, '');
					return { file, name: nameWithoutExt };
				});
				setFiles(initialFiles);
			} else {
				setFiles([]);
			}

			// Set default entity if provided
			if (defaultEntityType && defaultEntityId && defaultEntityLabel) {
				setSelectedEntity({
					type: defaultEntityType,
					id: defaultEntityId,
					label: defaultEntityLabel,
				});
				// Find and set the correct category tab
				for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
					if (config.entityTypes.includes(defaultEntityType)) {
						setActiveCategory(category as EntityCategory);
						break;
					}
				}
			} else {
				setSelectedEntity(null);
			}
		}
	}, [open, defaultEntityType, defaultEntityId, defaultEntityLabel, defaultFolderId, defaultFiles]);

	// Build entity options for the current category
	const entityOptions = useMemo<EntityOption[]>(() => {
		const options: EntityOption[] = [];

		// Add entities based on active category
		if (activeCategory === 'contacts') {
			if (customers) {
				customers.forEach((c) => {
					options.push({
						type: 'customer',
						id: c.id,
						label: `${c.firstName} ${c.lastName}`,
						sublabel: 'Customer',
					});
				});
			}
			if (funeralDirectors) {
				funeralDirectors.forEach((fd) => {
					options.push({
						type: 'funeral_director',
						id: fd.id,
						label: fd.businessName,
						sublabel: 'Funeral Director',
					});
				});
			}
			if (suppliers) {
				suppliers.forEach((s) => {
					options.push({
						type: 'supplier',
						id: s.id,
						label: s.businessName,
						sublabel: 'Supplier',
					});
				});
			}
		}

		if (activeCategory === 'work') {
			if (quotes?.packages) {
				quotes.packages.forEach((q) => {
					const customerName =
						q.customerFirstName && q.customerLastName
							? `${q.customerFirstName} ${q.customerLastName}`
							: '';
					options.push({
						type: 'quote',
						id: q.id,
						label: q.firstQuoteNumber + (customerName ? ` - ${customerName}` : ''),
						sublabel: 'Quote',
					});
				});
			}
			if (jobs) {
				jobs.forEach((j) => {
					const customerName =
						j.customerFirstName && j.customerLastName
							? `${j.customerFirstName} ${j.customerLastName}`
							: '';
					options.push({
						type: 'job',
						id: j.id,
						label: j.jobNumber + (customerName ? ` - ${customerName}` : ''),
						sublabel: 'Job',
					});
				});
			}
		}

		if (activeCategory === 'sites') {
			if (memorialSites) {
				memorialSites.forEach((ms) => {
					options.push({
						type: 'memorial_site',
						id: ms.id,
						label: ms.name,
						sublabel: 'Memorial Site',
					});
				});
			}
		}

		if (activeCategory === 'items') {
			if (productsData?.products) {
				productsData.products.forEach((p) => {
					options.push({
						type: 'product',
						id: p.id,
						label: p.name,
						sublabel: p.sku,
					});
				});
			}
		}

		// Filter by search
		if (entitySearch.trim()) {
			const search = entitySearch.toLowerCase();
			return options.filter(
				(o) =>
					o.label.toLowerCase().includes(search) ||
					o.sublabel?.toLowerCase().includes(search)
			);
		}

		return options;
	}, [
		activeCategory,
		customers,
		funeralDirectors,
		suppliers,
		quotes,
		jobs,
		memorialSites,
		productsData,
		entitySearch,
	]);

	const handleFileSelect = (selectedFiles: FileList | File[]) => {
		const newFiles: FileItem[] = [];
		for (const file of selectedFiles) {
			const ext = getFileExtension(file.name);
			const nameWithoutExt = file.name.replace(`.${ext}`, '');
			newFiles.push({ file, name: nameWithoutExt });
		}
		setFiles((prev) => [...prev, ...newFiles]);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		if (e.dataTransfer.files.length > 0) {
			handleFileSelect(e.dataTransfer.files);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			handleFileSelect(e.target.files);
		}
	};

	const handleRemoveFile = (index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const handleFileNameChange = (index: number, name: string) => {
		setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, name } : f)));
	};

	const handleSelectEntity = (entity: SelectedEntity) => {
		setSelectedEntity(entity);
		setEntitySearchOpen(false);
		setEntitySearch('');
	};

	const handleSelectRecentEntity = (recent: RecentEntity) => {
		setSelectedEntity({
			type: recent.type,
			id: recent.id,
			label: recent.label,
		});
	};

	const handleClearEntity = () => {
		setSelectedEntity(null);
	};

	const handleSubmit = async () => {
		if (files.length === 0) return;

		setUploadError(null);
		setUploadProgress(0);

		try {
			// Upload files sequentially
			for (let i = 0; i < files.length; i++) {
				const fileItem = files[i];
				await uploadMutation.mutateAsync({
					entityType: selectedEntity?.type,
					entityId: selectedEntity?.id,
					folderId: selectedFolderId,
					file: fileItem.file,
					name: fileItem.name.trim(),
					tags: tags.trim() || undefined,
				});
				setUploadProgress(((i + 1) / files.length) * 100);
			}

			// Track entity in recent entities if selected
			if (selectedEntity) {
				addRecentEntity(selectedEntity.type, selectedEntity.id, selectedEntity.label);
			}

			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			setUploadError(
				error instanceof Error ? error.message : 'Failed to upload files'
			);
		}
	};

	// Get selected folder name for display
	const selectedFolderName = useMemo(() => {
		if (!selectedFolderId) return 'Unfiled (Root)';
		const folder = allFolders?.find((f) => f.id === selectedFolderId);
		return folder?.name || 'Unknown folder';
	}, [selectedFolderId, allFolders]);

	const isValid = files.length > 0 && files.every((f) => f.name.trim().length > 0);
	const isUploading = uploadMutation.isPending;

	// Render entity options list - extracted for better type inference
	const renderEntityOptions = () => {
		return entityOptions.map((opt) => {
			const isSelected = selectedEntity?.id === opt.id && selectedEntity?.type === opt.type;
			return (
				<CommandItem
					key={`${opt.type}-${opt.id}`}
					value={`${opt.type}-${opt.id}`}
					onSelect={() => handleSelectEntity(opt)}
				>
					<Check
						className={cn(
							'mr-2 h-4 w-4',
							isSelected ? 'opacity-100' : 'opacity-0'
						)}
					/>
					<div className="flex-1">
						<span>{opt.label}</span>
						{opt.sublabel && (
							<span className="ml-2 text-muted-foreground text-xs">
								{opt.sublabel}
							</span>
						)}
					</div>
				</CommandItem>
			);
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Upload Documents</DialogTitle>
					<DialogDescription>
						Upload files and optionally associate them with an entity.
					</DialogDescription>
				</DialogHeader>

				{uploadError && (
					<div className="bg-destructive/10 text-destructive px-4 py-2 rounded text-sm">
						{uploadError}
					</div>
				)}

				<FieldGroup>
					{/* Recent Entities Quick Select */}
					{recentEntities.length > 0 && !selectedEntity && (
						<Field>
							<FieldLabel className="flex items-center gap-1">
								<Clock className="h-3 w-3" />
								Recent
							</FieldLabel>
							<div className="flex flex-wrap gap-2">
								{recentEntities.map((recent) => (
									<Badge
										key={`${recent.type}-${recent.id}`}
										variant="outline"
										className="cursor-pointer hover:bg-accent"
										onClick={() => handleSelectRecentEntity(recent)}
									>
										{recent.label}
										<span className="ml-1 text-muted-foreground text-xs">
											({ENTITY_TYPE_LABELS[recent.type]})
										</span>
									</Badge>
								))}
							</div>
						</Field>
					)}

					{/* Entity Selection */}
					<Field>
						<FieldLabel>Associate with (optional)</FieldLabel>
						{selectedEntity ? (
							<div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
								<div className="flex-1">
									<p className="font-medium text-sm">{selectedEntity.label}</p>
									<p className="text-xs text-muted-foreground">
										{ENTITY_TYPE_LABELS[selectedEntity.type]}
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={handleClearEntity}
									className="shrink-0"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						) : (
							<Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as EntityCategory)}>
								<TabsList className="grid w-full grid-cols-4">
									{Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
										const Icon = config.icon;
										return (
											<TabsTrigger key={key} value={key} className="gap-1 px-2 text-xs">
												<Icon className="h-3 w-3" />
												<span className="hidden sm:inline">{config.label}</span>
											</TabsTrigger>
										);
									})}
								</TabsList>

								{Object.keys(CATEGORY_CONFIG).map((category) => (
									<TabsContent key={category} value={category} className="mt-2">
										<Popover open={entitySearchOpen} onOpenChange={setEntitySearchOpen}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													aria-expanded={entitySearchOpen}
													className="w-full justify-between"
												>
													<span className="text-muted-foreground">
														Select {CATEGORY_CONFIG[category as EntityCategory].label.toLowerCase()}...
													</span>
													<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[400px] p-0" align="start">
												<Command shouldFilter={false}>
													<CommandInput
														placeholder={`Search ${CATEGORY_CONFIG[category as EntityCategory].label.toLowerCase()}...`}
														value={entitySearch}
														onValueChange={setEntitySearch}
													/>
													<CommandList>
														<CommandEmpty>No results found.</CommandEmpty>
														<CommandGroup>
															{renderEntityOptions()}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									</TabsContent>
								))}
							</Tabs>
						)}
						<FieldDescription>
							Documents can be uploaded without association
						</FieldDescription>
					</Field>

					{/* Folder Selection */}
					<Field>
						<FieldLabel>Upload to folder</FieldLabel>
						<Popover open={folderSearchOpen} onOpenChange={setFolderSearchOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={folderSearchOpen}
									className="w-full justify-between"
								>
									<div className="flex items-center gap-2">
										{selectedFolderId ? (
											<Folder className="h-4 w-4" />
										) : (
											<Home className="h-4 w-4" />
										)}
										<span>{selectedFolderName}</span>
									</div>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[300px] p-0" align="start">
								<Command>
									<CommandInput placeholder="Search folders..." />
									<CommandList>
										<CommandEmpty>No folders found.</CommandEmpty>
										<CommandGroup>
											<CommandItem
												value="unfiled"
												onSelect={() => {
													setSelectedFolderId(null);
													setFolderSearchOpen(false);
												}}
											>
												<Check
													className={cn(
														'mr-2 h-4 w-4',
														selectedFolderId === null ? 'opacity-100' : 'opacity-0'
													)}
												/>
												<Home className="mr-2 h-4 w-4" />
												Unfiled (Root)
											</CommandItem>
											{allFolders?.map((folder) => (
												<CommandItem
													key={folder.id}
													value={folder.name}
													onSelect={() => {
														setSelectedFolderId(folder.id);
														setFolderSearchOpen(false);
													}}
												>
													<Check
														className={cn(
															'mr-2 h-4 w-4',
															selectedFolderId === folder.id ? 'opacity-100' : 'opacity-0'
														)}
													/>
													<Folder
														className="mr-2 h-4 w-4"
														style={{ color: folder.color || undefined }}
													/>
													<span style={{ paddingLeft: `${folder.depth * 12}px` }}>
														{folder.name}
													</span>
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
						<FieldDescription>
							Organize documents into folders
						</FieldDescription>
					</Field>

					{/* File Drop Zone / File List */}
					<Field>
						<FieldLabel>Files</FieldLabel>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							className="hidden"
							onChange={handleFileInputChange}
						/>

						{files.length > 0 && (
							<div className="space-y-2 mb-2">
								{files.map((fileItem, index) => (
									<div
										key={index}
										className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30"
									>
										<File className="h-6 w-6 text-muted-foreground shrink-0" />
										<div className="flex-1 min-w-0 space-y-1">
											<Input
												value={fileItem.name}
												onChange={(e) => handleFileNameChange(index, e.target.value)}
												placeholder="Document name"
												className="h-7 text-sm"
											/>
											<p className="text-xs text-muted-foreground truncate">
												{fileItem.file.name} ({formatFileSize(fileItem.file.size)})
											</p>
										</div>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleRemoveFile(index)}
											className="shrink-0 h-7 w-7"
										>
											<X className="h-3 w-3" />
										</Button>
									</div>
								))}
							</div>
						)}

						<div
							onDrop={handleDrop}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onClick={() => fileInputRef.current?.click()}
							className={cn(
								'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30',
								isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
							)}
						>
							<Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
							<p className="text-sm text-muted-foreground">
								<span className="font-medium text-primary">Click to upload</span> or drag
								and drop
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								{files.length > 0 ? 'Add more files' : 'Any file type accepted'}
							</p>
						</div>
					</Field>

					<Field>
						<FieldLabel htmlFor="tags">Tags (applied to all)</FieldLabel>
						<Input
							id="tags"
							value={tags}
							onChange={(e) => setTags(e.target.value)}
							placeholder="e.g., invoice, 2025, important"
						/>
						<FieldDescription>Comma-separated tags for organization</FieldDescription>
					</Field>
				</FieldGroup>

				{/* Upload Progress */}
				{isUploading && (
					<div className="space-y-2">
						<div className="h-2 bg-muted rounded-full overflow-hidden">
							<div
								className="h-full bg-primary transition-all duration-300"
								style={{ width: `${uploadProgress}%` }}
							/>
						</div>
						<p className="text-sm text-muted-foreground text-center">
							Uploading... {Math.round(uploadProgress)}%
						</p>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!isValid || isUploading}>
						{isUploading
							? 'Uploading...'
							: `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
