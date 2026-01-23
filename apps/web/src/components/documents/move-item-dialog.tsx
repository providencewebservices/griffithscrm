import { useState, useMemo } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	ChevronRight,
	ChevronDown,
	Folder,
	FolderOpen,
	Home,
} from 'lucide-react';
import {
	useAllFoldersQuery,
	useMoveFolderMutation,
	useMoveDocumentMutation,
	useBulkMoveDocumentsMutation,
	buildFolderTree,
	type DocumentFolder,
} from '@/hooks/use-document-folders';

type MoveItemType = 'folder' | 'document' | 'documents';

interface MoveItemDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	itemType: MoveItemType;
	itemId?: string;
	itemIds?: string[];
	itemName?: string;
	currentFolderId?: string | null;
	excludeFolderId?: string; // Exclude this folder and its descendants from selection
	onSuccess?: () => void;
}

interface FolderSelectItemProps {
	folder: DocumentFolder & { children?: DocumentFolder[] };
	level: number;
	selectedFolderId: string | null;
	expandedFolders: Set<string>;
	excludeFolderId?: string;
	onSelect: (folderId: string | null) => void;
	onToggleExpand: (folderId: string) => void;
}

function FolderSelectItem({
	folder,
	level,
	selectedFolderId,
	expandedFolders,
	excludeFolderId,
	onSelect,
	onToggleExpand,
}: FolderSelectItemProps) {
	const hasChildren = folder.children && folder.children.length > 0;
	const isExpanded = expandedFolders.has(folder.id);
	const isSelected = selectedFolderId === folder.id;

	// Check if this folder or any of its ancestors is the excluded folder
	const isExcluded = excludeFolderId && folder.path.includes(`/${excludeFolderId}`);

	if (isExcluded) return null;

	return (
		<div>
			<div
				className={cn(
					'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer hover:bg-accent text-sm',
					isSelected && 'bg-accent'
				)}
				style={{ paddingLeft: `${level * 16 + 8}px` }}
				onClick={() => onSelect(folder.id)}
			>
				{hasChildren ? (
					<Button
						variant="ghost"
						size="icon"
						className="h-5 w-5 p-0"
						onClick={(e) => {
							e.stopPropagation();
							onToggleExpand(folder.id);
						}}
					>
						{isExpanded ? (
							<ChevronDown className="h-3 w-3" />
						) : (
							<ChevronRight className="h-3 w-3" />
						)}
					</Button>
				) : (
					<span className="w-5" />
				)}
				{isExpanded ? (
					<FolderOpen
						className="h-4 w-4 shrink-0"
						style={{ color: folder.color || undefined }}
					/>
				) : (
					<Folder
						className="h-4 w-4 shrink-0"
						style={{ color: folder.color || undefined }}
					/>
				)}
				<span className="truncate">{folder.name}</span>
			</div>
			{hasChildren && isExpanded && (
				<div>
					{folder.children
						?.filter((child) => !excludeFolderId || !child.path.includes(`/${excludeFolderId}`))
						.map((child) => (
							<FolderSelectItem
								key={child.id}
								folder={child as DocumentFolder & { children?: DocumentFolder[] }}
								level={level + 1}
								selectedFolderId={selectedFolderId}
								expandedFolders={expandedFolders}
								excludeFolderId={excludeFolderId}
								onSelect={onSelect}
								onToggleExpand={onToggleExpand}
							/>
						))}
				</div>
			)}
		</div>
	);
}

export function MoveItemDialog({
	open,
	onOpenChange,
	itemType,
	itemId,
	itemIds,
	itemName,
	currentFolderId,
	excludeFolderId,
	onSuccess,
}: MoveItemDialogProps) {
	const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId ?? null);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

	const { data: folders } = useAllFoldersQuery();
	const moveFolderMutation = useMoveFolderMutation();
	const moveDocumentMutation = useMoveDocumentMutation();
	const bulkMoveMutation = useBulkMoveDocumentsMutation();

	const folderTree = useMemo(() => (folders ? buildFolderTree(folders) : []), [folders]);

	const isLoading =
		moveFolderMutation.isPending ||
		moveDocumentMutation.isPending ||
		bulkMoveMutation.isPending;

	const handleToggleExpand = (folderId: string) => {
		setExpandedFolders((prev) => {
			const next = new Set(prev);
			if (next.has(folderId)) {
				next.delete(folderId);
			} else {
				next.add(folderId);
			}
			return next;
		});
	};

	const handleMove = async () => {
		try {
			if (itemType === 'folder' && itemId) {
				await moveFolderMutation.mutateAsync({
					id: itemId,
					parentId: selectedFolderId,
				});
			} else if (itemType === 'document' && itemId) {
				await moveDocumentMutation.mutateAsync({
					id: itemId,
					folderId: selectedFolderId,
				});
			} else if (itemType === 'documents' && itemIds && itemIds.length > 0) {
				await bulkMoveMutation.mutateAsync({
					documentIds: itemIds,
					folderId: selectedFolderId,
				});
			}
			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			// Error is handled by mutation
		}
	};

	const getTitle = () => {
		switch (itemType) {
			case 'folder':
				return 'Move Folder';
			case 'document':
				return 'Move Document';
			case 'documents':
				return `Move ${itemIds?.length} Documents`;
			default:
				return 'Move Item';
		}
	};

	const getDescription = () => {
		if (itemType === 'documents') {
			return 'Select a destination folder for the selected documents.';
		}
		return `Select a destination folder for "${itemName}".`;
	};

	const error =
		moveFolderMutation.error ||
		moveDocumentMutation.error ||
		bulkMoveMutation.error;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{getTitle()}</DialogTitle>
					<DialogDescription>{getDescription()}</DialogDescription>
				</DialogHeader>

				<div className="border rounded-lg max-h-[300px] overflow-y-auto">
					{/* Root (Unfiled) option */}
					<div
						className={cn(
							'flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-accent text-sm',
							selectedFolderId === null && 'bg-accent'
						)}
						onClick={() => setSelectedFolderId(null)}
					>
						<Home className="h-4 w-4 shrink-0" />
						<span>Unfiled (Root)</span>
					</div>

					{/* Folder tree */}
					{folderTree
						.filter((folder) => !excludeFolderId || folder.id !== excludeFolderId)
						.map((folder) => (
							<FolderSelectItem
								key={folder.id}
								folder={folder}
								level={0}
								selectedFolderId={selectedFolderId}
								expandedFolders={expandedFolders}
								excludeFolderId={excludeFolderId}
								onSelect={setSelectedFolderId}
								onToggleExpand={handleToggleExpand}
							/>
						))}
				</div>

				{error && (
					<div className="text-sm text-destructive">{error.message}</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button
						onClick={handleMove}
						disabled={isLoading || selectedFolderId === currentFolderId}
					>
						{isLoading ? 'Moving...' : 'Move Here'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
