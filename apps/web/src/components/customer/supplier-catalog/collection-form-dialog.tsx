import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CreateCollectionInput, SupplierCollection } from '@/hooks/use-supplier-collections';

type CollectionFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: CreateCollectionInput) => void;
	supplierId: string;
	collection?: SupplierCollection | null;
	isLoading?: boolean;
	error?: string | null;
};

export function CollectionFormDialog({
	open,
	onOpenChange,
	onSubmit,
	supplierId,
	collection,
	isLoading,
	error,
}: CollectionFormDialogProps) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');

	const isEditing = !!collection;

	useEffect(() => {
		if (open) {
			if (collection) {
				setName(collection.name);
				setDescription(collection.description || '');
			} else {
				setName('');
				setDescription('');
			}
		}
	}, [open, collection]);

	const handleSubmit = () => {
		onSubmit({
			supplierId,
			name,
			description: description || null,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Edit Collection' : 'Add Collection'}</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the collection details.'
							: "Add a new collection to this supplier's catalog."}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">{error}</div>
				)}

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="collection-name">Name</FieldLabel>
						<Input
							id="collection-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Premium Range"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="collection-description">Description</FieldLabel>
						<Textarea
							id="collection-description"
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
