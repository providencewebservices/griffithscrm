import { useState, useMemo } from 'react';
import { CalendarHeader } from './calendar-header';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { DayView } from './day-view';
import { UpcomingEventsList } from './upcoming-events-list';
import { EventFormDialog } from './event-form-dialog';
import { navigateDate, getDateRange } from './calendar-utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
	useCalendarEventsQuery,
	useCreateCalendarEventMutation,
	useUpdateCalendarEventMutation,
	useDeleteCalendarEventMutation,
} from '@/hooks/use-calendar';
import type { CalendarView, CalendarEvent, EventSource } from './types';

const ALL_EVENT_TYPES: EventSource[] = [
	'custom',
	'quote_valid_until',
	'job_installation',
	'job_deadline',
	'time_off',
];

export function Calendar() {
	// View state
	const [view, setView] = useState<CalendarView>('month');
	const [currentDate, setCurrentDate] = useState(new Date());

	// Create event state
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [createDate, setCreateDate] = useState<Date | undefined>();
	const [createHour, setCreateHour] = useState<number | undefined>();

	// Edit event state
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editEvent, setEditEvent] = useState<CalendarEvent | undefined>();

	// Filter state
	const [enabledTypes, setEnabledTypes] = useState<EventSource[]>([...ALL_EVENT_TYPES]);

	// Calculate date range for current view
	const dateRange = useMemo(
		() => getDateRange(currentDate, view),
		[currentDate, view]
	);

	// Fetch events
	const { data: events = [], isLoading } = useCalendarEventsQuery(
		dateRange.start,
		dateRange.end,
		enabledTypes.length < ALL_EVENT_TYPES.length ? enabledTypes : undefined
	);

	// Mutations
	const createEventMutation = useCreateCalendarEventMutation();
	const updateEventMutation = useUpdateCalendarEventMutation();
	const deleteEventMutation = useDeleteCalendarEventMutation();

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
	const handleDateClick = (date: Date) => {
		if (view === 'month') {
			setCurrentDate(date);
			setView('day');
		} else {
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

	const handleCreateButtonClick = () => {
		setCreateDate(new Date());
		setCreateHour(undefined);
		setCreateDialogOpen(true);
	};

	const handleEditEvent = (event: CalendarEvent) => {
		setEditEvent(event);
		setEditDialogOpen(true);
	};

	const handleUpdateEvent = async (data: {
		title: string;
		description?: string;
		startAt: string;
		endAt?: string;
		isAllDay: boolean;
		recurrencePattern: 'none' | 'daily' | 'weekly' | 'monthly';
	}) => {
		if (!editEvent) return;
		await updateEventMutation.mutateAsync({
			id: editEvent.sourceId,
			title: data.title,
			description: data.description || null,
			startAt: data.startAt,
			endAt: data.endAt || null,
			isAllDay: data.isAllDay,
			recurrencePattern: data.recurrencePattern,
		});
	};

	const handleDeleteEvent = async (eventId: string) => {
		await deleteEventMutation.mutateAsync(eventId);
	};

	return (
		<div className="flex gap-3 h-[calc(100vh-6rem)]">
			{/* Calendar card */}
			<div className="flex-1 min-w-0 flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
				<CalendarHeader
					currentDate={currentDate}
					view={view}
					onViewChange={setView}
					onPrevious={handlePrevious}
					onNext={handleNext}
					onToday={handleToday}
					onCreateEvent={handleCreateButtonClick}
					enabledTypes={enabledTypes}
					onTypesChange={setEnabledTypes}
				/>

				{isLoading ? (
					<CalendarSkeleton view={view} />
				) : (
					<>
						{view === 'month' && (
							<MonthView
								currentDate={currentDate}
								events={events}
								onDateClick={handleDateClick}
								onEditEvent={handleEditEvent}
								onDeleteEvent={handleDeleteEvent}
							/>
						)}

						{view === 'week' && (
							<WeekView
								currentDate={currentDate}
								events={events}
								onTimeSlotClick={handleTimeSlotClick}
								onEditEvent={handleEditEvent}
								onDeleteEvent={handleDeleteEvent}
							/>
						)}

						{view === 'day' && (
							<DayView
								currentDate={currentDate}
								events={events}
								onTimeSlotClick={handleTimeSlotClick}
								onEditEvent={handleEditEvent}
								onDeleteEvent={handleDeleteEvent}
							/>
						)}
					</>
				)}

				{/* Create dialog */}
				<EventFormDialog
					open={createDialogOpen}
					onOpenChange={setCreateDialogOpen}
					onSubmit={handleCreateEvent}
					initialDate={createDate}
					initialHour={createHour}
					isLoading={createEventMutation.isPending}
				/>

				{/* Edit dialog */}
				<EventFormDialog
					open={editDialogOpen}
					onOpenChange={setEditDialogOpen}
					onSubmit={handleUpdateEvent}
					mode="edit"
					event={editEvent}
					isLoading={updateEventMutation.isPending}
				/>
			</div>

			{/* Upcoming events sidebar - hidden on small screens */}
			{!isLoading && (
				<div className="hidden lg:block w-72 shrink-0">
					<UpcomingEventsList
						events={events}
						currentDate={currentDate}
						view={view}
						onEditEvent={handleEditEvent}
						onDeleteEvent={handleDeleteEvent}
					/>
				</div>
			)}
		</div>
	);
}

function CalendarSkeleton({ view }: { view: CalendarView }) {
	if (view === 'month') {
		return (
			<div className="flex-1 p-4">
				{/* Weekday headers */}
				<div className="grid grid-cols-7 gap-2 mb-3">
					{Array.from({ length: 7 }).map((_, i) => (
						<Skeleton key={i} className="h-4 w-10 mx-auto" />
					))}
				</div>
				{/* Day cells */}
				{Array.from({ length: 5 }).map((_, row) => (
					<div key={row} className="grid grid-cols-7 gap-2 mb-2">
						{Array.from({ length: 7 }).map((_, col) => (
							<div key={col} className="space-y-1.5 p-2">
								<Skeleton className="h-4 w-6" />
								<Skeleton className="h-3 w-full" />
								{(row + col) % 3 === 0 && <Skeleton className="h-3 w-3/4" />}
							</div>
						))}
					</div>
				))}
			</div>
		);
	}

	// Week/Day skeleton
	return (
		<div className="flex-1 p-4">
			{/* Day header skeleton */}
			<div className={`grid gap-2 mb-3 ${view === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-1'}`}>
				{view === 'week' && <div />}
				{Array.from({ length: view === 'week' ? 7 : 1 }).map((_, i) => (
					<div key={i} className="flex flex-col items-center gap-1">
						<Skeleton className="h-3 w-8" />
						<Skeleton className="h-6 w-6 rounded-full" />
					</div>
				))}
			</div>
			{/* Hour rows */}
			{Array.from({ length: 10 }).map((_, i) => (
				<div key={i} className={`grid gap-2 ${view === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]'}`}>
					<Skeleton className="h-10 w-10 ml-auto" />
					{Array.from({ length: view === 'week' ? 7 : 1 }).map((_, j) => (
						<Skeleton key={j} className="h-10 w-full" />
					))}
				</div>
			))}
		</div>
	);
}
