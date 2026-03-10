import { parseISO, format, getContrastTextColor } from './calendar-utils';
import { EventDetailPopover } from './event-detail-popover';
import type { CalendarEvent } from './types';

type CalendarEventBlockProps = {
	event: CalendarEvent;
	top: number;
	height: number;
	left?: string;
	width?: string;
	onClick?: (event: CalendarEvent) => void;
	onEditEvent?: (event: CalendarEvent) => void;
	onDeleteEvent?: (eventId: string) => void;
};

export function CalendarEventBlock({
	event,
	top,
	height,
	left,
	width,
	onClick,
	onEditEvent,
	onDeleteEvent,
}: CalendarEventBlockProps) {
	const startTime = parseISO(event.start);
	const endTime = event.end ? parseISO(event.end) : null;
	const isCompact = height < 40;
	const textColor = getContrastTextColor(event.color);
	const subTextColor =
		textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)';

	const blockContent = (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick?.(event);
			}}
			className="absolute rounded-md px-2 overflow-hidden cursor-pointer text-left transition-all hover:shadow-md hover:z-10 pointer-events-auto"
			style={{
				top: `${top}px`,
				height: `${height}px`,
				left: left || '4px',
				width: width || 'calc(100% - 8px)',
				backgroundColor: event.color,
				color: textColor,
				paddingTop: isCompact ? '2px' : '4px',
				paddingBottom: isCompact ? '2px' : '4px',
			}}
			title={`${event.title}${endTime ? ` - ${format(startTime, 'h:mm a')} to ${format(endTime, 'h:mm a')}` : ''}`}
		>
			{isCompact ? (
				<div className="text-xs font-medium truncate leading-tight">
					{format(startTime, 'h:mm a')} {event.title}
				</div>
			) : (
				<>
					<div className="text-xs font-medium truncate leading-tight">
						{event.title}
					</div>
					{height > 48 && (
						<div
							className="text-[11px] truncate mt-0.5"
							style={{ color: subTextColor }}
						>
							{format(startTime, 'h:mm a')}
							{endTime && ` - ${format(endTime, 'h:mm a')}`}
						</div>
					)}
				</>
			)}
		</button>
	);

	return (
		<EventDetailPopover
			event={event}
			onEdit={onEditEvent}
			onDelete={onDeleteEvent}
		>
			{blockContent}
		</EventDetailPopover>
	);
}
