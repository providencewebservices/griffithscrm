import { ArrowRight, CalendarDays } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import {
	addDays,
	format,
	isSameDay,
	parseISO,
	startOfDay,
} from '@/components/calendar/calendar-utils';
import { EventDetailPopover } from '@/components/calendar/event-detail-popover';
import type { CalendarEvent } from '@/components/calendar/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCalendarEventsQuery } from '@/hooks/use-calendar';

const MAX_EVENTS = 5;

function getDayLabel(date: Date): string {
	const today = startOfDay(new Date());
	const tomorrow = addDays(today, 1);

	if (isSameDay(date, today)) return 'Today';
	if (isSameDay(date, tomorrow)) return 'Tomorrow';
	return format(date, 'EEE, d MMM');
}

function formatEventTime(event: CalendarEvent): string {
	if (event.allDay) return 'All day';
	return format(parseISO(event.start), 'h:mm a');
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

export function UpcomingEvents() {
	const now = useMemo(() => new Date(), []);
	const start = useMemo(() => startOfDay(now), [now]);
	const end = useMemo(() => addDays(start, 7), [start]);

	const { data: events } = useCalendarEventsQuery(start, end);

	const upcoming = useMemo(() => {
		if (!events) return [];

		const today = startOfDay(new Date());
		return events
			.filter((e) => {
				const eventStart = parseISO(e.start);
				const eventEnd = e.end ? parseISO(e.end) : eventStart;
				return eventStart >= today || eventEnd >= today;
			})
			.sort((a, b) => {
				const aStart = parseISO(a.start);
				const bStart = parseISO(b.start);
				const aDay = startOfDay(aStart);
				const bDay = startOfDay(bStart);

				if (aDay.getTime() !== bDay.getTime()) {
					return aDay.getTime() - bDay.getTime();
				}

				if (a.allDay && !b.allDay) return -1;
				if (!a.allDay && b.allDay) return 1;

				return aStart.getTime() - bStart.getTime();
			})
			.slice(0, MAX_EVENTS);
	}, [events]);

	const grouped = useMemo(() => groupEventsByDay(upcoming), [upcoming]);

	return (
		<Card className="flex-1">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CalendarDays className="h-4 w-4 text-muted-foreground" />
						<CardTitle className="text-base font-semibold">Upcoming</CardTitle>
					</div>
					<Link to="/app/calendar">
						<Button variant="ghost" size="sm" className="text-xs">
							View calendar
							<ArrowRight className="h-3 w-3 ml-1" />
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				{upcoming.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
				) : (
					<div className="space-y-3">
						{grouped.map((group) => (
							<div key={group.label}>
								<div className="text-xs font-medium text-muted-foreground mb-1.5">
									{group.label}
								</div>
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
												<span className="text-xs text-muted-foreground shrink-0">
													{formatEventTime(event)}
												</span>
												<span className="text-sm truncate flex-1">{event.title}</span>
											</button>
										</EventDetailPopover>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
