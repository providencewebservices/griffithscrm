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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { SupplierCategory } from '@/hooks/use-supplier-categories';
import type { CreateSupplierProductInput, SupplierProduct } from '@/hooks/use-supplier-products';

type SupplierProductFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: CreateSupplierProductInput) => void;
	supplierId: string;
	collectionId: string;
	categories: SupplierCategory[];
	product?: SupplierProduct | null;
	isLoading?: boolean;
	error?: string | null;
};

export function SupplierProductFormDialog({
	open,
	onOpenChange,
	onSubmit,
	supplierId,
	collectionId,
	categories,
	product,
	isLoading,
	error,
}: SupplierProductFormDialogProps) {
	const [name, setName] = useState('');
	const [sku, setSku] = useState('');
	const [description, setDescription] = useState('');
	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [supplierCost, setSupplierCost] = useState('');
	const [height, setHeight] = useState('');
	const [width, setWidth] = useState('');
	const [depth, setDepth] = useState('');
	const [weight, setWeight] = useState('');
	const [material, setMaterial] = useState('');

	const isEditing = !!product;

	useEffect(() => {
		if (open) {
			if (product) {
				setName(product.name);
				setSku(product.sku || '');
				setDescription(product.description || '');
				setCategoryId(product.categoryId);
				setSupplierCost(product.supplierCost || '');
				setHeight(product.height || '');
				setWidth(product.width || '');
				setDepth(product.depth || '');
				setWeight(product.weight || '');
				setMaterial(product.material || '');
			} else {
				setName('');
				setSku('');
				setDescription('');
				setCategoryId(null);
				setSupplierCost('');
				setHeight('');
				setWidth('');
				setDepth('');
				setWeight('');
				setMaterial('');
			}
		}
	}, [open, product]);

	const handleSubmit = () => {
		onSubmit({
			supplierId,
			collectionId,
			name,
			sku: sku || null,
			description: description || null,
			categoryId: categoryId || null,
			supplierCost: supplierCost || null,
			height: height || null,
			width: width || null,
			depth: depth || null,
			weight: weight || null,
			material: material || null,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Edit Product' : 'Add Product'}</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the supplier product details.'
							: 'Add a new product to this collection.'}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">{error}</div>
				)}

				<FieldGroup>
					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="sp-name">Name</FieldLabel>
							<Input
								id="sp-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g., Black Granite Headstone"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="sp-sku">SKU</FieldLabel>
							<Input
								id="sp-sku"
								value={sku}
								onChange={(e) => setSku(e.target.value)}
								placeholder="e.g., BG-HS-001"
							/>
						</Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="sp-category">Category</FieldLabel>
							<Select
								value={categoryId || 'none'}
								onValueChange={(value) => setCategoryId(value === 'none' ? null : value)}
							>
								<SelectTrigger id="sp-category">
									<SelectValue placeholder="Select category" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No category</SelectItem>
									{categories.map((cat) => (
										<SelectItem key={cat.id} value={cat.id}>
											{cat.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="sp-cost">Supplier Cost</FieldLabel>
							<Input
								id="sp-cost"
								type="number"
								step="0.01"
								value={supplierCost}
								onChange={(e) => setSupplierCost(e.target.value)}
								placeholder="0.00"
							/>
						</Field>
					</div>

					<Field>
						<FieldLabel htmlFor="sp-material">Material</FieldLabel>
						<Input
							id="sp-material"
							value={material}
							onChange={(e) => setMaterial(e.target.value)}
							placeholder="e.g., Black Granite"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="sp-description">Description</FieldLabel>
						<Textarea
							id="sp-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional description"
							rows={3}
						/>
					</Field>

					<div className="grid grid-cols-4 gap-4">
						<Field>
							<FieldLabel htmlFor="sp-height">Height</FieldLabel>
							<Input
								id="sp-height"
								type="number"
								step="0.01"
								value={height}
								onChange={(e) => setHeight(e.target.value)}
								placeholder="0"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="sp-width">Width</FieldLabel>
							<Input
								id="sp-width"
								type="number"
								step="0.01"
								value={width}
								onChange={(e) => setWidth(e.target.value)}
								placeholder="0"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="sp-depth">Depth</FieldLabel>
							<Input
								id="sp-depth"
								type="number"
								step="0.01"
								value={depth}
								onChange={(e) => setDepth(e.target.value)}
								placeholder="0"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="sp-weight">Weight</FieldLabel>
							<Input
								id="sp-weight"
								type="number"
								step="0.01"
								value={weight}
								onChange={(e) => setWeight(e.target.value)}
								placeholder="0"
							/>
						</Field>
					</div>
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
