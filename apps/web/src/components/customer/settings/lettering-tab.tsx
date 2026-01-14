import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { MoreHorizontal, Plus } from 'lucide-react';
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
				</TabsList>

				<TabsContent value="techniques">
					<TechniquesSection />
				</TabsContent>

				<TabsContent value="colors">
					<ColorsSection />
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
		return <div className="text-muted-foreground">Loading techniques...</div>;
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
					Carving methods. Click "View" to set pricing rules per color.
				</p>
				<Button onClick={handleCreate}>
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
								<TableHead>Status</TableHead>
								<TableHead>Cost Rules</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{techniques?.map((item) => (
								<TableRow key={item.id}>
									<TableCell className="font-medium">{item.name}</TableCell>
									<TableCell>
										<Badge variant={item.isActive ? 'default' : 'secondary'}>
											{item.isActive ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell>{item.costCount}</TableCell>
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

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<LetteringColor | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [formName, setFormName] = useState('');

	const isEditing = !!selectedItem;

	const resetForm = () => {
		setFormName('');
		setMutationError(null);
	};

	const handleCreate = () => {
		setSelectedItem(null);
		resetForm();
		setFormDialogOpen(true);
	};

	const handleEdit = (item: LetteringColor) => {
		setSelectedItem(item);
		setFormName(item.name);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleDelete = (item: LetteringColor) => {
		setSelectedItem(item);
		setDeleteDialogOpen(true);
	};

	const handleToggleActive = async (item: LetteringColor) => {
		try {
			await updateMutation.mutateAsync({
				id: item.id,
				isActive: !item.isActive,
			});
		} catch (err) {
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
			setFormDialogOpen(false);
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
			setSelectedItem(null);
		} catch (err) {
			// Error handled by mutation
		}
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading colors...</div>;
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
					Paint finishes. Prices are set per technique/color combination.
				</p>
				<Button onClick={handleCreate}>
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
								<TableHead>Status</TableHead>
								<TableHead className="w-[70px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{colors?.map((item) => (
								<TableRow key={item.id}>
									<TableCell className="font-medium">{item.name}</TableCell>
									<TableCell>
										<Badge variant={item.isActive ? 'default' : 'secondary'}>
											{item.isActive ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon-sm">
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => handleEdit(item)}>
													Edit
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleToggleActive(item)}>
													{item.isActive ? 'Deactivate' : 'Activate'}
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-destructive"
													onClick={() => handleDelete(item)}
												>
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
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

					<DialogFooter>
						<Button variant="outline" onClick={() => setFormDialogOpen(false)}>
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
