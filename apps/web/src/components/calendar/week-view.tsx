import { useMemo, useEffect, useState } from 'react';
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
import { EventDetailPopover } from './event-detail-popover';
import type { CalendarEvent } from './types';

const HOUR_HEIGHT = 48;

type WeekViewProps = {
	currentDate: Date;
	events: CalendarEvent[];
	onTimeSlotClick: (date: Date, hour: number) => void;
};

export function WeekView({
	currentDate,
	events,
	onTimeSlotClick,
}: WeekViewProps) {
	const days = useMemo(() => getWeekDays(currentDate), [currentDate]);

	const allDayEvents = events.filter((e) => e.allDay);
	const timedEvents = events.filter((e) => !e.allDay);

	return (
		<div className="flex-1 overflow-auto">
			<div className="min-w-[600px]">
				{/* All-day events section */}
				{allDayEvents.length > 0 && (
					<div className="border-b bg-muted/30 sticky top-0 z-20">
						<div className="grid grid-cols-[60px_repeat(7,1fr)]">
							<div className="border-r bg-background flex items-center justify-end pr-2">
								<span className="text-[10px] text-muted-foreground font-medium">
									ALL DAY
								</span>
							</div>
							{days.map((day) => {
								const dayAllDayEvents = allDayEvents.filter(
									(e) => getEventsForDay([e], day).length > 0
								);
								return (
									<div
										key={day.toISOString()}
										className={cn(
											'border-r p-1.5 min-h-[40px]',
											isToday(day) && 'bg-primary/5'
										)}
									>
										{dayAllDayEvents.slice(0, 2).map((event) => (
											<EventDetailPopover key={event.id} event={event}>
												<button
													type="button"
													onClick={(e) => e.stopPropagation()}
													className="w-full text-left text-xs px-2 py-1 rounded truncate mb-1 cursor-pointer hover:opacity-80 transition-opacity"
													style={{
														backgroundColor: `${event.color}20`,
														color: event.color,
														borderLeft: `3px solid ${event.color}`,
													}}
												>
													{event.title}
												</button>
											</EventDetailPopover>
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

				{/* Day headers - sticky */}
				<div
					className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-background sticky z-20"
					style={{ top: allDayEvents.length > 0 ? 'auto' : 0 }}
				>
					<div className="border-r" />
					{days.map((day) => (
						<div
							key={day.toISOString()}
							className={cn(
								'text-center py-2 border-r',
								isToday(day) && 'bg-primary/5'
							)}
						>
							<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								{format(day, 'EEE')}
							</div>
							<div
								className={cn(
									'text-xl font-semibold mt-0.5',
									isToday(day) &&
										'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto text-base'
								)}
							>
								{format(day, 'd')}
							</div>
						</div>
					))}
				</div>

				{/* Time grid */}
				<div className="grid grid-cols-[60px_repeat(7,1fr)]">
					{CALENDAR_HOURS.map((hour, hourIndex) => (
						<HourRow
							key={hour}
							hour={hour}
							hourIndex={hourIndex}
							days={days}
							timedEvents={timedEvents}
							onTimeSlotClick={onTimeSlotClick}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function HourRow({
	hour,
	hourIndex,
	days,
	timedEvents,
	onTimeSlotClick,
}: {
	hour: number;
	hourIndex: number;
	days: Date[];
	timedEvents: CalendarEvent[];
	onTimeSlotClick: (date: Date, hour: number) => void;
}) {
	return (
		<>
			{/* Time label cell */}
			<div
				className="border-r border-b text-[11px] text-muted-foreground text-right pr-2 relative bg-background"
				style={{ height: HOUR_HEIGHT }}
			>
				{hourIndex > 0 && (
					<span className="absolute -top-[9px] right-2 bg-background px-0.5">
						{formatHour(hour)}
					</span>
				)}
			</div>

			{/* Day cells for this hour */}
			{days.map((day) => {
				const dayTimedEvents = getEventsForDay(timedEvents, day).filter((event) => {
					const eventHour = new Date(event.start).getHours();
					return eventHour === hour;
				});

				return (
					<div
						key={day.toISOString()}
						className={cn(
							'border-r border-b relative hover:bg-muted/30 transition-colors cursor-pointer',
							isToday(day) && 'bg-primary/5'
						)}
						style={{ height: HOUR_HEIGHT }}
						onClick={() => onTimeSlotClick(day, hour)}
					>
						{dayTimedEvents.map((event) => {
							const { top, height } = calculateEventPosition(event, HOUR_HEIGHT);
							const hourTop = hour * HOUR_HEIGHT;
							const relativeTop = top - hourTop;

							return (
								<CalendarEventBlock
									key={event.id}
									event={event}
									top={relativeTop}
									height={height}
								/>
							);
						})}

						{isToday(day) && <CurrentTimeIndicatorForHour hour={hour} />}
					</div>
				);
			})}
		</>
	);
}

function CurrentTimeIndicatorForHour({ hour }: { hour: number }) {
	const [, setTick] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => setTick((t) => t + 1), 60000);
		return () => clearInterval(interval);
	}, []);

	const now = new Date();
	const currentHour = now.getHours();
	const minute = now.getMinutes();

	if (currentHour !== hour) return null;

	const top = (minute / 60) * HOUR_HEIGHT;

	return (
		<div
			className="absolute left-0 right-0 z-20 pointer-events-none"
			style={{ top: `${top}px` }}
		>
			<div className="flex items-center">
				<div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
				<div className="flex-1 h-0.5 bg-red-500" />
			</div>
		</div>
	);
}
