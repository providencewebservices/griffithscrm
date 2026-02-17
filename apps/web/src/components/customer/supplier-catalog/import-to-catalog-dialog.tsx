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
import { CategorySelect } from '@/components/customer/products/category-select';
import type { SupplierProduct } from '@/hooks/use-supplier-products';

type ImportToCatalogDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: {
		sku: string;
		name?: string;
		description?: string | null;
		categoryId?: string | null;
		basePrice?: string | null;
		imageUrl?: string | null;
	}) => void;
	product: SupplierProduct | null;
	isLoading?: boolean;
	error?: string | null;
};

export function ImportToCatalogDialog({
	open,
	onOpenChange,
	onSubmit,
	product,
	isLoading,
	error,
}: ImportToCatalogDialogProps) {
	const [sku, setSku] = useState('');
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [basePrice, setBasePrice] = useState('');

	useEffect(() => {
		if (open && product) {
			setSku(product.sku || '');
			setName(product.name);
			setDescription(product.description || '');
			setCategoryId(null);
			setBasePrice('');
		}
	}, [open, product]);

	const handleSubmit = () => {
		onSubmit({
			sku,
			name: name || undefined,
			description: description || null,
			categoryId: categoryId || null,
			basePrice: basePrice || null,
		});
	};

	const formatCurrency = (amount: string) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(parseFloat(amount));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Import to My Catalog</DialogTitle>
					<DialogDescription>
						Import this supplier product into your customer-facing catalog.
						You can customize the details below.
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
						{error}
					</div>
				)}

				{product?.supplierCost && (
					<div className="bg-muted px-4 py-3 rounded text-sm">
						<span className="font-medium">Supplier cost:</span>{' '}
						{formatCurrency(product.supplierCost)}
						{basePrice && parseFloat(basePrice) > 0 && (
							<span className="ml-3 text-muted-foreground">
								Margin: {formatCurrency(String(parseFloat(basePrice) - parseFloat(product.supplierCost)))}
								{' '}({((parseFloat(basePrice) - parseFloat(product.supplierCost)) / parseFloat(product.supplierCost) * 100).toFixed(0)}%)
							</span>
						)}
					</div>
				)}

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="import-sku">SKU (required)</FieldLabel>
						<Input
							id="import-sku"
							value={sku}
							onChange={(e) => setSku(e.target.value)}
							placeholder="e.g., HS-001"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="import-name">Name</FieldLabel>
						<Input
							id="import-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={product?.name || ''}
						/>
					</Field>

					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="import-category">Catalog Category</FieldLabel>
							<CategorySelect
								value={categoryId}
								onChange={setCategoryId}
								placeholder="Select category"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="import-price">Selling Price</FieldLabel>
							<Input
								id="import-price"
								type="number"
								step="0.01"
								value={basePrice}
								onChange={(e) => setBasePrice(e.target.value)}
								placeholder="0.00"
							/>
						</Field>
					</div>

					<Field>
						<FieldLabel htmlFor="import-description">Description</FieldLabel>
						<Textarea
							id="import-description"
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
					<Button onClick={handleSubmit} disabled={!sku.trim() || isLoading}>
						{isLoading ? 'Importing...' : 'Import to Catalog'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
