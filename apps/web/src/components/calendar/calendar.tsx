import { useState, useMemo } from 'react';
import { CalendarHeader } from './calendar-header';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { DayView } from './day-view';
import { EventDetailSheet } from './event-detail-sheet';
import { EventFormDialog } from './event-form-dialog';
import { navigateDate, getDateRange } from './calendar-utils';
import {
	useCalendarEventsQuery,
	useCreateCalendarEventMutation,
} from '@/hooks/use-calendar';
import type { CalendarView, CalendarEvent } from './types';

export function Calendar() {
	// View state
	const [view, setView] = useState<CalendarView>('month');
	const [currentDate, setCurrentDate] = useState(new Date());

	// Selection state
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
		null
	);
	const [eventSheetOpen, setEventSheetOpen] = useState(false);

	// Create event state
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [createDate, setCreateDate] = useState<Date | undefined>();
	const [createHour, setCreateHour] = useState<number | undefined>();

	// Calculate date range for current view
	const dateRange = useMemo(
		() => getDateRange(currentDate, view),
		[currentDate, view]
	);

	// Fetch events
	const { data: events = [], isLoading } = useCalendarEventsQuery(
		dateRange.start,
		dateRange.end
	);

	// Create event mutation
	const createEventMutation = useCreateCalendarEventMutation();

	// Navigation handlers
	const handlePrevious = () => {
		setCurrentDate((prev) => navigateDate(prev, view, -1));
	};

	const handleNext = () => {
		setCurrentDate((prev) => navigateDate(prev, view, 1));
	};

	const handleToday = () => {
		setCurrentDate(new Date());
	};

	// Event handlers
	const handleEventClick = (event: CalendarEvent) => {
		setSelectedEvent(event);
		setEventSheetOpen(true);
	};

	const handleDateClick = (date: Date) => {
		// When clicking a date in month view, switch to day view
		if (view === 'month') {
			setCurrentDate(date);
			setView('day');
		} else {
			// Open create dialog
			setCreateDate(date);
			setCreateHour(undefined);
			setCreateDialogOpen(true);
		}
	};

	const handleTimeSlotClick = (date: Date, hour: number) => {
		setCreateDate(date);
		setCreateHour(hour);
		setCreateDialogOpen(true);
	};

	const handleCreateEvent = async (data: {
		title: string;
		description?: string;
		startAt: string;
		endAt?: string;
		isAllDay: boolean;
		recurrencePattern: 'none' | 'daily' | 'weekly' | 'monthly';
	}) => {
		await createEventMutation.mutateAsync(data);
	};

	return (
		<div className="flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden">
			<CalendarHeader
				currentDate={currentDate}
				view={view}
				onViewChange={setView}
				onPrevious={handlePrevious}
				onNext={handleNext}
				onToday={handleToday}
			/>

			{isLoading ? (
				<div className="flex-1 flex items-center justify-center text-muted-foreground">
					Loading events...
				</div>
			) : (
				<>
					{view === 'month' && (
						<MonthView
							currentDate={currentDate}
							events={events}
							onDateClick={handleDateClick}
							onEventClick={handleEventClick}
						/>
					)}

					{view === 'week' && (
						<WeekView
							currentDate={currentDate}
							events={events}
							onTimeSlotClick={handleTimeSlotClick}
							onEventClick={handleEventClick}
						/>
					)}

					{view === 'day' && (
						<DayView
							currentDate={currentDate}
							events={events}
							onTimeSlotClick={handleTimeSlotClick}
							onEventClick={handleEventClick}
						/>
					)}
				</>
			)}

			<EventDetailSheet
				event={selectedEvent}
				open={eventSheetOpen}
				onOpenChange={setEventSheetOpen}
			/>

			<EventFormDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSubmit={handleCreateEvent}
				initialDate={createDate}
				initialHour={createHour}
				isLoading={createEventMutation.isPending}
			/>
		</div>
	);
}
