import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import {
	useProductCategoriesQuery,
	useCreateProductCategoryMutation,
	type CreateProductCategoryInput,
} from '@/hooks/use-product-categories';

export function ProductCategoriesTab() {
	const navigate = useNavigate();
	const { data: categories, isLoading, error } = useProductCategoriesQuery();
	const createMutation = useCreateProductCategoryMutation();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [formName, setFormName] = useState('');
	const [formDescription, setFormDescription] = useState('');

	const resetForm = () => {
		setFormName('');
		setFormDescription('');
		setMutationError(null);
	};

	const handleCreate = () => {
		resetForm();
		setDialogOpen(true);
	};

	const handleFormSubmit = async () => {
		setMutationError(null);
		const data: CreateProductCategoryInput = {
			name: formName,
			description: formDescription || undefined,
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
		return <div className="text-muted-foreground">Loading categories...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading categories: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold">Product Categories</h3>
					<p className="text-sm text-muted-foreground">
						Organize your products into categories
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Category
				</Button>
			</div>

			{categories && categories.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No categories yet. Add your first category to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Products</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{categories?.map((item) => (
								<TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/app/categories/${item.id}`)}>
									<TableCell className="font-medium">{item.name}</TableCell>
									<TableCell><Badge variant="secondary">{item.productCount}</Badge></TableCell>
									<TableCell>
										<Link to={`/app/categories/${item.id}`}>
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

			{/* Create Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Category</DialogTitle>
						<DialogDescription>
							Add a new product category.
						</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="name">Name</FieldLabel>
							<Input
								id="name"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								placeholder="e.g., Full Length Memorials"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="description">Description</FieldLabel>
							<Textarea
								id="description"
								value={formDescription}
								onChange={(e) => setFormDescription(e.target.value)}
								placeholder="Optional description"
								rows={2}
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
