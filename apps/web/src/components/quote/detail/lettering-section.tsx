import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { InscriptionText } from '@/components/inscription-text';
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
import { Textarea } from '@/components/ui/textarea';
import { useFontsQuery } from '@/hooks/use-fonts';
import { useLetteringColorsQuery } from '@/hooks/use-lettering-colors';
import { useLetteringTechniquesQuery } from '@/hooks/use-lettering-techniques';
import type {
	QuoteLettering,
	QuoteOption,
	QuotePackageWithOptions,
	useAddLetteringMutation,
	useDeleteLetteringMutation,
	useUpdateLetteringMutation,
	useUpdateLetteringPricingMutation,
} from '@/hooks/use-quotes';
import { EditableNumber } from './editable-number';

export function LetteringSection({
	pkg,
	option,
	canEditPricing,
	formatCurrency,
	updateLetteringPricing,
	addLetteringMutation,
	updateLetteringMutation,
	deleteLetteringMutation,
}: {
	pkg: QuotePackageWithOptions;
	option: QuoteOption;
	canEditPricing: boolean;
	formatCurrency: (value: string | number) => string;
	updateLetteringPricing: ReturnType<typeof useUpdateLetteringPricingMutation>;
	addLetteringMutation: ReturnType<typeof useAddLetteringMutation>;
	updateLetteringMutation: ReturnType<typeof useUpdateLetteringMutation>;
	deleteLetteringMutation: ReturnType<typeof useDeleteLetteringMutation>;
}) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	// New lettering form state
	const [newTechniqueId, setNewTechniqueId] = useState('');
	const [newColorId, setNewColorId] = useState('');
	const [newFontId, setNewFontId] = useState('');
	const [newQuoteComponentId, setNewQuoteComponentId] = useState('');
	const [newPlacementDescription, setNewPlacementDescription] = useState('');
	const [newText, setNewText] = useState('');

	// Edit form state
	const [editTechniqueId, setEditTechniqueId] = useState('');
	const [editColorId, setEditColorId] = useState('');
	const [editFontId, setEditFontId] = useState('');
	const [editQuoteComponentId, setEditQuoteComponentId] = useState('');
	const [editPlacementDescription, setEditPlacementDescription] = useState('');
	const [editText, setEditText] = useState('');

	// Fetch techniques, colors, and fonts
	const { data: techniques } = useLetteringTechniquesQuery();
	const { data: colors } = useLetteringColorsQuery();
	const { data: fontsList } = useFontsQuery();

	const activeTechniques = techniques?.filter((t) => t.isActive) || [];
	const activeColors = colors?.filter((c) => c.isActive) || [];
	const activeFonts = fontsList?.filter((f) => f.isActive) || [];
	const componentOptions = option.components.map((component, index) => ({
		id: component.id,
		label: `Component ${index + 1}: ${component.componentType
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')}`,
	}));

	const handleAddLettering = async () => {
		if (!newText.trim()) return;

		await addLetteringMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			techniqueId: newTechniqueId || undefined,
			colorId: newColorId || undefined,
			fontId: newFontId || undefined,
			quoteComponentId: newQuoteComponentId || undefined,
			placementDescription: newPlacementDescription.trim() || undefined,
			text: newText.trim(),
		});

		// Reset form
		setNewTechniqueId('');
		setNewColorId('');
		setNewFontId('');
		setNewQuoteComponentId('');
		setNewPlacementDescription('');
		setNewText('');
		setShowAddForm(false);
	};

	const handleStartEdit = (lett: QuoteLettering) => {
		setEditingId(lett.id);
		setEditTechniqueId(lett.techniqueId || '');
		setEditColorId(lett.colorId || '');
		setEditFontId(lett.fontId || '');
		setEditQuoteComponentId(lett.quoteComponentId || '');
		setEditPlacementDescription(lett.placementDescription || '');
		setEditText(lett.text || '');
	};

	const handleSaveEdit = async (itemId: string) => {
		if (!editText.trim()) return;

		await updateLetteringMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			itemId,
			techniqueId: editTechniqueId || null,
			colorId: editColorId || null,
			fontId: editFontId || null,
			quoteComponentId: editQuoteComponentId || null,
			placementDescription: editPlacementDescription.trim() || null,
			text: editText.trim(),
		});

		setEditingId(null);
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditTechniqueId('');
		setEditColorId('');
		setEditFontId('');
		setEditQuoteComponentId('');
		setEditPlacementDescription('');
		setEditText('');
	};

	const handleDelete = async (itemId: string) => {
		await deleteLetteringMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			itemId,
		});
		setDeleteConfirmId(null);
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-3">
				<h4 className="font-medium">
					Lettering ({option.lettering.length} item{option.lettering.length !== 1 ? 's' : ''})
				</h4>
				{canEditPricing && !showAddForm && (
					<Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
						<Plus className="h-4 w-4 mr-1" />
						Add Lettering
					</Button>
				)}
			</div>

			{/* Add Lettering Form */}
			{showAddForm && canEditPricing && (
				<div className="border rounded-lg p-4 mb-4 bg-muted/50">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
						<div>
							<Label className="text-sm mb-1 block">Component</Label>
							<Select
								value={newQuoteComponentId || '_none'}
								onValueChange={(v) => setNewQuoteComponentId(v === '_none' ? '' : v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Not specified" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="_none">Not specified</SelectItem>
									{componentOptions.map((component) => (
										<SelectItem key={component.id} value={component.id}>
											{component.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-sm mb-1 block">Technique</Label>
							<Select
								value={newTechniqueId || '_none'}
								onValueChange={(v) => setNewTechniqueId(v === '_none' ? '' : v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Not specified" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="_none">Not specified</SelectItem>
									{activeTechniques.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											{t.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-sm mb-1 block">Color</Label>
							<Select
								value={newColorId || '_none'}
								onValueChange={(v) => setNewColorId(v === '_none' ? '' : v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select color" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="_none">No color</SelectItem>
									{activeColors.map((c) => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-sm mb-1 block">Font</Label>
							<Select
								value={newFontId || '_none'}
								onValueChange={(v) => setNewFontId(v === '_none' ? '' : v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Default font" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="_none">Default font</SelectItem>
									{activeFonts.map((f) => (
										<SelectItem key={f.id} value={f.id}>
											{f.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="md:col-span-3">
							<Label className="text-sm mb-1 block">Placement Description</Label>
							<Input
								value={newPlacementDescription}
								onChange={(e) => setNewPlacementDescription(e.target.value)}
								placeholder="Describe where the inscription should go"
							/>
						</div>
						<div className="md:col-span-3">
							<Label className="text-sm mb-1 block">
								Text * ({newText.replace(/\s/g, '').length} letters)
							</Label>
							<Textarea
								value={newText}
								onChange={(e) => setNewText(e.target.value)}
								placeholder="Enter inscription text..."
								rows={2}
							/>
						</div>
						{newText && newFontId && (
							<div className="md:col-span-3 border rounded p-3 bg-background">
								<Label className="text-xs text-muted-foreground mb-1 block">Preview</Label>
								<InscriptionText
									text={newText}
									fontId={newFontId}
									fontName={activeFonts.find((f) => f.id === newFontId)?.name}
									className="text-sm"
								/>
							</div>
						)}
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setShowAddForm(false);
								setNewTechniqueId('');
								setNewColorId('');
								setNewFontId('');
								setNewQuoteComponentId('');
								setNewPlacementDescription('');
								setNewText('');
							}}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleAddLettering}
							disabled={!newText.trim() || addLetteringMutation.isPending}
						>
							{addLetteringMutation.isPending ? (
								<Loader2 className="h-4 w-4 mr-1 animate-spin" />
							) : (
								<Plus className="h-4 w-4 mr-1" />
							)}
							Add
						</Button>
					</div>
				</div>
			)}

			{/* Empty state */}
			{option.lettering.length === 0 && !showAddForm && (
				<div className="border rounded-lg p-8 text-center text-muted-foreground border-dashed">
					No lettering items added yet.
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
			)}

			{/* Lettering Table */}
			{option.lettering.length > 0 && (
				<div className="border rounded-lg overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Component</TableHead>
								<TableHead>Technique</TableHead>
								<TableHead>Color</TableHead>
								<TableHead>Placement</TableHead>
								<TableHead>Text</TableHead>
								<TableHead className="text-center w-16">Letters</TableHead>
								<TableHead className="text-right w-28">Cost/Letter</TableHead>
								<TableHead className="text-center w-24">Markup</TableHead>
								<TableHead className="text-right w-24">Retail</TableHead>
								<TableHead className="text-right w-24">Total</TableHead>
								{canEditPricing && <TableHead className="w-[80px]"></TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{option.lettering.map((lett) => (
								<TableRow key={lett.id} className="[&_td]:py-3">
									{editingId === lett.id ? (
										// Edit mode
										<>
											<TableCell>
												<Select
													value={editQuoteComponentId || '_none'}
													onValueChange={(v) => setEditQuoteComponentId(v === '_none' ? '' : v)}
												>
													<SelectTrigger className="h-8">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="_none">Not specified</SelectItem>
														{componentOptions.map((component) => (
															<SelectItem key={component.id} value={component.id}>
																{component.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</TableCell>
											<TableCell>
												<Select
													value={editTechniqueId || '_none'}
													onValueChange={(v) => setEditTechniqueId(v === '_none' ? '' : v)}
												>
													<SelectTrigger className="h-8">
														<SelectValue placeholder="Not specified" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="_none">Not specified</SelectItem>
														{activeTechniques.map((t) => (
															<SelectItem key={t.id} value={t.id}>
																{t.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</TableCell>
											<TableCell>
												<Select
													value={editColorId || '_none'}
													onValueChange={(v) => setEditColorId(v === '_none' ? '' : v)}
												>
													<SelectTrigger className="h-8">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="_none">-</SelectItem>
														{activeColors.map((c) => (
															<SelectItem key={c.id} value={c.id}>
																{c.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</TableCell>
											<TableCell>
												<Input
													value={editPlacementDescription}
													onChange={(e) => setEditPlacementDescription(e.target.value)}
													className="h-8"
													placeholder="Placement"
												/>
											</TableCell>
											<TableCell>
												<div className="space-y-1">
													<Input
														value={editText}
														onChange={(e) => setEditText(e.target.value)}
														className="h-8"
													/>
													<Select
														value={editFontId || '_none'}
														onValueChange={(v) => setEditFontId(v === '_none' ? '' : v)}
													>
														<SelectTrigger className="h-7 text-xs">
															<SelectValue placeholder="Font" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="_none">Default font</SelectItem>
															{activeFonts.map((f) => (
																<SelectItem key={f.id} value={f.id}>
																	{f.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											</TableCell>
											<TableCell className="text-center">
												{editText.replace(/\s/g, '').length}
											</TableCell>
											<TableCell colSpan={4}></TableCell>
											<TableCell className="text-right">
												<div className="flex gap-1 justify-end">
													<Button
														variant="ghost"
														size="sm"
														onClick={handleCancelEdit}
														className="h-7 px-2"
													>
														<X className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSaveEdit(lett.id)}
														disabled={!editText.trim() || updateLetteringMutation.isPending}
														className="h-7 px-2"
													>
														{updateLetteringMutation.isPending ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Check className="h-4 w-4" />
														)}
													</Button>
												</div>
											</TableCell>
										</>
									) : (
										// Display mode
										<>
											<TableCell className="text-sm">
												{componentOptions.find(
													(component) => component.id === lett.quoteComponentId,
												)?.label || '-'}
											</TableCell>
											<TableCell className="font-medium">{lett.techniqueName || '-'}</TableCell>
											<TableCell>{lett.colorName || '-'}</TableCell>
											<TableCell className="max-w-[180px] truncate">
												{lett.placementDescription || '-'}
											</TableCell>
											<TableCell className="max-w-[200px] truncate">{lett.text || '-'}</TableCell>
											<TableCell className="text-center">{lett.letterCount}</TableCell>
											<TableCell className="text-right">
												<EditableNumber
													value={parseFloat(lett.supplierCost)}
													onSave={async (value) => {
														await updateLetteringPricing.mutateAsync({
															packageId: pkg.id,
															optionId: option.id,
															itemId: lett.id,
															supplierCost: value,
														});
													}}
													disabled={!canEditPricing}
													isCurrency
												/>
											</TableCell>
											<TableCell className="text-center text-muted-foreground text-sm">
												<EditableNumber
													value={parseFloat(lett.markupPercent)}
													onSave={async (value) => {
														await updateLetteringPricing.mutateAsync({
															packageId: pkg.id,
															optionId: option.id,
															itemId: lett.id,
															markupPercent: value,
														});
													}}
													disabled={!canEditPricing}
													min={0}
													align="center"
													formatValue={(val) => `${val.toFixed(0)}%`}
												/>
											</TableCell>
											<TableCell className="text-right">{formatCurrency(lett.unitPrice)}</TableCell>
											<TableCell className="text-right font-medium">
												{formatCurrency(lett.lineTotal)}
											</TableCell>
											{canEditPricing && (
												<TableCell>
													<div className="flex gap-1 justify-end">
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleStartEdit(lett)}
															className="h-8 w-8 p-0"
															title="Edit"
														>
															<Pencil className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => setDeleteConfirmId(lett.id)}
															className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-destructive transition-colors"
															title="Delete"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</TableCell>
											)}
										</>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteConfirmId !== null}
				onOpenChange={(open) => !open && setDeleteConfirmId(null)}
				onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
				title="Delete Lettering Item"
				description="Are you sure you want to delete this lettering item? This action cannot be undone."
				isLoading={deleteLetteringMutation.isPending}
			/>
		</div>
	);
}
