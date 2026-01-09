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
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseISO, format, formatDateRange } from './calendar-utils';
import { getEventSourceLabel } from './types';
import type { CalendarEvent } from './types';

type EventDetailSheetProps = {
	event: CalendarEvent | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function EventDetailSheet({
	event,
	open,
	onOpenChange,
}: EventDetailSheetProps) {
	if (!event) return null;

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
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-md">
				<SheetHeader>
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
					<SheetTitle className="text-xl">{event.title}</SheetTitle>
					{event.description && (
						<SheetDescription>{event.description}</SheetDescription>
					)}
				</SheetHeader>

				<div className="mt-6 space-y-4">
					{/* Date/Time */}
					<div className="flex items-start gap-3">
						<Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
						<div>
							<div className="font-medium">
								{formatDateRange(startDate, endDate)}
							</div>
							{!event.allDay && (
								<div className="text-sm text-muted-foreground">
									{format(startDate, 'h:mm a')}
									{endDate && ` - ${format(endDate, 'h:mm a')}`}
								</div>
							)}
							{event.allDay && (
								<div className="text-sm text-muted-foreground">
									All day
								</div>
							)}
						</div>
					</div>

					{/* Source-specific details */}
					{event.sourceType === 'quote_valid_until' && (
						<div className="flex items-start gap-3">
							<FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
							<div>
								<div className="font-medium">Quote Expiration</div>
								<div className="text-sm text-muted-foreground">
									This quote expires on this date
								</div>
							</div>
						</div>
					)}

					{(event.sourceType === 'job_installation' ||
						event.sourceType === 'job_deadline') && (
						<div className="flex items-start gap-3">
							<Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
							<div>
								<div className="font-medium">
									{event.sourceType === 'job_installation'
										? 'Installation Date'
										: 'Job Deadline'}
								</div>
								<div className="text-sm text-muted-foreground">
									{event.sourceType === 'job_installation'
										? 'Scheduled installation for this job'
										: 'Deadline for completing this job'}
								</div>
							</div>
						</div>
					)}

					{event.sourceType === 'time_off' && (
						<>
							<div className="flex items-start gap-3">
								<User className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<div className="font-medium">Time Off Request</div>
									<div className="text-sm text-muted-foreground">
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
						</>
					)}

					{event.sourceType === 'custom' && event.recurrencePattern && event.recurrencePattern !== 'none' && (
						<div className="flex items-start gap-3">
							<Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
							<div>
								<div className="font-medium">Recurring Event</div>
								<div className="text-sm text-muted-foreground">
									Repeats {event.recurrencePattern}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Actions */}
				{detailLink && (
					<div className="mt-8">
						<Button asChild className="w-full">
							<Link to={detailLink}>
								View Details
								<ExternalLink className="ml-2 h-4 w-4" />
							</Link>
						</Button>
					</div>
				)}

				{event.sourceType === 'custom' && event.editable && (
					<div className="mt-8 text-sm text-muted-foreground text-center">
						Custom events can be edited from the calendar
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
