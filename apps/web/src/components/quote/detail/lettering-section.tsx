import { Loader2, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
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

type ComponentOption = { id: string; label: string };

type SheetState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; item: QuoteLettering };

const countLetters = (text: string) => text.replace(/\s/g, '').length;

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
	const [sheet, setSheet] = useState<SheetState>({ mode: 'closed' });
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	const { data: techniques } = useLetteringTechniquesQuery();
	const { data: colors } = useLetteringColorsQuery();
	const { data: fontsList } = useFontsQuery();

	const activeTechniques = techniques?.filter((t) => t.isActive) || [];
	const activeColors = colors?.filter((c) => c.isActive) || [];
	const activeFonts = fontsList?.filter((f) => f.isActive) || [];

	const componentOptions: ComponentOption[] = option.components.map((component, index) => ({
		id: component.id,
		label: `Component ${index + 1}: ${component.componentType
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')}`,
	}));

	const handleDelete = async (itemId: string) => {
		await deleteLetteringMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			itemId,
		});
		setDeleteConfirmId(null);
	};

	return (
		<div id="quote-blocker-lettering" className="scroll-mt-24">
			<div className="flex items-center justify-between mb-3">
				<h4 className="font-medium">
					Lettering ({option.lettering.length} item{option.lettering.length !== 1 ? 's' : ''})
				</h4>
				{canEditPricing && (
					<Button variant="outline" size="sm" onClick={() => setSheet({ mode: 'add' })}>
						<Plus className="size-4 mr-1" />
						Add Lettering
					</Button>
				)}
			</div>

			{option.lettering.length === 0 ? (
				<div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
					No lettering items added yet.
				</div>
			) : (
				<div className="space-y-3">
					{option.lettering.map((lett) => (
						<LetteringCard
							key={lett.id}
							lett={lett}
							pkg={pkg}
							option={option}
							componentOptions={componentOptions}
							canEditPricing={canEditPricing}
							formatCurrency={formatCurrency}
							updateLetteringPricing={updateLetteringPricing}
							onEdit={() => setSheet({ mode: 'edit', item: lett })}
							onDelete={() => setDeleteConfirmId(lett.id)}
						/>
					))}
				</div>
			)}

			<LetteringFormSheet
				state={sheet}
				onClose={() => setSheet({ mode: 'closed' })}
				componentOptions={componentOptions}
				techniques={activeTechniques}
				colors={activeColors}
				fonts={activeFonts}
				onSubmitAdd={async (values) => {
					await addLetteringMutation.mutateAsync({
						packageId: pkg.id,
						optionId: option.id,
						...values,
					});
				}}
				onSubmitEdit={async (itemId, values) => {
					await updateLetteringMutation.mutateAsync({
						packageId: pkg.id,
						optionId: option.id,
						itemId,
						techniqueId: values.techniqueId ?? null,
						colorId: values.colorId ?? null,
						fontId: values.fontId ?? null,
						quoteComponentId: values.quoteComponentId ?? null,
						placementDescription: values.placementDescription ?? null,
						text: values.text,
					});
				}}
				isAddPending={addLetteringMutation.isPending}
				isEditPending={updateLetteringMutation.isPending}
			/>

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

function LetteringCard({
	lett,
	pkg,
	option,
	componentOptions,
	canEditPricing,
	formatCurrency,
	updateLetteringPricing,
	onEdit,
	onDelete,
}: {
	lett: QuoteLettering;
	pkg: QuotePackageWithOptions;
	option: QuoteOption;
	componentOptions: ComponentOption[];
	canEditPricing: boolean;
	formatCurrency: (value: string | number) => string;
	updateLetteringPricing: ReturnType<typeof useUpdateLetteringPricingMutation>;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const componentLabel = componentOptions.find((c) => c.id === lett.quoteComponentId)?.label;
	const metaParts = [
		componentLabel,
		lett.techniqueName,
		lett.colorName,
		lett.fontName && `${lett.fontName} font`,
		lett.placementDescription,
	].filter(Boolean) as string[];

	const hasTechnique = Boolean(lett.techniqueId);

	return (
		<div className="group border rounded-lg bg-card overflow-hidden">
			<div className="grid grid-cols-1 md:grid-cols-[1fr_280px] divide-y md:divide-y-0 md:divide-x divide-border/60">
				{/* Proof panel */}
				<div className="relative p-6 bg-muted/30">
					{canEditPricing && (
						<div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-8"
								onClick={onEdit}
								aria-label="Edit lettering"
							>
								<Pencil className="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-8 text-destructive hover:text-destructive"
								onClick={onDelete}
								aria-label="Delete lettering"
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
					)}

					<InscriptionText
						text={lett.text || ''}
						fontId={lett.fontId}
						fontName={lett.fontName}
						placeholder="(no inscription text)"
						className="text-xl sm:text-2xl leading-8 tracking-wide text-balance"
					/>

					{metaParts.length > 0 && (
						<p className="mt-4 text-center text-xs text-muted-foreground">
							{metaParts.join(' · ')}
						</p>
					)}
				</div>

				{/* Pricing panel */}
				<div className="p-4 flex flex-col gap-3 text-sm">
					{!hasTechnique && (
						<button
							type="button"
							onClick={canEditPricing ? onEdit : undefined}
							disabled={!canEditPricing}
							className="flex items-center gap-1.5 text-amber-700 hover:text-amber-800 disabled:hover:text-amber-700 disabled:cursor-default text-xs font-medium -mx-1 px-1 py-0.5 rounded"
						>
							<TriangleAlert className="size-3.5 shrink-0" />
							<span>{canEditPricing ? 'Set technique to price' : 'No technique set'}</span>
						</button>
					)}

					<dl className="space-y-2">
						<div className="flex items-baseline justify-between gap-2">
							<dt className="text-muted-foreground">Letters</dt>
							<dd className="tabular-nums font-medium">{lett.letterCount}</dd>
						</div>
						<div className="flex items-baseline justify-between gap-2">
							<dt className="text-muted-foreground">Cost / letter</dt>
							<dd className="tabular-nums">
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
							</dd>
						</div>
						<div className="flex items-baseline justify-between gap-2">
							<dt className="text-muted-foreground">Markup</dt>
							<dd className="tabular-nums">
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
							</dd>
						</div>
						<div className="flex items-baseline justify-between gap-2">
							<dt className="text-muted-foreground">Retail / letter</dt>
							<dd className="tabular-nums text-muted-foreground">
								{formatCurrency(lett.unitPrice)}
							</dd>
						</div>
					</dl>

					<div className="flex items-baseline justify-between gap-2 pt-3 border-t border-border/60">
						<span className="font-medium">Total</span>
						<span className="tabular-nums font-semibold text-base">
							{formatCurrency(lett.lineTotal)}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

type FormValues = {
	text: string;
	techniqueId?: string;
	colorId?: string;
	fontId?: string;
	quoteComponentId?: string;
	placementDescription?: string;
};

function LetteringFormSheet({
	state,
	onClose,
	componentOptions,
	techniques,
	colors,
	fonts,
	onSubmitAdd,
	onSubmitEdit,
	isAddPending,
	isEditPending,
}: {
	state: SheetState;
	onClose: () => void;
	componentOptions: ComponentOption[];
	techniques: { id: string; name: string; isActive: boolean }[];
	colors: { id: string; name: string; isActive: boolean }[];
	fonts: { id: string; name: string; isActive: boolean }[];
	onSubmitAdd: (values: FormValues) => Promise<void>;
	onSubmitEdit: (itemId: string, values: FormValues) => Promise<void>;
	isAddPending: boolean;
	isEditPending: boolean;
}) {
	const open = state.mode !== 'closed';
	const isEdit = state.mode === 'edit';
	const editingItem = state.mode === 'edit' ? state.item : null;

	const [text, setText] = useState('');
	const [techniqueId, setTechniqueId] = useState('');
	const [colorId, setColorId] = useState('');
	const [fontId, setFontId] = useState('');
	const [quoteComponentId, setQuoteComponentId] = useState('');
	const [placementDescription, setPlacementDescription] = useState('');

	// Reset form when the sheet opens with new state
	useEffect(() => {
		if (state.mode === 'add') {
			setText('');
			setTechniqueId('');
			setColorId('');
			setFontId('');
			setQuoteComponentId('');
			setPlacementDescription('');
		} else if (state.mode === 'edit') {
			setText(state.item.text || '');
			setTechniqueId(state.item.techniqueId || '');
			setColorId(state.item.colorId || '');
			setFontId(state.item.fontId || '');
			setQuoteComponentId(state.item.quoteComponentId || '');
			setPlacementDescription(state.item.placementDescription || '');
		}
	}, [state]);

	const selectedFont = fonts.find((f) => f.id === fontId);
	const letterCount = countLetters(text);
	const isPending = isEdit ? isEditPending : isAddPending;
	const canSubmit = text.trim().length > 0 && !isPending;

	const handleSubmit = async () => {
		if (!canSubmit) return;
		const values: FormValues = {
			text: text.trim(),
			techniqueId: techniqueId || undefined,
			colorId: colorId || undefined,
			fontId: fontId || undefined,
			quoteComponentId: quoteComponentId || undefined,
			placementDescription: placementDescription.trim() || undefined,
		};
		if (isEdit && editingItem) {
			await onSubmitEdit(editingItem.id, values);
		} else {
			await onSubmitAdd(values);
		}
		onClose();
	};

	return (
		<Sheet open={open} onOpenChange={(next) => !next && onClose()}>
			<SheetContent className="w-full sm:max-w-xl p-0 gap-0">
				<SheetHeader className="border-b">
					<SheetTitle>{isEdit ? 'Edit lettering' : 'Add lettering'}</SheetTitle>
					<SheetDescription>
						Preview shows the inscription as it will appear on the memorial.
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto">
					{/* Live proof preview */}
					<div className="bg-muted/40 border-b px-6 py-8">
						<p className="text-[10px] uppercase tracking-wide text-muted-foreground text-center mb-3">
							Preview
						</p>
						<InscriptionText
							text={text}
							fontId={fontId || null}
							fontName={selectedFont?.name || null}
							placeholder="Type the inscription below…"
							className="text-xl sm:text-2xl leading-8 tracking-wide text-balance min-h-24"
						/>
						<p className="mt-4 text-center text-xs text-muted-foreground tabular-nums">
							{letterCount} letter{letterCount !== 1 ? 's' : ''}
							{selectedFont ? ` · ${selectedFont.name}` : ' · Default font'}
						</p>
					</div>

					{/* Form fields */}
					<div className="p-6 space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="lettering-text">
								Inscription text <span className="text-destructive">*</span>
							</Label>
							<Textarea
								id="lettering-text"
								value={text}
								onChange={(e) => setText(e.target.value)}
								placeholder="Enter inscription text (line breaks will be preserved)…"
								rows={4}
								className="font-serif"
							/>
							<p className="text-xs text-muted-foreground">
								Press Enter to add line breaks exactly as they should appear on the memorial.
							</p>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label htmlFor="lettering-technique">Technique</Label>
								<Select
									value={techniqueId || '_none'}
									onValueChange={(v) => setTechniqueId(v === '_none' ? '' : v)}
								>
									<SelectTrigger id="lettering-technique">
										<SelectValue placeholder="Not specified" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="_none">Not specified</SelectItem>
										{techniques.map((t) => (
											<SelectItem key={t.id} value={t.id}>
												{t.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="lettering-color">Color</Label>
								<Select
									value={colorId || '_none'}
									onValueChange={(v) => setColorId(v === '_none' ? '' : v)}
								>
									<SelectTrigger id="lettering-color">
										<SelectValue placeholder="No color" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="_none">No color</SelectItem>
										{colors.map((c) => (
											<SelectItem key={c.id} value={c.id}>
												{c.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="lettering-font">Font</Label>
								<Select
									value={fontId || '_none'}
									onValueChange={(v) => setFontId(v === '_none' ? '' : v)}
								>
									<SelectTrigger id="lettering-font">
										<SelectValue placeholder="Default font" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="_none">Default font</SelectItem>
										{fonts.map((f) => (
											<SelectItem key={f.id} value={f.id}>
												{f.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="lettering-component">Component</Label>
								<Select
									value={quoteComponentId || '_none'}
									onValueChange={(v) => setQuoteComponentId(v === '_none' ? '' : v)}
								>
									<SelectTrigger id="lettering-component">
										<SelectValue placeholder="Not specified" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="_none">Not specified</SelectItem>
										{componentOptions.map((c) => (
											<SelectItem key={c.id} value={c.id}>
												{c.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="lettering-placement">Placement</Label>
							<Input
								id="lettering-placement"
								value={placementDescription}
								onChange={(e) => setPlacementDescription(e.target.value)}
								placeholder="e.g. Front face, centered below name"
							/>
						</div>

						{!techniqueId && (
							<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
								<TriangleAlert className="size-4 shrink-0 mt-0.5" />
								<p>Without a technique, this lettering item can't be priced.</p>
							</div>
						)}
					</div>
				</div>

				<SheetFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
						Cancel
					</Button>
					<Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
						{isPending ? (
							<Loader2 className="size-4 mr-1 animate-spin" />
						) : (
							<Plus className="size-4 mr-1" />
						)}
						{isEdit ? 'Save changes' : 'Add lettering'}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
