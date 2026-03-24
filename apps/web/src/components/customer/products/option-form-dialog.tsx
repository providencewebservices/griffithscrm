import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { ProductOption, ProductOptionType } from '@/hooks/use-product-options';

const OPTION_TYPES: { value: ProductOptionType; label: string; description: string }[] = [
	{ value: 'dimension', label: 'Dimension', description: 'Size variations (e.g., 24x12, 36x18)' },
	{ value: 'stone_color', label: 'Stone Color', description: 'Material/color options' },
	{
		value: 'flower_holes',
		label: 'Flower Holes',
		description: 'Pre-defined flower receptacle positions (choices auto-populated)',
	},
	{ value: 'custom', label: 'Custom', description: 'Any other configurable option' },
];

type OptionFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { name: string; type: ProductOptionType; isRequired: boolean }) => void;
	option?: ProductOption | null;
	isLoading?: boolean;
	error?: string | null;
};

export function OptionFormDialog({
	open,
	onOpenChange,
	onSubmit,
	option,
	isLoading,
	error,
}: OptionFormDialogProps) {
	const [name, setName] = useState('');
	const [type, setType] = useState<ProductOptionType>('custom');
	const [isRequired, setIsRequired] = useState(true);

	const isEditing = !!option;

	useEffect(() => {
		if (open) {
			if (option) {
				setName(option.name);
				setType(option.type);
				setIsRequired(option.isRequired);
			} else {
				setName('');
				setType('custom');
				setIsRequired(true);
			}
		}
	}, [open, option]);

	const handleSubmit = () => {
		onSubmit({ name, type, isRequired });
	};

	const selectedType = OPTION_TYPES.find((t) => t.value === type);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Edit Option' : 'Add Option'}</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the product option details.'
							: 'Add a new configurable option to this product.'}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">{error}</div>
				)}

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="name">Name</FieldLabel>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Size, Color, Flower Holes"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="type">Option Type</FieldLabel>
						<Select value={type} onValueChange={(val) => setType(val as ProductOptionType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{OPTION_TYPES.map((optType) => (
									<SelectItem key={optType.value} value={optType.value}>
										{optType.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{selectedType && <FieldDescription>{selectedType.description}</FieldDescription>}
					</Field>

					<Field className="flex items-center gap-2">
						<Checkbox
							id="isRequired"
							checked={isRequired}
							onCheckedChange={(checked) => setIsRequired(checked === true)}
						/>
						<FieldLabel htmlFor="isRequired" className="cursor-pointer mb-0">
							Required option
						</FieldLabel>
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
