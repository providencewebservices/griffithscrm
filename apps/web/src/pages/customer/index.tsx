import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { PipelineBoard } from '@/components/dashboard/pipeline-board';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { Calendar } from '@/components/calendar/calendar';
import { Plus, UserPlus, CalendarDays, LayoutGrid } from 'lucide-react';

export function CustomerDashboard() {
	const [showCalendar, setShowCalendar] = useState(false);

	return (
		<div className="space-y-6">
			<DashboardHeader
				showCalendar={showCalendar}
				onToggleView={() => setShowCalendar(!showCalendar)}
			/>
			{showCalendar ? (
				<Calendar />
			) : (
				<>
					<StatsCards />
					<PipelineBoard />
				</>
			)}
		</div>
	);
}

// Dashboard Header Component
interface DashboardHeaderProps {
	showCalendar: boolean;
	onToggleView: () => void;
}

function DashboardHeader({ showCalendar, onToggleView }: DashboardHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">
					Overview of quotes, jobs, and payments
				</p>
			</div>
			<div className="flex gap-2">
				<Link to="/app/quotes/new">
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						New Quote
					</Button>
				</Link>
				<Link to="/app/customers/new">
					<Button variant="outline">
						<UserPlus className="h-4 w-4 mr-2" />
						New Customer
					</Button>
				</Link>
				<Button variant="outline" onClick={onToggleView}>
					{showCalendar ? (
						<>
							<LayoutGrid className="h-4 w-4 mr-2" />
							View Pipelines
						</>
					) : (
						<>
							<CalendarDays className="h-4 w-4 mr-2" />
							View Calendar
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
