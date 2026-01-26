import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import mammoth from 'mammoth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileTypeIcon } from '@/components/documents/file-type-icon';
import {
	useDocumentQuery,
	useDownloadUrl,
	DOCUMENT_ENTITY_LABELS,
	type DocumentEntityType,
} from '@/hooks/use-documents';
import {
	formatFileSize,
	parseTags,
	getFileTypeLabel,
	isImageType,
	isPdfType,
	isPreviewable,
	isWordDocument,
	isLegacyWordDocument,
} from '@/lib/file-utils';
import {
	ArrowLeft,
	Download,
	ExternalLink,
	FileQuestion,
	FileText,
	Loader2,
} from 'lucide-react';

const ENTITY_ROUTES: Record<DocumentEntityType, string> = {
	customer: '/app/customers',
	quote: '/app/quotes',
	job: '/app/jobs',
	funeral_director: '/app/funeral-directors',
	supplier: '/app/suppliers',
	council: '/app/councils',
	memorial_site: '/app/memorial-sites',
	product: '/app/products',
};

function WordDocumentPreview({ url }: { url: string }) {
	const [html, setHtml] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function convertDocument() {
			try {
				setLoading(true);
				setError(null);
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error('Failed to fetch document');
				}
				const arrayBuffer = await response.arrayBuffer();
				const result = await mammoth.convertToHtml({ arrayBuffer });
				setHtml(result.value);
			} catch (err) {
				setError('Failed to load document preview');
				console.error('Word document conversion error:', err);
			} finally {
				setLoading(false);
			}
		}
		convertDocument();
	}, [url]);

	if (loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<span className="ml-2 text-muted-foreground">Loading preview...</span>
			</div>
		);
	}

	if (error) {
		return (
			<Card className="max-w-md">
				<CardContent className="p-8 text-center">
					<FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<h3 className="font-semibold mb-2">Preview Error</h3>
					<p className="text-sm text-muted-foreground">{error}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-auto">
			<div
				className="prose prose-sm max-w-none p-8"
				dangerouslySetInnerHTML={{ __html: html || '' }}
			/>
		</div>
	);
}

export function DocumentViewerPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: doc, isLoading, error } = useDocumentQuery(id);
	const downloadMutation = useDownloadUrl();

	const handleDownload = async () => {
		if (!id) return;
		try {
			const downloadUrl = await downloadMutation.mutateAsync(id);
			window.location.href = downloadUrl;
		} catch (error) {
			console.error('Download failed:', error);
		}
	};

	const handleOpenInNewTab = () => {
		if (doc?.publicUrl) {
			window.open(doc.publicUrl, '_blank');
		}
	};

	const navigateToEntity = () => {
		if (!doc?.entityType || !doc?.entityId) return;
		const baseRoute = ENTITY_ROUTES[doc.entityType];
		if (baseRoute) {
			navigate(`${baseRoute}/${doc.entityId}`);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	if (isLoading) {
		return (
			<div className="h-full flex flex-col">
				<div className="border-b p-4">
					<div className="flex items-center gap-4">
						<Skeleton className="h-10 w-10" />
						<div className="flex-1">
							<Skeleton className="h-6 w-64 mb-2" />
							<Skeleton className="h-4 w-32" />
						</div>
					</div>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</div>
		);
	}

	if (error || !doc) {
		return (
			<div className="h-full flex flex-col">
				<div className="border-b p-4">
					<Button variant="ghost" onClick={() => navigate(-1)}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<Card className="max-w-md">
						<CardContent className="p-6 text-center">
							<FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<h2 className="text-lg font-semibold mb-2">Document Not Found</h2>
							<p className="text-muted-foreground mb-4">
								{error?.message || 'The requested document could not be found.'}
							</p>
							<Button onClick={() => navigate('/app/documents')}>
								Go to Documents
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	const tags = parseTags(doc.tags);
	const canPreview = isPreviewable(doc.contentType);

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="border-b p-4 bg-background">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<FileTypeIcon
						contentType={doc.contentType}
						className="w-10 h-10"
					/>
					<div className="flex-1 min-w-0">
						<h1 className="text-lg font-semibold truncate">{doc.name}</h1>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<span>{getFileTypeLabel(doc.contentType)}</span>
							<span>·</span>
							<span>{formatFileSize(doc.size)}</span>
							{doc.entityType && doc.entityId && (
								<>
									<span>·</span>
									<button
										onClick={navigateToEntity}
										className="text-primary hover:underline"
									>
										{DOCUMENT_ENTITY_LABELS[doc.entityType]}
									</button>
								</>
							)}
						</div>
					</div>
					<div className="flex items-center gap-2">
						{canPreview && (
							<Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
								<ExternalLink className="h-4 w-4 mr-2" />
								Open in New Tab
							</Button>
						)}
						<Button
							size="sm"
							onClick={handleDownload}
							disabled={downloadMutation.isPending}
						>
							{downloadMutation.isPending ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<Download className="h-4 w-4 mr-2" />
							)}
							Download
						</Button>
					</div>
				</div>
			</div>

			{/* Content Area */}
			<div className="flex-1 flex overflow-hidden">
				{/* Preview Panel */}
				<div className="flex-1 bg-muted/30 flex items-center justify-center p-4 overflow-auto">
					{isImageType(doc.contentType) && doc.publicUrl ? (
						<img
							src={doc.publicUrl}
							alt={doc.name}
							className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
						/>
					) : isPdfType(doc.contentType) && doc.publicUrl ? (
						<iframe
							src={doc.publicUrl}
							title={doc.name}
							className="w-full h-full rounded-lg shadow-lg bg-white"
						/>
					) : isWordDocument(doc.contentType) && doc.publicUrl ? (
						<WordDocumentPreview url={doc.publicUrl} />
					) : isLegacyWordDocument(doc.contentType) ? (
						<Card className="max-w-md">
							<CardContent className="p-8 text-center">
								<FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
								<h3 className="font-semibold mb-2">Preview Not Available</h3>
								<p className="text-sm text-muted-foreground mb-4">
									Preview is not available for legacy .doc files.
									Download the file to view it.
								</p>
								<Button onClick={handleDownload} disabled={downloadMutation.isPending}>
									{downloadMutation.isPending ? (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									) : (
										<Download className="h-4 w-4 mr-2" />
									)}
									Download File
								</Button>
							</CardContent>
						</Card>
					) : (
						<Card className="max-w-md">
							<CardContent className="p-8 text-center">
								<FileTypeIcon
									contentType={doc.contentType}
									className="w-16 h-16 mx-auto mb-4"
								/>
								<h3 className="font-semibold mb-2">Preview Not Available</h3>
								<p className="text-sm text-muted-foreground mb-4">
									This file type cannot be previewed in the browser.
									Download the file to view it.
								</p>
								<Button onClick={handleDownload} disabled={downloadMutation.isPending}>
									{downloadMutation.isPending ? (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									) : (
										<Download className="h-4 w-4 mr-2" />
									)}
									Download File
								</Button>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Details Sidebar */}
				<div className="w-80 border-l bg-background p-4 overflow-auto">
					<h3 className="font-semibold mb-4">Details</h3>

					<dl className="space-y-4 text-sm">
						<div>
							<dt className="text-muted-foreground">Filename</dt>
							<dd className="mt-1 break-all">{doc.filename}</dd>
						</div>

						<div>
							<dt className="text-muted-foreground">File Type</dt>
							<dd className="mt-1">{doc.contentType}</dd>
						</div>

						<div>
							<dt className="text-muted-foreground">Size</dt>
							<dd className="mt-1">{formatFileSize(doc.size)}</dd>
						</div>

						<div>
							<dt className="text-muted-foreground">Uploaded</dt>
							<dd className="mt-1">{formatDate(doc.createdAt)}</dd>
						</div>

						{doc.uploaderName && (
							<div>
								<dt className="text-muted-foreground">Uploaded By</dt>
								<dd className="mt-1">{doc.uploaderName}</dd>
							</div>
						)}

						{doc.notes && (
							<div>
								<dt className="text-muted-foreground">Notes</dt>
								<dd className="mt-1">{doc.notes}</dd>
							</div>
						)}

						{tags.length > 0 && (
							<div>
								<dt className="text-muted-foreground">Tags</dt>
								<dd className="mt-2 flex flex-wrap gap-1">
									{tags.map((tag, idx) => (
										<Badge key={idx} variant="secondary">
											{tag}
										</Badge>
									))}
								</dd>
							</div>
						)}

						{doc.entityType && doc.entityId && (
							<div>
								<dt className="text-muted-foreground">Linked To</dt>
								<dd className="mt-1">
									<button
										onClick={navigateToEntity}
										className="text-primary hover:underline"
									>
										{DOCUMENT_ENTITY_LABELS[doc.entityType]}
									</button>
								</dd>
							</div>
						)}
					</dl>
				</div>
			</div>
		</div>
	);
}
