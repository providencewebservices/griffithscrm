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
} from '@/hooks/use-memorial-sites';
import { Search, Church, Flame } from 'lucide-react';

type ViewMode = 'active' | 'archived';

export function MemorialSitesPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('active');
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
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Memorial Sites</h2>
					<p className="text-muted-foreground mt-1">
						Manage churchyards, crematoria, and memorial gardens
					</p>
				</div>
				<div className="text-muted-foreground">Loading memorial sites...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Memorial Sites</h2>
					<p className="text-muted-foreground mt-1">
						Manage churchyards, crematoria, and memorial gardens
					</p>
				</div>
				<div className="text-destructive">
					Error loading memorial sites: {error.message}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Memorial Sites</h2>
				<p className="text-muted-foreground mt-1">
					Manage churchyards, crematoria, and memorial gardens
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
				<Link to="/app/memorial-sites/new">
					<Button>Add Memorial Site</Button>
				</Link>
			</div>

			{memorialSites && memorialSites.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					{searchQuery || siteTypeFilter !== 'all'
						? 'No memorial sites found matching your search.'
						: viewMode === 'archived'
							? 'No archived memorial sites.'
							: 'No memorial sites yet. Add your first memorial site to get started.'}
				</div>
			) : (
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
										<Badge
											variant={site.siteType === 'churchyard' ? 'default' : 'secondary'}
											className="gap-1"
										>
											{site.siteType === 'churchyard' ? (
												<Church className="h-3 w-3" />
											) : (
												<Flame className="h-3 w-3" />
											)}
											{SITE_TYPE_LABELS[site.siteType]}
										</Badge>
									</TableCell>
									<TableCell>
										{site.siteType === 'churchyard' && site.denomination ? (
											<span>{DENOMINATION_LABELS[site.denomination]}</span>
										) : site.siteType === 'crematorium' && site.operatorName ? (
											<span>{site.operatorName}</span>
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
			)}
		</div>
	);
}
