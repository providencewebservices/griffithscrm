import { cn } from '@/lib/utils';
import { CalendarEventPill } from './calendar-event-pill';
import { formatDayNumber } from './calendar-utils';
import type { CalendarEvent } from './types';

type CalendarDayCellProps = {
	date: Date;
	isCurrentMonth: boolean;
	isToday: boolean;
	events: CalendarEvent[];
	onDateClick: (date: Date) => void;
	onEditEvent?: (event: CalendarEvent) => void;
	onDeleteEvent?: (eventId: string) => void;
};

const MAX_VISIBLE_EVENTS = 3;

export function CalendarDayCell({
	date,
	isCurrentMonth,
	isToday,
	events,
	onDateClick,
	onEditEvent,
	onDeleteEvent,
}: CalendarDayCellProps) {
	const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
	const hiddenCount = events.length - MAX_VISIBLE_EVENTS;

	const isWeekend = date.getDay() === 0 || date.getDay() === 6;

	return (
		<div
			className={cn(
				'min-h-[100px] border-r border-b border-border/50 p-2 cursor-pointer transition-colors',
				'hover:bg-muted/30',
				!isCurrentMonth && 'bg-muted/10 text-muted-foreground',
				isCurrentMonth && isWeekend && 'bg-muted/5',
			)}
			onClick={() => onDateClick(date)}
		>
			<div className="flex items-center justify-start mb-1">
				<span
					className={cn(
						'text-sm',
						isCurrentMonth && !isToday && 'text-muted-foreground',
						isToday &&
							'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center font-medium',
					)}
				>
					{formatDayNumber(date)}
				</span>
			</div>

			<div className="space-y-1">
				{visibleEvents.map((event) => (
					<CalendarEventPill
						key={event.id}
						event={event}
						onEditEvent={onEditEvent}
						onDeleteEvent={onDeleteEvent}
					/>
				))}

				{hiddenCount > 0 && (
					<button
						type="button"
						className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left px-2"
						onClick={(e) => {
							e.stopPropagation();
							onDateClick(date);
						}}
					>
						+{hiddenCount} more
					</button>
				)}
			</div>
		</div>
	);
}
