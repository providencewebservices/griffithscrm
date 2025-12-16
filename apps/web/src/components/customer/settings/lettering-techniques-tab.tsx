import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
	useLetteringTechniquesQuery,
	useCreateLetteringTechniqueMutation,
	type CreateLetteringTechniqueInput,
} from '@/hooks/use-lettering-techniques';

export function LetteringTechniquesTab() {
	const { data: techniques, isLoading, error } = useLetteringTechniquesQuery();
	const createMutation = useCreateLetteringTechniqueMutation();

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
		return <div className="text-muted-foreground">Loading lettering techniques...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading lettering techniques: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold">Lettering Techniques</h3>
					<p className="text-sm text-muted-foreground">
						Manage carving methods and their cost rules
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Technique
				</Button>
			</div>

			{techniques && techniques.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No lettering techniques yet. Add your first technique to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Costs</TableHead>
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

			{/* Create Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Lettering Technique</DialogTitle>
						<DialogDescription>
							Add a new lettering technique. Configure cost rules on the detail page.
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
