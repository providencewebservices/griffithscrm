import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useFinishesQuery } from '@/hooks/use-finishes';
import { useMaterialSectionsQuery } from '@/hooks/use-material-sections';
import { useMaterialsQuery } from '@/hooks/use-materials';
import type {
	useAddComponentMutation,
	useDeleteComponentMutation,
	useUpdateComponentPricingMutation,
	useUpdateProductPricingMutation,
} from '@/hooks/use-quotes';
import {
	formatComponentType,
	type QuoteOption,
	type QuotePackageWithOptions,
} from '@/hooks/use-quotes';
import { COMPONENT_TYPE_LABELS, COMPONENT_TYPES, getDimensionLabels } from '@/lib/product-utils';
import { EditableNumber } from './editable-number';

export function ComponentsSection({
	pkg,
	option,
	canEditPricing,
	formatCurrency,
	updateComponentPricing,
	updateProductPricing,
	addComponentMutation,
	deleteComponentMutation,
}: {
	pkg: QuotePackageWithOptions;
	option: QuoteOption;
	canEditPricing: boolean;
	formatCurrency: (value: string | number) => string;
	updateComponentPricing: ReturnType<typeof useUpdateComponentPricingMutation>;
	updateProductPricing: ReturnType<typeof useUpdateProductPricingMutation>;
	addComponentMutation: ReturnType<typeof useAddComponentMutation>;
	deleteComponentMutation: ReturnType<typeof useDeleteComponentMutation>;
}) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	// Form state
	const [componentType, setComponentType] = useState('');
	const [sectionId, setSectionId] = useState('');
	const [materialId, setMaterialId] = useState('');
	const [finishId, setFinishId] = useState('');
	const [height, setHeight] = useState('');
	const [width, setWidth] = useState('');
	const [depth, setDepth] = useState('');
	const [quantity, setQuantity] = useState('1');

	// Fetch reference data
	const { data: materialSections } = useMaterialSectionsQuery();
	const { data: allMaterials } = useMaterialsQuery();
	const { data: finishes } = useFinishesQuery();

	const activeMaterials =
		allMaterials?.filter((m) => m.isActive && (!sectionId || m.sectionId === sectionId)) || [];
	const activeFinishes = finishes?.filter((f) => f.isActive) || [];

	const dimensionLabels = getDimensionLabels(componentType || 'default');

	const resetForm = () => {
		setComponentType('');
		setSectionId('');
		setMaterialId('');
		setFinishId('');
		setHeight('');
		setWidth('');
		setDepth('');
		setQuantity('1');
		setShowAddForm(false);
	};

	const handleAdd = async () => {
		if (!componentType) return;

		await addComponentMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			componentType,
			materialId: materialId || null,
			finishId: finishId || null,
			height: height ? parseFloat(height) : null,
			width: width ? parseFloat(width) : null,
			depth: depth ? parseFloat(depth) : null,
			quantity: parseInt(quantity, 10) || 1,
		});

		resetForm();
	};

	const isProductPricing = option.productRetailPrice !== null;

	return (
		<>
			<div className="flex items-center justify-between mb-3">
				<h4 className="font-medium">Stone Components</h4>
				{canEditPricing && (
					<div className="flex items-center rounded-lg border overflow-hidden">
						<button
							type="button"
							className={`px-3 py-1.5 text-sm font-medium transition-colors ${
								!isProductPricing
									? 'bg-primary text-primary-foreground'
									: 'bg-background text-muted-foreground hover:bg-muted'
							}`}
							onClick={async () => {
								if (!isProductPricing) return;
								await updateProductPricing.mutateAsync({
									packageId: pkg.id,
									optionId: option.id,
									supplierCost: null,
									retailPrice: null,
								});
							}}
						>
							Price by components
						</button>
						<button
							type="button"
							className={`px-3 py-1.5 text-sm font-medium transition-colors ${
								isProductPricing
									? 'bg-primary text-primary-foreground'
									: 'bg-background text-muted-foreground hover:bg-muted'
							}`}
							onClick={async () => {
								if (isProductPricing) return;
								await updateProductPricing.mutateAsync({
									packageId: pkg.id,
									optionId: option.id,
									supplierCost: 0,
									retailPrice: 0,
								});
							}}
						>
							Product price
						</button>
					</div>
				)}
			</div>
			{isProductPricing ? (
				<div className="border rounded-lg p-6 space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium text-muted-foreground">Supplier Cost</span>
						<EditableNumber
							value={parseFloat(option.productSupplierCost ?? '0')}
							onSave={async (value) => {
								await updateProductPricing.mutateAsync({
									packageId: pkg.id,
									optionId: option.id,
									supplierCost: value,
									retailPrice: parseFloat(option.productRetailPrice ?? '0'),
								});
							}}
							disabled={!canEditPricing}
							isCurrency
						/>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium text-muted-foreground">Retail Price</span>
						<EditableNumber
							value={parseFloat(option.productRetailPrice ?? '0')}
							onSave={async (value) => {
								await updateProductPricing.mutateAsync({
									packageId: pkg.id,
									optionId: option.id,
									supplierCost: parseFloat(option.productSupplierCost ?? '0'),
									retailPrice: value,
								});
							}}
							disabled={!canEditPricing}
							isCurrency
						/>
					</div>
				</div>
			) : (
				<>
					{/* Add Component Button */}
					{canEditPricing && !showAddForm && (
						<div className="mb-3">
							<Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
								<Plus className="h-4 w-4 mr-1" />
								Add Component
							</Button>
						</div>
					)}

					{/* Add Component Form */}
					{showAddForm && canEditPricing && (
						<div className="border rounded-lg p-4 mb-4 bg-muted/50">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
								<div>
									<Label className="text-sm mb-1 block">Component Type *</Label>
									<Select value={componentType} onValueChange={setComponentType}>
										<SelectTrigger>
											<SelectValue placeholder="Select type" />
										</SelectTrigger>
										<SelectContent>
											{COMPONENT_TYPES.map((type) => (
												<SelectItem key={type} value={type}>
													{COMPONENT_TYPE_LABELS[type] || type}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label className="text-sm mb-1 block">Material Section</Label>
									<Select
										value={sectionId || '_none'}
										onValueChange={(v) => {
											setSectionId(v === '_none' ? '' : v);
											setMaterialId('');
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select section" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="_none">All sections</SelectItem>
											{materialSections?.map((s) => (
												<SelectItem key={s.id} value={s.id}>
													{s.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label className="text-sm mb-1 block">Material</Label>
									<Select
										value={materialId || '_none'}
										onValueChange={(v) => setMaterialId(v === '_none' ? '' : v)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select material" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="_none">No material</SelectItem>
											{activeMaterials.map((m) => (
												<SelectItem key={m.id} value={m.id}>
													{m.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label className="text-sm mb-1 block">Finish</Label>
									<Select
										value={finishId || '_none'}
										onValueChange={(v) => setFinishId(v === '_none' ? '' : v)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select finish" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="_none">No finish</SelectItem>
											{activeFinishes.map((f) => (
												<SelectItem key={f.id} value={f.id}>
													{f.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label className="text-sm mb-1 block">{dimensionLabels[0]}</Label>
									<Input
										type="number"
										value={height}
										onChange={(e) => setHeight(e.target.value)}
										placeholder={dimensionLabels[0]}
										min={0}
									/>
								</div>
								<div>
									<Label className="text-sm mb-1 block">{dimensionLabels[1]}</Label>
									<Input
										type="number"
										value={width}
										onChange={(e) => setWidth(e.target.value)}
										placeholder={dimensionLabels[1]}
										min={0}
									/>
								</div>
								<div>
									<Label className="text-sm mb-1 block">{dimensionLabels[2]}</Label>
									<Input
										type="number"
										value={depth}
										onChange={(e) => setDepth(e.target.value)}
										placeholder={dimensionLabels[2]}
										min={0}
									/>
								</div>
								<div>
									<Label className="text-sm mb-1 block">Quantity</Label>
									<Input
										type="number"
										value={quantity}
										onChange={(e) => setQuantity(e.target.value)}
										min={1}
									/>
								</div>
							</div>
							<div className="flex justify-end gap-2">
								<Button variant="outline" size="sm" onClick={resetForm}>
									Cancel
								</Button>
								<Button
									size="sm"
									onClick={handleAdd}
									disabled={!componentType || addComponentMutation.isPending}
								>
									{addComponentMutation.isPending ? (
										<Loader2 className="h-4 w-4 mr-1 animate-spin" />
									) : (
										<Plus className="h-4 w-4 mr-1" />
									)}
									Add
								</Button>
							</div>
						</div>
					)}

					{option.components.length > 0 ? (
						<div>
							<p className="text-sm text-muted-foreground mb-3">
								{option.components.length} item{option.components.length !== 1 ? 's' : ''}
							</p>
							<div className="border rounded-lg overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Type</TableHead>
											<TableHead>Material</TableHead>
											<TableHead>Dimensions</TableHead>
											<TableHead className="text-center">Qty</TableHead>
											<TableHead className="text-right">Supplier</TableHead>
											<TableHead className="text-center">Markup</TableHead>
											<TableHead className="text-right">Retail</TableHead>
											<TableHead className="text-right">Total</TableHead>
											{canEditPricing && <TableHead className="w-10"></TableHead>}
										</TableRow>
									</TableHeader>
									<TableBody>
										{option.components.map((comp) => (
											<TableRow key={comp.id} className="[&_td]:py-3">
												<TableCell className="font-medium">
													{formatComponentType(comp.componentType)}
												</TableCell>
												<TableCell>
													{comp.materialName || '-'}
													{comp.finishName && (
														<span className="text-muted-foreground text-xs block">
															{comp.finishName}
														</span>
													)}
												</TableCell>
												<TableCell className="text-sm">
													{comp.height && comp.width && comp.depth
														? `${comp.height}" × ${comp.width}" × ${comp.depth}"`
														: '-'}
												</TableCell>
												<TableCell className="text-center">{comp.quantity}</TableCell>
												<TableCell className="text-right">
													<EditableNumber
														value={parseFloat(comp.supplierCost)}
														onSave={async (value) => {
															await updateComponentPricing.mutateAsync({
																packageId: pkg.id,
																optionId: option.id,
																itemId: comp.id,
																supplierCost: value,
															});
														}}
														disabled={!canEditPricing}
														isCurrency
													/>
												</TableCell>
												<TableCell className="text-center text-muted-foreground text-sm">
													<EditableNumber
														value={parseFloat(comp.markupPercent)}
														onSave={async (value) => {
															await updateComponentPricing.mutateAsync({
																packageId: pkg.id,
																optionId: option.id,
																itemId: comp.id,
																markupPercent: value,
															});
														}}
														disabled={!canEditPricing}
														min={0}
														formatValue={(val) => `${val.toFixed(0)}%`}
													/>
												</TableCell>
												<TableCell className="text-right">
													{formatCurrency(comp.unitPrice)}
												</TableCell>
												<TableCell className="text-right font-medium">
													{formatCurrency(comp.lineTotal)}
												</TableCell>
												{canEditPricing && (
													<TableCell>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 text-muted-foreground hover:text-destructive"
															onClick={() => setDeletingId(comp.id)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</TableCell>
												)}
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					) : !showAddForm ? (
						<div className="border rounded-lg p-8 text-center text-muted-foreground border-dashed">
							No stone components added yet.
							{canEditPricing && (
								<>
									{' '}
									<Button
										variant="link"
										size="sm"
										className="p-0 h-auto"
										onClick={() => setShowAddForm(true)}
									>
										Add one now
									</Button>
								</>
							)}
						</div>
					) : null}
				</>
			)}

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={!!deletingId}
				onOpenChange={(open) => !open && setDeletingId(null)}
				onConfirm={async () => {
					if (!deletingId) return;
					await deleteComponentMutation.mutateAsync({
						packageId: pkg.id,
						optionId: option.id,
						itemId: deletingId,
					});
					setDeletingId(null);
				}}
				title="Delete Component"
				description="Are you sure you want to remove this component from the quote? This cannot be undone."
				isLoading={deleteComponentMutation.isPending}
			/>
		</>
	);
}
