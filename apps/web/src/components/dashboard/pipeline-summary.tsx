import { ArrowRight, Briefcase, FileText, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, type PipelineColumn, usePipelineQuery } from '@/hooks/use-pipeline';

function StageBlock({ column, basePath }: { column: PipelineColumn<unknown>; basePath: string }) {
	const isEmpty = column.count === 0;
	const statusParam = column.statuses.join(',');
	const href = `${basePath}?status=${statusParam}`;

	return (
		<Link to={href} className="block">
			<div
				className={`rounded-lg border p-3 transition-shadow hover:shadow-md cursor-pointer ${
					isEmpty ? 'opacity-50' : ''
				}`}
				style={{ borderLeftWidth: '3px', borderLeftColor: columnColor(column.color) }}
			>
				<p className="text-xs font-medium text-muted-foreground truncate">{column.label}</p>
				<p className="text-xl font-bold mt-0.5">{column.count}</p>
				<p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(column.totalValue)}</p>
			</div>
		</Link>
	);
}

// Convert Tailwind bg class to a CSS color for borderLeftColor
function columnColor(bgClass: string): string {
	const map: Record<string, string> = {
		'bg-gray-400': '#9ca3af',
		'bg-blue-400': '#60a5fa',
		'bg-blue-500': '#3b82f6',
		'bg-yellow-400': '#facc15',
		'bg-yellow-500': '#eab308',
		'bg-amber-400': '#fbbf24',
		'bg-amber-500': '#f59e0b',
		'bg-green-400': '#4ade80',
		'bg-green-500': '#22c55e',
		'bg-green-600': '#16a34a',
		'bg-purple-400': '#c084fc',
		'bg-purple-500': '#a855f7',
		'bg-orange-400': '#fb923c',
		'bg-orange-500': '#f97316',
		'bg-red-400': '#f87171',
		'bg-red-500': '#ef4444',
		'bg-indigo-400': '#818cf8',
		'bg-indigo-500': '#6366f1',
		'bg-teal-400': '#2dd4bf',
		'bg-teal-500': '#14b8a6',
		'bg-emerald-500': '#10b981',
		'bg-cyan-500': '#06b6d4',
		'bg-sky-500': '#0ea5e9',
	};
	return map[bgClass] || '#9ca3af';
}

export function PipelineSummary() {
	const { data, isLoading, error } = usePipelineQuery();

	if (isLoading) {
		return (
			<div className="space-y-6">
				{[1, 2].map((i) => (
					<Card key={i}>
						<CardContent className="flex items-center justify-center h-24">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (error || !data) return null;

	return (
		<div className="space-y-6">
			{/* Quotes Pipeline */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<FileText className="h-5 w-5 text-blue-600" />
							Quotes Pipeline
						</CardTitle>
						<Link to="/app/quotes">
							<Button variant="ghost" size="sm" className="text-xs">
								View all
								<ArrowRight className="h-3 w-3 ml-1" />
							</Button>
						</Link>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						{data.quotes.columns.map((col) => (
							<StageBlock key={col.id} column={col} basePath="/app/quotes" />
						))}
					</div>
				</CardContent>
			</Card>

			{/* Jobs Pipeline */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<Briefcase className="h-5 w-5 text-green-600" />
							Jobs Pipeline
						</CardTitle>
						<Link to="/app/jobs">
							<Button variant="ghost" size="sm" className="text-xs">
								View all
								<ArrowRight className="h-3 w-3 ml-1" />
							</Button>
						</Link>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
						{data.jobs.columns.map((col) => (
							<StageBlock key={col.id} column={col} basePath="/app/jobs" />
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
