import { addHours, format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CalendarEvent } from './types';

type EventFormData = {
	title: string;
	description: string;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	isAllDay: boolean;
	recurrencePattern: 'none' | 'daily' | 'weekly' | 'monthly';
};

type EventFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: {
		title: string;
		description?: string;
		startAt: string;
		endAt?: string;
		isAllDay: boolean;
		recurrencePattern: 'none' | 'daily' | 'weekly' | 'monthly';
	}) => Promise<void>;
	initialDate?: Date;
	initialHour?: number;
	isLoading?: boolean;
	mode?: 'create' | 'edit';
	event?: CalendarEvent;
};

export function EventFormDialog({
	open,
	onOpenChange,
	onSubmit,
	initialDate,
	initialHour,
	isLoading = false,
	mode = 'create',
	event,
}: EventFormDialogProps) {
	const getInitialFormData = (): EventFormData => {
		// Edit mode: pre-fill from event
		if (mode === 'edit' && event) {
			const start = parseISO(event.start);
			const end = event.end ? parseISO(event.end) : addHours(start, 1);
			return {
				title: event.title,
				description: event.description || '',
				startDate: format(start, 'yyyy-MM-dd'),
				startTime: format(start, 'HH:mm'),
				endDate: format(end, 'yyyy-MM-dd'),
				endTime: format(end, 'HH:mm'),
				isAllDay: event.allDay,
				recurrencePattern:
					(event.recurrencePattern as EventFormData['recurrencePattern']) || 'none',
			};
		}

		// Create mode
		const startDate = initialDate || new Date();
		const startHour = initialHour ?? 9;
		const startDateTime = new Date(startDate);
		startDateTime.setHours(startHour, 0, 0, 0);
		const endDateTime = addHours(startDateTime, 1);

		return {
			title: '',
			description: '',
			startDate: format(startDateTime, 'yyyy-MM-dd'),
			startTime: format(startDateTime, 'HH:mm'),
			endDate: format(endDateTime, 'yyyy-MM-dd'),
			endTime: format(endDateTime, 'HH:mm'),
			isAllDay: false,
			recurrencePattern: 'none',
		};
	};

	const [formData, setFormData] = useState<EventFormData>(getInitialFormData);
	const [error, setError] = useState<string | null>(null);

	// Reset form when dialog opens with new initial values
	useEffect(() => {
		if (open) {
			setFormData(getInitialFormData());
			setError(null);
		}
	}, [open, getInitialFormData]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!formData.title.trim()) {
			setError('Title is required');
			return;
		}

		try {
			let startAt: string;
			let endAt: string | undefined;

			if (formData.isAllDay) {
				// For all-day events, use date at midnight UTC
				startAt = new Date(`${formData.startDate}T00:00:00`).toISOString();
				if (formData.endDate && formData.endDate !== formData.startDate) {
					endAt = new Date(`${formData.endDate}T23:59:59`).toISOString();
				}
			} else {
				startAt = new Date(`${formData.startDate}T${formData.startTime}`).toISOString();
				endAt = new Date(`${formData.endDate}T${formData.endTime}`).toISOString();
			}

			await onSubmit({
				title: formData.title.trim(),
				description: formData.description.trim() || undefined,
				startAt,
				endAt,
				isAllDay: formData.isAllDay,
				recurrencePattern: formData.recurrencePattern,
			});

			onOpenChange(false);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: mode === 'edit'
						? 'Failed to update event'
						: 'Failed to create event',
			);
		}
	};

	const isEdit = mode === 'edit';

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Event' : 'Create Event'}</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-md">
							{error}
						</div>
					)}

					{/* Title */}
					<div className="space-y-2">
						<Label htmlFor="title">Title</Label>
						<Input
							id="title"
							value={formData.title}
							onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
							placeholder="Event title"
							autoFocus
						/>
					</div>

					{/* All Day Toggle */}
					<div className="flex items-center space-x-2">
						<Checkbox
							id="allDay"
							checked={formData.isAllDay}
							onCheckedChange={(checked) =>
								setFormData((prev) => ({
									...prev,
									isAllDay: checked === true,
								}))
							}
						/>
						<Label htmlFor="allDay" className="font-normal cursor-pointer">
							All day event
						</Label>
					</div>

					{/* Date/Time */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="startDate">Start Date</Label>
							<Input
								id="startDate"
								type="date"
								value={formData.startDate}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										startDate: e.target.value,
										// Also update end date if it's before start
										endDate: prev.endDate < e.target.value ? e.target.value : prev.endDate,
									}))
								}
							/>
						</div>
						{!formData.isAllDay && (
							<div className="space-y-2">
								<Label htmlFor="startTime">Start Time</Label>
								<Input
									id="startTime"
									type="time"
									value={formData.startTime}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											startTime: e.target.value,
										}))
									}
								/>
							</div>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4">
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
						{!formData.isAllDay && (
							<div className="space-y-2">
								<Label htmlFor="endTime">End Time</Label>
								<Input
									id="endTime"
									type="time"
									value={formData.endTime}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											endTime: e.target.value,
										}))
									}
								/>
							</div>
						)}
					</div>

					{/* Recurrence */}
					<div className="space-y-2">
						<Label htmlFor="recurrence">Repeat</Label>
						<Select
							value={formData.recurrencePattern}
							onValueChange={(value) =>
								setFormData((prev) => ({
									...prev,
									recurrencePattern: value as EventFormData['recurrencePattern'],
								}))
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select recurrence" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Does not repeat</SelectItem>
								<SelectItem value="daily">Daily</SelectItem>
								<SelectItem value="weekly">Weekly</SelectItem>
								<SelectItem value="monthly">Monthly</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Description (optional)</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									description: e.target.value,
								}))
							}
							placeholder="Add description"
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
							{isLoading
								? isEdit
									? 'Saving...'
									: 'Creating...'
								: isEdit
									? 'Save Changes'
									: 'Create Event'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
