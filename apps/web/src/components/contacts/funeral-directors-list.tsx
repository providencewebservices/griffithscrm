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
import { Pagination, usePagination } from '@/components/ui/pagination';
import { useFuneralDirectorsQuery, type FuneralDirectorListItem } from '@/hooks/use-funeral-directors';
import { Search, List, LayoutGrid, Mail, Phone, MapPin, Building } from 'lucide-react';

type ViewMode = 'active' | 'archived';
type DisplayMode = 'table' | 'cards';

const ITEMS_PER_PAGE = 12;

export function FuneralDirectorsList() {
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('active');
	const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [currentPage, setCurrentPage] = useState(0);

	// Debounce search
	useMemo(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
			setCurrentPage(0); // Reset to first page on search
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const { data: funeralDirectors, isLoading, error } = useFuneralDirectorsQuery({
		q: debouncedSearch || undefined,
		archivedOnly: viewMode === 'archived',
	});

	const { totalItems, totalPages, paginateItems } = usePagination(funeralDirectors, ITEMS_PER_PAGE);
	const paginatedFuneralDirectors = paginateItems(currentPage);

	const handleViewModeChange = (v: string) => {
		setViewMode(v as ViewMode);
		setCurrentPage(0);
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading funeral directors...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading funeral directors: {error.message}
			</div>
		);
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-4 gap-4">
				<div className="flex items-center gap-4 flex-1">
					<Tabs value={viewMode} onValueChange={handleViewModeChange}>
						<TabsList>
							<TabsTrigger value="active">Active</TabsTrigger>
							<TabsTrigger value="archived">Archived</TabsTrigger>
						</TabsList>
					</Tabs>
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name, email, phone, or location..."
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
					<Link to="/app/funeral-directors/new">
						<Button>Add Funeral Director</Button>
					</Link>
				</div>
			</div>

			{funeralDirectors && funeralDirectors.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					{searchQuery
						? 'No funeral directors found matching your search.'
						: viewMode === 'archived'
							? 'No archived funeral directors.'
							: 'No funeral directors yet. Add your first funeral director to get started.'}
				</div>
			) : displayMode === 'table' ? (
				<>
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Business Name</TableHead>
									<TableHead>Branch</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Phone</TableHead>
									<TableHead>Location</TableHead>
									<TableHead className="w-[100px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedFuneralDirectors.map((fd) => (
									<TableRow key={fd.id}>
										<TableCell className="font-medium">
											{fd.tradingName || fd.businessName}
										</TableCell>
										<TableCell>
											{fd.branchName || (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											{fd.primaryEmail?.value || (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											{fd.primaryPhone?.value || (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											{fd.primaryAddress ? (
												<span>
													{fd.primaryAddress.locality}
													{fd.primaryAddress.administrativeAreaLevel1 &&
														`, ${fd.primaryAddress.administrativeAreaLevel1}`}
												</span>
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											<Link to={`/app/funeral-directors/${fd.id}`}>
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
						{paginatedFuneralDirectors.map((fd) => (
							<FuneralDirectorCard key={fd.id} funeralDirector={fd} />
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

function FuneralDirectorCard({ funeralDirector: fd }: { funeralDirector: FuneralDirectorListItem }) {
	const displayName = fd.tradingName || fd.businessName;

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-3">
				<CardTitle className="text-base">{displayName}</CardTitle>
				{fd.branchName && (
					<p className="text-sm text-muted-foreground">{fd.branchName}</p>
				)}
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
					{fd.primaryEmail?.value && (
						<div className="flex items-center gap-2">
							<Mail className="h-3.5 w-3.5" />
							<span className="truncate">{fd.primaryEmail.value}</span>
						</div>
					)}
					{fd.primaryPhone?.value && (
						<div className="flex items-center gap-2">
							<Phone className="h-3.5 w-3.5" />
							<span>{fd.primaryPhone.value}</span>
						</div>
					)}
					{fd.primaryAddress && (
						<div className="flex items-center gap-2">
							<MapPin className="h-3.5 w-3.5" />
							<span>
								{fd.primaryAddress.locality}
								{fd.primaryAddress.administrativeAreaLevel1 &&
									`, ${fd.primaryAddress.administrativeAreaLevel1}`}
							</span>
						</div>
					)}
					{!fd.primaryEmail?.value && !fd.primaryPhone?.value && !fd.primaryAddress && (
						<div className="flex items-center gap-2">
							<Building className="h-3.5 w-3.5" />
							<span>No contact info</span>
						</div>
					)}
				</div>

				<div className="pt-2">
					<Link to={`/app/funeral-directors/${fd.id}`}>
						<Button variant="outline" size="sm" className="w-full">
							View Details
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
