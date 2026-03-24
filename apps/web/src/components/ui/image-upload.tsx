import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import type * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type UploadCategory, useUploadImageMutation } from '@/hooks/use-uploads';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ImageUploadProps {
	value?: string | null;
	onChange: (url: string | null) => void;
	category: UploadCategory;
	entityId: string;
	className?: string;
	disabled?: boolean;
	compact?: boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({
	value,
	onChange,
	category,
	entityId,
	className,
	disabled = false,
	compact = false,
}: ImageUploadProps) {
	const [preview, setPreview] = useState<string | null>(value || null);
	const [error, setError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const blobUrlRef = useRef<string | null>(null);

	// Clean up blob URL on unmount
	useEffect(() => {
		return () => {
			if (blobUrlRef.current) {
				URL.revokeObjectURL(blobUrlRef.current);
			}
		};
	}, []);

	// Sync preview with value prop changes (e.g., when dialog reopens or editing existing)
	// Only update from value if we don't have a local blob preview
	useEffect(() => {
		if (!blobUrlRef.current) {
			setPreview(value || null);
		}
	}, [value]);

	const uploadMutation = useUploadImageMutation();

	const handleFile = useCallback(
		async (file: File) => {
			setError(null);

			// Validate file type
			if (!ACCEPTED_TYPES.includes(file.type)) {
				setError('Please upload a JPEG, PNG, GIF, or WebP image');
				return;
			}

			// Validate file size
			if (file.size > MAX_SIZE) {
				setError('Image must be less than 5MB');
				return;
			}

			// Clean up any existing blob URL before creating a new one
			if (blobUrlRef.current) {
				URL.revokeObjectURL(blobUrlRef.current);
			}

			// Create local preview and keep it (S3 URLs are private and won't load)
			const localPreview = URL.createObjectURL(file);
			blobUrlRef.current = localPreview;
			setPreview(localPreview);

			try {
				const publicUrl = await uploadMutation.mutateAsync({
					category,
					entityId,
					file,
				});

				// Keep the blob preview (it works), just notify parent of S3 URL for storage
				onChange(publicUrl);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to upload image');
				// On error, clear preview and revoke blob
				setPreview(value || null);
				if (blobUrlRef.current) {
					URL.revokeObjectURL(blobUrlRef.current);
					blobUrlRef.current = null;
				}
			}
		},
		[category, entityId, onChange, uploadMutation, value],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragging(false);

			if (disabled || uploadMutation.isPending) return;

			const file = e.dataTransfer.files[0];
			if (file) {
				handleFile(file);
			}
		},
		[disabled, uploadMutation.isPending, handleFile],
	);

	const handleDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			if (!disabled && !uploadMutation.isPending) {
				setIsDragging(true);
			}
		},
		[disabled, uploadMutation.isPending],
	);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				handleFile(file);
			}
			// Reset input
			e.target.value = '';
		},
		[handleFile],
	);

	const handleRemove = useCallback(() => {
		// Clean up blob URL if we have one
		if (blobUrlRef.current) {
			URL.revokeObjectURL(blobUrlRef.current);
			blobUrlRef.current = null;
		}
		setPreview(null);
		onChange(null);
		setError(null);
	}, [onChange]);

	const handleClick = useCallback(() => {
		if (!disabled && !uploadMutation.isPending) {
			fileInputRef.current?.click();
		}
	}, [disabled, uploadMutation.isPending]);

	return (
		<div className={cn('space-y-2', className)}>
			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPTED_TYPES.join(',')}
				onChange={handleInputChange}
				className="hidden"
				disabled={disabled || uploadMutation.isPending}
			/>

			{preview ? (
				<div className="relative group">
					<img
						src={preview}
						alt="Preview"
						className={cn(
							'w-full object-contain rounded-lg border',
							compact ? 'max-h-32' : 'max-h-48',
						)}
					/>
					{!disabled && (
						<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onClick={handleClick}
								disabled={uploadMutation.isPending}
							>
								{uploadMutation.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Upload className="h-4 w-4" />
								)}
								Replace
							</Button>
							<Button
								type="button"
								variant="destructive"
								size="sm"
								onClick={handleRemove}
								disabled={uploadMutation.isPending}
							>
								<X className="h-4 w-4" />
								Remove
							</Button>
						</div>
					)}
					{uploadMutation.isPending && (
						<div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
							<Loader2 className="h-8 w-8 animate-spin text-white" />
						</div>
					)}
				</div>
			) : (
				<div
					onClick={handleClick}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					className={cn(
						'w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
						compact ? 'h-32' : 'h-48',
						isDragging
							? 'border-primary bg-primary/5'
							: 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
						(disabled || uploadMutation.isPending) && 'cursor-not-allowed opacity-50',
					)}
				>
					{uploadMutation.isPending ? (
						<>
							<Loader2
								className={cn(
									'animate-spin text-muted-foreground',
									compact ? 'h-6 w-6' : 'h-8 w-8',
								)}
							/>
							<span className="text-sm text-muted-foreground">Uploading...</span>
						</>
					) : (
						<>
							<ImageIcon className={cn('text-muted-foreground', compact ? 'h-6 w-6' : 'h-8 w-8')} />
							<div className="text-center">
								<span className="text-sm font-medium text-muted-foreground">Click to upload</span>
								<span className="text-sm text-muted-foreground block">or drag and drop</span>
							</div>
							<span className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP (max 5MB)</span>
						</>
					)}
				</div>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
