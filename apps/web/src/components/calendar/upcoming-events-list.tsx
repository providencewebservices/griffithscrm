import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { EventDetailPopover } from './event-detail-popover';
import {
	getUpcomingEvents,
	parseISO,
	format,
	isToday,
	isSameDay,
	addDays,
	startOfDay,
} from './calendar-utils';
import { getEventSourceLabel } from './types';
import type { CalendarEvent, CalendarView } from './types';

type UpcomingEventsListProps = {
	events: CalendarEvent[];
	currentDate: Date;
	view: CalendarView;
};

const MAX_EVENTS = 12;

function getDayLabel(date: Date): string {
	const today = startOfDay(new Date());
	const tomorrow = addDays(today, 1);

	if (isSameDay(date, today)) return 'Today';
	if (isSameDay(date, tomorrow)) return 'Tomorrow';
	return format(date, 'EEEE, MMM d');
}

function formatEventTime(event: CalendarEvent): string {
	if (event.allDay) return 'All day';
	const start = parseISO(event.start);
	if (event.end) {
		const end = parseISO(event.end);
		return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
	}
	return format(start, 'h:mm a');
}

type GroupedEvents = { date: Date; label: string; events: CalendarEvent[] }[];

function groupEventsByDay(events: CalendarEvent[]): GroupedEvents {
	const groups: GroupedEvents = [];
	let currentGroup: GroupedEvents[number] | null = null;

	for (const event of events) {
		const eventDate = startOfDay(parseISO(event.start));
		if (!currentGroup || !isSameDay(currentGroup.date, eventDate)) {
			currentGroup = {
				date: eventDate,
				label: getDayLabel(eventDate),
				events: [],
			};
			groups.push(currentGroup);
		}
		currentGroup.events.push(event);
	}

	return groups;
}

export function UpcomingEventsList({
	events,
	currentDate,
	view,
}: UpcomingEventsListProps) {
	const upcoming = useMemo(
		() => getUpcomingEvents(events, currentDate, view),
		[events, currentDate, view]
	);

	const truncated = upcoming.length > MAX_EVENTS;
	const displayEvents = truncated ? upcoming.slice(0, MAX_EVENTS) : upcoming;
	const grouped = useMemo(() => groupEventsByDay(displayEvents), [displayEvents]);
	const remainingCount = upcoming.length - MAX_EVENTS;

	if (upcoming.length === 0) {
		return (
			<div className="bg-card rounded-xl border shadow-sm px-4 py-6 text-center text-sm text-muted-foreground">
				No upcoming events
			</div>
		);
	}

	return (
		<div className="bg-card rounded-xl border shadow-sm">
			<div className="px-4 py-2">
				<h3 className="text-sm font-medium text-muted-foreground">
					{view === 'day' ? 'Events' : 'Upcoming'}
				</h3>
			</div>
			<div className="px-4 pb-3 space-y-3 max-h-80 overflow-y-auto">
				{grouped.map((group) => (
					<div key={group.label}>
						{view !== 'day' && (
							<div className="text-xs font-medium text-muted-foreground mb-1.5">
								{group.label}
							</div>
						)}
						<div className="space-y-1">
							{group.events.map((event) => (
								<EventDetailPopover key={event.id} event={event}>
									<button
										type="button"
										className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left hover:bg-muted/50 transition-colors cursor-pointer"
									>
										<span
											className="w-2 h-2 rounded-full shrink-0"
											style={{ backgroundColor: event.color }}
										/>
										<span className="text-xs text-muted-foreground w-28 shrink-0">
											{formatEventTime(event)}
										</span>
										<span className="text-sm truncate flex-1">
											{event.title}
										</span>
										<Badge
											variant="outline"
											className="text-[10px] shrink-0"
											style={{
												backgroundColor: `${event.color}10`,
												color: event.color,
												borderColor: `${event.color}40`,
											}}
										>
											{getEventSourceLabel(event.sourceType)}
										</Badge>
									</button>
								</EventDetailPopover>
							))}
						</div>
					</div>
				))}
				{truncated && (
					<div className="text-xs text-muted-foreground text-center py-1">
						and {remainingCount} more event{remainingCount !== 1 ? 's' : ''}
					</div>
				)}
			</div>
		</div>
	);
}
