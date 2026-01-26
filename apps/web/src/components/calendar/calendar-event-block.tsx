import { parseISO, format } from './calendar-utils';
import { EventDetailPopover } from './event-detail-popover';
import type { CalendarEvent } from './types';

type CalendarEventBlockProps = {
	event: CalendarEvent;
	top: number;
	height: number;
	onClick?: (event: CalendarEvent) => void;
};

export function CalendarEventBlock({
	event,
	top,
	height,
	onClick,
}: CalendarEventBlockProps) {
	const startTime = parseISO(event.start);
	const endTime = event.end ? parseISO(event.end) : null;
	const isCompact = height < 40;

	const blockContent = (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick?.(event);
			}}
			className="absolute left-1 right-1 rounded-md px-2 overflow-hidden cursor-pointer text-left transition-all hover:shadow-md hover:z-10 border-l-[3px]"
			style={{
				top: `${top}px`,
				height: `${height}px`,
				backgroundColor: `${event.color}15`,
				borderLeftColor: event.color,
				paddingTop: isCompact ? '2px' : '4px',
				paddingBottom: isCompact ? '2px' : '4px',
			}}
			title={`${event.title}${endTime ? ` - ${format(startTime, 'h:mm a')} to ${format(endTime, 'h:mm a')}` : ''}`}
		>
			{isCompact ? (
				<div
					className="text-xs font-medium truncate leading-tight"
					style={{ color: event.color }}
				>
					{format(startTime, 'h:mm')} {event.title}
				</div>
			) : (
				<>
					<div
						className="text-xs font-medium truncate leading-tight"
						style={{ color: event.color }}
					>
						{event.title}
					</div>
					{height > 48 && (
						<div className="text-[10px] text-muted-foreground truncate mt-0.5">
							{format(startTime, 'h:mm a')}
							{endTime && ` - ${format(endTime, 'h:mm a')}`}
						</div>
					)}
				</>
			)}
		</button>
	);

	return <EventDetailPopover event={event}>{blockContent}</EventDetailPopover>;
}
