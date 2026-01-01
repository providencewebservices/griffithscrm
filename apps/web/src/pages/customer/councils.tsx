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
import { useCouncilsQuery } from '@/hooks/use-councils';
import { Search, CheckCircle, XCircle } from 'lucide-react';

type ViewMode = 'active' | 'archived';

export function CouncilsPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('active');
	const [debouncedSearch, setDebouncedSearch] = useState('');

	// Debounce search
	useMemo(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const { data: councils, isLoading, error } = useCouncilsQuery({
		q: debouncedSearch || undefined,
		archivedOnly: viewMode === 'archived',
	});

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Councils</h2>
					<p className="text-muted-foreground mt-1">
						Manage council cemetery regulations and requirements
					</p>
				</div>
				<div className="text-muted-foreground">Loading councils...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Councils</h2>
					<p className="text-muted-foreground mt-1">
						Manage council cemetery regulations and requirements
					</p>
				</div>
				<div className="text-destructive">
					Error loading councils: {error.message}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Councils</h2>
				<p className="text-muted-foreground mt-1">
					Manage council cemetery regulations and requirements
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
							placeholder="Search by council name, cemetery, or location..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>
				</div>
				<Link to="/app/councils/new">
					<Button>Add Council</Button>
				</Link>
			</div>

			{councils && councils.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					{searchQuery
						? 'No councils found matching your search.'
						: viewMode === 'archived'
							? 'No archived councils.'
							: 'No councils yet. Add your first council to get started.'}
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Council Name</TableHead>
								<TableHead>Cemetery</TableHead>
								<TableHead>Permit Required</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Location</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{councils?.map((council) => (
								<TableRow key={council.id}>
									<TableCell className="font-medium">
										{council.councilName}
									</TableCell>
									<TableCell>
										{council.cemeteryName || (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell>
										{council.permitRequired ? (
											<Badge variant="default" className="gap-1">
												<CheckCircle className="h-3 w-3" />
												Required
											</Badge>
										) : (
											<Badge variant="secondary" className="gap-1">
												<XCircle className="h-3 w-3" />
												Not Required
											</Badge>
										)}
									</TableCell>
									<TableCell>
										{council.primaryPhone?.value || (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell>
										{council.primaryAddress ? (
											<span>
												{council.primaryAddress.locality}
												{council.primaryAddress.administrativeAreaLevel1 &&
													`, ${council.primaryAddress.administrativeAreaLevel1}`}
											</span>
										) : (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell>
										<Link to={`/app/councils/${council.id}`}>
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
