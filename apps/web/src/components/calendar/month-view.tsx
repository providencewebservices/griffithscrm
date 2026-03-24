import { useMemo } from 'react';
import { CalendarDayCell } from './calendar-day-cell';
import {
	getEventsForDay,
	getMonthDays,
	isSameMonth,
	isToday,
	WEEKDAY_NAMES,
} from './calendar-utils';
import type { CalendarEvent } from './types';

type MonthViewProps = {
	currentDate: Date;
	events: CalendarEvent[];
	onDateClick: (date: Date) => void;
	onEditEvent?: (event: CalendarEvent) => void;
	onDeleteEvent?: (eventId: string) => void;
};

export function MonthView({
	currentDate,
	events,
	onDateClick,
	onEditEvent,
	onDeleteEvent,
}: MonthViewProps) {
	const days = useMemo(() => getMonthDays(currentDate), [currentDate]);

	return (
		<div className="flex-1 overflow-auto">
			<div className="grid grid-cols-7">
				{/* Day headers */}
				{WEEKDAY_NAMES.map((day) => (
					<div
						key={day}
						className="text-center text-sm font-medium text-muted-foreground py-2 border-r border-b border-border/50 bg-muted/20"
					>
						{day}
					</div>
				))}

				{/* Day cells */}
				{days.map((day) => (
					<CalendarDayCell
						key={day.toISOString()}
						date={day}
						isCurrentMonth={isSameMonth(day, currentDate)}
						isToday={isToday(day)}
						events={getEventsForDay(events, day)}
						onDateClick={onDateClick}
						onEditEvent={onEditEvent}
						onDeleteEvent={onDeleteEvent}
					/>
				))}
			</div>
		</div>
	);
}
