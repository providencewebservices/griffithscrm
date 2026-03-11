import { useState, useMemo } from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentRow } from './document-row';
import { DocumentUploadDialog } from './document-upload-dialog';
import {
	useEntityDocumentsQuery,
	useUploadDocumentMutation,
	type DocumentEntityType,
} from '@/hooks/use-documents';
import { Plus, Files } from 'lucide-react';
import { parseTags } from '@/lib/file-utils';

interface DocumentsCardProps {
	entityType: DocumentEntityType;
	entityId: string;
	title?: string;
	description?: string;
	tagFilter?: string;
	defaultTags?: string;
	excludeTags?: string[];
	/** When true, renders content without Card wrapper (for embedding inside tabs, etc.) */
	embedded?: boolean;
}

export function DocumentsCard({
	entityType,
	entityId,
	title = 'Documents',
	description = 'Attached files and documents',
	tagFilter,
	defaultTags,
	excludeTags,
	embedded,
}: DocumentsCardProps) {
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const { data: documents, isLoading } = useEntityDocumentsQuery(entityType, entityId);
	const uploadMutation = useUploadDocumentMutation();

	const filteredDocuments = useMemo(() => {
		if (!documents) return [];
		if (!tagFilter && !excludeTags) return documents;

		return documents.filter((doc) => {
			const docTags = parseTags(doc.tags);

			if (tagFilter) {
				return docTags.includes(tagFilter);
			}

			if (excludeTags && excludeTags.length > 0) {
				return !excludeTags.some((tag) => docTags.includes(tag));
			}

			return true;
		});
	}, [documents, tagFilter, excludeTags]);

	const handleUpload = async (data: {
		file: File;
		name: string;
		tags?: string;
		notes?: string;
	}) => {
		setUploadError(null);
		try {
			// Merge defaultTags with user-provided tags
			let tags = data.tags;
			if (defaultTags) {
				const userTags = parseTags(tags);
				const defaultTagsList = parseTags(defaultTags);
				const mergedTags = [...new Set([...defaultTagsList, ...userTags])];
				tags = mergedTags.join(', ');
			}

			await uploadMutation.mutateAsync({
				entityType,
				entityId,
				file: data.file,
				name: data.name,
				tags,
				notes: data.notes,
			});
			setUploadDialogOpen(false);
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : 'Upload failed');
		}
	};

	const content = (
		<>
			{isLoading ? (
				<div className="text-center py-8 text-muted-foreground">
					Loading documents...
				</div>
			) : filteredDocuments.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					<Files className="h-8 w-8 mx-auto mb-2 opacity-50" />
					No documents uploaded yet
				</div>
			) : (
				<div className="space-y-2">
					{filteredDocuments.map((doc) => (
						<DocumentRow key={doc.id} document={doc} />
					))}
				</div>
			)}
		</>
	);

	if (embedded) {
		return (
			<>
				<div className="flex items-center justify-between mb-4">
					<p className="text-sm text-muted-foreground">{description}</p>
					<Button size="sm" onClick={() => setUploadDialogOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Upload
					</Button>
				</div>
				{content}
				<DocumentUploadDialog
					open={uploadDialogOpen}
					onOpenChange={setUploadDialogOpen}
					onSubmit={handleUpload}
					isLoading={uploadMutation.isPending}
					error={uploadError}
				/>
			</>
		);
	}

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>{title}</CardTitle>
							<CardDescription>{description}</CardDescription>
						</div>
						<Button onClick={() => setUploadDialogOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Upload
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{content}
				</CardContent>
			</Card>

			<DocumentUploadDialog
				open={uploadDialogOpen}
				onOpenChange={setUploadDialogOpen}
				onSubmit={handleUpload}
				isLoading={uploadMutation.isPending}
				error={uploadError}
			/>
		</>
	);
}
