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
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
import { useCreateFolderMutation, useUpdateFolderMutation, type DocumentFolder } from '@/hooks/use-document-folders';

// Predefined color options
const FOLDER_COLORS = [
	{ value: null, label: 'Default' },
	{ value: '#EF4444', label: 'Red' },
	{ value: '#F97316', label: 'Orange' },
	{ value: '#EAB308', label: 'Yellow' },
	{ value: '#22C55E', label: 'Green' },
	{ value: '#06B6D4', label: 'Cyan' },
	{ value: '#3B82F6', label: 'Blue' },
	{ value: '#8B5CF6', label: 'Purple' },
	{ value: '#EC4899', label: 'Pink' },
];

interface CreateFolderDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	parentId?: string | null;
	editFolder?: DocumentFolder | null;
	onSuccess?: () => void;
}

export function CreateFolderDialog({
	open,
	onOpenChange,
	parentId = null,
	editFolder = null,
	onSuccess,
}: CreateFolderDialogProps) {
	const [name, setName] = useState('');
	const [color, setColor] = useState<string | null>(null);

	const createMutation = useCreateFolderMutation();
	const updateMutation = useUpdateFolderMutation();

	const isEditing = !!editFolder;
	const isLoading = createMutation.isPending || updateMutation.isPending;

	// Reset form when dialog opens/closes or when switching between create/edit
	useEffect(() => {
		if (open) {
			if (editFolder) {
				setName(editFolder.name);
				setColor(editFolder.color);
			} else {
				setName('');
				setColor(null);
			}
		}
	}, [open, editFolder]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) return;

		try {
			if (isEditing && editFolder) {
				await updateMutation.mutateAsync({
					id: editFolder.id,
					name: name.trim(),
					color,
				});
			} else {
				await createMutation.mutateAsync({
					name: name.trim(),
					parentId,
					color,
				});
			}
			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			// Error is handled by mutation
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{isEditing ? 'Edit Folder' : 'New Folder'}</DialogTitle>
						<DialogDescription>
							{isEditing
								? 'Update the folder name and color.'
								: 'Create a new folder to organize your documents.'}
						</DialogDescription>
					</DialogHeader>

					<FieldGroup className="py-4">
						<Field>
							<FieldLabel htmlFor="folder-name">Folder Name</FieldLabel>
							<Input
								id="folder-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter folder name"
								maxLength={100}
								autoFocus
							/>
							<FieldDescription>Maximum 100 characters</FieldDescription>
						</Field>

						<Field>
							<FieldLabel>Color (optional)</FieldLabel>
							<div className="flex flex-wrap gap-2">
								{FOLDER_COLORS.map((option) => (
									<button
										key={option.value || 'default'}
										type="button"
										className={`w-8 h-8 rounded-full border-2 transition-all ${
											color === option.value
												? 'border-foreground scale-110'
												: 'border-transparent hover:border-muted-foreground'
										}`}
										style={{
											backgroundColor: option.value || '#9CA3AF',
										}}
										onClick={() => setColor(option.value)}
										title={option.label}
									/>
								))}
							</div>
						</Field>
					</FieldGroup>

					{(createMutation.error || updateMutation.error) && (
						<div className="text-sm text-destructive mb-4">
							{createMutation.error?.message || updateMutation.error?.message}
						</div>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!name.trim() || isLoading}>
							{isLoading
								? isEditing
									? 'Saving...'
									: 'Creating...'
								: isEditing
									? 'Save Changes'
									: 'Create Folder'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
