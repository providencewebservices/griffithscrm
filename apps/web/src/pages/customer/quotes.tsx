import { useState, useEffect } from 'react';
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
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
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
	formatPriceRange,
	formatQuoteNumberWithOptions,
	QUOTE_TYPE_LABELS,
	QUOTE_TYPES,
	type QuoteStatus,
	type QuoteType,
	type QuotePackageListItem,
} from '@/hooks/use-quotes';
import { QUOTE_STATUSES } from '@griffiths-crm/shared/db/schema';
import { Search, Plus, List, LayoutGrid, Calendar, User, Layers } from 'lucide-react';

type DisplayMode = 'table' | 'cards';

export function QuotesPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
	const [typeFilter, setTypeFilter] = useState<QuoteType | 'all'>('all');
	const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
	const [debouncedSearch, setDebouncedSearch] = useState('');

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const { data: packages, isLoading, error } = useQuotesQuery({
		search: debouncedSearch || undefined,
		status: statusFilter !== 'all' ? statusFilter : undefined,
		quoteType: typeFilter !== 'all' ? typeFilter : undefined,
	});

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const getCustomerName = (pkg: QuotePackageListItem) => {
		if (pkg.customerFirstName && pkg.customerLastName) {
			return `${pkg.customerFirstName} ${pkg.customerLastName}`;
		}
		if (pkg.customerFirstName) return pkg.customerFirstName;
		if (pkg.customerLastName) return pkg.customerLastName;
		return null;
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
							placeholder="Search by quote number or customer..."
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
					<Select
						value={typeFilter}
						onValueChange={(value) => setTypeFilter(value as QuoteType | 'all')}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="All types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							{QUOTE_TYPES.map((type) => (
								<SelectItem key={type} value={type}>
									{QUOTE_TYPE_LABELS[type]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex items-center border rounded-md">
						<Button
							variant={displayMode === 'table' ? 'secondary' : 'ghost'}
							size="sm"
							className="rounded-r-none"
							onClick={() => setDisplayMode('table')}
						>
							<List className="h-4 w-4" />
						</Button>
						<Button
							variant={displayMode === 'cards' ? 'secondary' : 'ghost'}
							size="sm"
							className="rounded-l-none"
							onClick={() => setDisplayMode('cards')}
						>
							<LayoutGrid className="h-4 w-4" />
						</Button>
					</div>
					<Link to="/app/quotes/new">
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							New Quote
						</Button>
					</Link>
				</div>
			</div>

			{packages && packages.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					{searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
						? 'No quotes found matching your filters.'
						: 'No quotes yet. Create your first quote to get started.'}
				</div>
			) : displayMode === 'table' ? (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Quote #</TableHead>
								<TableHead>Customer</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Price</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{packages?.map((pkg) => (
								<TableRow key={pkg.id}>
									<TableCell className="font-medium">
										<div className="flex items-center gap-2">
											{formatQuoteNumberWithOptions(pkg.firstQuoteNumber, pkg.optionCount)}
											{pkg.optionCount > 1 && (
												<Layers className="h-3.5 w-3.5 text-muted-foreground" />
											)}
										</div>
									</TableCell>
									<TableCell className="font-display">
										{getCustomerName(pkg) || (
											<span className="text-muted-foreground font-sans">Walk-in</span>
										)}
									</TableCell>
									<TableCell>
										{pkg.quoteType && pkg.quoteType !== 'new_memorial' ? (
											<Badge variant="outline">
												{QUOTE_TYPE_LABELS[pkg.quoteType]}
											</Badge>
										) : (
											<span className="text-muted-foreground text-sm">New Memorial</span>
										)}
									</TableCell>
									<TableCell>
										<Badge variant={getQuoteStatusVariant(pkg.status)}>
											{formatQuoteStatus(pkg.status)}
										</Badge>
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatPriceRange(pkg.priceRange)}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{formatDate(pkg.createdAt)}
									</TableCell>
									<TableCell>
										<Link to={`/app/quotes/${pkg.id}`}>
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
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{packages?.map((pkg) => (
						<QuoteCard
							key={pkg.id}
							pkg={pkg}
							formatDate={formatDate}
							getCustomerName={getCustomerName}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function QuoteCard({
	pkg,
	formatDate,
	getCustomerName,
}: {
	pkg: QuotePackageListItem;
	formatDate: (dateString: string) => string;
	getCustomerName: (pkg: QuotePackageListItem) => string | null;
}) {
	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle className="text-base flex items-center gap-2">
							{formatQuoteNumberWithOptions(pkg.firstQuoteNumber, pkg.optionCount)}
							{pkg.optionCount > 1 && (
								<Layers className="h-3.5 w-3.5 text-muted-foreground" />
							)}
						</CardTitle>
						<CardDescription className="flex items-center gap-1.5">
							<User className="h-3.5 w-3.5" />
							<span className={getCustomerName(pkg) ? 'font-display' : ''}>
								{getCustomerName(pkg) || 'Walk-in'}
							</span>
						</CardDescription>
					</div>
					<div className="flex flex-col items-end gap-1">
						<Badge variant={getQuoteStatusVariant(pkg.status)}>
							{formatQuoteStatus(pkg.status)}
						</Badge>
						{pkg.quoteType && pkg.quoteType !== 'new_memorial' && (
							<Badge variant="outline" className="text-xs">
								{QUOTE_TYPE_LABELS[pkg.quoteType]}
							</Badge>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-2xl font-bold">
						{formatPriceRange(pkg.priceRange)}
					</span>
				</div>

				{pkg.optionCount > 1 && (
					<div className="text-sm text-muted-foreground">
						{pkg.optionCount} pricing options
					</div>
				)}

				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					<Calendar className="h-3.5 w-3.5" />
					<span>{formatDate(pkg.createdAt)}</span>
				</div>

				<div className="pt-2">
					<Link to={`/app/quotes/${pkg.id}`}>
						<Button variant="outline" size="sm" className="w-full">
							View Details
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
