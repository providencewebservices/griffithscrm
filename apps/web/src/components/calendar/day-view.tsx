import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { CalendarEventBlock } from './calendar-event-block';
import { CalendarEventPill } from './calendar-event-pill';
import {
	BUSINESS_HOURS_END,
	BUSINESS_HOURS_START,
	CALENDAR_HOURS,
	calculateEventPosition,
	calculateOverlapColumns,
	format,
	formatHour,
	getEventsForDay,
	isToday,
} from './calendar-utils';
import type { CalendarEvent } from './types';

const HOUR_HEIGHT = 64;

type DayViewProps = {
	currentDate: Date;
	events: CalendarEvent[];
	onTimeSlotClick: (date: Date, hour: number) => void;
	onEditEvent?: (event: CalendarEvent) => void;
	onDeleteEvent?: (eventId: string) => void;
};

export function DayView({
	currentDate,
	events,
	onTimeSlotClick,
	onEditEvent,
	onDeleteEvent,
}: DayViewProps) {
	const today = isToday(currentDate);
	const scrollRef = useRef<HTMLDivElement>(null);

	const { allDayEvents, timedEvents } = useMemo(() => {
		const dayEvents = getEventsForDay(events, currentDate);
		return {
			allDayEvents: dayEvents.filter((e) => e.allDay),
			timedEvents: dayEvents.filter((e) => !e.allDay),
		};
	}, [events, currentDate]);

	const overlapColumns = useMemo(() => calculateOverlapColumns(timedEvents), [timedEvents]);

	// Auto-scroll to current time on mount/date change
	useEffect(() => {
		if (scrollRef.current) {
			const currentHour = new Date().getHours();
			const scrollTarget = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
			scrollRef.current.scrollTop = scrollTarget;
		}
	}, []);

	return (
		<div className="flex-1 overflow-auto" ref={scrollRef}>
			<div className="min-w-[300px]">
				{/* Sticky header: day info + all-day events */}
				<div className="sticky top-0 z-20 bg-background border-b shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06)]">
					{/* Day header */}
					<div className="py-3 px-4">
						<div className="flex items-center gap-3">
							<div
								className={cn(
									'text-2xl font-bold',
									today &&
										'bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center text-lg',
								)}
							>
								{format(currentDate, 'd')}
							</div>
							<div>
								<div className="text-base font-medium">{format(currentDate, 'EEEE')}</div>
								<div className="text-sm text-muted-foreground">
									{format(currentDate, 'MMMM yyyy')}
								</div>
							</div>
						</div>
					</div>

					{/* All-day events section */}
					{allDayEvents.length > 0 && (
						<div className="border-t bg-muted/30">
							<div className="flex">
								<div className="w-[60px] flex-shrink-0 border-r flex items-center justify-end pr-2">
									<span className="text-[11px] text-muted-foreground font-medium">ALL DAY</span>
								</div>
								<div className="flex-1 p-2 space-y-1">
									{allDayEvents.map((event) => (
										<CalendarEventPill
											key={event.id}
											event={event}
											onEditEvent={onEditEvent}
											onDeleteEvent={onDeleteEvent}
										/>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Time grid */}
				<div className="flex">
					{/* Time labels column */}
					<div className="w-[60px] flex-shrink-0">
						{CALENDAR_HOURS.map((hour, hourIndex) => (
							<div
								key={hour}
								className="border-r border-b border-border/50 text-xs text-muted-foreground text-right pr-2 relative bg-background"
								style={{ height: HOUR_HEIGHT }}
							>
								{hourIndex > 0 && (
									<span className="absolute -top-[9px] right-2 bg-background px-0.5">
										{formatHour(hour)}
									</span>
								)}
							</div>
						))}
					</div>

					{/* Day column with events overlay */}
					<div className="flex-1 relative">
						{/* Hour grid cells (click targets + visual dividers) */}
						{CALENDAR_HOURS.map((hour) => {
							const isOffHours = hour < BUSINESS_HOURS_START || hour >= BUSINESS_HOURS_END;
							return (
								<div
									key={hour}
									className={cn(
										'border-b border-border/50 transition-colors cursor-pointer hover:bg-muted/30',
										isOffHours && 'bg-muted/40',
										today && !isOffHours && 'bg-primary/5',
									)}
									style={{ height: HOUR_HEIGHT }}
									onClick={() => onTimeSlotClick(currentDate, hour)}
								/>
							);
						})}

						{/* Events overlay */}
						<div className="absolute inset-0 pointer-events-none">
							{timedEvents.map((event) => {
								const { top, height } = calculateEventPosition(event, HOUR_HEIGHT);
								const cols = overlapColumns.get(event.id) || {
									column: 0,
									totalColumns: 1,
								};
								const colWidth = `calc((100% - 8px) / ${cols.totalColumns})`;
								const colLeft = `calc(4px + (100% - 8px) * ${cols.column} / ${cols.totalColumns})`;

								return (
									<CalendarEventBlock
										key={event.id}
										event={event}
										top={top}
										height={height}
										left={colLeft}
										width={colWidth}
										onEditEvent={onEditEvent}
										onDeleteEvent={onDeleteEvent}
									/>
								);
							})}
						</div>

						{/* Current time indicator */}
						{today && <CurrentTimeIndicator />}
					</div>
				</div>
			</div>
		</div>
	);
}

function CurrentTimeIndicator() {
	const [, setTick] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => setTick((t) => t + 1), 60000);
		return () => clearInterval(interval);
	}, []);

	const now = new Date();
	const top = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;

	return (
		<div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
			<div className="flex items-center">
				<div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
				<div className="flex-1 h-0.5 bg-red-500" />
			</div>
		</div>
	);
}
