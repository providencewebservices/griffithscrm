import { addDays, format } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type TimeOffFormData = {
	startDate: string;
	endDate: string;
	reason: string;
};

type TimeOffRequestDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { startDate: string; endDate: string; reason?: string }) => Promise<void>;
	isLoading?: boolean;
};

export function TimeOffRequestDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading = false,
}: TimeOffRequestDialogProps) {
	const getInitialFormData = (): TimeOffFormData => {
		const tomorrow = addDays(new Date(), 1);
		return {
			startDate: format(tomorrow, 'yyyy-MM-dd'),
			endDate: format(tomorrow, 'yyyy-MM-dd'),
			reason: '',
		};
	};

	const [formData, setFormData] = useState<TimeOffFormData>(getInitialFormData);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setFormData(getInitialFormData());
			setError(null);
		}
	}, [open, getInitialFormData]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!formData.startDate || !formData.endDate) {
			setError('Please select both start and end dates');
			return;
		}

		if (formData.endDate < formData.startDate) {
			setError('End date must be on or after start date');
			return;
		}

		try {
			// Convert date strings to ISO datetime format for API
			const startDateTime = new Date(`${formData.startDate}T00:00:00`).toISOString();
			const endDateTime = new Date(`${formData.endDate}T23:59:59`).toISOString();

			await onSubmit({
				startDate: startDateTime,
				endDate: endDateTime,
				reason: formData.reason.trim() || undefined,
			});
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to submit request');
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Request Time Off</DialogTitle>
					<DialogDescription>
						Submit a request for time off. Your manager will review and approve or reject the
						request.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-md">
							{error}
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="startDate">Start Date</Label>
							<Input
								id="startDate"
								type="date"
								value={formData.startDate}
								min={format(new Date(), 'yyyy-MM-dd')}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										startDate: e.target.value,
										endDate: prev.endDate < e.target.value ? e.target.value : prev.endDate,
									}))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="endDate">End Date</Label>
							<Input
								id="endDate"
								type="date"
								value={formData.endDate}
								min={formData.startDate}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										endDate: e.target.value,
									}))
								}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="reason">Reason (optional)</Label>
						<Textarea
							id="reason"
							value={formData.reason}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									reason: e.target.value,
								}))
							}
							placeholder="e.g., Vacation, Medical appointment, Personal day"
							rows={3}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? 'Submitting...' : 'Submit Request'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
