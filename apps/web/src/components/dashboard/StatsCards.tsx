import { Card, CardContent } from '@/components/ui/card';
import { useDashboardQuery, type DashboardStats } from '@/hooks/use-dashboard';
import { AlertCircle, Clock, Calendar, FileWarning, Loader2, ListChecks } from 'lucide-react';

type StatCardProps = {
	title: string;
	icon: React.ReactNode;
	primary: string;
	secondary: string;
	variant?: 'default' | 'warning' | 'danger';
};

function StatCard({ title, icon, primary, secondary, variant = 'default' }: StatCardProps) {
	const variantStyles = {
		default: 'border-border',
		warning: 'border-amber-200 bg-amber-50/50',
		danger: 'border-red-200 bg-red-50/50',
	};

	const iconStyles = {
		default: 'text-muted-foreground',
		warning: 'text-amber-600',
		danger: 'text-red-600',
	};

	return (
		<Card className={`${variantStyles[variant]} py-4`}>
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
}

function formatCurrency(amount: string): string {
	const num = parseFloat(amount);
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(num);
}

export function StatsCards() {
	const { data: stats, isLoading } = useDashboardQuery();

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				{[...Array(5)].map((_, i) => (
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

	const overdueCount = stats.payments.overdueCount;
	const overdueAmount = formatCurrency(stats.payments.overdueAmount);
	const awaitingDecision = stats.quotes.awaitingDecision;
	const upcomingInstallations = stats.jobs.upcomingInstallations;
	const expiringSoon = stats.quotes.expiringSoon;
	const myOpenTasks = stats.tasks?.myOpenCount || 0;
	const myOverdueTasks = stats.tasks?.myOverdueCount || 0;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
			<StatCard
				title="Overdue Payments"
				icon={<AlertCircle className="h-5 w-5" />}
				primary={overdueCount.toString()}
				secondary={overdueCount > 0 ? `${overdueAmount} overdue` : 'All payments on track'}
				variant={overdueCount > 0 ? 'danger' : 'default'}
			/>
			<StatCard
				title="Awaiting Decision"
				icon={<Clock className="h-5 w-5" />}
				primary={awaitingDecision.toString()}
				secondary={awaitingDecision > 0 ? `${awaitingDecision === 1 ? 'quote needs' : 'quotes need'} follow-up` : 'No quotes pending'}
				variant={awaitingDecision > 0 ? 'warning' : 'default'}
			/>
			<StatCard
				title="This Week's Installs"
				icon={<Calendar className="h-5 w-5" />}
				primary={upcomingInstallations.toString()}
				secondary={upcomingInstallations > 0 ? `${upcomingInstallations === 1 ? 'job' : 'jobs'} scheduled` : 'No installs this week'}
				variant="default"
			/>
			<StatCard
				title="Expiring Soon"
				icon={<FileWarning className="h-5 w-5" />}
				primary={expiringSoon.toString()}
				secondary={expiringSoon > 0 ? `${expiringSoon === 1 ? 'quote expires' : 'quotes expire'} in 14 days` : 'No quotes expiring'}
				variant={expiringSoon > 0 ? 'warning' : 'default'}
			/>
			<StatCard
				title="My Open Tasks"
				icon={<ListChecks className="h-5 w-5" />}
				primary={myOpenTasks.toString()}
				secondary={myOverdueTasks > 0 ? `${myOverdueTasks} overdue` : 'All tasks on track'}
				variant={myOverdueTasks > 0 ? 'danger' : 'default'}
			/>
		</div>
	);
}
