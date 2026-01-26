import { Link } from 'react-router';
import {
	Calendar,
	Clock,
	FileText,
	Briefcase,
	User,
	ExternalLink,
} from 'lucide-react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseISO, format, formatDateRange } from './calendar-utils';
import { getEventSourceLabel } from './types';
import type { CalendarEvent } from './types';

type EventDetailPopoverProps = {
	event: CalendarEvent;
	children: React.ReactNode;
};

export function EventDetailPopover({
	event,
	children,
}: EventDetailPopoverProps) {
	const startDate = parseISO(event.start);
	const endDate = event.end ? parseISO(event.end) : null;

	// Get link to source entity
	const getDetailLink = (): string | null => {
		switch (event.sourceType) {
			case 'quote_valid_until':
				return event.linkedQuoteId
					? `/app/quotes/${event.linkedQuoteId}`
					: null;
			case 'job_installation':
			case 'job_deadline':
				return event.linkedJobId ? `/app/jobs/${event.linkedJobId}` : null;
			case 'custom':
				// Custom events don't have a separate detail page
				return null;
			case 'time_off':
				// Could link to time-off management page
				return null;
			default:
				return null;
		}
	};

	const detailLink = getDetailLink();

	return (
		<Popover>
			<PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
				{children}
			</PopoverTrigger>
			<PopoverContent className="w-80" align="start" side="bottom" sideOffset={4}>
				<div className="space-y-4">
					{/* Header */}
					<div>
						<div className="flex items-center gap-2 mb-1">
							<Badge
								className="text-xs"
								style={{
									backgroundColor: `${event.color}20`,
									color: event.color,
									borderColor: event.color,
								}}
								variant="outline"
							>
								{getEventSourceLabel(event.sourceType)}
							</Badge>
						</div>
						<h4 className="font-semibold text-base">{event.title}</h4>
						{event.description && (
							<p className="text-sm text-muted-foreground mt-1">
								{event.description}
							</p>
						)}
					</div>

					{/* Date/Time */}
					<div className="flex items-start gap-3">
						<Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
						<div>
							<div className="text-sm font-medium">
								{formatDateRange(startDate, endDate)}
							</div>
							{!event.allDay && (
								<div className="text-xs text-muted-foreground">
									{format(startDate, 'h:mm a')}
									{endDate && ` - ${format(endDate, 'h:mm a')}`}
								</div>
							)}
							{event.allDay && (
								<div className="text-xs text-muted-foreground">All day</div>
							)}
						</div>
					</div>

					{/* Source-specific details */}
					{event.sourceType === 'quote_valid_until' && (
						<div className="flex items-start gap-3">
							<FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
							<div>
								<div className="text-sm font-medium">Quote Expiration</div>
								<div className="text-xs text-muted-foreground">
									This quote expires on this date
								</div>
							</div>
						</div>
					)}

					{(event.sourceType === 'job_installation' ||
						event.sourceType === 'job_deadline') && (
						<div className="flex items-start gap-3">
							<Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
							<div>
								<div className="text-sm font-medium">
									{event.sourceType === 'job_installation'
										? 'Installation Date'
										: 'Job Deadline'}
								</div>
								<div className="text-xs text-muted-foreground">
									{event.sourceType === 'job_installation'
										? 'Scheduled installation for this job'
										: 'Deadline for completing this job'}
								</div>
							</div>
						</div>
					)}

					{event.sourceType === 'time_off' && (
						<div className="flex items-start gap-3">
							<User className="h-4 w-4 text-muted-foreground mt-0.5" />
							<div>
								<div className="text-sm font-medium">Time Off Request</div>
								<div className="text-xs text-muted-foreground">
									{event.userName || 'Team member'} -{' '}
									<span
										className={
											event.status === 'approved'
												? 'text-green-600'
												: event.status === 'pending'
													? 'text-amber-600'
													: 'text-red-600'
										}
									>
										{event.status}
									</span>
								</div>
							</div>
						</div>
					)}

					{event.sourceType === 'custom' &&
						event.recurrencePattern &&
						event.recurrencePattern !== 'none' && (
							<div className="flex items-start gap-3">
								<Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<div className="text-sm font-medium">Recurring Event</div>
									<div className="text-xs text-muted-foreground">
										Repeats {event.recurrencePattern}
									</div>
								</div>
							</div>
						)}

					{/* Actions */}
					{detailLink && (
						<Button asChild size="sm" className="w-full">
							<Link to={detailLink}>
								View Details
								<ExternalLink className="ml-2 h-3 w-3" />
							</Link>
						</Button>
					)}

					{event.sourceType === 'custom' && event.editable && (
						<p className="text-xs text-muted-foreground text-center">
							Custom events can be edited from the calendar
						</p>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
