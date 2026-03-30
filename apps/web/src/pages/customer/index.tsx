import { Plus, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { AttentionBanner } from '@/components/dashboard/attention-banner';
import { NewInquiriesWidget } from '@/components/dashboard/new-inquiries-widget';
import { PipelineSummary } from '@/components/dashboard/pipeline-summary';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { UpcomingEvents } from '@/components/dashboard/upcoming-events';
import { MyTasksWidget } from '@/components/tasks/my-tasks-widget';
import { Button } from '@/components/ui/button';

export function CustomerDashboard() {
	return (
		<div className="space-y-6">
			<DashboardHeader />
			<AttentionBanner />
			<StatsCards />
			<MyTasksWidget />
			<div className="grid lg:grid-cols-5 gap-6">
				<div className="lg:col-span-3">
					<RecentActivity />
				</div>
				<div className="lg:col-span-2 space-y-6">
					<NewInquiriesWidget />
					<UpcomingEvents />
				</div>
			</div>
			<PipelineSummary />
		</div>
	);
}

// Dashboard Header Component
function DashboardHeader() {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">Overview of quotes, jobs, and payments</p>
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
			</div>
		</div>
	);
}
