// Calendar view types
export type CalendarView = 'month' | 'week' | 'day';

// Event source types (matches API)
export type EventSource =
	| 'quote_valid_until'
	| 'job_installation'
	| 'job_deadline'
	| 'custom'
	| 'time_off';

// Calendar event from API
export type CalendarEvent = {
	id: string;
	sourceType: EventSource;
	sourceId: string;
	title: string;
	description: string | null;
	start: string; // ISO date string
	end: string | null; // ISO date string
	allDay: boolean;
	editable: boolean;
	color: string;
	linkedCustomerId?: string | null;
	linkedQuoteId?: string | null;
	linkedJobId?: string | null;
	recurrencePattern?: string;
	recurrenceParentId?: string;
	// Time-off specific
	userId?: string;
	userName?: string;
	status?: string;
};

// Calendar settings from API
export type CalendarSettings = {
	quoteValidUntilColor: string;
	jobInstallationColor: string;
	jobDeadlineColor: string;
	customEventColor: string;
	timeOffApprovedColor: string;
	timeOffPendingColor: string;
};

// Default colors
export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
	quoteValidUntilColor: '#3B82F6',
	jobInstallationColor: '#10B981',
	jobDeadlineColor: '#F59E0B',
	customEventColor: '#8B5CF6',
	timeOffApprovedColor: '#6B7280',
	timeOffPendingColor: '#EF4444',
};

// Event source labels
export const EVENT_SOURCE_LABELS: Record<EventSource, string> = {
	quote_valid_until: 'Quote Expires',
	job_installation: 'Installation',
	job_deadline: 'Deadline',
	custom: 'Event',
	time_off: 'Time Off',
};

// Get human-readable label for event source
export function getEventSourceLabel(source: EventSource): string {
	return EVENT_SOURCE_LABELS[source] || source;
}
