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
} from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Pagination, usePagination } from '@/components/ui/pagination';
import {
	useMemorialSitesQuery,
	SITE_TYPE_LABELS,
	type MemorialSiteType,
	type MemorialSiteListItem,
} from '@/hooks/use-memorial-sites';
import { getAvatarColor } from '@/lib/avatar-utils';
import { Search, Church, Flame, Building2, Building, List, LayoutGrid, Phone, MapPin, X, Plus } from 'lucide-react';

type ViewMode = 'active' | 'archived';
type DisplayMode = 'table' | 'cards';

const ITEMS_PER_PAGE = 12;

function getSiteTypeIcon(siteType: MemorialSiteType) {
	switch (siteType) {
		case 'churchyard':
			return Church;
		case 'council_cemetery':
			return Building2;
		case 'chapel':
			return Building;
		default:
			return Flame;
	}
}

export function MemorialSitesList() {
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('active');
	const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
	const [siteTypeFilter, setSiteTypeFilter] = useState<MemorialSiteType | 'all'>('all');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [currentPage, setCurrentPage] = useState(0);

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
			setCurrentPage(0); // Reset to first page on search
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const { data: memorialSites, isLoading, error } = useMemorialSitesQuery({
		q: debouncedSearch || undefined,
		archivedOnly: viewMode === 'archived',
		siteType: siteTypeFilter === 'all' ? undefined : siteTypeFilter,
	});

	const { totalItems, totalPages, paginateItems } = usePagination(memorialSites, ITEMS_PER_PAGE);
	const paginatedMemorialSites = paginateItems(currentPage);

	const handleViewModeChange = (v: string) => {
		setViewMode(v as ViewMode);
		setCurrentPage(0);
	};

	const handleSiteTypeChange = (v: string) => {
		setSiteTypeFilter(v as MemorialSiteType | 'all');
		setCurrentPage(0);
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading memorial sites...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading memorial sites: {error.message}
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
						placeholder="Search memorial sites..."
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
					{/* Left: Status filter + Site type filter + Desktop search */}
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
						<Select
							value={siteTypeFilter}
							onValueChange={handleSiteTypeChange}
						>
							<SelectTrigger className="w-[120px] sm:w-[180px]">
								<SelectValue placeholder="All types" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								<SelectItem value="churchyard">Churchyards</SelectItem>
								<SelectItem value="crematorium">Crematoria</SelectItem>
								<SelectItem value="council_cemetery">Council Cemeteries</SelectItem>
								<SelectItem value="chapel">Chapels</SelectItem>
							</SelectContent>
						</Select>
						{/* Desktop-only inline search */}
						<div className="relative flex-1 hidden sm:block">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search memorial sites..."
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
						<Link to="/app/memorial-sites/new" className="sm:hidden">
							<Button size="icon">
								<Plus className="h-4 w-4" />
							</Button>
						</Link>
						<Link to="/app/memorial-sites/new" className="hidden sm:block">
							<Button>Add Memorial Site</Button>
						</Link>
					</div>
				</div>
			</div>

			{memorialSites && memorialSites.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 border rounded-lg">
					<Church className="h-10 w-10 text-muted-foreground mb-3" />
					<p className="text-muted-foreground mb-4">
						{searchQuery || siteTypeFilter !== 'all'
							? 'No memorial sites found matching your search.'
							: viewMode === 'archived'
								? 'No archived memorial sites.'
								: 'No memorial sites yet. Add your first memorial site to get started.'}
					</p>
					{!searchQuery && siteTypeFilter === 'all' && viewMode === 'active' && (
						<Link to="/app/memorial-sites/new">
							<Button>Add Memorial Site</Button>
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
									<TableHead>Type</TableHead>
									<TableHead>Phone</TableHead>
									<TableHead>Location</TableHead>
									<TableHead className="w-[100px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedMemorialSites.map((site) => (
									<TableRow key={site.id}>
										<TableCell className="font-medium">{site.name}</TableCell>
										<TableCell>
											<SiteTypeBadge siteType={site.siteType} />
										</TableCell>
										<TableCell>
											{site.primaryPhone?.value || (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											{site.primaryAddress?.formattedAddress ? (
												<div className="flex flex-col">
													{site.primaryAddress.formattedAddress.split(', ').map((part, i) => (
														<span key={i}>{part}</span>
													))}
												</div>
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											<Link to={`/app/memorial-sites/${site.id}`}>
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
						{paginatedMemorialSites.map((site) => (
							<MemorialSiteCard key={site.id} site={site} />
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

function SiteTypeBadge({ siteType }: { siteType: MemorialSiteType }) {
	const getVariant = () => {
		if (siteType === 'churchyard') return 'default';
		if (siteType === 'council_cemetery') return 'outline';
		return 'secondary'; // crematorium and chapel both use secondary
	};

	const Icon = getSiteTypeIcon(siteType);

	return (
		<Badge variant={getVariant()} className="gap-1">
			<Icon className="h-3 w-3" />
			{SITE_TYPE_LABELS[siteType]}
		</Badge>
	);
}

function MemorialSiteCard({ site }: { site: MemorialSiteListItem }) {
	const Icon = getSiteTypeIcon(site.siteType);
	const avatarColor = getAvatarColor(site.name);

	return (
		<Link to={`/app/memorial-sites/${site.id}`} className="block">
			<Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-3">
							<div
								className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
								style={{ backgroundColor: avatarColor }}
							>
								<Icon className="h-4 w-4" />
							</div>
							<CardTitle className="text-base font-medium">{site.name}</CardTitle>
						</div>
						<SiteTypeBadge siteType={site.siteType} />
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
						{site.primaryPhone?.value && (
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4" />
								<span>{site.primaryPhone.value}</span>
							</div>
						)}
						{site.primaryAddress && (
							<div className="flex gap-2">
								<MapPin className="h-4 w-4 mt-0.5 shrink-0" />
								<div className="flex flex-col">
									{site.primaryAddress.formattedAddress?.split(', ').map((part, i) => (
										<span key={i}>{part}</span>
									))}
								</div>
							</div>
						)}
						{!site.primaryPhone?.value && !site.primaryAddress && (
							<div className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								<span>No location info</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
