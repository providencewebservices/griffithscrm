import {
	startOfMonth,
	endOfMonth,
	startOfWeek,
	endOfWeek,
	eachDayOfInterval,
	addMonths,
	addWeeks,
	addDays,
	isSameDay,
	isSameMonth,
	isToday as dateFnsIsToday,
	format,
	setHours,
	setMinutes,
	differenceInMinutes,
	startOfDay,
	parseISO,
} from 'date-fns';
import type { CalendarView, CalendarEvent } from './types';

// Get all days to display in month view (includes days from prev/next months to fill grid)
export function getMonthDays(date: Date): Date[] {
	const monthStart = startOfMonth(date);
	const monthEnd = endOfMonth(date);
	const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
	const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

	return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

// Get days for week view
export function getWeekDays(date: Date): Date[] {
	const weekStart = startOfWeek(date, { weekStartsOn: 0 });
	const weekEnd = endOfWeek(date, { weekStartsOn: 0 });

	return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

// Navigate by view unit
export function navigateDate(
	date: Date,
	view: CalendarView,
	delta: number
): Date {
	switch (view) {
		case 'month':
			return addMonths(date, delta);
		case 'week':
			return addWeeks(date, delta);
		case 'day':
			return addDays(date, delta);
		default:
			return date;
	}
}

// Get date range for API query based on view
export function getDateRange(
	date: Date,
	view: CalendarView
): { start: Date; end: Date } {
	switch (view) {
		case 'month': {
			const monthStart = startOfMonth(date);
			const monthEnd = endOfMonth(date);
			// Include buffer for prev/next month days shown in grid
			return {
				start: startOfWeek(monthStart, { weekStartsOn: 0 }),
				end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
			};
		}
		case 'week': {
			return {
				start: startOfWeek(date, { weekStartsOn: 0 }),
				end: endOfWeek(date, { weekStartsOn: 0 }),
			};
		}
		case 'day': {
			return {
				start: startOfDay(date),
				end: addDays(startOfDay(date), 1),
			};
		}
	}
}

// Get events for a specific day
export function getEventsForDay(
	events: CalendarEvent[],
	date: Date
): CalendarEvent[] {
	return events.filter((event) => {
		const eventStart = parseISO(event.start);
		const eventEnd = event.end ? parseISO(event.end) : eventStart;

		// Check if the day falls within the event's range
		if (event.allDay) {
			// For all-day events, check if the date is within start-end range
			const dayStart = startOfDay(date);
			const dayEnd = addDays(dayStart, 1);
			return eventStart < dayEnd && eventEnd >= dayStart;
		}

		// For timed events, check if they start on this day
		return isSameDay(eventStart, date);
	});
}

// Calculate event position for week/day view (in pixels)
// Returns top position and height based on time
export function calculateEventPosition(
	event: CalendarEvent,
	hourHeight: number = 48 // Height of one hour slot in pixels
): { top: number; height: number } {
	const eventStart = parseISO(event.start);

	if (event.allDay) {
		// All-day events go at the top
		return { top: 0, height: 24 };
	}

	// Calculate top position based on start time
	const startHour = eventStart.getHours();
	const startMinute = eventStart.getMinutes();
	const top = startHour * hourHeight + (startMinute / 60) * hourHeight;

	// Calculate height based on duration
	let height = hourHeight; // Default 1 hour
	if (event.end) {
		const eventEnd = parseISO(event.end);
		const durationMinutes = differenceInMinutes(eventEnd, eventStart);
		height = (durationMinutes / 60) * hourHeight;
	}

	return {
		top,
		height: Math.max(height, 24), // Minimum 24px height
	};
}

// Format helpers
export function formatMonthYear(date: Date): string {
	return format(date, 'MMMM yyyy');
}

export function formatDayHeader(date: Date): string {
	return format(date, 'EEE');
}

export function formatDayNumber(date: Date): string {
	return format(date, 'd');
}

export function formatTime(date: Date): string {
	return format(date, 'h:mm a');
}

export function formatHour(hour: number): string {
	const date = setMinutes(setHours(new Date(), hour), 0);
	return format(date, 'h a');
}

export function formatDateRange(start: Date, end: Date | null): string {
	if (!end || isSameDay(start, end)) {
		return format(start, 'EEEE, MMMM d, yyyy');
	}
	if (isSameMonth(start, end)) {
		return `${format(start, 'MMMM d')} - ${format(end, 'd, yyyy')}`;
	}
	return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
}

// Re-export commonly used date-fns functions
export { isSameMonth, isSameDay, parseISO, format, startOfDay, addDays };
export const isToday = dateFnsIsToday;

// Hours array for time grid (6 AM to 9 PM)
export const CALENDAR_HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

// Week day names
export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_NAMES_FULL = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
];
