import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { SupplierCategory, CreateCategoryInput } from '@/hooks/use-supplier-categories';

type CategoryFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: CreateCategoryInput) => void;
	collectionId: string;
	category?: SupplierCategory | null;
	isLoading?: boolean;
	error?: string | null;
};

export function CategoryFormDialog({
	open,
	onOpenChange,
	onSubmit,
	collectionId,
	category,
	isLoading,
	error,
}: CategoryFormDialogProps) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');

	const isEditing = !!category;

	useEffect(() => {
		if (open) {
			if (category) {
				setName(category.name);
				setDescription(category.description || '');
			} else {
				setName('');
				setDescription('');
			}
		}
	}, [open, category]);

	const handleSubmit = () => {
		onSubmit({
			collectionId,
			name,
			description: description || null,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Edit Category' : 'Add Category'}</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the category details.'
							: 'Add a new category to this collection.'}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
						{error}
					</div>
				)}

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="category-name">Name</FieldLabel>
						<Input
							id="category-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Headstones"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="category-description">Description</FieldLabel>
						<Textarea
							id="category-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional description"
							rows={3}
						/>
					</Field>
				</FieldGroup>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!name.trim() || isLoading}>
						{isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
