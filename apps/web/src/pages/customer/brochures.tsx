import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	type BrochureListItem,
	type BrochureListParams,
	useBrochuresQuery,
} from '@/hooks/use-brochures';

type StatusFilter = BrochureListParams['status'] | 'all';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
	{ value: 'all', label: 'All Statuses' },
	{ value: 'active', label: 'Active' },
	{ value: 'expired', label: 'Expired' },
	{ value: 'archived', label: 'Archived' },
];

function getBrochureStatus(brochure: BrochureListItem): 'active' | 'expired' | 'archived' {
	if (brochure.archivedAt) return 'archived';
	if (new Date(brochure.expiresAt) < new Date()) return 'expired';
	return 'active';
}

function getStatusBadgeVariant(status: 'active' | 'expired' | 'archived') {
	switch (status) {
		case 'active':
			return 'default' as const;
		case 'expired':
			return 'secondary' as const;
		case 'archived':
			return 'outline' as const;
	}
}

function formatStatusLabel(status: 'active' | 'expired' | 'archived') {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export function BrochuresPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Reset page when filters change
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset page when filters change
	useEffect(() => {
		setPage(1);
	}, [debouncedSearch, statusFilter]);

	const { data, isLoading, error } = useBrochuresQuery({
		search: debouncedSearch || undefined,
		status: statusFilter !== 'all' ? statusFilter : undefined,
		page,
		limit,
	});

	const brochures = data?.brochures;
	const pagination = data?.pagination;

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	};

	const getCustomerName = (brochure: BrochureListItem) => {
		if (brochure.customerName) return brochure.customerName;
		if (brochure.customerFirstName && brochure.customerLastName) {
			return `${brochure.customerFirstName} ${brochure.customerLastName}`;
		}
		if (brochure.customerFirstName) return brochure.customerFirstName;
		if (brochure.customerLastName) return brochure.customerLastName;
		return 'Unknown';
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Brochures</h2>
				</div>
				<div className="text-muted-foreground">Loading brochures...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Brochures</h2>
				</div>
				<div className="text-destructive">Error loading brochures: {error.message}</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-bold">Brochures</h2>
				<Link to="/app/brochures/new">
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						New Brochure
					</Button>
				</Link>
			</div>

			<div className="flex items-center gap-4 mb-4">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by customer name..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select
					value={statusFilter ?? 'all'}
					onValueChange={(value) => setStatusFilter(value as StatusFilter)}
				>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="All statuses" />
					</SelectTrigger>
					<SelectContent>
						{STATUS_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value!}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{brochures && brochures.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					{searchQuery || statusFilter !== 'all'
						? 'No brochures found matching your filters.'
						: 'No brochures yet. Create your first brochure to get started.'}
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Customer</TableHead>
								<TableHead>Products</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Ready to Discuss</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{brochures?.map((brochure) => {
								const status = getBrochureStatus(brochure);
								return (
									<TableRow key={brochure.id}>
										<TableCell className="font-medium font-display">
											{getCustomerName(brochure)}
										</TableCell>
										<TableCell>{brochure.productCount}</TableCell>
										<TableCell>
											<Badge variant={getStatusBadgeVariant(status)}>
												{formatStatusLabel(status)}
											</Badge>
										</TableCell>
										<TableCell>
											{brochure.readyToDiscussAt ? (
												<span className="text-sm">{formatDate(brochure.readyToDiscussAt)}</span>
											) : (
												<span className="text-muted-foreground text-sm">No</span>
											)}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{formatDate(brochure.createdAt)}
										</TableCell>
										<TableCell>
											<Link to={`/app/brochures/${brochure.id}`}>
												<Button variant="ghost" size="sm">
													View
												</Button>
											</Link>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			)}

			{pagination && brochures && brochures.length > 0 && (
				<div className="flex items-center justify-between mt-4">
					<div className="text-sm text-muted-foreground">
						Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
						{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
						brochures
					</div>
					<div className="flex items-center gap-2">
						<Select
							value={String(limit)}
							onValueChange={(val) => {
								setLimit(Number(val));
								setPage(1);
							}}
						>
							<SelectTrigger className="w-20 h-8">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="10">10</SelectItem>
								<SelectItem value="20">20</SelectItem>
								<SelectItem value="50">50</SelectItem>
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={pagination.page <= 1}
						>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</Button>
						<span className="text-sm">
							Page {pagination.page} of {pagination.totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => p + 1)}
							disabled={pagination.page >= pagination.totalPages}
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
