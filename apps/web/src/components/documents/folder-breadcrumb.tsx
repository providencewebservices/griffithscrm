import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BreadcrumbItem } from '@/hooks/use-document-folders';

interface FolderBreadcrumbProps {
	breadcrumb: BreadcrumbItem[];
	onNavigate: (folderId: string | null) => void;
	showAllDocuments?: boolean;
}

export function FolderBreadcrumb({
	breadcrumb,
	onNavigate,
	showAllDocuments = false,
}: FolderBreadcrumbProps) {
	return (
		<nav className="flex items-center gap-1 text-sm">
			{showAllDocuments ? (
				<Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onNavigate('all')}>
					All Documents
				</Button>
			) : (
				<Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onNavigate(null)}>
					<Home className="h-4 w-4 mr-1" />
					Documents
				</Button>
			)}

			{breadcrumb.map((item, index) => (
				<div key={item.id} className="flex items-center gap-1">
					<ChevronRight className="h-4 w-4 text-muted-foreground" />
					{index === breadcrumb.length - 1 ? (
						<span className="font-medium px-2">{item.name}</span>
					) : (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2"
							onClick={() => onNavigate(item.id)}
						>
							{item.name}
						</Button>
					)}
				</div>
			))}
		</nav>
	);
}
