import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus } from 'lucide-react';
import {
	useMaterialSectionsQuery,
	useCreateMaterialSectionMutation,
	type CreateMaterialSectionInput,
} from '@/hooks/use-material-sections';

export function MaterialSectionsTab() {
	const { data: sections, isLoading, error } = useMaterialSectionsQuery();
	const createMutation = useCreateMaterialSectionMutation();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
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
		const data: CreateMaterialSectionInput = {
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
		return <div className="text-muted-foreground">Loading material sections...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading material sections: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold">Material Sections</h3>
					<p className="text-sm text-muted-foreground">
						Organize materials into color families (e.g., White, Black, Grey)
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Section
				</Button>
			</div>

			{sections && sections.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No material sections yet. Add your first section to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Materials</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sections?.map((item) => (
								<TableRow key={item.id}>
									<TableCell className="font-medium">
										<Link
											to={`/app/material-sections/${item.id}`}
											className="hover:underline"
										>
											{item.name}
										</Link>
									</TableCell>
									<TableCell>{item.materialCount}</TableCell>
									<TableCell>
										<Link to={`/app/material-sections/${item.id}`}>
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
						<DialogTitle>Add Material Section</DialogTitle>
						<DialogDescription>
							Add a new material section (color family). Add specific materials on the detail page.
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
								placeholder="e.g., White, Black, Light Grey"
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
