import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	CalendarEvent,
	CalendarSettings,
} from '@/components/calendar/types';
import { DEFAULT_CALENDAR_SETTINGS } from '@/components/calendar/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Fetch calendar events for a date range
export function useCalendarEventsQuery(start: Date, end: Date) {
	return useQuery({
		queryKey: ['calendar-events', start.toISOString(), end.toISOString()],
		queryFn: async (): Promise<CalendarEvent[]> => {
			const params = new URLSearchParams({
				start: start.toISOString(),
				end: end.toISOString(),
			});

			const response = await fetch(
				`${API_URL}/api/calendar/events?${params}`,
				{
					credentials: 'include',
				}
			);

			if (!response.ok) {
				throw new Error('Failed to fetch calendar events');
			}

			const data = await response.json();
			return data.events;
		},
		staleTime: 30000, // 30 seconds
	});
}

// Fetch calendar settings
export function useCalendarSettingsQuery() {
	return useQuery({
		queryKey: ['calendar-settings'],
		queryFn: async (): Promise<CalendarSettings> => {
			const response = await fetch(`${API_URL}/api/calendar/settings`, {
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error('Failed to fetch calendar settings');
			}

			const data = await response.json();
			return data.settings || DEFAULT_CALENDAR_SETTINGS;
		},
		staleTime: 60000, // 1 minute
	});
}

// Create calendar event input type
export type CreateCalendarEventInput = {
	title: string;
	description?: string;
	startAt: string;
	endAt?: string;
	isAllDay?: boolean;
	linkedQuoteId?: string;
	linkedJobId?: string;
	linkedCustomerId?: string;
	recurrencePattern?: 'none' | 'daily' | 'weekly' | 'monthly';
	recurrenceEndDate?: string;
};

// Create calendar event mutation
export function useCreateCalendarEventMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateCalendarEventInput) => {
			const response = await fetch(`${API_URL}/api/calendar/events`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create event');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
		},
	});
}

// Update calendar event input type
export type UpdateCalendarEventInput = {
	id: string;
	title?: string;
	description?: string | null;
	startAt?: string;
	endAt?: string | null;
	isAllDay?: boolean;
	linkedQuoteId?: string | null;
	linkedJobId?: string | null;
	linkedCustomerId?: string | null;
	recurrencePattern?: 'none' | 'daily' | 'weekly' | 'monthly';
	recurrenceEndDate?: string | null;
};

// Update calendar event mutation
export function useUpdateCalendarEventMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, ...input }: UpdateCalendarEventInput) => {
			const response = await fetch(`${API_URL}/api/calendar/events/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update event');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
		},
	});
}

// Delete calendar event mutation
export function useDeleteCalendarEventMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const response = await fetch(`${API_URL}/api/calendar/events/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete event');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
		},
	});
}

// Reschedule event mutation (for drag & drop)
export type RescheduleEventInput = {
	id: string;
	startAt: string;
	endAt?: string;
};

export function useRescheduleEventMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, startAt, endAt }: RescheduleEventInput) => {
			const response = await fetch(
				`${API_URL}/api/calendar/events/${id}/reschedule`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ startAt, endAt }),
					credentials: 'include',
				}
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to reschedule event');
			}

			return response.json();
		},
		onSuccess: () => {
			// Invalidate both calendar events and related queries
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
			queryClient.invalidateQueries({ queryKey: ['jobs'] });
		},
	});
}

// Update calendar settings mutation
export function useUpdateCalendarSettingsMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (settings: Partial<CalendarSettings>) => {
			const response = await fetch(`${API_URL}/api/calendar/settings`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update settings');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['calendar-settings'] });
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
		},
	});
}
