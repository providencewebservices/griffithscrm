import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardQuery } from '@/hooks/use-dashboard';
import { Calendar, Loader2, ListChecks } from 'lucide-react';

type StatCardProps = {
	title: string;
	icon: React.ReactNode;
	primary: string;
	secondary: string;
	variant?: 'default' | 'danger';
	href?: string;
};

function StatCard({ title, icon, primary, secondary, variant = 'default', href }: StatCardProps) {
	const variantStyles = {
		default: 'border-border',
		danger: 'border-red-200 bg-red-50/50',
	};

	const iconStyles = {
		default: 'text-muted-foreground',
		danger: 'text-red-600',
	};

	const card = (
		<Card className={`${variantStyles[variant]} py-4 ${href ? 'hover:shadow-md cursor-pointer transition-shadow' : ''}`}>
			<CardContent className="flex items-start gap-4">
				<div className={`p-2 rounded-lg bg-muted/50 ${iconStyles[variant]}`}>
					{icon}
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-muted-foreground">{title}</p>
					<p className="text-2xl font-bold mt-0.5">{primary}</p>
					<p className="text-sm text-muted-foreground mt-0.5 truncate">{secondary}</p>
				</div>
			</CardContent>
		</Card>
	);

	if (href) {
		return <Link to={href}>{card}</Link>;
	}

	return card;
}

export function StatsCards() {
	const { data: stats, isLoading } = useDashboardQuery();

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
				{[...Array(2)].map((_, i) => (
					<Card key={i} className="py-4">
						<CardContent className="flex items-center justify-center h-20">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (!stats) {
		return null;
	}

	const upcomingInstallations = stats.jobs.upcomingInstallations;
	const myOpenTasks = stats.tasks?.myOpenCount || 0;
	const myOverdueTasks = stats.tasks?.myOverdueCount || 0;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
			<StatCard
				title="This Week's Installs"
				icon={<Calendar className="h-5 w-5" />}
				primary={upcomingInstallations.toString()}
				secondary={upcomingInstallations > 0
					? `${upcomingInstallations === 1 ? 'job' : 'jobs'} scheduled`
					: 'No installs this week'}
				variant="default"
				href="/app/jobs?status=ready_for_install"
			/>
			<StatCard
				title="My Open Tasks"
				icon={<ListChecks className="h-5 w-5" />}
				primary={myOpenTasks.toString()}
				secondary={myOverdueTasks > 0 ? `${myOverdueTasks} overdue` : 'All tasks on track'}
				variant={myOverdueTasks > 0 ? 'danger' : 'default'}
				href="/app/tasks"
			/>
		</div>
	);
}
