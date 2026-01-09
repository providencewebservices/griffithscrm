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
	CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSuppliersQuery, type SupplierListItem } from '@/hooks/use-suppliers';
import { Search, List, LayoutGrid, Phone, MapPin } from 'lucide-react';

type ViewMode = 'active' | 'archived';
type DisplayMode = 'table' | 'cards';

export function SuppliersPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('active');
	const [displayMode, setDisplayMode] = useState<DisplayMode>('table');
	const [debouncedSearch, setDebouncedSearch] = useState('');

	// Debounce search
	useMemo(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const { data: suppliers, isLoading, error } = useSuppliersQuery({
		q: debouncedSearch || undefined,
		archivedOnly: viewMode === 'archived',
	});

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Suppliers</h2>
					<p className="text-muted-foreground mt-1">
						Manage your material and product suppliers
					</p>
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
					<p className="text-muted-foreground mt-1">
						Manage your material and product suppliers
					</p>
				</div>
				<div className="text-destructive">
					Error loading suppliers: {error.message}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Suppliers</h2>
				<p className="text-muted-foreground mt-1">
					Manage your material and product suppliers
				</p>
			</div>

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
							placeholder="Search by name, account number, or location..."
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
					<Link to="/app/suppliers/new">
						<Button>Add Supplier</Button>
					</Link>
				</div>
			</div>

			{suppliers && suppliers.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					{searchQuery
						? 'No suppliers found matching your search.'
						: viewMode === 'archived'
							? 'No archived suppliers.'
							: 'No suppliers yet. Add your first supplier to get started.'}
				</div>
			) : displayMode === 'table' ? (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Account #</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead className="text-center">Materials</TableHead>
								<TableHead className="text-center">Sundries</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{suppliers?.map((supplier) => (
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
										{supplier.accountNumber || (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell>
										{supplier.primaryPhone?.value || (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell className="text-center">
										{supplier.materialsCount}
									</TableCell>
									<TableCell className="text-center">
										{supplier.sundriesCount}
									</TableCell>
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
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{suppliers?.map((supplier) => (
						<SupplierCard key={supplier.id} supplier={supplier} />
					))}
				</div>
			)}
		</div>
	);
}

function SupplierCard({ supplier }: { supplier: SupplierListItem }) {
	const displayName = supplier.tradingName || supplier.businessName;
	const hasLocation = supplier.primaryAddress?.locality;

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle className="text-base">{displayName}</CardTitle>
						{supplier.tradingName && supplier.tradingName !== supplier.businessName && (
							<CardDescription>{supplier.businessName}</CardDescription>
						)}
					</div>
					{supplier.accountNumber && (
						<Badge variant="outline" className="text-xs">
							{supplier.accountNumber}
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
					{supplier.primaryPhone?.value && (
						<div className="flex items-center gap-2">
							<Phone className="h-3.5 w-3.5" />
							<span>{supplier.primaryPhone.value}</span>
						</div>
					)}
					{hasLocation && (
						<div className="flex items-center gap-2">
							<MapPin className="h-3.5 w-3.5" />
							<span>{supplier.primaryAddress?.locality}</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2 pt-1">
					<Badge variant="secondary" className="text-xs">
						{supplier.materialsCount} material{supplier.materialsCount !== 1 ? 's' : ''}
					</Badge>
					<Badge variant="secondary" className="text-xs">
						{supplier.sundriesCount} sundr{supplier.sundriesCount !== 1 ? 'ies' : 'y'}
					</Badge>
				</div>

				<div className="pt-2">
					<Link to={`/app/suppliers/${supplier.id}`}>
						<Button variant="outline" size="sm" className="w-full">
							View Details
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
