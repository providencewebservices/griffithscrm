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
import {
	useMemorialSitesQuery,
	SITE_TYPE_LABELS,
	DENOMINATION_LABELS,
	type MemorialSiteType,
	type MemorialSiteListItem,
} from '@/hooks/use-memorial-sites';
import { Search, Church, Flame, Building2, List, LayoutGrid, Phone, MapPin } from 'lucide-react';

type ViewMode = 'active' | 'archived';
type DisplayMode = 'table' | 'cards';

export function MemorialSitesList() {
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('active');
	const [displayMode, setDisplayMode] = useState<DisplayMode>('table');
	const [siteTypeFilter, setSiteTypeFilter] = useState<MemorialSiteType | 'all'>('all');
	const [debouncedSearch, setDebouncedSearch] = useState('');

	// Debounce search
	useMemo(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const { data: memorialSites, isLoading, error } = useMemorialSitesQuery({
		q: debouncedSearch || undefined,
		archivedOnly: viewMode === 'archived',
		siteType: siteTypeFilter === 'all' ? undefined : siteTypeFilter,
	});

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
			<div className="flex justify-between items-center mb-4 gap-4">
				<div className="flex items-center gap-4 flex-1">
					<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
						<TabsList>
							<TabsTrigger value="active">Active</TabsTrigger>
							<TabsTrigger value="archived">Archived</TabsTrigger>
						</TabsList>
					</Tabs>
					<Select
						value={siteTypeFilter}
						onValueChange={(v) => setSiteTypeFilter(v as MemorialSiteType | 'all')}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="All types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							<SelectItem value="churchyard">Churchyards</SelectItem>
							<SelectItem value="crematorium">Crematoria</SelectItem>
							<SelectItem value="council_cemetery">Council Cemeteries</SelectItem>
						</SelectContent>
					</Select>
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name, location, or denomination..."
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
					<Link to="/app/memorial-sites/new">
						<Button>Add Memorial Site</Button>
					</Link>
				</div>
			</div>

			{memorialSites && memorialSites.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					{searchQuery || siteTypeFilter !== 'all'
						? 'No memorial sites found matching your search.'
						: viewMode === 'archived'
							? 'No archived memorial sites.'
							: 'No memorial sites yet. Add your first memorial site to get started.'}
				</div>
			) : displayMode === 'table' ? (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Details</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Location</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{memorialSites?.map((site) => (
								<TableRow key={site.id}>
									<TableCell className="font-medium">{site.name}</TableCell>
									<TableCell>
										<SiteTypeBadge siteType={site.siteType} />
									</TableCell>
									<TableCell>
										{site.siteType === 'churchyard' && site.denomination ? (
											<span>{DENOMINATION_LABELS[site.denomination]}</span>
										) : site.siteType === 'crematorium' && site.operatorName ? (
											<span>{site.operatorName}</span>
										) : site.siteType === 'council_cemetery' && site.councilName ? (
											<span>{site.councilName}</span>
										) : (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell>
										{site.primaryPhone?.value || (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell>
										{site.primaryAddress ? (
											<span>
												{site.primaryAddress.locality}
												{site.primaryAddress.administrativeAreaLevel1 &&
													`, ${site.primaryAddress.administrativeAreaLevel1}`}
											</span>
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
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{memorialSites?.map((site) => (
						<MemorialSiteCard key={site.id} site={site} />
					))}
				</div>
			)}
		</div>
	);
}

function SiteTypeBadge({ siteType }: { siteType: MemorialSiteType }) {
	return (
		<Badge
			variant={siteType === 'churchyard' ? 'default' : siteType === 'council_cemetery' ? 'outline' : 'secondary'}
			className="gap-1"
		>
			{siteType === 'churchyard' ? (
				<Church className="h-3 w-3" />
			) : siteType === 'council_cemetery' ? (
				<Building2 className="h-3 w-3" />
			) : (
				<Flame className="h-3 w-3" />
			)}
			{SITE_TYPE_LABELS[siteType]}
		</Badge>
	);
}

function MemorialSiteCard({ site }: { site: MemorialSiteListItem }) {
	const getDetail = () => {
		if (site.siteType === 'churchyard' && site.denomination) {
			return DENOMINATION_LABELS[site.denomination];
		}
		if (site.siteType === 'crematorium' && site.operatorName) {
			return site.operatorName;
		}
		if (site.siteType === 'council_cemetery' && site.councilName) {
			return site.councilName;
		}
		return null;
	};

	const detail = getDetail();

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="text-base">{site.name}</CardTitle>
					<SiteTypeBadge siteType={site.siteType} />
				</div>
				{detail && (
					<p className="text-sm text-muted-foreground">{detail}</p>
				)}
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
					{site.primaryPhone?.value && (
						<div className="flex items-center gap-2">
							<Phone className="h-3.5 w-3.5" />
							<span>{site.primaryPhone.value}</span>
						</div>
					)}
					{site.primaryAddress && (
						<div className="flex items-center gap-2">
							<MapPin className="h-3.5 w-3.5" />
							<span>
								{site.primaryAddress.locality}
								{site.primaryAddress.administrativeAreaLevel1 &&
									`, ${site.primaryAddress.administrativeAreaLevel1}`}
							</span>
						</div>
					)}
					{!site.primaryPhone?.value && !site.primaryAddress && (
						<div className="flex items-center gap-2">
							<MapPin className="h-3.5 w-3.5" />
							<span>No location info</span>
						</div>
					)}
				</div>

				<div className="pt-2">
					<Link to={`/app/memorial-sites/${site.id}`}>
						<Button variant="outline" size="sm" className="w-full">
							View Details
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
