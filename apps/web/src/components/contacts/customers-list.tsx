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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { CustomerFormDialog } from '@/components/customer/customer-form-dialog';
import {
	useCustomersQuery,
	useCreateCustomerMutation,
	type CreateCustomerInput,
	type CustomerListItem,
} from '@/hooks/use-customers';
import { useTenantSettingsQuery } from '@/hooks/use-tenant-settings';
import { getInitials, getAvatarColor } from '@/lib/avatar-utils';
import { Search, List, LayoutGrid, Mail, Phone, MapPin, X, Plus, Users } from 'lucide-react';

type ViewMode = 'active' | 'archived';
type DisplayMode = 'table' | 'cards';

const ITEMS_PER_PAGE = 12;

export function CustomersList() {
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('active');
	const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(0);

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
			setCurrentPage(0); // Reset to first page on search
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const { data: customers, isLoading, error } = useCustomersQuery({
		q: debouncedSearch || undefined,
		archivedOnly: viewMode === 'archived',
	});

	const { totalItems, totalPages, paginateItems } = usePagination(customers, ITEMS_PER_PAGE);
	const paginatedCustomers = paginateItems(currentPage);

	const createMutation = useCreateCustomerMutation();

	const { data: tenantSettings } = useTenantSettingsQuery();
	const defaultCountry = tenantSettings?.address?.country || 'GB';

	const handleAddCustomer = () => {
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleFormSubmit = async (data: CreateCustomerInput) => {
		setMutationError(null);
		try {
			await createMutation.mutateAsync(data);
			setFormDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleViewModeChange = (v: string) => {
		setViewMode(v as ViewMode);
		setCurrentPage(0);
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading customers...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading customers: {error.message}
			</div>
		);
	}

	return (
		<div>
			<div className="flex flex-col gap-3 mb-4">
				{/* Mobile-only search row (full width) */}
				<div className="relative w-full sm:hidden">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search customers..."
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
						<div className="relative flex-1 hidden sm:block">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search customers..."
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
						<Button size="icon" className="sm:hidden" onClick={handleAddCustomer}>
							<Plus className="h-4 w-4" />
						</Button>
						<Button className="hidden sm:inline-flex" onClick={handleAddCustomer}>
							Add Customer
						</Button>
					</div>
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			{customers && customers.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 border rounded-lg">
					<Users className="h-10 w-10 text-muted-foreground mb-3" />
					<p className="text-muted-foreground mb-4">
						{searchQuery
							? 'No customers found matching your search.'
							: viewMode === 'archived'
								? 'No archived customers.'
								: 'No customers yet. Add your first customer to get started.'}
					</p>
					{!searchQuery && viewMode === 'active' && (
						<Button onClick={handleAddCustomer}>Add Customer</Button>
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
									<TableHead>Phone</TableHead>
									<TableHead>Location</TableHead>
									<TableHead className="w-[100px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedCustomers.map((customer) => (
									<TableRow key={customer.id}>
										<TableCell className="font-medium">
											{customer.firstName} {customer.lastName}
										</TableCell>
										<TableCell>
											{customer.primaryEmail?.value || (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											{customer.primaryPhone?.value || (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											{customer.primaryAddress?.formattedAddress ? (
												<div className="flex flex-col">
													{customer.primaryAddress.formattedAddress.split(', ').map((part, i) => (
														<span key={i}>{part}</span>
													))}
												</div>
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											<Link to={`/app/customers/${customer.id}`}>
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
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{paginatedCustomers.map((customer) => (
							<CustomerCard key={customer.id} customer={customer} />
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

			<CustomerFormDialog
				open={formDialogOpen}
				onOpenChange={setFormDialogOpen}
				onSubmit={handleFormSubmit}
				customer={null}
				isLoading={createMutation.isPending}
				error={mutationError}
				defaultCountry={defaultCountry}
			/>
		</div>
	);
}

function CustomerCard({ customer }: { customer: CustomerListItem }) {
	const fullName = `${customer.firstName} ${customer.lastName}`;
	const hasLocation = customer.primaryAddress?.formattedAddress;
	const initials = getInitials(fullName);
	const avatarColor = getAvatarColor(fullName);

	return (
		<Link to={`/app/customers/${customer.id}`} className="block">
			<Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
				<CardHeader className="pb-3">
					<div className="flex items-center gap-3">
						<div
							className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
							style={{ backgroundColor: avatarColor }}
						>
							{initials}
						</div>
						<CardTitle className="text-base font-medium">{fullName}</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
						{customer.primaryEmail?.value && (
							<div className="flex items-center gap-2">
								<Mail className="h-4 w-4" />
								<span className="truncate">{customer.primaryEmail.value}</span>
							</div>
						)}
						{customer.primaryPhone?.value && (
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4" />
								<span>{customer.primaryPhone.value}</span>
							</div>
						)}
						{hasLocation && (
							<div className="flex gap-2">
								<MapPin className="h-4 w-4 mt-0.5 shrink-0" />
								<div className="flex flex-col">
									{customer.primaryAddress?.formattedAddress?.split(', ').map((part, i) => (
										<span key={i}>{part}</span>
									))}
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
