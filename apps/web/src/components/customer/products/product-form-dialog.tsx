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
import { CategorySelect } from './category-select';
import { ImageUpload } from '@/components/ui/image-upload';
import type { Product, CreateProductInput } from '@/hooks/use-products';

type ProductFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: CreateProductInput) => void;
	product?: Product | null;
	isLoading?: boolean;
	error?: string | null;
};

export function ProductFormDialog({
	open,
	onOpenChange,
	onSubmit,
	product,
	isLoading,
	error,
}: ProductFormDialogProps) {
	const [sku, setSku] = useState('');
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [entityId, setEntityId] = useState('');

	const isEditing = !!product;

	useEffect(() => {
		if (open) {
			if (product) {
				setSku(product.sku);
				setName(product.name);
				setDescription(product.description || '');
				setCategoryId(product.categoryId);
				setImageUrl(product.imageUrl);
				setEntityId(product.id);
			} else {
				setSku('');
				setName('');
				setDescription('');
				setCategoryId(null);
				setImageUrl(null);
				setEntityId(crypto.randomUUID());
			}
		}
	}, [open, product]);

	const handleSubmit = () => {
		const data: CreateProductInput = {
			sku,
			name,
			description: description || undefined,
			categoryId: categoryId || null,
			imageUrl,
		};
		onSubmit(data);
	};

	const isValid = sku.trim() && name.trim();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Edit Product' : 'Add Product'}</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the product details.'
							: 'Add a new product to your catalog.'}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
						{error}
					</div>
				)}

				<FieldGroup>
					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="sku">SKU</FieldLabel>
							<Input
								id="sku"
								value={sku}
								onChange={(e) => setSku(e.target.value)}
								placeholder="e.g., HS-001"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="category">Category</FieldLabel>
							<CategorySelect
								value={categoryId}
								onChange={setCategoryId}
								placeholder="Select category"
							/>
						</Field>
					</div>

					<Field>
						<FieldLabel htmlFor="name">Name</FieldLabel>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Granite Headstone - Standard"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="description">Description</FieldLabel>
						<Textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional product description"
							rows={3}
						/>
					</Field>

					<Field>
						<FieldLabel>Image (optional)</FieldLabel>
						<ImageUpload
							value={imageUrl}
							onChange={setImageUrl}
							category="products"
							entityId={entityId}
						/>
					</Field>
				</FieldGroup>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!isValid || isLoading}>
						{isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
