import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
	getWeekDays,
	getEventsForDay,
	isToday,
	format,
	formatHour,
	calculateEventPosition,
	CALENDAR_HOURS,
} from './calendar-utils';
import { CalendarEventBlock } from './calendar-event-block';
import type { CalendarEvent } from './types';

const HOUR_HEIGHT = 48; // Height of each hour slot in pixels

type WeekViewProps = {
	currentDate: Date;
	events: CalendarEvent[];
	onTimeSlotClick: (date: Date, hour: number) => void;
	onEventClick: (event: CalendarEvent) => void;
};

export function WeekView({
	currentDate,
	events,
	onTimeSlotClick,
	onEventClick,
}: WeekViewProps) {
	const days = useMemo(() => getWeekDays(currentDate), [currentDate]);

	// Filter out all-day events
	const allDayEvents = events.filter((e) => e.allDay);
	const timedEvents = events.filter((e) => !e.allDay);

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			{/* All-day events section */}
			{allDayEvents.length > 0 && (
				<div className="border-b">
					<div className="flex">
						{/* Time gutter spacer */}
						<div className="w-16 shrink-0 border-r" />
						{/* Day columns for all-day events */}
						{days.map((day) => {
							const dayAllDayEvents = allDayEvents.filter((e) =>
								getEventsForDay([e], day).length > 0
							);
							return (
								<div
									key={day.toISOString()}
									className="flex-1 border-r p-1 min-h-[32px]"
								>
									{dayAllDayEvents.slice(0, 2).map((event) => (
										<button
											key={event.id}
											type="button"
											onClick={() => onEventClick(event)}
											className="w-full text-left text-xs px-2 py-0.5 rounded-md truncate mb-1 cursor-pointer"
											style={{
												backgroundColor: `${event.color}20`,
												color: event.color,
											}}
										>
											{event.title}
										</button>
									))}
									{dayAllDayEvents.length > 2 && (
										<div className="text-xs text-muted-foreground px-2">
											+{dayAllDayEvents.length - 2} more
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Day headers */}
			<div className="flex border-b">
				{/* Time gutter spacer */}
				<div className="w-16 shrink-0 border-r" />
				{/* Day headers */}
				{days.map((day) => (
					<div
						key={day.toISOString()}
						className={cn(
							'flex-1 text-center py-2 border-r',
							isToday(day) && 'bg-primary/5'
						)}
					>
						<div className="text-sm text-muted-foreground">
							{format(day, 'EEE')}
						</div>
						<div
							className={cn(
								'text-lg font-semibold',
								isToday(day) &&
									'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto'
							)}
						>
							{format(day, 'd')}
						</div>
					</div>
				))}
			</div>

			{/* Time grid */}
			<div className="flex-1 overflow-auto">
				<div className="flex min-h-full">
					{/* Time gutter */}
					<div className="w-16 shrink-0 border-r">
						{CALENDAR_HOURS.map((hour) => (
							<div
								key={hour}
								className="h-12 text-xs text-muted-foreground text-right pr-2 -mt-2"
							>
								{formatHour(hour)}
							</div>
						))}
					</div>

					{/* Day columns */}
					{days.map((day) => {
						const dayTimedEvents = getEventsForDay(timedEvents, day);

						return (
							<div
								key={day.toISOString()}
								className={cn(
									'flex-1 border-r relative',
									isToday(day) && 'bg-primary/5'
								)}
							>
								{/* Time slots (background) */}
								{CALENDAR_HOURS.map((hour) => (
									<div
										key={hour}
										className="h-12 border-b hover:bg-muted/20 transition-colors cursor-pointer"
										onClick={() => onTimeSlotClick(day, hour)}
									/>
								))}

								{/* Event blocks */}
								{dayTimedEvents.map((event) => {
									const { top, height } = calculateEventPosition(
										event,
										HOUR_HEIGHT
									);
									// Adjust top position based on start hour (CALENDAR_HOURS starts at 6)
									const adjustedTop = top - 6 * HOUR_HEIGHT;
									if (adjustedTop < 0) return null; // Event before visible hours

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
								{isToday(day) && <CurrentTimeIndicator />}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function CurrentTimeIndicator() {
	const now = new Date();
	const hour = now.getHours();
	const minute = now.getMinutes();

	// Only show if within visible hours (6 AM - 10 PM)
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
