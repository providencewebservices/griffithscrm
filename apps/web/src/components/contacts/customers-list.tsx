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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { CustomerFormDialog } from '@/components/customer/customer-form-dialog';
import {
	useCustomersQuery,
	useCreateCustomerMutation,
	type CreateCustomerInput,
	type CustomerListItem,
} from '@/hooks/use-customers';
import { useTenantSettingsQuery } from '@/hooks/use-tenant-settings';
import { Search, List, LayoutGrid, Mail, Phone, MapPin } from 'lucide-react';

type ViewMode = 'active' | 'archived';
type DisplayMode = 'table' | 'cards';

export function CustomersList() {
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('active');
	const [displayMode, setDisplayMode] = useState<DisplayMode>('table');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Debounce search
	useMemo(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const { data: customers, isLoading, error } = useCustomersQuery({
		q: debouncedSearch || undefined,
		archivedOnly: viewMode === 'archived',
	});

	const createMutation = useCreateCustomerMutation();

	const { data: tenantSettings } = useTenantSettingsQuery();
	const defaultCountry = tenantSettings?.address?.country || 'US';

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
			<div className="flex justify-between items-center mb-4 gap-4">
				<div className="flex items-center gap-4 flex-1">
					<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
						<TabsList>
							<TabsTrigger value="active">Active</TabsTrigger>
							<TabsTrigger value="archived">Archived</TabsTrigger>
						</TabsList>
					</Tabs>
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name, email, phone, or address..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>
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
					<Button onClick={handleAddCustomer}>Add Customer</Button>
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			{customers && customers.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					{searchQuery
						? 'No customers found matching your search.'
						: viewMode === 'archived'
							? 'No archived customers.'
							: 'No customers yet. Add your first customer to get started.'}
				</div>
			) : displayMode === 'table' ? (
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
							{customers?.map((customer) => (
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
										{customer.primaryAddress ? (
											<span>
												{customer.primaryAddress.locality}
												{customer.primaryAddress.administrativeAreaLevel1 &&
													`, ${customer.primaryAddress.administrativeAreaLevel1}`}
											</span>
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
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{customers?.map((customer) => (
						<CustomerCard key={customer.id} customer={customer} />
					))}
				</div>
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
	const hasLocation = customer.primaryAddress?.locality;

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-3">
				<CardTitle className="text-base">{fullName}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
					{customer.primaryEmail?.value && (
						<div className="flex items-center gap-2">
							<Mail className="h-3.5 w-3.5" />
							<span className="truncate">{customer.primaryEmail.value}</span>
						</div>
					)}
					{customer.primaryPhone?.value && (
						<div className="flex items-center gap-2">
							<Phone className="h-3.5 w-3.5" />
							<span>{customer.primaryPhone.value}</span>
						</div>
					)}
					{hasLocation && (
						<div className="flex items-center gap-2">
							<MapPin className="h-3.5 w-3.5" />
							<span>
								{customer.primaryAddress?.locality}
								{customer.primaryAddress?.administrativeAreaLevel1 &&
									`, ${customer.primaryAddress.administrativeAreaLevel1}`}
							</span>
						</div>
					)}
				</div>

				<div className="pt-2">
					<Link to={`/app/customers/${customer.id}`}>
						<Button variant="outline" size="sm" className="w-full">
							View Details
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
