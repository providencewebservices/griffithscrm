import { useEffect, useState, useRef } from 'react';
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
import { EventDetailPopover } from './event-detail-popover';
import type { CalendarEvent } from './types';

const HOUR_HEIGHT = 48;

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
	const dayEvents = getEventsForDay(events, currentDate);
	const allDayEvents = dayEvents.filter((e) => e.allDay);
	const timedEvents = dayEvents.filter((e) => !e.allDay);
	const today = isToday(currentDate);
	const scrollRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to current time on mount/date change
	useEffect(() => {
		if (scrollRef.current) {
			const currentHour = new Date().getHours();
			const scrollTarget = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
			scrollRef.current.scrollTop = scrollTarget;
		}
	}, [currentDate]);

	return (
		<div className="flex-1 overflow-auto" ref={scrollRef}>
			<div className="min-w-[300px]">
				{/* Day header */}
				<div className="border-b bg-background py-3 px-4 sticky top-0 z-20">
					<div className="flex items-center gap-3">
						<div
							className={cn(
								'text-2xl font-bold',
								today &&
									'bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center text-lg'
							)}
						>
							{format(currentDate, 'd')}
						</div>
						<div>
							<div className="text-base font-medium">
								{format(currentDate, 'EEEE')}
							</div>
							<div className="text-sm text-muted-foreground">
								{format(currentDate, 'MMMM yyyy')}
							</div>
						</div>
					</div>
				</div>

				{/* All-day events section */}
				{allDayEvents.length > 0 && (
					<div className="border-b bg-muted/30">
						<div className="grid grid-cols-[60px_1fr]">
							<div className="border-r bg-background flex items-center justify-end pr-2">
								<span className="text-[10px] text-muted-foreground font-medium">
									ALL DAY
								</span>
							</div>
							<div className="p-2 space-y-1">
								{allDayEvents.map((event) => (
									<EventDetailPopover
										key={event.id}
										event={event}
										onEdit={onEditEvent}
										onDelete={onDeleteEvent}
									>
										<button
											type="button"
											onClick={(e) => e.stopPropagation()}
											className="w-full text-left text-sm px-3 py-1.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
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
							</div>
						</div>
					</div>
				)}

				{/* Time grid */}
				<div className="grid grid-cols-[60px_1fr]">
					{CALENDAR_HOURS.map((hour, hourIndex) => (
						<HourRow
							key={hour}
							hour={hour}
							hourIndex={hourIndex}
							currentDate={currentDate}
							timedEvents={timedEvents}
							today={today}
							onTimeSlotClick={onTimeSlotClick}
							onEditEvent={onEditEvent}
							onDeleteEvent={onDeleteEvent}
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
	currentDate,
	timedEvents,
	today,
	onTimeSlotClick,
	onEditEvent,
	onDeleteEvent,
}: {
	hour: number;
	hourIndex: number;
	currentDate: Date;
	timedEvents: CalendarEvent[];
	today: boolean;
	onTimeSlotClick: (date: Date, hour: number) => void;
	onEditEvent?: (event: CalendarEvent) => void;
	onDeleteEvent?: (eventId: string) => void;
}) {
	const hourEvents = timedEvents.filter((event) => {
		const eventHour = new Date(event.start).getHours();
		return eventHour === hour;
	});

	return (
		<>
			{/* Time label cell */}
			<div
				className="border-r border-b border-border/50 text-[11px] text-muted-foreground text-right pr-2 relative bg-background"
				style={{ height: HOUR_HEIGHT }}
			>
				{hourIndex > 0 && (
					<span className="absolute -top-[9px] right-2 bg-background px-0.5">
						{formatHour(hour)}
					</span>
				)}
			</div>

			{/* Day cell for this hour */}
			<div
				className={cn(
					'border-b border-border/50 relative hover:bg-muted/30 transition-colors cursor-pointer',
					today && 'bg-primary/5'
				)}
				style={{ height: HOUR_HEIGHT }}
				onClick={() => onTimeSlotClick(currentDate, hour)}
			>
				{hourEvents.map((event) => {
					const { top, height } = calculateEventPosition(event, HOUR_HEIGHT);
					const hourTop = hour * HOUR_HEIGHT;
					const relativeTop = top - hourTop;

					return (
						<CalendarEventBlock
							key={event.id}
							event={event}
							top={relativeTop}
							height={height}
							onEditEvent={onEditEvent}
							onDeleteEvent={onDeleteEvent}
						/>
					);
				})}

				{today && <CurrentTimeIndicatorForHour hour={hour} />}
			</div>
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
