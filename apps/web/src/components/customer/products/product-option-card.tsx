import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { ChoiceFormDialog } from './choice-form-dialog';
import { OptionFormDialog } from './option-form-dialog';
import {
	useUpdateProductOptionMutation,
	useDeleteProductOptionMutation,
	type ProductOption,
	type ProductOptionType,
} from '@/hooks/use-product-options';
import {
	useCreateOptionChoiceMutation,
	useUpdateOptionChoiceMutation,
	useDeleteOptionChoiceMutation,
	type OptionChoice,
} from '@/hooks/use-option-choices';
import { useSignedUrls } from '@/hooks/use-uploads';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, ImageIcon } from 'lucide-react';
import { formatPriceAdjustment } from '@/lib/product-utils';

const OPTION_TYPE_LABELS: Record<ProductOptionType, string> = {
	dimension: 'Dimension',
	stone_color: 'Stone Color',
	flower_holes: 'Flower Holes',
	custom: 'Custom',
};

type ProductOptionCardProps = {
	option: ProductOption;
	defaultOpen?: boolean;
};

export function ProductOptionCard({ option, defaultOpen = false }: ProductOptionCardProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [choiceFormOpen, setChoiceFormOpen] = useState(false);
	const [selectedChoice, setSelectedChoice] = useState<OptionChoice | null>(null);
	const [deleteChoiceDialogOpen, setDeleteChoiceDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const choiceImageUrls = option.choices?.map((c) => c.imageUrl) || [];
	const { data: signedChoiceImages } = useSignedUrls(choiceImageUrls);

	const updateOptionMutation = useUpdateProductOptionMutation();
	const deleteOptionMutation = useDeleteProductOptionMutation();
	const createChoiceMutation = useCreateOptionChoiceMutation();
	const updateChoiceMutation = useUpdateOptionChoiceMutation();
	const deleteChoiceMutation = useDeleteOptionChoiceMutation();

	const handleEditOption = async (data: {
		name: string;
		type: ProductOptionType;
		isRequired: boolean;
	}) => {
		setMutationError(null);
		try {
			await updateOptionMutation.mutateAsync({ id: option.id, ...data });
			setEditDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteOption = async () => {
		try {
			await deleteOptionMutation.mutateAsync(option.id);
			setDeleteDialogOpen(false);
		} catch (err) {
			// Error handled by mutation
		}
	};

	const handleAddChoice = () => {
		setSelectedChoice(null);
		setMutationError(null);
		setChoiceFormOpen(true);
	};

	const handleEditChoice = (choice: OptionChoice) => {
		setSelectedChoice(choice);
		setMutationError(null);
		setChoiceFormOpen(true);
	};

	const handleChoiceSubmit = async (data: {
		name: string;
		priceAdjustment: number;
		imageUrl?: string | null;
	}) => {
		setMutationError(null);
		try {
			if (selectedChoice) {
				await updateChoiceMutation.mutateAsync({ id: selectedChoice.id, ...data });
			} else {
				await createChoiceMutation.mutateAsync({ optionId: option.id, ...data });
			}
			setChoiceFormOpen(false);
			setSelectedChoice(null);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteChoice = (choice: OptionChoice) => {
		setSelectedChoice(choice);
		setDeleteChoiceDialogOpen(true);
	};

	const handleDeleteChoiceConfirm = async () => {
		if (!selectedChoice) return;
		try {
			await deleteChoiceMutation.mutateAsync(selectedChoice.id);
			setDeleteChoiceDialogOpen(false);
			setSelectedChoice(null);
		} catch (err) {
			// Error handled by mutation
		}
	};

	return (
		<>
			<div className="border rounded-lg">
				<Collapsible open={isOpen} onOpenChange={setIsOpen}>
					<div className="flex items-center justify-between p-4 bg-muted/30">
						<CollapsibleTrigger asChild>
							<button className="flex items-center gap-2 text-left flex-1">
								{isOpen ? (
									<ChevronDown className="h-4 w-4" />
								) : (
									<ChevronRight className="h-4 w-4" />
								)}
								<span className="font-medium">{option.name}</span>
								<Badge variant="outline" className="ml-2">
									{OPTION_TYPE_LABELS[option.type]}
								</Badge>
								{option.isRequired && (
									<Badge variant="secondary" className="ml-1">
										Required
									</Badge>
								)}
								<span className="text-sm text-muted-foreground ml-2">
									({option.choices.length} choice{option.choices.length !== 1 ? 's' : ''})
								</span>
							</button>
						</CollapsibleTrigger>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon-sm">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
									Edit Option
								</DropdownMenuItem>
								<DropdownMenuItem
									className="text-destructive"
									onClick={() => setDeleteDialogOpen(true)}
								>
									Delete Option
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					<CollapsibleContent>
						<div className="p-4 pt-0">
							{option.choices.length === 0 ? (
								<div className="text-center py-6 text-muted-foreground border rounded-lg mt-4">
									No choices yet. Add choices to make this option available.
								</div>
							) : (
								<div className="border rounded-lg mt-4">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-[50px]">Image</TableHead>
												<TableHead>Name</TableHead>
												<TableHead>Price Adj.</TableHead>
												{option.type !== 'flower_holes' && (
													<TableHead className="w-[70px]"></TableHead>
												)}
											</TableRow>
										</TableHeader>
										<TableBody>
											{option.choices.map((choice) => (
												<TableRow key={choice.id}>
													<TableCell>
														{choice.imageUrl ? (
															<img
																src={
																	(signedChoiceImages?.get(choice.imageUrl)) ||
																	choice.imageUrl
																}
																alt={choice.name}
																className="w-8 h-8 object-cover rounded"
															/>
														) : (
															<div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
																<ImageIcon className="w-3 h-3 text-muted-foreground" />
															</div>
														)}
													</TableCell>
													<TableCell className="font-medium">
														{choice.name}
													</TableCell>
													<TableCell>{formatPriceAdjustment(choice.priceAdjustment)}</TableCell>
													{option.type !== 'flower_holes' && (
													<TableCell>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button variant="ghost" size="icon-sm">
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem
																	onClick={() => handleEditChoice(choice)}
																>
																	Edit
																</DropdownMenuItem>
																<DropdownMenuItem
																	className="text-destructive"
																	onClick={() => handleDeleteChoice(choice)}
																>
																	Delete
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												)}
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}

							{option.type !== 'flower_holes' && (
								<div className="mt-4">
									<Button variant="outline" size="sm" onClick={handleAddChoice}>
										<Plus className="h-4 w-4 mr-2" />
										Add Choice
									</Button>
								</div>
							)}
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>

			{/* Edit Option Dialog */}
			<OptionFormDialog
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				onSubmit={handleEditOption}
				option={option}
				isLoading={updateOptionMutation.isPending}
				error={mutationError}
			/>

			{/* Delete Option Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteOption}
				title="Delete Option"
				description={`Are you sure you want to delete "${option.name}"? This will also delete all choices. This action cannot be undone.`}
				isLoading={deleteOptionMutation.isPending}
			/>

			{/* Choice Form Dialog */}
			<ChoiceFormDialog
				open={choiceFormOpen}
				onOpenChange={setChoiceFormOpen}
				onSubmit={handleChoiceSubmit}
				choice={selectedChoice}
				isLoading={createChoiceMutation.isPending || updateChoiceMutation.isPending}
				error={mutationError}
			/>

			{/* Delete Choice Dialog */}
			<DeleteConfirmDialog
				open={deleteChoiceDialogOpen}
				onOpenChange={setDeleteChoiceDialogOpen}
				onConfirm={handleDeleteChoiceConfirm}
				title="Delete Choice"
				description={`Are you sure you want to delete "${selectedChoice?.name}"? This action cannot be undone.`}
				isLoading={deleteChoiceMutation.isPending}
			/>
		</>
	);
}
