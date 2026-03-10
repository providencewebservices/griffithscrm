import { Link } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { useDashboardQuery } from '@/hooks/use-dashboard';
import { useTaskSummaryQuery } from '@/hooks/use-tasks';

type AttentionItem = {
	label: string;
	href: string;
};

export function AttentionBanner() {
	const { data: stats } = useDashboardQuery();
	const { data: taskSummary } = useTaskSummaryQuery();

	if (!stats && !taskSummary) return null;

	const items: AttentionItem[] = [];

	if (stats?.payments.overdueCount && stats.payments.overdueCount > 0) {
		items.push({
			label: `${stats.payments.overdueCount} overdue payment${stats.payments.overdueCount === 1 ? '' : 's'}`,
			href: '/app/jobs',
		});
	}

	if (stats?.tasks?.myOverdueCount && stats.tasks.myOverdueCount > 0) {
		items.push({
			label: `${stats.tasks.myOverdueCount} overdue task${stats.tasks.myOverdueCount === 1 ? '' : 's'}`,
			href: '/app/tasks',
		});
	}

	if (taskSummary?.myDueTodayCount && taskSummary.myDueTodayCount > 0) {
		items.push({
			label: `${taskSummary.myDueTodayCount} task${taskSummary.myDueTodayCount === 1 ? '' : 's'} due today`,
			href: '/app/tasks',
		});
	}

	if (stats?.quotes.expiringSoon && stats.quotes.expiringSoon > 0) {
		items.push({
			label: `${stats.quotes.expiringSoon} quote${stats.quotes.expiringSoon === 1 ? '' : 's'} expiring soon`,
			href: '/app/quotes?status=ready,presented',
		});
	}

	if (stats?.quotes.awaitingDecision && stats.quotes.awaitingDecision > 0) {
		items.push({
			label: `${stats.quotes.awaitingDecision} quote${stats.quotes.awaitingDecision === 1 ? '' : 's'} awaiting decision`,
			href: '/app/quotes?status=presented',
		});
	}

	if (items.length === 0) return null;

	return (
		<div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
			<AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
			<p className="text-sm text-amber-900">
				{items.map((item, i) => (
					<span key={item.href + i}>
						{i > 0 && ' · '}
						<Link
							to={item.href}
							className="font-medium underline underline-offset-2 hover:text-amber-700"
						>
							{item.label}
						</Link>
					</span>
				))}
			</p>
		</div>
	);
}
