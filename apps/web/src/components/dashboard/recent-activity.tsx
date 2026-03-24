import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	formatTimeAgo,
	type RecentJob,
	type RecentQuote,
	useDashboardQuery,
} from '@/hooks/use-dashboard';
import { formatJobStatus, getJobStatusVariant } from '@/hooks/use-jobs';
import { formatQuoteStatus, getQuoteStatusVariant } from '@/hooks/use-quotes';

type ActivityItem = {
	id: string;
	type: 'quote' | 'job';
	number: string;
	customerName: string;
	status: string;
	updatedAt: string;
	href: string;
};

function toActivityItems(quotes: RecentQuote[], jobs: RecentJob[]): ActivityItem[] {
	const items: ActivityItem[] = [
		...quotes.map((q) => ({
			id: q.id,
			type: 'quote' as const,
			number: q.quoteNumber,
			customerName: q.customerName,
			status: q.status,
			updatedAt: q.updatedAt,
			href: `/app/quotes/${q.id}`,
		})),
		...jobs.map((j) => ({
			id: j.id,
			type: 'job' as const,
			number: j.jobNumber,
			customerName: j.customerName,
			status: j.status,
			updatedAt: j.updatedAt,
			href: `/app/jobs/${j.id}`,
		})),
	];

	items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
	return items.slice(0, 8);
}

export function RecentActivity() {
	const { data: stats } = useDashboardQuery();

	if (!stats) return null;

	const items = toActivityItems(stats.recent.quotes, stats.recent.jobs);
	if (items.length === 0) return null;

	return (
		<Card className="h-full">
			<CardHeader className="pb-3">
				<CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-1">
					{items.map((item) => (
						<Link
							key={`${item.type}-${item.id}`}
							to={item.href}
							className="flex items-center gap-3 py-1.5 px-1 rounded-md hover:bg-muted/50"
						>
							<span
								className={`w-2 h-2 rounded-full shrink-0 ${
									item.type === 'quote' ? 'bg-blue-400' : 'bg-green-400'
								}`}
							/>
							<span className="text-sm font-medium shrink-0">{item.number}</span>
							<span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
								{item.customerName}
							</span>
							<Badge
								variant={
									item.type === 'quote'
										? getQuoteStatusVariant(item.status as any)
										: getJobStatusVariant(item.status as any)
								}
								className="shrink-0"
							>
								{item.type === 'quote'
									? formatQuoteStatus(item.status as any)
									: formatJobStatus(item.status as any)}
							</Badge>
							<span className="text-xs text-muted-foreground shrink-0">
								{formatTimeAgo(item.updatedAt)}
							</span>
						</Link>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
