import { parseISO, format } from './calendar-utils';
import { EventDetailPopover } from './event-detail-popover';
import type { CalendarEvent } from './types';

type CalendarEventPillProps = {
	event: CalendarEvent;
	onClick?: (event: CalendarEvent) => void;
	onEditEvent?: (event: CalendarEvent) => void;
	onDeleteEvent?: (eventId: string) => void;
};

export function CalendarEventPill({ event, onClick, onEditEvent, onDeleteEvent }: CalendarEventPillProps) {
	const startTime = parseISO(event.start);
	const timeDisplay = event.allDay ? '' : format(startTime, 'h:mm a') + ' ';

	const pillContent = (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick?.(event);
			}}
			className="w-full text-left text-xs font-medium px-2 py-1 rounded-md truncate transition-opacity hover:opacity-80 cursor-pointer"
			style={{
				backgroundColor: `${event.color}30`,
				color: event.color,
				borderLeft: `3px solid ${event.color}`,
			}}
			title={event.title}
		>
			{timeDisplay}
			{event.title}
		</button>
	);

	return (
		<EventDetailPopover
			event={event}
			onEdit={onEditEvent}
			onDelete={onDeleteEvent}
		>
			{pillContent}
		</EventDetailPopover>
	);
}
