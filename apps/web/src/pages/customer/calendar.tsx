import { Calendar } from '@/components/calendar';

export function CalendarPage() {
	return (
		<div>
			<div className="mb-4">
				<h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
				<p className="text-muted-foreground">
					View and manage scheduled events, deadlines, and time off
				</p>
			</div>
			<Calendar />
		</div>
	);
}
