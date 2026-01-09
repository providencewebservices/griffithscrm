import { parseISO, format } from './calendar-utils';
import type { CalendarEvent } from './types';

type CalendarEventBlockProps = {
	event: CalendarEvent;
	top: number;
	height: number;
	onClick: (event: CalendarEvent) => void;
};

export function CalendarEventBlock({
	event,
	top,
	height,
	onClick,
}: CalendarEventBlockProps) {
	const startTime = parseISO(event.start);
	const endTime = event.end ? parseISO(event.end) : null;

	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick(event);
			}}
			className="absolute left-1 right-1 rounded-md px-2 py-1 text-xs shadow-sm hover:shadow-md transition-shadow border-l-[3px] overflow-hidden cursor-pointer text-left"
			style={{
				top: `${top}px`,
				height: `${height}px`,
				backgroundColor: `${event.color}15`,
				borderLeftColor: event.color,
			}}
			title={event.title}
		>
			<div
				className="font-medium truncate"
				style={{ color: event.color }}
			>
				{event.title}
			</div>
			{height > 40 && (
				<div className="text-muted-foreground truncate text-[10px]">
					{format(startTime, 'h:mm a')}
					{endTime && ` - ${format(endTime, 'h:mm a')}`}
				</div>
			)}
		</button>
	);
}
