import { getFileIcon, isImageType } from '@/lib/file-utils';
import { cn } from '@/lib/utils';

interface FileTypeIconProps {
	contentType: string;
	className?: string;
	previewUrl?: string | null;
}

export function FileTypeIcon({ contentType, className, previewUrl }: FileTypeIconProps) {
	// Show thumbnail for images if preview URL is available
	if (isImageType(contentType) && previewUrl) {
		return (
			<div
				className={cn(
					'w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center',
					className
				)}
			>
				<img
					src={previewUrl}
					alt="Preview"
					className="w-full h-full object-cover"
					onError={(e) => {
						// Fall back to icon on error
						e.currentTarget.style.display = 'none';
						e.currentTarget.parentElement?.classList.add('fallback');
					}}
				/>
			</div>
		);
	}

	// Show icon for other file types
	const Icon = getFileIcon(contentType);
	return (
		<div
			className={cn(
				'w-10 h-10 rounded bg-muted flex items-center justify-center',
				className
			)}
		>
			<Icon className="h-5 w-5 text-muted-foreground" />
		</div>
	);
}
