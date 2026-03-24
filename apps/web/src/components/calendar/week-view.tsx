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
	getWeekDays,
	isToday,
} from './calendar-utils';
import type { CalendarEvent } from './types';

const HOUR_HEIGHT = 48;

type WeekViewProps = {
	currentDate: Date;
	events: CalendarEvent[];
	onTimeSlotClick: (date: Date, hour: number) => void;
	onEditEvent?: (event: CalendarEvent) => void;
	onDeleteEvent?: (eventId: string) => void;
};

export function WeekView({
	currentDate,
	events,
	onTimeSlotClick,
	onEditEvent,
	onDeleteEvent,
}: WeekViewProps) {
	const days = useMemo(() => getWeekDays(currentDate), [currentDate]);
	const scrollRef = useRef<HTMLDivElement>(null);

	const { allDayEvents, timedEvents } = useMemo(
		() => ({
			allDayEvents: events.filter((e) => e.allDay),
			timedEvents: events.filter((e) => !e.allDay),
		}),
		[events],
	);

	const dayData = useMemo(
		() =>
			days.map((day) => {
				const dayTimedEvents = getEventsForDay(timedEvents, day);
				return {
					day,
					timedEvents: dayTimedEvents,
					columns: calculateOverlapColumns(dayTimedEvents),
				};
			}),
		[days, timedEvents],
	);

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
			<div className="min-w-[600px]">
				{/* Unified sticky header: day headers + all-day events */}
				<div className="sticky top-0 z-20 bg-background border-b shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06)]">
					{/* Day headers row */}
					<div className="grid grid-cols-[60px_repeat(7,1fr)]">
						<div className="border-r" />
						{days.map((day) => (
							<div
								key={day.toISOString()}
								className={cn(
									'text-center py-2 border-r',
									isToday(day) && 'bg-primary/10',
									day.getDay() === 0 || (day.getDay() === 6 && !isToday(day) && 'bg-muted/5'),
								)}
							>
								<div
									className={cn(
										'text-xs font-medium uppercase tracking-wide',
										isToday(day) ? 'text-primary' : 'text-muted-foreground',
									)}
								>
									{format(day, 'EEE')}
								</div>
								<div
									className={cn(
										'text-lg font-normal mt-0.5 text-muted-foreground',
										isToday(day) &&
											'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto text-base',
									)}
								>
									{format(day, 'd')}
								</div>
							</div>
						))}
					</div>

					{/* All-day events row */}
					{allDayEvents.length > 0 && (
						<div className="grid grid-cols-[60px_repeat(7,1fr)] border-t">
							<div className="border-r" />
							{days.map((day) => {
								const dayAllDayEvents = allDayEvents.filter(
									(e) => getEventsForDay([e], day).length > 0,
								);
								return (
									<div
										key={day.toISOString()}
										className={cn(
											'border-r px-1 py-1.5 overflow-hidden min-w-0',
											isToday(day) && 'bg-primary/10',
											(day.getDay() === 0 || day.getDay() === 6) && !isToday(day) && 'bg-muted/5',
										)}
									>
										{dayAllDayEvents.slice(0, 2).map((event) => (
											<div key={event.id} className="mb-0.5">
												<CalendarEventPill
													event={event}
													onEditEvent={onEditEvent}
													onDeleteEvent={onDeleteEvent}
												/>
											</div>
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
					)}
				</div>

				{/* Time grid */}
				<div className="flex">
					{/* Time labels column */}
					<div className="w-[60px] flex-shrink-0">
						{CALENDAR_HOURS.map((hour, hourIndex) => (
							<div
								key={hour}
								className="border-r border-b border-border text-xs text-muted-foreground text-right pr-2 relative bg-background"
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

					{/* Day columns */}
					{dayData.map(({ day, timedEvents: dayTimedEvents, columns: dayColumns }) => {
						const dayIsToday = isToday(day);
						const isWeekend = day.getDay() === 0 || day.getDay() === 6;

						return (
							<div key={day.toISOString()} className="flex-1 relative border-r min-w-0">
								{/* Hour cells (click targets + visual dividers) */}
								{CALENDAR_HOURS.map((hour) => {
									const isOffHours = hour < BUSINESS_HOURS_START || hour >= BUSINESS_HOURS_END;
									return (
										<div
											key={hour}
											className={cn(
												'border-b border-border transition-colors cursor-pointer hover:bg-muted/30',
												isOffHours && 'bg-muted/40',
												isWeekend && !dayIsToday && !isOffHours && 'bg-muted/5',
												dayIsToday && !isOffHours && 'bg-primary/10',
											)}
											style={{
												height: HOUR_HEIGHT,
											}}
											onClick={() => onTimeSlotClick(day, hour)}
										/>
									);
								})}

								{/* Events overlay */}
								<div className="absolute inset-0 pointer-events-none">
									{dayTimedEvents.map((event) => {
										const { top, height } = calculateEventPosition(event, HOUR_HEIGHT);
										const cols = dayColumns.get(event.id) || {
											column: 0,
											totalColumns: 1,
										};
										const colWidth = `calc((100% - 4px) / ${cols.totalColumns})`;
										const colLeft = `calc(2px + (100% - 4px) * ${cols.column} / ${cols.totalColumns})`;

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
								{dayIsToday && <CurrentTimeIndicator />}
							</div>
						);
					})}
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
