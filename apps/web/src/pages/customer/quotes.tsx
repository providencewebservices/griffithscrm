import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	useQuotesQuery,
	formatQuoteStatus,
	getQuoteStatusVariant,
	type QuoteStatus,
} from '@/hooks/use-quotes';
import { QUOTE_STATUSES } from '@griffiths-crm/shared/db/schema';
import { Search, Plus } from 'lucide-react';

export function QuotesPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
	const [debouncedSearch, setDebouncedSearch] = useState('');

	// Debounce search
	useMemo(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const { data: quotes, isLoading, error } = useQuotesQuery({
		search: debouncedSearch || undefined,
		status: statusFilter !== 'all' ? statusFilter : undefined,
		latestOnly: true,
	});

	const formatCurrency = (value: string) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(parseFloat(value));
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Quotes</h2>
					<p className="text-muted-foreground mt-1">
						Create and manage customer quotes
					</p>
				</div>
				<div className="text-muted-foreground">Loading quotes...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Quotes</h2>
					<p className="text-muted-foreground mt-1">
						Create and manage customer quotes
					</p>
				</div>
				<div className="text-destructive">
					Error loading quotes: {error.message}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Quotes</h2>
				<p className="text-muted-foreground mt-1">
					Create and manage customer quotes
				</p>
			</div>

			<div className="flex justify-between items-center mb-4 gap-4">
				<div className="flex items-center gap-4 flex-1">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by quote number..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select
						value={statusFilter}
						onValueChange={(value) => setStatusFilter(value as QuoteStatus | 'all')}
					>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder="All statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							{QUOTE_STATUSES.map((status) => (
								<SelectItem key={status} value={status}>
									{formatQuoteStatus(status)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Link to="/app/quotes/new">
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						New Quote
					</Button>
				</Link>
			</div>

			{quotes && quotes.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					{searchQuery || statusFilter !== 'all'
						? 'No quotes found matching your filters.'
						: 'No quotes yet. Create your first quote to get started.'}
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Quote #</TableHead>
								<TableHead>Customer</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Total</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{quotes?.map((quote) => (
								<TableRow key={quote.id}>
									<TableCell className="font-medium">
										{quote.quoteNumber}
										{quote.version > 1 && (
											<span className="text-muted-foreground ml-1">
												(v{quote.version})
											</span>
										)}
									</TableCell>
									<TableCell>
										{quote.customerName || (
											<span className="text-muted-foreground">Walk-in</span>
										)}
									</TableCell>
									<TableCell>
										<Badge variant={getQuoteStatusVariant(quote.status)}>
											{formatQuoteStatus(quote.status)}
										</Badge>
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatCurrency(quote.total)}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{formatDate(quote.createdAt)}
									</TableCell>
									<TableCell>
										<Link to={`/app/quotes/${quote.id}`}>
											<Button variant="ghost" size="sm">
												View
											</Button>
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
