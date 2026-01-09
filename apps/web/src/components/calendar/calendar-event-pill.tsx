import { parseISO, format } from './calendar-utils';
import type { CalendarEvent } from './types';

type CalendarEventPillProps = {
	event: CalendarEvent;
	onClick: (event: CalendarEvent) => void;
};

export function CalendarEventPill({ event, onClick }: CalendarEventPillProps) {
	const startTime = parseISO(event.start);
	const timeDisplay = event.allDay ? '' : format(startTime, 'h:mm ');

	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick(event);
			}}
			className="w-full text-left text-xs px-2 py-0.5 rounded-md truncate transition-opacity hover:opacity-80 cursor-pointer"
			style={{
				backgroundColor: `${event.color}20`,
				color: event.color,
				borderLeft: `3px solid ${event.color}`,
			}}
			title={event.title}
		>
			{timeDisplay}
			{event.title}
		</button>
	);
}
