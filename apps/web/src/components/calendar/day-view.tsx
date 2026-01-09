import { cn } from '@/lib/utils';
import {
	getEventsForDay,
	isToday,
	format,
	formatHour,
	calculateEventPosition,
	CALENDAR_HOURS,
} from './calendar-utils';
import { CalendarEventBlock } from './calendar-event-block';
import type { CalendarEvent } from './types';

const HOUR_HEIGHT = 48;

type DayViewProps = {
	currentDate: Date;
	events: CalendarEvent[];
	onTimeSlotClick: (date: Date, hour: number) => void;
	onEventClick: (event: CalendarEvent) => void;
};

export function DayView({
	currentDate,
	events,
	onTimeSlotClick,
	onEventClick,
}: DayViewProps) {
	const dayEvents = getEventsForDay(events, currentDate);
	const allDayEvents = dayEvents.filter((e) => e.allDay);
	const timedEvents = dayEvents.filter((e) => !e.allDay);
	const today = isToday(currentDate);

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			{/* All-day events section */}
			{allDayEvents.length > 0 && (
				<div className="border-b p-2">
					<div className="text-xs text-muted-foreground mb-1 font-medium">
						All Day
					</div>
					<div className="space-y-1">
						{allDayEvents.map((event) => (
							<button
								key={event.id}
								type="button"
								onClick={() => onEventClick(event)}
								className="w-full text-left text-sm px-3 py-1.5 rounded-md cursor-pointer"
								style={{
									backgroundColor: `${event.color}20`,
									color: event.color,
									borderLeft: `3px solid ${event.color}`,
								}}
							>
								{event.title}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Time grid */}
			<div className="flex-1 overflow-auto">
				<div className="flex min-h-full">
					{/* Time gutter */}
					<div className="w-20 shrink-0 border-r">
						{CALENDAR_HOURS.map((hour) => (
							<div
								key={hour}
								className="h-12 text-sm text-muted-foreground text-right pr-3 -mt-2"
							>
								{formatHour(hour)}
							</div>
						))}
					</div>

					{/* Day column */}
					<div
						className={cn(
							'flex-1 relative',
							today && 'bg-primary/5'
						)}
					>
						{/* Time slots */}
						{CALENDAR_HOURS.map((hour) => (
							<div
								key={hour}
								className="h-12 border-b hover:bg-muted/20 transition-colors cursor-pointer"
								onClick={() => onTimeSlotClick(currentDate, hour)}
							/>
						))}

						{/* Event blocks */}
						{timedEvents.map((event) => {
							const { top, height } = calculateEventPosition(
								event,
								HOUR_HEIGHT
							);
							const adjustedTop = top - 6 * HOUR_HEIGHT;
							if (adjustedTop < 0) return null;

							return (
								<CalendarEventBlock
									key={event.id}
									event={event}
									top={adjustedTop}
									height={height}
									onClick={onEventClick}
								/>
							);
						})}

						{/* Current time indicator */}
						{today && <CurrentTimeIndicator />}
					</div>
				</div>
			</div>
		</div>
	);
}

function CurrentTimeIndicator() {
	const now = new Date();
	const hour = now.getHours();
	const minute = now.getMinutes();

	if (hour < 6 || hour >= 22) return null;

	const top = (hour - 6) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT;

	return (
		<div
			className="absolute left-0 right-0 z-10 pointer-events-none"
			style={{ top: `${top}px` }}
		>
			<div className="flex items-center">
				<div className="w-2 h-2 rounded-full bg-destructive" />
				<div className="flex-1 h-0.5 bg-destructive" />
			</div>
		</div>
	);
}
