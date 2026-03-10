import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { EditableNumber } from './editable-number';
import {
	Plus,
	Pencil,
	Trash2,
	Loader2,
	Check,
	X,
} from 'lucide-react';
import { InscriptionText } from '@/components/inscription-text';
import { useLetteringTechniquesQuery } from '@/hooks/use-lettering-techniques';
import { useLetteringColorsQuery } from '@/hooks/use-lettering-colors';
import { useFontsQuery } from '@/hooks/use-fonts';
import type {
	QuotePackageWithOptions,
	QuoteOption,
	QuoteLettering,
} from '@/hooks/use-quotes';
import type {
	useUpdateLetteringPricingMutation,
	useAddLetteringMutation,
	useUpdateLetteringMutation,
	useDeleteLetteringMutation,
} from '@/hooks/use-quotes';

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
	const [newText, setNewText] = useState('');

	// Edit form state
	const [editTechniqueId, setEditTechniqueId] = useState('');
	const [editColorId, setEditColorId] = useState('');
	const [editFontId, setEditFontId] = useState('');
	const [editText, setEditText] = useState('');

	// Fetch techniques, colors, and fonts
	const { data: techniques } = useLetteringTechniquesQuery();
	const { data: colors } = useLetteringColorsQuery();
	const { data: fontsList } = useFontsQuery();

	const activeTechniques = techniques?.filter((t) => t.isActive) || [];
	const activeColors = colors?.filter((c) => c.isActive) || [];
	const activeFonts = fontsList?.filter((f) => f.isActive) || [];

	const handleAddLettering = async () => {
		if (!newTechniqueId || !newText.trim()) return;

		await addLetteringMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			techniqueId: newTechniqueId,
			colorId: newColorId || undefined,
			fontId: newFontId || undefined,
			text: newText.trim(),
		});

		// Reset form
		setNewTechniqueId('');
		setNewColorId('');
		setNewFontId('');
		setNewText('');
		setShowAddForm(false);
	};

	const handleStartEdit = (lett: QuoteLettering) => {
		setEditingId(lett.id);
		setEditTechniqueId(lett.techniqueId || '');
		setEditColorId(lett.colorId || '');
		setEditFontId(lett.fontId || '');
		setEditText(lett.text || '');
	};

	const handleSaveEdit = async (itemId: string) => {
		if (!editTechniqueId || !editText.trim()) return;

		await updateLetteringMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			itemId,
			techniqueId: editTechniqueId,
			colorId: editColorId || null,
			fontId: editFontId || null,
			text: editText.trim(),
		});

		setEditingId(null);
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditTechniqueId('');
		setEditColorId('');
		setEditFontId('');
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
							<Label className="text-sm mb-1 block">Technique *</Label>
							<Select value={newTechniqueId} onValueChange={setNewTechniqueId}>
								<SelectTrigger>
									<SelectValue placeholder="Select technique" />
								</SelectTrigger>
								<SelectContent>
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
							<Select value={newColorId || '_none'} onValueChange={(v) => setNewColorId(v === '_none' ? '' : v)}>
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
							<Select value={newFontId || '_none'} onValueChange={(v) => setNewFontId(v === '_none' ? '' : v)}>
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
								setNewText('');
							}}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleAddLettering}
							disabled={!newTechniqueId || !newText.trim() || addLetteringMutation.isPending}
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
								<TableHead>Technique</TableHead>
								<TableHead>Color</TableHead>
								<TableHead>Text</TableHead>
								<TableHead className="text-center">Letters</TableHead>
								<TableHead className="text-right text-orange-600">Cost/Letter</TableHead>
								<TableHead className="text-center">Markup</TableHead>
								<TableHead className="text-right">Retail</TableHead>
								<TableHead className="text-right">Total</TableHead>
								{canEditPricing && <TableHead className="w-[80px]"></TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{option.lettering.map((lett) => (
								<TableRow key={lett.id}>
									{editingId === lett.id ? (
										// Edit mode
										<>
											<TableCell>
												<Select value={editTechniqueId} onValueChange={setEditTechniqueId}>
													<SelectTrigger className="h-8">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
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
												<div className="space-y-1">
													<Input
														value={editText}
														onChange={(e) => setEditText(e.target.value)}
														className="h-8"
													/>
													<Select value={editFontId || '_none'} onValueChange={(v) => setEditFontId(v === '_none' ? '' : v)}>
														<SelectTrigger className="h-7 text-xs">
															<SelectValue placeholder="Font" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="_none">Default font</SelectItem>
															{activeFonts.map((f) => (
																<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											</TableCell>
											<TableCell className="text-center">
												{editText.replace(/\s/g, '').length}
											</TableCell>
											<TableCell colSpan={3}></TableCell>
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
														disabled={!editTechniqueId || !editText.trim() || updateLetteringMutation.isPending}
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
											<TableCell className="font-medium">{lett.techniqueName || '-'}</TableCell>
											<TableCell>{lett.colorName || '-'}</TableCell>
											<TableCell className="max-w-[200px] truncate">{lett.text || '-'}</TableCell>
											<TableCell className="text-center">{lett.letterCount}</TableCell>
											<TableCell className="text-right text-orange-600">
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
													formatValue={(val) => `${val.toFixed(0)}%`}
												/>
											</TableCell>
											<TableCell className="text-right">{formatCurrency(lett.unitPrice)}</TableCell>
											<TableCell className="text-right font-medium">{formatCurrency(lett.lineTotal)}</TableCell>
											{canEditPricing && (
												<TableCell>
													<div className="flex gap-1 justify-end">
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleStartEdit(lett)}
															className="h-7 w-7 p-0"
															title="Edit"
														>
															<Pencil className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => setDeleteConfirmId(lett.id)}
															className="h-7 w-7 p-0 text-destructive hover:text-destructive"
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
