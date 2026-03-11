import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InscriptionText } from '@/components/inscription-text';
import { Plus, Upload } from 'lucide-react';
import {
	useLetteringTechniquesQuery,
	useCreateLetteringTechniqueMutation,
	type CreateLetteringTechniqueInput,
} from '@/hooks/use-lettering-techniques';
import {
	useLetteringColorsQuery,
	useCreateLetteringColorMutation,
	useUpdateLetteringColorMutation,
	useDeleteLetteringColorMutation,
	type LetteringColor,
	type CreateLetteringColorInput,
} from '@/hooks/use-lettering-colors';
import {
	useFontsQuery,
	useCreateFontMutation,
	useUpdateFontMutation,
	useDeleteFontMutation,
	type Font,
} from '@/hooks/use-fonts';

export function LetteringTab() {
	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-semibold">Lettering</h3>
				<p className="text-sm text-muted-foreground">
					Manage techniques, colors, and pricing rules
				</p>
			</div>

			<Tabs defaultValue="techniques" className="space-y-4">
				<TabsList>
					<TabsTrigger value="techniques">Techniques</TabsTrigger>
					<TabsTrigger value="colors">Colors</TabsTrigger>
					<TabsTrigger value="fonts">Fonts</TabsTrigger>
				</TabsList>

				<TabsContent value="techniques">
					<TechniquesSection />
				</TabsContent>

				<TabsContent value="colors">
					<ColorsSection />
				</TabsContent>

				<TabsContent value="fonts">
					<FontsSection />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function TechniquesSection() {
	const { data: techniques, isLoading, error } = useLetteringTechniquesQuery();
	const createMutation = useCreateLetteringTechniqueMutation();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [formName, setFormName] = useState('');

	const resetForm = () => {
		setFormName('');
		setMutationError(null);
	};

	const handleCreate = () => {
		resetForm();
		setDialogOpen(true);
	};

	const handleFormSubmit = async () => {
		setMutationError(null);
		const data: CreateLetteringTechniqueInput = {
			name: formName,
		};

		try {
			await createMutation.mutateAsync(data);
			setDialogOpen(false);
			resetForm();
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<Skeleton className="h-4 w-80" />
					<Skeleton className="h-9 w-32" />
				</div>
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Pricing</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 3 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell>
										<Skeleton className="h-4 w-32" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-40" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-8 w-12" />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading techniques: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<p className="text-sm text-muted-foreground">
					Carving methods and their per-letter pricing rules
				</p>
				<Button variant="outline" onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Technique
				</Button>
			</div>

			{techniques && techniques.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No techniques yet. Add your first technique to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Pricing</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{techniques?.map((item) => (
								<TableRow key={item.id}>
									<TableCell className="font-medium">
										{item.name}
										{!item.isActive && (
											<Badge variant="secondary" className="ml-2">
												Inactive
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-sm">
										{item.costCount === 0 ? (
											<span className="italic text-muted-foreground">No rules</span>
										) : (
											<span>
												{item.priceMin === item.priceMax
													? `£${item.priceMin}/letter`
													: `£${item.priceMin} – £${item.priceMax}/letter`}
												{item.colorCount > 0 && (
													<span className="text-muted-foreground">
														{' '}
														· {item.colorCount} {item.colorCount === 1 ? 'color' : 'colors'}
													</span>
												)}
											</span>
										)}
									</TableCell>
									<TableCell>
										<Link to={`/app/lettering-techniques/${item.id}`}>
											<Button variant="ghost" size="sm">
												View
											</Button>
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Technique</DialogTitle>
						<DialogDescription>
							Add a new lettering technique. Configure pricing on the detail page.
						</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="technique-name">Name</FieldLabel>
							<Input
								id="technique-name"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								placeholder="e.g., Sandblast, V-Cut, Raised"
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleFormSubmit}
							disabled={!formName || createMutation.isPending}
						>
							{createMutation.isPending ? 'Creating...' : 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function ColorsSection() {
	const { data: colors, isLoading, error } = useLetteringColorsQuery();
	const createMutation = useCreateLetteringColorMutation();
	const updateMutation = useUpdateLetteringColorMutation();
	const deleteMutation = useDeleteLetteringColorMutation();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<LetteringColor | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [formName, setFormName] = useState('');

	const isEditing = !!selectedItem;

	const resetForm = () => {
		setFormName('');
		setSelectedItem(null);
		setMutationError(null);
	};

	const handleCreate = () => {
		resetForm();
		setDialogOpen(true);
	};

	const handleEdit = (item: LetteringColor) => {
		setSelectedItem(item);
		setFormName(item.name);
		setMutationError(null);
		setDialogOpen(true);
	};

	const handleToggleActive = async () => {
		if (!selectedItem) return;
		try {
			await updateMutation.mutateAsync({
				id: selectedItem.id,
				isActive: !selectedItem.isActive,
			});
			setDialogOpen(false);
			resetForm();
		} catch {
			// Error handled by mutation
		}
	};

	const handleFormSubmit = async () => {
		setMutationError(null);
		const data: CreateLetteringColorInput = {
			name: formName,
		};

		try {
			if (isEditing && selectedItem) {
				await updateMutation.mutateAsync({ id: selectedItem.id, ...data });
			} else {
				await createMutation.mutateAsync(data);
			}
			setDialogOpen(false);
			resetForm();
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteConfirm = async () => {
		if (!selectedItem) return;
		try {
			await deleteMutation.mutateAsync(selectedItem.id);
			setDeleteDialogOpen(false);
			setDialogOpen(false);
			setSelectedItem(null);
		} catch {
			// Error handled by mutation
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<Skeleton className="h-4 w-80" />
					<Skeleton className="h-9 w-28" />
				</div>
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 3 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell>
										<Skeleton className="h-4 w-32" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-8 w-12" />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading colors: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<p className="text-sm text-muted-foreground">
					Paint and fill colors used in lettering pricing
				</p>
				<Button variant="outline" onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Color
				</Button>
			</div>

			{colors && colors.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No colors yet. Add your first color to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{colors?.map((item) => (
								<TableRow
									key={item.id}
									className="cursor-pointer"
									onClick={() => handleEdit(item)}
								>
									<TableCell className="font-medium">
										{item.name}
										{!item.isActive && (
											<Badge variant="secondary" className="ml-2">
												Inactive
											</Badge>
										)}
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												handleEdit(item);
											}}
										>
											Edit
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{isEditing ? 'Edit Color' : 'Add Color'}
						</DialogTitle>
						<DialogDescription>
							{isEditing
								? 'Update the color name.'
								: 'Add a new paint finish. Prices are set per technique.'}
						</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="color-name">Name</FieldLabel>
							<Input
								id="color-name"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								placeholder="e.g., Gold Leaf, White Paint, Gilding"
							/>
						</Field>
					</FieldGroup>

					<DialogFooter className="flex-col sm:flex-row gap-2">
						{isEditing && selectedItem && (
							<div className="flex gap-2 mr-auto">
								<Button
									variant="outline"
									size="sm"
									onClick={handleToggleActive}
									disabled={updateMutation.isPending}
								>
									{selectedItem.isActive ? 'Deactivate' : 'Activate'}
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setDeleteDialogOpen(true)}
								>
									Delete
								</Button>
							</div>
						)}
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleFormSubmit}
							disabled={!formName || createMutation.isPending || updateMutation.isPending}
						>
							{createMutation.isPending || updateMutation.isPending
								? 'Saving...'
								: isEditing
									? 'Update'
									: 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				title="Delete Color"
				description={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}

const ACCEPTED_FONT_EXTENSIONS = '.ttf,.otf,.woff,.woff2';
const MAX_FONT_SIZE = 10 * 1024 * 1024; // 10MB

function FontsSection() {
	const { data: fontsList, isLoading, error } = useFontsQuery();
	const createMutation = useCreateFontMutation();
	const updateMutation = useUpdateFontMutation();
	const deleteMutation = useDeleteFontMutation();

	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedFont, setSelectedFont] = useState<Font | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Upload form state
	const [uploadFile, setUploadFile] = useState<File | null>(null);
	const [uploadName, setUploadName] = useState('');
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Edit form state
	const [editName, setEditName] = useState('');

	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > MAX_FONT_SIZE) {
			setMutationError('Font file must be under 10MB');
			return;
		}

		setUploadFile(file);
		// Auto-populate name from filename (without extension)
		if (!uploadName) {
			const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
			setUploadName(nameWithoutExt);
		}
		setMutationError(null);
	}, [uploadName]);

	const handleUpload = async () => {
		if (!uploadFile || !uploadName.trim()) return;
		setMutationError(null);

		try {
			await createMutation.mutateAsync({
				name: uploadName.trim(),
				file: uploadFile,
			});
			setUploadDialogOpen(false);
			setUploadFile(null);
			setUploadName('');
			if (fileInputRef.current) fileInputRef.current.value = '';
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Upload failed');
		}
	};

	const handleEdit = (font: Font) => {
		setSelectedFont(font);
		setEditName(font.name);
		setMutationError(null);
		setEditDialogOpen(true);
	};

	const handleEditSubmit = async () => {
		if (!selectedFont || !editName.trim()) return;
		setMutationError(null);

		try {
			await updateMutation.mutateAsync({ id: selectedFont.id, name: editName.trim() });
			setEditDialogOpen(false);
			setSelectedFont(null);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Update failed');
		}
	};

	const handleToggleActive = async () => {
		if (!selectedFont) return;
		try {
			await updateMutation.mutateAsync({ id: selectedFont.id, isActive: !selectedFont.isActive });
			setEditDialogOpen(false);
			setSelectedFont(null);
		} catch {
			// Error handled by mutation
		}
	};

	const handleDeleteConfirm = async () => {
		if (!selectedFont) return;
		try {
			await deleteMutation.mutateAsync(selectedFont.id);
			setDeleteDialogOpen(false);
			setEditDialogOpen(false);
			setSelectedFont(null);
		} catch {
			// Error handled by mutation
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<Skeleton className="h-4 w-80" />
					<Skeleton className="h-9 w-28" />
				</div>
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Preview</TableHead>
								<TableHead>Filename</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 3 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell>
										<Skeleton className="h-4 w-32" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-40" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-28" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-8 w-12" />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading fonts: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<p className="text-sm text-muted-foreground">
					Custom fonts for inscription rendering on quotes
				</p>
				<Button variant="outline" onClick={() => {
					setUploadFile(null);
					setUploadName('');
					setMutationError(null);
					setUploadDialogOpen(true);
				}}>
					<Plus className="h-4 w-4 mr-2" />
					Add Font
				</Button>
			</div>

			{fontsList && fontsList.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No fonts uploaded yet. Add a font (.ttf, .otf, .woff, .woff2) to use in inscription rendering.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Preview</TableHead>
								<TableHead>Filename</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{fontsList?.map((font) => (
								<TableRow
									key={font.id}
									className="cursor-pointer"
									onClick={() => handleEdit(font)}
								>
									<TableCell className="font-medium">
										{font.name}
										{!font.isActive && (
											<Badge variant="secondary" className="ml-2">
												Inactive
											</Badge>
										)}
									</TableCell>
									<TableCell>
										<InscriptionText
											text="In Loving Memory"
											fontId={font.id}
											fontName={font.name}
											className="text-sm"
										/>
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{font.filename}
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												handleEdit(font);
											}}
										>
											Edit
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Upload Dialog */}
			<Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Font</DialogTitle>
						<DialogDescription>
							Upload a font file (.ttf, .otf, .woff, .woff2) for use in inscriptions.
						</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel>Font File</FieldLabel>
							<div
								className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
								onClick={() => fileInputRef.current?.click()}
							>
								<input
									ref={fileInputRef}
									type="file"
									accept={ACCEPTED_FONT_EXTENSIONS}
									onChange={handleFileChange}
									className="hidden"
								/>
								{uploadFile ? (
									<div className="space-y-1">
										<p className="font-medium">{uploadFile.name}</p>
										<p className="text-sm text-muted-foreground">
											{(uploadFile.size / 1024).toFixed(1)} KB
										</p>
									</div>
								) : (
									<div className="space-y-1">
										<Upload className="h-8 w-8 mx-auto text-muted-foreground" />
										<p className="text-sm text-muted-foreground">
											Click to select a font file
										</p>
									</div>
								)}
							</div>
						</Field>
						<Field>
							<FieldLabel htmlFor="font-name">Display Name</FieldLabel>
							<Input
								id="font-name"
								value={uploadName}
								onChange={(e) => setUploadName(e.target.value)}
								placeholder="e.g., Times New Roman, Garamond"
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleUpload}
							disabled={!uploadFile || !uploadName.trim() || createMutation.isPending}
						>
							{createMutation.isPending ? 'Uploading...' : 'Upload'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Font</DialogTitle>
						<DialogDescription>Update the font display name.</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="edit-font-name">Display Name</FieldLabel>
							<Input
								id="edit-font-name"
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								placeholder="Font name"
							/>
						</Field>
					</FieldGroup>

					<DialogFooter className="flex-col sm:flex-row gap-2">
						{selectedFont && (
							<div className="flex gap-2 mr-auto">
								<Button
									variant="outline"
									size="sm"
									onClick={handleToggleActive}
									disabled={updateMutation.isPending}
								>
									{selectedFont.isActive ? 'Deactivate' : 'Activate'}
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setDeleteDialogOpen(true)}
								>
									Delete
								</Button>
							</div>
						)}
						<Button variant="outline" onClick={() => setEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleEditSubmit}
							disabled={!editName.trim() || updateMutation.isPending}
						>
							{updateMutation.isPending ? 'Saving...' : 'Update'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				title="Delete Font"
				description={`Are you sure you want to delete "${selectedFont?.name}"? Existing quotes will still render using the snapshotted font data.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
