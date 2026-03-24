import {
	addDays,
	addMonths,
	addWeeks,
	isToday as dateFnsIsToday,
	differenceInMinutes,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	parseISO,
	setHours,
	setMinutes,
	startOfDay,
	startOfMonth,
	startOfWeek,
} from 'date-fns';
import type { CalendarEvent, CalendarView } from './types';

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
export function navigateDate(date: Date, view: CalendarView, delta: number): Date {
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
export function getDateRange(date: Date, view: CalendarView): { start: Date; end: Date } {
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
export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
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
	hourHeight: number = 48, // Height of one hour slot in pixels
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

// Calculate relative luminance for WCAG contrast
function getLuminance(hex: string): number {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;

	const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Get text color with sufficient WCAG contrast against a background color
export function getContrastTextColor(bgColor: string): string {
	try {
		const luminance = getLuminance(bgColor);
		return luminance > 0.35 ? '#1a1a1a' : '#ffffff';
	} catch {
		return '#ffffff';
	}
}

// Calculate column layout for overlapping timed events
export function calculateOverlapColumns(
	events: CalendarEvent[],
): Map<string, { column: number; totalColumns: number }> {
	const result = new Map<string, { column: number; totalColumns: number }>();
	if (events.length === 0) return result;

	const parsed = events
		.map((e) => ({
			id: e.id,
			start: parseISO(e.start).getTime(),
			end: e.end ? parseISO(e.end).getTime() : parseISO(e.start).getTime() + 3600000,
		}))
		.sort((a, b) => {
			if (a.start !== b.start) return a.start - b.start;
			return b.end - b.start - (a.end - a.start);
		});

	// Greedy column assignment
	const placed: { id: string; end: number; column: number }[] = [];

	for (const event of parsed) {
		const occupied = new Set<number>();
		for (const p of placed) {
			if (p.end > event.start) {
				occupied.add(p.column);
			}
		}

		let column = 0;
		while (occupied.has(column)) column++;

		result.set(event.id, { column, totalColumns: 1 });
		placed.push({ id: event.id, end: event.end, column });
	}

	// Union-find to group overlapping events for totalColumns
	const parent = new Map<string, string>();
	for (const e of parsed) parent.set(e.id, e.id);

	function find(x: string): string {
		while (parent.get(x) !== x) {
			parent.set(x, parent.get(parent.get(x)!)!);
			x = parent.get(x)!;
		}
		return x;
	}

	for (let i = 0; i < parsed.length; i++) {
		for (let j = i + 1; j < parsed.length; j++) {
			if (parsed[i].end > parsed[j].start && parsed[j].end > parsed[i].start) {
				const ri = find(parsed[i].id);
				const rj = find(parsed[j].id);
				if (ri !== rj) parent.set(ri, rj);
			}
		}
	}

	const groups = new Map<string, string[]>();
	for (const e of parsed) {
		const root = find(e.id);
		if (!groups.has(root)) groups.set(root, []);
		groups.get(root)?.push(e.id);
	}

	for (const group of groups.values()) {
		let maxCol = 0;
		for (const id of group) {
			maxCol = Math.max(maxCol, result.get(id)?.column ?? 0);
		}
		for (const id of group) {
			result.get(id)!.totalColumns = maxCol + 1;
		}
	}

	return result;
}

// Business hours
export const BUSINESS_HOURS_START = 7;
export const BUSINESS_HOURS_END = 19;

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

// Get upcoming events filtered by view
export function getUpcomingEvents(
	events: CalendarEvent[],
	currentDate: Date,
	view: CalendarView,
): CalendarEvent[] {
	const _now = new Date();
	const today = startOfDay(currentDate);

	let filtered: CalendarEvent[];

	switch (view) {
		case 'day': {
			// Show all events for the selected day, sorted by time
			filtered = getEventsForDay(events, currentDate);
			break;
		}
		case 'week': {
			// Show events from today onward within the week
			const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
			filtered = events.filter((event) => {
				const eventStart = parseISO(event.start);
				// Include events from today onward (or from now if today)
				return (
					eventStart <= weekEnd &&
					(eventStart >= today || (event.end && parseISO(event.end) >= today))
				);
			});
			break;
		}
		default: {
			// Show today's events + upcoming events in the visible range
			const range = getDateRange(currentDate, 'month');
			filtered = events.filter((event) => {
				const eventStart = parseISO(event.start);
				return (
					eventStart <= range.end &&
					(eventStart >= today || (event.end && parseISO(event.end) >= today))
				);
			});
			break;
		}
	}

	// Sort: all-day events first, then by start time
	return filtered.sort((a, b) => {
		const aStart = parseISO(a.start);
		const bStart = parseISO(b.start);
		const aDay = startOfDay(aStart);
		const bDay = startOfDay(bStart);

		// Group by day first
		if (aDay.getTime() !== bDay.getTime()) {
			return aDay.getTime() - bDay.getTime();
		}

		// Within same day: all-day events first
		if (a.allDay && !b.allDay) return -1;
		if (!a.allDay && b.allDay) return 1;

		// Then by start time
		return aStart.getTime() - bStart.getTime();
	});
}

// Re-export commonly used date-fns functions
export { isSameMonth, isSameDay, parseISO, format, startOfDay, addDays };
export const isToday = dateFnsIsToday;

// Hours array for time grid (12 AM to 11 PM - full 24 hours)
export const CALENDAR_HOURS = Array.from({ length: 24 }, (_, i) => i);

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
