import { ArrowRight, Inbox } from 'lucide-react';
import { Link } from 'react-router';
import {
	formatCurrency,
	type PipelineColumn,
	type PipelineJobItem,
	type PipelineQuoteItem,
} from '@/hooks/use-pipeline';
import { PipelineJobCard, PipelineQuoteCard } from './pipeline-card';

type PipelineQuoteColumnProps = {
	column: PipelineColumn<PipelineQuoteItem>;
	maxCards?: number;
};

type PipelineJobColumnProps = {
	column: PipelineColumn<PipelineJobItem>;
	maxCards?: number;
};

// Get the dot color from the backend color class
function getDotColor(color: string): string {
	return color || 'bg-gray-400';
}

export function PipelineQuoteColumn({ column, maxCards = 5 }: PipelineQuoteColumnProps) {
	const hasMore = column.count > maxCards;
	const statusParam = column.statuses.join(',');
	const dotColor = getDotColor(column.color);

	return (
		<div className="flex flex-col min-w-[240px] lg:min-w-0 rounded-lg bg-muted/30 border border-border/50">
			{/* Column Header */}
			<div className="px-3 py-3 border-b border-border/50">
				<div className="flex items-center gap-2 mb-1">
					<span className={`w-2 h-2 rounded-full ${dotColor}`} />
					<span className="font-semibold text-sm">{column.label}</span>
				</div>
				<div className="flex items-center justify-between text-xs text-muted-foreground pl-4">
					<span>
						{column.count} {column.count === 1 ? 'quote' : 'quotes'}
					</span>
					<span className="font-medium">{formatCurrency(column.totalValue)}</span>
				</div>
			</div>

			{/* Cards Container */}
			<div className="flex-1 p-2 space-y-2 min-h-[140px]">
				{column.items.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full py-6 text-muted-foreground">
						<Inbox className="h-8 w-8 mb-2 opacity-40" />
						<span className="text-xs">No quotes</span>
					</div>
				) : (
					column.items.map((item) => <PipelineQuoteCard key={item.id} item={item} />)
				)}
			</div>

			{/* View All Link */}
			{hasMore && (
				<div className="px-3 pb-3">
					<Link
						to={`/app/quotes?status=${statusParam}`}
						className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-white/60 rounded-md border border-black/5 transition-colors"
					>
						View all {column.count}
						<ArrowRight className="h-3 w-3" />
					</Link>
				</div>
			)}
		</div>
	);
}

export function PipelineJobColumn({ column, maxCards = 5 }: PipelineJobColumnProps) {
	const hasMore = column.count > maxCards;
	const statusParam = column.statuses.join(',');
	const dotColor = getDotColor(column.color);

	return (
		<div className="flex flex-col min-w-[240px] lg:min-w-0 rounded-lg bg-muted/30 border border-border/50">
			{/* Column Header */}
			<div className="px-3 py-3 border-b border-border/50">
				<div className="flex items-center gap-2 mb-1">
					<span className={`w-2 h-2 rounded-full ${dotColor}`} />
					<span className="font-semibold text-sm">{column.label}</span>
				</div>
				<div className="flex items-center justify-between text-xs text-muted-foreground pl-4">
					<span>
						{column.count} {column.count === 1 ? 'job' : 'jobs'}
					</span>
					<span className="font-medium">{formatCurrency(column.totalValue)}</span>
				</div>
			</div>

			{/* Cards Container */}
			<div className="flex-1 p-2 space-y-2 min-h-[140px]">
				{column.items.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full py-6 text-muted-foreground">
						<Inbox className="h-8 w-8 mb-2 opacity-40" />
						<span className="text-xs">No jobs</span>
					</div>
				) : (
					column.items.map((item) => <PipelineJobCard key={item.id} item={item} />)
				)}
			</div>

			{/* View All Link */}
			{hasMore && (
				<div className="px-3 pb-3">
					<Link
						to={`/app/jobs?status=${statusParam}`}
						className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-white/60 rounded-md border border-black/5 transition-colors"
					>
						View all {column.count}
						<ArrowRight className="h-3 w-3" />
					</Link>
				</div>
			)}
		</div>
	);
}
