import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import {
	formatAccountStatus,
	formatJobStatus,
	getAccountStatusColor,
	getJobStatusVariant,
} from '@/hooks/use-jobs';
import { formatCurrency, type PipelineJobItem, type PipelineQuoteItem } from '@/hooks/use-pipeline';
import { formatQuoteStatus, getQuoteStatusVariant } from '@/hooks/use-quotes';

type PipelineQuoteCardProps = {
	item: PipelineQuoteItem;
};

type PipelineJobCardProps = {
	item: PipelineJobItem;
};

export function PipelineQuoteCard({ item }: PipelineQuoteCardProps) {
	return (
		<Link
			to={`/app/quotes/${item.id}`}
			className="block p-3 bg-white border border-black/5 rounded-lg shadow-sm hover:shadow-md hover:border-black/10 transition-all"
		>
			<div className="flex items-start justify-between gap-2 mb-2">
				<div className="min-w-0 flex-1">
					<p className="font-display text-sm font-semibold truncate text-foreground">
						{item.customerName}
					</p>
					<span className="text-xs text-muted-foreground">{item.quoteNumber}</span>
				</div>
				<Badge
					variant={getQuoteStatusVariant(
						item.status as Parameters<typeof getQuoteStatusVariant>[0],
					)}
					className="text-[10px] px-1.5 shrink-0"
				>
					{formatQuoteStatus(item.status as Parameters<typeof formatQuoteStatus>[0])}
				</Badge>
			</div>
			<div className="flex items-center justify-between pt-2 border-t border-black/5">
				<span className="text-sm font-bold text-foreground">{formatCurrency(item.total)}</span>
			</div>
		</Link>
	);
}

export function PipelineJobCard({ item }: PipelineJobCardProps) {
	return (
		<Link
			to={`/app/jobs/${item.id}`}
			className="block p-3 bg-white border border-black/5 rounded-lg shadow-sm hover:shadow-md hover:border-black/10 transition-all"
		>
			<div className="flex items-start justify-between gap-2 mb-2">
				<div className="min-w-0 flex-1">
					<p className="font-display text-sm font-semibold truncate text-foreground">
						{item.customerName}
					</p>
					<span className="text-xs text-muted-foreground">{item.jobNumber}</span>
				</div>
				<Badge
					variant={getJobStatusVariant(item.status as Parameters<typeof getJobStatusVariant>[0])}
					className="text-[10px] px-1.5 shrink-0"
				>
					{formatJobStatus(item.status as Parameters<typeof formatJobStatus>[0])}
				</Badge>
			</div>
			<div className="flex items-center justify-between pt-2 border-t border-black/5">
				<span className="text-sm font-bold text-foreground">{formatCurrency(item.total)}</span>
				<div className="flex items-center gap-1">
					{item.accountStatus && item.accountStatus !== 'not_invoiced' && (
						<span
							className={`text-[10px] px-1.5 py-0.5 rounded ${getAccountStatusColor(item.accountStatus)}`}
						>
							{formatAccountStatus(item.accountStatus)}
						</span>
					)}
					{item.paymentStatus && (
						<span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
							{item.paymentStatus}
						</span>
					)}
				</div>
			</div>
		</Link>
	);
}
