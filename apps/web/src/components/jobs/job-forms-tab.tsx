import { FORM_STATUSES } from '@griffiths-crm/shared/db/schema';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	useAddFormMutation,
	useDeleteFormMutation,
	useFormSuggestionsQuery,
	useJobFormsQuery,
	useUpdateFormMutation,
} from '@/hooks/use-job-forms';
import { formatCurrency, formatDate } from './types';

export function JobFormsTab({ jobId }: { jobId: string }) {
	const [newFormName, setNewFormName] = useState('');
	const [showFormSuggestions, setShowFormSuggestions] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [deletingForm, setDeletingForm] = useState<{ id: string; name: string } | null>(null);

	const { data: jobForms, isLoading: formsLoading } = useJobFormsQuery(jobId);
	const { data: formSuggestions } = useFormSuggestionsQuery();
	const addFormMutation = useAddFormMutation(jobId);
	const updateFormMutation = useUpdateFormMutation(jobId);
	const deleteFormMutation = useDeleteFormMutation(jobId);

	const handleDeleteForm = async () => {
		if (!deletingForm) return;
		try {
			await deleteFormMutation.mutateAsync(deletingForm.id);
			toast.success(`"${deletingForm.name}" removed`);
			setDeleteConfirmOpen(false);
			setDeletingForm(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete form');
		}
	};

	return (
		<div className="max-w-2xl space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Forms & Fees</CardTitle>
							<CardDescription>Track forms, applications and associated fees</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{formsLoading ? (
						<div className="text-muted-foreground flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading forms...
						</div>
					) : (
						<>
							{/* Form list */}
							{jobForms && jobForms.length > 0 ? (
								<div className="space-y-2">
									{jobForms.map((form) => (
										<div
											key={form.id}
											className="flex items-center gap-3 p-3 border rounded-lg"
										>
											{/* Name */}
											<div className="flex-1 min-w-0">
												<span className="font-medium text-sm">{form.name}</span>
												{form.referenceNumber && (
													<span className="text-xs text-muted-foreground ml-2">
														Ref: {form.referenceNumber}
													</span>
												)}
												<div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
													{form.submittedAt && (
														<span>Submitted: {formatDate(form.submittedAt)}</span>
													)}
													{form.approvedAt && (
														<span>Approved: {formatDate(form.approvedAt)}</span>
													)}
												</div>
											</div>

											{/* Status select */}
											<Select
												value={form.status}
												onValueChange={(value) => {
													const input: Record<string, unknown> = { status: value };
													if (value === 'submitted' && !form.submittedAt) {
														input.submittedAt = new Date().toISOString();
													}
													if (value === 'approved' && !form.approvedAt) {
														input.approvedAt = new Date().toISOString();
													}
													updateFormMutation.mutate(
														{ formId: form.id, input },
														{
															onError: (err) => toast.error(err.message),
														},
													);
												}}
											>
												<SelectTrigger className="w-36 h-8">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{FORM_STATUSES.map((status) => (
														<SelectItem key={status} value={status}>
															<div className="flex items-center gap-2">
																<div
																	className={`w-2 h-2 rounded-full ${
																		status === 'not_started'
																			? 'bg-gray-400'
																			: status === 'submitted'
																				? 'bg-blue-500'
																				: status === 'approved'
																					? 'bg-green-500'
																					: status === 'received'
																						? 'bg-green-500'
																						: 'bg-gray-400'
																	}`}
																/>
																{status
																	.split('_')
																	.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
																	.join(' ')}
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>

											{/* Fee input */}
											<div className="w-24">
												<Input
													type="number"
													step="0.01"
													placeholder="Fee"
													className="h-8 text-sm"
													defaultValue={form.fee || ''}
													onBlur={(e) => {
														const newFee = e.target.value || null;
														if (newFee !== form.fee) {
															updateFormMutation.mutate(
																{ formId: form.id, input: { fee: newFee } },
																{
																	onError: (err) => toast.error(err.message),
																},
															);
														}
													}}
												/>
											</div>

											{/* Delete */}
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													setDeletingForm({ id: form.id, name: form.name });
													setDeleteConfirmOpen(true);
												}}
												disabled={deleteFormMutation.isPending}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							) : (
								<div className="text-muted-foreground text-center py-6">
									No forms added yet.
								</div>
							)}

							{/* Total fees */}
							{jobForms && jobForms.length > 0 && (
								<div className="flex items-center justify-between pt-4 mt-4 border-t">
									<span className="font-medium text-sm">Total Fees</span>
									<span className="font-bold">
										{formatCurrency(
											jobForms.reduce((sum, f) => sum + (f.fee ? Number.parseFloat(f.fee) : 0), 0),
										)}
									</span>
								</div>
							)}

							{/* Quick-add form */}
							<div className="mt-4 pt-4 border-t">
								<div className="flex items-center gap-2 relative">
									<div className="flex-1 relative">
										<Input
											placeholder="Add a form (e.g., Faculty Application, Burial Rights)..."
											className="h-8"
											value={newFormName}
											onChange={(e) => {
												setNewFormName(e.target.value);
												setShowFormSuggestions(e.target.value.length > 0);
											}}
											onFocus={() => {
												if (newFormName.length > 0) setShowFormSuggestions(true);
											}}
											onBlur={() => {
												setTimeout(() => setShowFormSuggestions(false), 200);
											}}
											onKeyDown={(e) => {
												if (e.key === 'Enter' && newFormName.trim()) {
													addFormMutation.mutate(
														{ name: newFormName.trim() },
														{
															onSuccess: () => {
																toast.success('Form added');
																setNewFormName('');
																setShowFormSuggestions(false);
															},
															onError: (err) => toast.error(err.message),
														},
													);
												}
											}}
										/>
										{showFormSuggestions && formSuggestions && formSuggestions.length > 0 && (
											<div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-10 max-h-40 overflow-y-auto">
												{formSuggestions
													.filter((s) => s.toLowerCase().includes(newFormName.toLowerCase()))
													.map((suggestion) => (
														<button
															key={suggestion}
															type="button"
															className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
															onMouseDown={(e) => e.preventDefault()}
															onClick={() => {
																setNewFormName(suggestion);
																setShowFormSuggestions(false);
															}}
														>
															{suggestion}
														</button>
													))}
											</div>
										)}
									</div>
									<Button
										size="sm"
										disabled={!newFormName.trim() || addFormMutation.isPending}
										onClick={() => {
											addFormMutation.mutate(
												{ name: newFormName.trim() },
												{
													onSuccess: () => {
														toast.success('Form added');
														setNewFormName('');
													},
													onError: (err) => toast.error(err.message),
												},
											);
										}}
									>
										{addFormMutation.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Plus className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<DeleteConfirmDialog
				open={deleteConfirmOpen}
				onOpenChange={setDeleteConfirmOpen}
				onConfirm={handleDeleteForm}
				title="Remove Form"
				description={`Are you sure you want to remove "${deletingForm?.name || ''}"? This action cannot be undone.`}
				isLoading={deleteFormMutation.isPending}
			/>
		</div>
	);
}
