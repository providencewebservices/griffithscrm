import { useState, useMemo } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomerFormDialog } from '@/components/customer/customer-form-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useCustomersQuery,
	useCustomerQuery,
	useCreateCustomerMutation,
	useUpdateCustomerMutation,
	useArchiveCustomerMutation,
	useUnarchiveCustomerMutation,
	type CustomerListItem,
	type CustomerWithRelations,
	type CreateCustomerInput,
} from '@/hooks/use-customers';
import { Search } from 'lucide-react';

export function CustomersPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [includeArchived, setIncludeArchived] = useState(false);
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
	const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);
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
		includeArchived,
	});

	const { data: customerDetails } = useCustomerQuery(selectedCustomerId || '');

	const createMutation = useCreateCustomerMutation();
	const updateMutation = useUpdateCustomerMutation();
	const archiveMutation = useArchiveCustomerMutation();
	const unarchiveMutation = useUnarchiveCustomerMutation();

	const handleAddCustomer = () => {
		setSelectedCustomerId(null);
		setSelectedCustomer(null);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleEdit = (customer: CustomerListItem) => {
		setSelectedCustomerId(customer.id);
		setSelectedCustomer(customer);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleArchive = (customer: CustomerListItem) => {
		setSelectedCustomer(customer);
		setMutationError(null);
		setArchiveDialogOpen(true);
	};

	const handleUnarchive = async (customer: CustomerListItem) => {
		setMutationError(null);
		try {
			await unarchiveMutation.mutateAsync(customer.id);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to restore customer');
		}
	};

	const handleFormSubmit = async (data: CreateCustomerInput) => {
		setMutationError(null);
		try {
			if (selectedCustomerId) {
				await updateMutation.mutateAsync({ id: selectedCustomerId, ...data });
			} else {
				await createMutation.mutateAsync(data);
			}
			setFormDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleArchiveConfirm = async () => {
		if (!selectedCustomer) return;
		setMutationError(null);
		try {
			await archiveMutation.mutateAsync(selectedCustomer.id);
			setArchiveDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Customers</h2>
					<p className="text-muted-foreground mt-1">
						Manage your customer database
					</p>
				</div>
				<div className="text-muted-foreground">Loading customers...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Customers</h2>
					<p className="text-muted-foreground mt-1">
						Manage your customer database
					</p>
				</div>
				<div className="text-destructive">
					Error loading customers: {error.message}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Customers</h2>
				<p className="text-muted-foreground mt-1">
					Manage your customer database
				</p>
			</div>

			<div className="flex justify-between items-center mb-4 gap-4">
				<div className="flex items-center gap-4 flex-1">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name, email, phone, or address..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>
					<label className="flex items-center gap-2 text-sm whitespace-nowrap">
						<Checkbox
							checked={includeArchived}
							onCheckedChange={(checked) => setIncludeArchived(checked === true)}
						/>
						Show archived
					</label>
				</div>
				<Button onClick={handleAddCustomer}>Add Customer</Button>
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
						: 'No customers yet. Add your first customer to get started.'}
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Location</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{customers?.map((customer) => (
								<TableRow
									key={customer.id}
									className={customer.archivedAt ? 'opacity-60' : ''}
								>
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
										{customer.archivedAt ? (
											<Badge variant="secondary">Archived</Badge>
										) : (
											<Badge variant="default">Active</Badge>
										)}
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="sm">
													...
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => handleEdit(customer)}>
													Edit
												</DropdownMenuItem>
												{customer.archivedAt ? (
													<DropdownMenuItem
														onClick={() => handleUnarchive(customer)}
														disabled={unarchiveMutation.isPending}
													>
														Restore
													</DropdownMenuItem>
												) : (
													<DropdownMenuItem
														onClick={() => handleArchive(customer)}
														className="text-destructive"
													>
														Archive
													</DropdownMenuItem>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<CustomerFormDialog
				open={formDialogOpen}
				onOpenChange={setFormDialogOpen}
				onSubmit={handleFormSubmit}
				customer={customerDetails as CustomerWithRelations | null}
				isLoading={createMutation.isPending || updateMutation.isPending}
				error={mutationError}
			/>

			<DeleteConfirmDialog
				open={archiveDialogOpen}
				onOpenChange={setArchiveDialogOpen}
				onConfirm={handleArchiveConfirm}
				title="Archive Customer"
				description={`Are you sure you want to archive "${selectedCustomer?.firstName} ${selectedCustomer?.lastName}"? You can restore them later.`}
				isLoading={archiveMutation.isPending}
			/>
		</div>
	);
}
