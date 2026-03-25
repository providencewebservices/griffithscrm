import {
	AlertCircle,
	Calendar,
	Check,
	CreditCard,
	Link2,
	Loader2,
	Plus,
	Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	type PaymentScheduleItem,
	useCreatePaymentScheduleItemMutation,
	useDeletePaymentScheduleItemMutation,
	useGeneratePaymentLinkMutation,
	usePaymentScheduleQuery,
	useUpdatePaymentScheduleItemMutation,
} from '@/hooks/use-jobs';
import { formatCurrency, formatDate } from './types';

function isPaymentOverdue(item: PaymentScheduleItem): boolean {
	if (!item.dueDate) return false;
	const paidAmount = Number.parseFloat(item.paidAmount);
	const amount = Number.parseFloat(item.amount);
	if (paidAmount >= amount) return false;
	return new Date(item.dueDate) < new Date();
}

function isPaymentPaid(item: PaymentScheduleItem): boolean {
	const paidAmount = Number.parseFloat(item.paidAmount);
	const amount = Number.parseFloat(item.amount);
	return paidAmount >= amount;
}

export function JobPaymentsTab({ jobId }: { jobId: string }) {
	const [showAddPayment, setShowAddPayment] = useState(false);
	const [newPaymentDescription, setNewPaymentDescription] = useState('');
	const [newPaymentAmount, setNewPaymentAmount] = useState('');
	const [newPaymentDueDate, setNewPaymentDueDate] = useState('');
	const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
	const [editingDueDate, setEditingDueDate] = useState('');
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

	const { data: paymentData, isLoading: paymentLoading } = usePaymentScheduleQuery(jobId);
	const createPaymentMutation = useCreatePaymentScheduleItemMutation();
	const updatePaymentMutation = useUpdatePaymentScheduleItemMutation();
	const deletePaymentMutation = useDeletePaymentScheduleItemMutation();
	const generateLinkMutation = useGeneratePaymentLinkMutation();

	const handleAddPayment = async () => {
		if (!newPaymentDescription || !newPaymentAmount) return;
		try {
			await createPaymentMutation.mutateAsync({
				jobId,
				input: {
					description: newPaymentDescription,
					amount: newPaymentAmount,
					dueDate: newPaymentDueDate || null,
				},
			});
			setShowAddPayment(false);
			setNewPaymentDescription('');
			setNewPaymentAmount('');
			setNewPaymentDueDate('');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add payment');
		}
	};

	const handleMarkAsPaid = async (item: PaymentScheduleItem) => {
		try {
			await updatePaymentMutation.mutateAsync({
				jobId,
				itemId: item.id,
				input: {
					paidAmount: item.amount,
					paidAt: new Date().toISOString(),
					paymentMethod: 'manual',
				},
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to mark as paid');
		}
	};

	const handleUpdateDueDate = async (itemId: string) => {
		try {
			await updatePaymentMutation.mutateAsync({
				jobId,
				itemId,
				input: { dueDate: editingDueDate || null },
			});
			setEditingPaymentId(null);
			setEditingDueDate('');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update due date');
		}
	};

	const handleDeletePayment = async () => {
		if (!deletingPaymentId) return;
		try {
			await deletePaymentMutation.mutateAsync({ jobId, itemId: deletingPaymentId });
			setDeleteConfirmOpen(false);
			setDeletingPaymentId(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete payment');
		}
	};

	const handleGeneratePaymentLink = async (milestoneId: string) => {
		try {
			const result = await generateLinkMutation.mutateAsync(milestoneId);
			await navigator.clipboard.writeText(result.paymentUrl);
			toast.success('Payment link copied to clipboard!');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to generate payment link');
		}
	};

	return (
		<div className="max-w-2xl space-y-6">
			{/* Payment Schedule Items */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Payment Schedule</CardTitle>
							<CardDescription>Track payments for this job</CardDescription>
						</div>
						<Button variant="outline" size="sm" onClick={() => setShowAddPayment(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Add Payment
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{paymentLoading ? (
						<div className="text-muted-foreground flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading payment schedule...
						</div>
					) : paymentData?.paymentSchedule.length === 0 ? (
						<div className="text-muted-foreground text-center py-8">
							No payment schedule items yet.
						</div>
					) : (
						<div className="space-y-3">
							{paymentData?.paymentSchedule.map((item) => {
								const isPaid = isPaymentPaid(item);
								const isOverdue = isPaymentOverdue(item);
								const isEditing = editingPaymentId === item.id;

								return (
									<div
										key={item.id}
										className={`border rounded-lg p-4 ${isPaid ? 'bg-green-50 border-green-200' : isOverdue ? 'bg-red-50 border-red-200' : ''}`}
									>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="font-medium">{item.description}</span>
													{isPaid && (
														<Badge variant="default" className="bg-green-600">
															<Check className="h-3 w-3 mr-1" />
															Paid
														</Badge>
													)}
													{isOverdue && (
														<Badge variant="destructive">
															<AlertCircle className="h-3 w-3 mr-1" />
															Overdue
														</Badge>
													)}
												</div>
												<div className="text-lg font-bold mt-1">
													{formatCurrency(item.amount)}
												</div>
												<div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
													{isEditing ? (
														<div className="flex items-center gap-2">
															<Calendar className="h-4 w-4" />
															<Input
																type="date"
																value={editingDueDate}
																onChange={(e) => setEditingDueDate(e.target.value)}
																className="w-40 h-8"
															/>
															<Button
																size="sm"
																variant="outline"
																onClick={() => handleUpdateDueDate(item.id)}
																disabled={updatePaymentMutation.isPending}
															>
																Save
															</Button>
															<Button
																size="sm"
																variant="ghost"
																onClick={() => {
																	setEditingPaymentId(null);
																	setEditingDueDate('');
																}}
															>
																Cancel
															</Button>
														</div>
													) : (
														<div className="flex items-center gap-1">
															<Calendar className="h-4 w-4" />
															{item.dueDate ? (
																<span>Due: {formatDate(item.dueDate)}</span>
															) : (
																<span className="italic">No due date set</span>
															)}
															{!isPaid && (
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-6 px-2 ml-1"
																	onClick={() => {
																		setEditingPaymentId(item.id);
																		setEditingDueDate(
																			item.dueDate ? item.dueDate.split('T')[0] : '',
																		);
																	}}
																>
																	Edit
																</Button>
															)}
														</div>
													)}
													{isPaid && item.paidAt && (
														<span>Paid: {formatDate(item.paidAt)}</span>
													)}
													{isPaid && item.cardLastFour && (
														<span className="flex items-center gap-1">
															<CreditCard className="h-3.5 w-3.5" />
															****{item.cardLastFour}
														</span>
													)}
												</div>
											</div>
											<div className="flex items-center gap-2">
												{!isPaid && (
													<>
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleGeneratePaymentLink(item.id)}
															disabled={generateLinkMutation.isPending}
															title="Copy payment link"
														>
															{generateLinkMutation.isPending ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<>
																	<Link2 className="h-4 w-4 mr-1" />
																	Payment Link
																</>
															)}
														</Button>
														<Button
															onClick={() => handleMarkAsPaid(item)}
															disabled={updatePaymentMutation.isPending}
															size="sm"
														>
															{updatePaymentMutation.isPending ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<>
																	<Check className="h-4 w-4 mr-1" />
																	Mark Paid
																</>
															)}
														</Button>
													</>
												)}
												{item.description !== 'Deposit' && item.description !== 'Balance' && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => {
															setDeletingPaymentId(item.id);
															setDeleteConfirmOpen(true);
														}}
														disabled={deletePaymentMutation.isPending}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* Add Payment Form */}
					{showAddPayment && (
						<div className="mt-4 border rounded-lg p-4 bg-muted/50">
							<h4 className="font-medium mb-3">Add Payment Item</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div>
									<label className="text-sm text-muted-foreground">Description</label>
									<Input
										placeholder="e.g., Installment 2"
										value={newPaymentDescription}
										onChange={(e) => setNewPaymentDescription(e.target.value)}
									/>
								</div>
								<div>
									<label className="text-sm text-muted-foreground">Amount</label>
									<Input
										type="number"
										step="0.01"
										placeholder="0.00"
										value={newPaymentAmount}
										onChange={(e) => setNewPaymentAmount(e.target.value)}
									/>
								</div>
								<div>
									<label className="text-sm text-muted-foreground">Due Date (optional)</label>
									<Input
										type="date"
										value={newPaymentDueDate}
										onChange={(e) => setNewPaymentDueDate(e.target.value)}
									/>
								</div>
							</div>
							<div className="flex justify-end gap-2 mt-3">
								<Button
									variant="outline"
									onClick={() => {
										setShowAddPayment(false);
										setNewPaymentDescription('');
										setNewPaymentAmount('');
										setNewPaymentDueDate('');
									}}
								>
									Cancel
								</Button>
								<Button
									onClick={handleAddPayment}
									disabled={
										!newPaymentDescription ||
										!newPaymentAmount ||
										createPaymentMutation.isPending
									}
								>
									{createPaymentMutation.isPending ? (
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
									) : (
										<Plus className="h-4 w-4 mr-2" />
									)}
									Add
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Payment Summary */}
			{paymentData?.summary && (
				<Card>
					<CardContent className="pt-6">
						<div className="grid grid-cols-3 gap-4 text-center">
							<div>
								<div className="text-sm text-muted-foreground">Total</div>
								<div className="text-xl font-bold">
									{formatCurrency(paymentData.summary.totalAmount)}
								</div>
							</div>
							<div>
								<div className="text-sm text-muted-foreground">Paid</div>
								<div className="text-xl font-bold text-green-600">
									{formatCurrency(paymentData.summary.paidAmount)}
								</div>
							</div>
							<div>
								<div className="text-sm text-muted-foreground">Outstanding</div>
								<div
									className={`text-xl font-bold ${paymentData.summary.hasOverdue ? 'text-red-600' : ''}`}
								>
									{formatCurrency(paymentData.summary.outstandingAmount)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<DeleteConfirmDialog
				open={deleteConfirmOpen}
				onOpenChange={setDeleteConfirmOpen}
				onConfirm={handleDeletePayment}
				title="Delete Payment"
				description="Are you sure you want to delete this payment item? This action cannot be undone."
				isLoading={deletePaymentMutation.isPending}
			/>
		</div>
	);
}
