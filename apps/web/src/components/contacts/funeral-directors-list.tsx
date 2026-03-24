import {
	Building,
	Building2,
	LayoutGrid,
	List,
	Mail,
	MapPin,
	Phone,
	Plus,
	Search,
	X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination, usePagination } from '@/components/ui/pagination';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	type FuneralDirectorListItem,
	useFuneralDirectorsQuery,
} from '@/hooks/use-funeral-directors';
import { getAvatarColor, getInitials } from '@/lib/avatar-utils';

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
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
			setCurrentPage(0); // Reset to first page on search
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const {
		data: funeralDirectors,
		isLoading,
		error,
	} = useFuneralDirectorsQuery({
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
		return <div className="text-destructive">Error loading funeral directors: {error.message}</div>;
	}

	return (
		<div>
			<div className="flex flex-col gap-3 mb-4">
				{/* Mobile-only search row (full width) */}
				<div className="relative w-full sm:hidden">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search funeral directors..."
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
								placeholder="Search funeral directors..."
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
						<Link to="/app/funeral-directors/new" className="sm:hidden">
							<Button size="icon">
								<Plus className="h-4 w-4" />
							</Button>
						</Link>
						<Link to="/app/funeral-directors/new" className="hidden sm:block">
							<Button>Add Funeral Director</Button>
						</Link>
					</div>
				</div>
			</div>

			{funeralDirectors && funeralDirectors.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 border rounded-lg">
					<Building2 className="h-10 w-10 text-muted-foreground mb-3" />
					<p className="text-muted-foreground mb-4">
						{searchQuery
							? 'No funeral directors found matching your search.'
							: viewMode === 'archived'
								? 'No archived funeral directors.'
								: 'No funeral directors yet. Add your first funeral director to get started.'}
					</p>
					{!searchQuery && viewMode === 'active' && (
						<Link to="/app/funeral-directors/new">
							<Button>Add Funeral Director</Button>
						</Link>
					)}
				</div>
			) : displayMode === 'table' ? (
				<>
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Business Name</TableHead>
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
											{fd.primaryEmail?.value || <span className="text-muted-foreground">-</span>}
										</TableCell>
										<TableCell>
											{fd.primaryPhone?.value || <span className="text-muted-foreground">-</span>}
										</TableCell>
										<TableCell>
											{fd.primaryAddress?.formattedAddress ? (
												<div className="flex flex-col">
													{fd.primaryAddress.formattedAddress.split(', ').map((part, i) => (
														<span key={i}>{part}</span>
													))}
												</div>
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

function FuneralDirectorCard({
	funeralDirector: fd,
}: {
	funeralDirector: FuneralDirectorListItem;
}) {
	const displayName = fd.tradingName || fd.businessName;
	const initials = getInitials(displayName);
	const avatarColor = getAvatarColor(displayName);

	return (
		<Link to={`/app/funeral-directors/${fd.id}`} className="block">
			<Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
				<CardHeader className="pb-3">
					<div className="flex items-center gap-3">
						<div
							className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
							style={{ backgroundColor: avatarColor }}
						>
							{initials}
						</div>
						<CardTitle className="text-base font-medium">{displayName}</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
						{fd.primaryEmail?.value && (
							<div className="flex items-center gap-2">
								<Mail className="h-4 w-4" />
								<span className="truncate">{fd.primaryEmail.value}</span>
							</div>
						)}
						{fd.primaryPhone?.value && (
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4" />
								<span>{fd.primaryPhone.value}</span>
							</div>
						)}
						{fd.primaryAddress && (
							<div className="flex gap-2">
								<MapPin className="h-4 w-4 mt-0.5 shrink-0" />
								<div className="flex flex-col">
									{fd.primaryAddress.formattedAddress?.split(', ').map((part, i) => (
										<span key={i}>{part}</span>
									))}
								</div>
							</div>
						)}
						{!fd.primaryEmail?.value && !fd.primaryPhone?.value && !fd.primaryAddress && (
							<div className="flex items-center gap-2">
								<Building className="h-4 w-4" />
								<span>No contact info</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
