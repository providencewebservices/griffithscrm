import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { FileTypeIcon } from '@/components/documents/file-type-icon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	DOCUMENT_ENTITY_LABELS,
	type DocumentEntityType,
	useDocumentsQuery,
} from '@/hooks/use-documents';
import { formatFileSize } from '@/lib/file-utils';

interface DocumentPickerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (docs: { id: string; name: string; size: number; contentType: string }[]) => void;
	excludeIds?: string[];
	entityContext?: { entityType: string; entityId: string };
}

export function DocumentPickerDialog({
	open,
	onOpenChange,
	onSelect,
	excludeIds = [],
	entityContext,
}: DocumentPickerDialogProps) {
	const [search, setSearch] = useState('');
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const { data, isLoading } = useDocumentsQuery(
		open
			? {
					search: search || undefined,
					limit: 50,
				}
			: undefined,
	);

	const documents = useMemo(() => {
		if (!data?.documents) return [];
		// Filter out already-attached docs
		const filtered = data.documents.filter((d) => !excludeIds.includes(d.id));
		// If we have entity context, sort those to the top
		if (entityContext) {
			return [...filtered].sort((a, b) => {
				const aMatch =
					a.entityType === entityContext.entityType && a.entityId === entityContext.entityId;
				const bMatch =
					b.entityType === entityContext.entityType && b.entityId === entityContext.entityId;
				if (aMatch && !bMatch) return -1;
				if (!aMatch && bMatch) return 1;
				return 0;
			});
		}
		return filtered;
	}, [data?.documents, excludeIds, entityContext]);

	const handleToggle = useCallback((docId: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(docId)) {
				next.delete(docId);
			} else {
				next.add(docId);
			}
			return next;
		});
	}, []);

	const handleAttach = useCallback(() => {
		const selected = documents.filter((d) => selectedIds.has(d.id));
		onSelect(
			selected.map((d) => ({
				id: d.id,
				name: d.name || d.filename,
				size: d.size || 0,
				contentType: d.contentType,
			})),
		);
		setSelectedIds(new Set());
		setSearch('');
		onOpenChange(false);
	}, [documents, selectedIds, onSelect, onOpenChange]);

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				setSelectedIds(new Set());
				setSearch('');
			}
			onOpenChange(isOpen);
		},
		[onOpenChange],
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[500px] max-h-[70vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Attach Documents</DialogTitle>
				</DialogHeader>

				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search documents..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>

				<div className="flex-1 overflow-y-auto border rounded-md min-h-[200px] max-h-[350px]">
					{isLoading ? (
						<div className="p-8 text-center text-muted-foreground text-sm">
							Loading documents...
						</div>
					) : documents.length === 0 ? (
						<div className="p-8 text-center text-muted-foreground text-sm">
							{search ? 'No documents match your search' : 'No documents found'}
						</div>
					) : (
						documents.map((doc) => {
							const isSelected = selectedIds.has(doc.id);
							const isEntityMatch =
								entityContext &&
								doc.entityType === entityContext.entityType &&
								doc.entityId === entityContext.entityId;

							return (
								<label
									key={doc.id}
									className={`flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
										isSelected ? 'bg-muted/50' : ''
									}`}
								>
									<Checkbox checked={isSelected} onCheckedChange={() => handleToggle(doc.id)} />
									<FileTypeIcon contentType={doc.contentType} className="w-8 h-8 shrink-0" />
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{doc.name || doc.filename}</p>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											{doc.entityName && (
												<span className="truncate max-w-[150px]">
													{DOCUMENT_ENTITY_LABELS[doc.entityType as DocumentEntityType] ||
														doc.entityType}
													: {doc.entityName}
												</span>
											)}
											{isEntityMatch && <span className="text-primary font-medium">Related</span>}
										</div>
									</div>
									<span className="text-xs text-muted-foreground whitespace-nowrap">
										{formatFileSize(doc.size)}
									</span>
								</label>
							);
						})
					)}
				</div>

				<DialogFooter className="flex-row justify-between sm:justify-between">
					<span className="text-sm text-muted-foreground">
						{selectedIds.size > 0
							? `${selectedIds.size} document${selectedIds.size > 1 ? 's' : ''} selected`
							: 'Select documents to attach'}
					</span>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => handleOpenChange(false)}>
							Cancel
						</Button>
						<Button onClick={handleAttach} disabled={selectedIds.size === 0}>
							Attach
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
