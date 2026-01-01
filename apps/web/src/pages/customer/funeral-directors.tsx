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
import { useFuneralDirectorsQuery } from '@/hooks/use-funeral-directors';
import { Search } from 'lucide-react';

type ViewMode = 'active' | 'archived';

export function FuneralDirectorsPage() {
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

	const { data: funeralDirectors, isLoading, error } = useFuneralDirectorsQuery({
		q: debouncedSearch || undefined,
		archivedOnly: viewMode === 'archived',
	});

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Funeral Directors</h2>
					<p className="text-muted-foreground mt-1">
						Manage funeral director relationships
					</p>
				</div>
				<div className="text-muted-foreground">Loading funeral directors...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Funeral Directors</h2>
					<p className="text-muted-foreground mt-1">
						Manage funeral director relationships
					</p>
				</div>
				<div className="text-destructive">
					Error loading funeral directors: {error.message}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Funeral Directors</h2>
				<p className="text-muted-foreground mt-1">
					Manage funeral director relationships
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
							placeholder="Search by name, email, phone, or location..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>
				</div>
				<Link to="/app/funeral-directors/new">
					<Button>Add Funeral Director</Button>
				</Link>
			</div>

			{funeralDirectors && funeralDirectors.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					{searchQuery
						? 'No funeral directors found matching your search.'
						: viewMode === 'archived'
							? 'No archived funeral directors.'
							: 'No funeral directors yet. Add your first funeral director to get started.'}
				</div>
			) : (
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
							{funeralDirectors?.map((fd) => (
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
			)}
		</div>
	);
}
