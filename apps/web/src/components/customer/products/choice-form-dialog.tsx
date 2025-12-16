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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import type { OptionChoice } from '@/hooks/use-option-choices';

type ChoiceFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { name: string; priceAdjustment: number; imageUrl?: string | null }) => void;
	choice?: OptionChoice | null;
	isLoading?: boolean;
	error?: string | null;
};

export function ChoiceFormDialog({
	open,
	onOpenChange,
	onSubmit,
	choice,
	isLoading,
	error,
}: ChoiceFormDialogProps) {
	const [name, setName] = useState('');
	const [priceAdjustment, setPriceAdjustment] = useState('0');
	const [imageUrl, setImageUrl] = useState<string | null>(null);

	const isEditing = !!choice;

	useEffect(() => {
		if (open) {
			if (choice) {
				setName(choice.name);
				setPriceAdjustment(choice.priceAdjustment || '0');
				setImageUrl(choice.imageUrl);
			} else {
				setName('');
				setPriceAdjustment('0');
				setImageUrl(null);
			}
		}
	}, [open, choice]);

	const handleSubmit = () => {
		onSubmit({
			name,
			priceAdjustment: parseFloat(priceAdjustment) || 0,
			...(isEditing && { imageUrl }),
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Edit Choice' : 'Add Choice'}</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the option choice details.'
							: 'Add a new choice for this option.'}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
						{error}
					</div>
				)}

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="name">Name</FieldLabel>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., 24x12, Gray, 2 holes"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="priceAdjustment">Price Adjustment ($)</FieldLabel>
						<Input
							id="priceAdjustment"
							type="number"
							step="0.01"
							value={priceAdjustment}
							onChange={(e) => setPriceAdjustment(e.target.value)}
							placeholder="0.00"
						/>
						<p className="text-xs text-muted-foreground mt-1">
							Added to base price. Use negative for discount.
						</p>
					</Field>

					{isEditing && choice && (
						<Field>
							<FieldLabel>Image</FieldLabel>
							<ImageUpload
								value={imageUrl}
								onChange={setImageUrl}
								category="options"
								entityId={choice.id}
							/>
						</Field>
					)}
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
