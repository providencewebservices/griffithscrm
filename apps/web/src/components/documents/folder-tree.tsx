import { ChevronDown, ChevronRight, File, Files, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	buildFolderTree,
	type DocumentFolder,
	useAllFoldersQuery,
} from '@/hooks/use-document-folders';
import { cn } from '@/lib/utils';

interface FolderTreeItemProps {
	folder: DocumentFolder & { children?: DocumentFolder[] };
	level: number;
	selectedFolderId: string | null;
	expandedFolders: Set<string>;
	dragOverTarget: string | null;
	onSelectFolder: (folderId: string | null) => void;
	onToggleExpand: (folderId: string) => void;
	onDragOver: (e: React.DragEvent, target: string) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent, folderId: string) => void;
}

function FolderTreeItem({
	folder,
	level,
	selectedFolderId,
	expandedFolders,
	dragOverTarget,
	onSelectFolder,
	onToggleExpand,
	onDragOver,
	onDragLeave,
	onDrop,
}: FolderTreeItemProps) {
	const hasChildren = folder.children && folder.children.length > 0;
	const isExpanded = expandedFolders.has(folder.id);
	const isSelected = selectedFolderId === folder.id;
	const isDragOver = dragOverTarget === folder.id;

	return (
		<div>
			<div
				className={cn(
					'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer hover:bg-accent text-sm transition-colors',
					isSelected && 'bg-accent',
					isDragOver && 'bg-primary/20 ring-2 ring-primary ring-inset',
				)}
				style={{ paddingLeft: `${level * 16 + 8}px` }}
				onDragOver={(e) => onDragOver(e, folder.id)}
				onDragLeave={onDragLeave}
				onDrop={(e) => onDrop(e, folder.id)}
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
				<div
					className="flex items-center gap-2 flex-1 min-w-0"
					onClick={() => onSelectFolder(folder.id)}
				>
					{isExpanded ? (
						<FolderOpen className="h-4 w-4 shrink-0" style={{ color: folder.color || undefined }} />
					) : (
						<Folder className="h-4 w-4 shrink-0" style={{ color: folder.color || undefined }} />
					)}
					<span className="truncate">{folder.name}</span>
				</div>
			</div>
			{hasChildren && isExpanded && (
				<div>
					{folder.children?.map((child) => (
						<FolderTreeItem
							key={child.id}
							folder={child as DocumentFolder & { children?: DocumentFolder[] }}
							level={level + 1}
							selectedFolderId={selectedFolderId}
							expandedFolders={expandedFolders}
							dragOverTarget={dragOverTarget}
							onSelectFolder={onSelectFolder}
							onToggleExpand={onToggleExpand}
							onDragOver={onDragOver}
							onDragLeave={onDragLeave}
							onDrop={onDrop}
						/>
					))}
				</div>
			)}
		</div>
	);
}

interface FolderTreeProps {
	selectedFolderId: string | null;
	onSelectFolder: (folderId: string | null) => void;
	onFilesDropped?: (files: File[], folderId: string | null) => void;
	onDocumentDropped?: (documentId: string, folderId: string | null) => void;
	className?: string;
}

export function FolderTree({
	selectedFolderId,
	onSelectFolder,
	onFilesDropped,
	onDocumentDropped,
	className,
}: FolderTreeProps) {
	const { data: folders, isLoading } = useAllFoldersQuery();
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
	const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

	const handleDragOver = (e: React.DragEvent, target: string) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOverTarget(target);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOverTarget(null);
	};

	const handleDrop = (e: React.DragEvent, folderId: string | null) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOverTarget(null);

		// Check for document move first
		const documentData = e.dataTransfer.getData('application/x-document-move');
		if (documentData && onDocumentDropped) {
			try {
				const { documentId } = JSON.parse(documentData);
				onDocumentDropped(documentId, folderId);
				return;
			} catch {
				// Invalid data, fall through to file upload
			}
		}

		// Fall back to file upload
		if (e.dataTransfer.files.length > 0 && onFilesDropped) {
			const files = Array.from(e.dataTransfer.files);
			onFilesDropped(files, folderId);
		}
	};

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

	if (isLoading) {
		return (
			<div className={cn('p-2', className)}>
				<p className="text-sm text-muted-foreground">Loading folders...</p>
			</div>
		);
	}

	const folderTree = folders ? buildFolderTree(folders) : [];

	return (
		<div className={cn('p-2', className)}>
			{/* All Documents - always at top */}
			<div
				className={cn(
					'flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer hover:bg-accent text-sm transition-colors',
					selectedFolderId === 'all' && 'bg-accent',
					dragOverTarget === 'all' && 'bg-primary/20 ring-2 ring-primary ring-inset',
				)}
				onClick={() => onSelectFolder('all')}
				onDragOver={(e) => handleDragOver(e, 'all')}
				onDragLeave={handleDragLeave}
				onDrop={(e) => handleDrop(e, null)}
			>
				<File className="h-4 w-4 shrink-0" />
				<span>All Documents</span>
			</div>

			{/* Folders section - only if folders exist */}
			{folderTree.length > 0 && (
				<>
					<div className="text-xs font-medium text-muted-foreground mt-4 mb-1 px-2 uppercase tracking-wide">
						Folders
					</div>
					{folderTree.map((folder) => (
						<FolderTreeItem
							key={folder.id}
							folder={folder}
							level={0}
							selectedFolderId={selectedFolderId}
							expandedFolders={expandedFolders}
							dragOverTarget={dragOverTarget}
							onSelectFolder={onSelectFolder}
							onToggleExpand={handleToggleExpand}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
						/>
					))}
				</>
			)}

			{/* Loose Documents - at bottom */}
			<div
				className={cn(
					'flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer hover:bg-accent text-sm transition-colors mt-3',
					selectedFolderId === null && 'bg-accent',
					dragOverTarget === 'unfiled' && 'bg-primary/20 ring-2 ring-primary ring-inset',
				)}
				onClick={() => onSelectFolder(null)}
				onDragOver={(e) => handleDragOver(e, 'unfiled')}
				onDragLeave={handleDragLeave}
				onDrop={(e) => handleDrop(e, null)}
			>
				<Files className="h-4 w-4 shrink-0" />
				<span>Loose Documents</span>
			</div>
		</div>
	);
}
