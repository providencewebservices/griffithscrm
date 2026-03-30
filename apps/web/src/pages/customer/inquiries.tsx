import { INQUIRY_STATUSES } from '@griffiths-crm/shared/db/schema';
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	LayoutGrid,
	List,
	Mail,
	Package,
	Phone,
	Plus,
	Search,
	User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
	type InquiryListItem,
	type InquiryListParams,
	useInquiriesQuery,
} from '@/hooks/use-inquiries';

const SOURCE_LABELS: Record<string, string> = {
	walk_in: 'Walk-in',
	phone: 'Phone',
	email: 'Email',
	website: 'Website',
	facebook: 'Facebook',
	instagram: 'Instagram',
	whatsapp: 'WhatsApp',
	referral: 'Referral',
	other: 'Other',
};

type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
type DisplayMode = 'table' | 'cards';

function getStatusBadgeVariant(status: string) {
	switch (status) {
		case 'new':
			return 'default' as const;
		case 'contacted':
			return 'secondary' as const;
		case 'converted':
			return 'outline' as const;
		case 'closed':
			return 'outline' as const;
		default:
			return 'outline' as const;
	}
}

function formatStatus(status: string) {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export function InquiriesPage() {
	const [searchParams] = useSearchParams();
	const initialStatus = searchParams.get('status') as InquiryStatus | null;

	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>(
		initialStatus && INQUIRY_STATUSES.includes(initialStatus) ? initialStatus : 'all',
	);
	const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
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

	const { data, isLoading, error } = useInquiriesQuery({
		search: debouncedSearch || undefined,
		status: (statusFilter !== 'all' ? statusFilter : undefined) as InquiryListParams['status'],
		page,
		limit,
	});

	const items = data?.items;
	const pagination = data?.pagination;

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Inquiries</h2>
				</div>
				<div className="text-muted-foreground">Loading inquiries...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Inquiries</h2>
				</div>
				<div className="text-destructive">Error loading inquiries: {error.message}</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Inquiries</h2>
			</div>

			<div className="flex justify-between items-center mb-4 gap-4">
				<div className="flex items-center gap-4 flex-1">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name or email..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select
						value={statusFilter}
						onValueChange={(value) => setStatusFilter(value as InquiryStatus | 'all')}
					>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder="All statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							{INQUIRY_STATUSES.map((status) => (
								<SelectItem key={status} value={status}>
									{formatStatus(status)}
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
					<Link to="/app/inquiries/new">
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							New Inquiry
						</Button>
					</Link>
				</div>
			</div>

			{items && items.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					{searchQuery || statusFilter !== 'all'
						? 'No inquiries found matching your filters.'
						: 'No inquiries yet. Create your first inquiry to get started.'}
				</div>
			) : displayMode === 'table' ? (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Source</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Products</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items?.map((inquiry) => (
								<TableRow key={inquiry.id}>
									<TableCell className="font-medium font-display">
										{inquiry.firstName} {inquiry.lastName}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{inquiry.email || '—'}
									</TableCell>
									<TableCell>{SOURCE_LABELS[inquiry.source] || inquiry.source}</TableCell>
									<TableCell>
										<Badge variant={getStatusBadgeVariant(inquiry.status)}>
											{formatStatus(inquiry.status)}
										</Badge>
									</TableCell>
									<TableCell>{inquiry.productCount}</TableCell>
									<TableCell className="text-muted-foreground">
										{formatDate(inquiry.createdAt)}
									</TableCell>
									<TableCell>
										<Link to={`/app/inquiries/${inquiry.id}`}>
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
					{items?.map((inquiry) => (
						<InquiryCard key={inquiry.id} inquiry={inquiry} formatDate={formatDate} />
					))}
				</div>
			)}

			{pagination && items && items.length > 0 && (
				<div className="flex items-center justify-between mt-4">
					<div className="text-sm text-muted-foreground">
						Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
						{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
						inquiries
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

function InquiryCard({
	inquiry,
	formatDate,
}: {
	inquiry: InquiryListItem;
	formatDate: (dateString: string) => string;
}) {
	return (
		<Link to={`/app/inquiries/${inquiry.id}`} className="block">
			<Card className="hover:shadow-md transition-shadow">
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<div className="space-y-1">
							<CardTitle className="text-base font-display">
								{inquiry.firstName} {inquiry.lastName}
							</CardTitle>
							<div className="text-sm text-muted-foreground">
								{SOURCE_LABELS[inquiry.source] || inquiry.source}
							</div>
						</div>
						<Badge variant={getStatusBadgeVariant(inquiry.status)}>
							{formatStatus(inquiry.status)}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-2">
					{inquiry.email && (
						<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
							<Mail className="h-3.5 w-3.5" />
							<span className="truncate">{inquiry.email}</span>
						</div>
					)}
					{inquiry.phone && (
						<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
							<Phone className="h-3.5 w-3.5" />
							<span>{inquiry.phone}</span>
						</div>
					)}
					{inquiry.customerName && (
						<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
							<User className="h-3.5 w-3.5" />
							<span className="font-display">{inquiry.customerName}</span>
						</div>
					)}
					{inquiry.productCount > 0 && (
						<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
							<Package className="h-3.5 w-3.5" />
							<span>
								{inquiry.productCount} product{inquiry.productCount !== 1 ? 's' : ''}
							</span>
						</div>
					)}
					<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Calendar className="h-3.5 w-3.5" />
						<span>{formatDate(inquiry.createdAt)}</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
