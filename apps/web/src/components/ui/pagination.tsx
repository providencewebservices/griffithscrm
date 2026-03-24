import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
}

export function Pagination({
	currentPage,
	totalPages,
	totalItems,
	itemsPerPage,
	onPageChange,
}: PaginationProps) {
	const startItem = currentPage * itemsPerPage + 1;
	const endItem = Math.min((currentPage + 1) * itemsPerPage, totalItems);

	if (totalItems === 0) return null;

	return (
		<div className="flex items-center justify-between mt-4 pt-4 border-t">
			<p className="text-sm text-muted-foreground">
				Showing {startItem} - {endItem} of {totalItems}
			</p>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 0}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<span className="text-sm text-muted-foreground px-2">
					Page {currentPage + 1} of {totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage >= totalPages - 1}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

export function usePagination<T>(items: T[] | undefined, itemsPerPage: number = 12) {
	const totalItems = items?.length ?? 0;
	const totalPages = Math.ceil(totalItems / itemsPerPage);

	const paginateItems = (page: number): T[] => {
		if (!items) return [];
		const start = page * itemsPerPage;
		return items.slice(start, start + itemsPerPage);
	};

	return {
		totalItems,
		totalPages,
		itemsPerPage,
		paginateItems,
	};
}
