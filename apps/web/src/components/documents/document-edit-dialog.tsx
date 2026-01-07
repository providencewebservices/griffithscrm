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
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
import type { Document, UpdateDocumentInput } from '@/hooks/use-documents';

interface DocumentEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: UpdateDocumentInput) => void;
	document: Document;
	isLoading?: boolean;
}

export function DocumentEditDialog({
	open,
	onOpenChange,
	onSubmit,
	document,
	isLoading,
}: DocumentEditDialogProps) {
	const [name, setName] = useState('');
	const [tags, setTags] = useState('');
	const [notes, setNotes] = useState('');

	useEffect(() => {
		if (open) {
			setName(document.name);
			setTags(document.tags || '');
			setNotes(document.notes || '');
		}
	}, [open, document]);

	const handleSubmit = () => {
		onSubmit({
			name: name.trim(),
			tags: tags.trim() || null,
			notes: notes.trim() || null,
		});
	};

	const isValid = name.trim().length > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Document</DialogTitle>
					<DialogDescription>
						Update the document name, tags, or notes.
					</DialogDescription>
				</DialogHeader>

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="name">Name</FieldLabel>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Document name"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="tags">Tags</FieldLabel>
						<Input
							id="tags"
							value={tags}
							onChange={(e) => setTags(e.target.value)}
							placeholder="e.g., invoice, receipt, proof"
						/>
						<FieldDescription>
							Comma-separated tags for organization
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor="notes">Notes</FieldLabel>
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Optional notes about this document"
							rows={3}
						/>
					</Field>
				</FieldGroup>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!isValid || isLoading}>
						{isLoading ? 'Saving...' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
