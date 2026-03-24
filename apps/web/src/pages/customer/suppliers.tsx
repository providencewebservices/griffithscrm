import { LayoutGrid, List, Mail, MapPin, Phone, Plus, Search, Truck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination, usePagination } from '@/components/ui/pagination';
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
import { type SupplierListItem, useSuppliersQuery } from '@/hooks/use-suppliers';
import { getAvatarColor, getInitials } from '@/lib/avatar-utils';

type ViewMode = 'active' | 'archived';
type DisplayMode = 'table' | 'cards';

const ITEMS_PER_PAGE = 12;

export function SuppliersPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('active');
	const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [currentPage, setCurrentPage] = useState(0);

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
			setCurrentPage(0);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const {
		data: suppliers,
		isLoading,
		error,
	} = useSuppliersQuery({
		q: debouncedSearch || undefined,
		archivedOnly: viewMode === 'archived',
	});

	const { totalItems, totalPages, paginateItems } = usePagination(suppliers, ITEMS_PER_PAGE);
	const paginatedSuppliers = paginateItems(currentPage);

	const handleViewModeChange = (v: string) => {
		setViewMode(v as ViewMode);
		setCurrentPage(0);
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Suppliers</h2>
					<p className="text-muted-foreground mt-1">Manage your material and product suppliers</p>
				</div>
				<div className="text-muted-foreground">Loading suppliers...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Suppliers</h2>
					<p className="text-muted-foreground mt-1">Manage your material and product suppliers</p>
				</div>
				<div className="text-destructive">Error loading suppliers: {error.message}</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Suppliers</h2>
				<p className="text-muted-foreground mt-1">Manage your material and product suppliers</p>
			</div>

			<div className="flex flex-col gap-3 mb-4">
				{/* Mobile-only search row (full width) */}
				<div className="relative w-full sm:hidden">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search suppliers..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9 pr-9"
						autoComplete="off"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery('')}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>

				{/* Controls row */}
				<div className="flex items-center justify-between gap-2 sm:gap-4">
					{/* Left: Status filter + Desktop search */}
					<div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
						<Select value={viewMode} onValueChange={handleViewModeChange}>
							<SelectTrigger className="w-[110px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="archived">Archived</SelectItem>
							</SelectContent>
						</Select>
						{/* Desktop-only inline search */}
						<div className="relative flex-1 max-w-sm hidden sm:block">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search suppliers..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9 pr-9"
								autoComplete="off"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery('')}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
					</div>

					{/* Right: Display toggle + Add */}
					<div className="flex items-center gap-2 shrink-0">
						{/* Display toggle - hidden on mobile */}
						<div className="hidden sm:flex items-center border rounded-md">
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
						{/* Add button - icon only on mobile */}
						<Link to="/app/suppliers/new" className="sm:hidden">
							<Button size="icon">
								<Plus className="h-4 w-4" />
							</Button>
						</Link>
						<Link to="/app/suppliers/new" className="hidden sm:block">
							<Button>
								<Plus className="h-4 w-4 mr-2" />
								Add Supplier
							</Button>
						</Link>
					</div>
				</div>
			</div>

			{suppliers && suppliers.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 border rounded-lg">
					<Truck className="h-10 w-10 text-muted-foreground mb-3" />
					<p className="text-muted-foreground mb-4">
						{searchQuery
							? 'No suppliers found matching your search.'
							: viewMode === 'archived'
								? 'No archived suppliers.'
								: 'No suppliers yet. Add your first supplier to get started.'}
					</p>
					{!searchQuery && viewMode === 'active' && (
						<Link to="/app/suppliers/new">
							<Button>Add Supplier</Button>
						</Link>
					)}
				</div>
			) : displayMode === 'table' ? (
				<>
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Account #</TableHead>
									<TableHead>Phone</TableHead>
									<TableHead className="text-center">Materials</TableHead>
									<TableHead className="text-center">Sundries</TableHead>
									<TableHead className="w-[100px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedSuppliers.map((supplier) => (
									<TableRow key={supplier.id}>
										<TableCell className="font-medium">
											{supplier.tradingName || supplier.businessName}
											{supplier.tradingName && supplier.tradingName !== supplier.businessName && (
												<span className="text-muted-foreground text-sm block">
													{supplier.businessName}
												</span>
											)}
										</TableCell>
										<TableCell>
											{supplier.primaryEmail?.value || (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											{supplier.accountNumber || <span className="text-muted-foreground">-</span>}
										</TableCell>
										<TableCell>
											{supplier.primaryPhone?.value || (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell className="text-center">{supplier.materialsCount}</TableCell>
										<TableCell className="text-center">{supplier.sundriesCount}</TableCell>
										<TableCell>
											<Link to={`/app/suppliers/${supplier.id}`}>
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
					<Pagination
						currentPage={currentPage}
						totalPages={totalPages}
						totalItems={totalItems}
						itemsPerPage={ITEMS_PER_PAGE}
						onPageChange={setCurrentPage}
					/>
				</>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{paginatedSuppliers.map((supplier) => (
							<SupplierCard key={supplier.id} supplier={supplier} />
						))}
					</div>
					<Pagination
						currentPage={currentPage}
						totalPages={totalPages}
						totalItems={totalItems}
						itemsPerPage={ITEMS_PER_PAGE}
						onPageChange={setCurrentPage}
					/>
				</>
			)}
		</div>
	);
}

function SupplierCard({ supplier }: { supplier: SupplierListItem }) {
	const displayName = supplier.tradingName || supplier.businessName;
	const hasLocation = supplier.primaryAddress?.formattedAddress;
	const initials = getInitials(displayName);
	const avatarColor = getAvatarColor(displayName);
	const hasBadges = supplier.materialsCount > 0 || supplier.sundriesCount > 0;

	return (
		<Link to={`/app/suppliers/${supplier.id}`} className="block">
			<Card className="h-full hover:shadow-md transition-shadow cursor-pointer flex flex-col">
				<CardHeader className="pb-3">
					<div className="flex items-center gap-3">
						<div
							className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
							style={{ backgroundColor: avatarColor }}
						>
							{initials}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-start justify-between gap-2">
								<CardTitle className="text-base font-medium truncate">{displayName}</CardTitle>
								{supplier.accountNumber && (
									<Badge variant="outline" className="text-xs shrink-0">
										{supplier.accountNumber}
									</Badge>
								)}
							</div>
							{supplier.tradingName && supplier.tradingName !== supplier.businessName && (
								<CardDescription className="truncate">{supplier.businessName}</CardDescription>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex-1 flex flex-col">
					<div className="flex flex-col gap-1.5 text-sm text-muted-foreground flex-1">
						{supplier.primaryEmail?.value && (
							<div className="flex items-center gap-2">
								<Mail className="h-3.5 w-3.5 shrink-0" />
								<span className="truncate">{supplier.primaryEmail.value}</span>
							</div>
						)}
						{supplier.primaryPhone?.value && (
							<div className="flex items-center gap-2">
								<Phone className="h-3.5 w-3.5 shrink-0" />
								<span>{supplier.primaryPhone.value}</span>
							</div>
						)}
						{hasLocation && (
							<div className="flex gap-2">
								<MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
								<div className="flex flex-col">
									{supplier.primaryAddress?.formattedAddress?.split(', ').map((part, i) => (
										<span key={i}>{part}</span>
									))}
								</div>
							</div>
						)}
					</div>

					{hasBadges && (
						<div className="flex items-center gap-2 pt-3">
							{supplier.materialsCount > 0 && (
								<Badge variant="secondary" className="text-xs">
									{supplier.materialsCount} material{supplier.materialsCount !== 1 ? 's' : ''}
								</Badge>
							)}
							{supplier.sundriesCount > 0 && (
								<Badge variant="secondary" className="text-xs">
									{supplier.sundriesCount} sundr{supplier.sundriesCount !== 1 ? 'ies' : 'y'}
								</Badge>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</Link>
	);
}
