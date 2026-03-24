import { File, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatFileSize, getFileExtension } from '@/lib/file-utils';

interface DocumentUploadDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { file: File; name: string; tags?: string; notes?: string }) => void;
	isLoading?: boolean;
	error?: string | null;
}

export function DocumentUploadDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
	error,
}: DocumentUploadDialogProps) {
	const [file, setFile] = useState<File | null>(null);
	const [name, setName] = useState('');
	const [tags, setTags] = useState('');
	const [notes, setNotes] = useState('');
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) {
			setFile(null);
			setName('');
			setTags('');
			setNotes('');
		}
	}, [open]);

	const handleFileSelect = (selectedFile: File) => {
		setFile(selectedFile);
		// Auto-fill name from filename (without extension)
		const ext = getFileExtension(selectedFile.name);
		const nameWithoutExt = selectedFile.name.replace(`.${ext}`, '');
		setName(nameWithoutExt);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile) {
			handleFileSelect(droppedFile);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			handleFileSelect(selectedFile);
		}
	};

	const handleSubmit = () => {
		if (!file) return;
		onSubmit({
			file,
			name: name.trim(),
			tags: tags.trim() || undefined,
			notes: notes.trim() || undefined,
		});
	};

	const handleRemoveFile = () => {
		setFile(null);
		setName('');
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const isValid = file && name.trim().length > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Upload Document</DialogTitle>
					<DialogDescription>Upload a file and add details to organize it.</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-destructive/10 text-destructive px-4 py-2 rounded text-sm">
						{error}
					</div>
				)}

				<FieldGroup>
					{/* File Drop Zone */}
					<Field>
						<FieldLabel>File</FieldLabel>
						<input
							ref={fileInputRef}
							type="file"
							className="hidden"
							onChange={handleFileInputChange}
						/>
						{file ? (
							<div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
								<File className="h-8 w-8 text-muted-foreground shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="font-medium text-sm truncate">{file.name}</p>
									<p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
								</div>
								<Button variant="ghost" size="icon" onClick={handleRemoveFile} className="shrink-0">
									<X className="h-4 w-4" />
								</Button>
							</div>
						) : (
							<div
								onDrop={handleDrop}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onClick={() => fileInputRef.current?.click()}
								className={`
									border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
									transition-colors hover:border-primary/50 hover:bg-muted/30
									${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
								`}
							>
								<Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
								<p className="text-sm text-muted-foreground">
									<span className="font-medium text-primary">Click to upload</span> or drag and drop
								</p>
								<p className="text-xs text-muted-foreground mt-1">Any file type accepted</p>
							</div>
						)}
					</Field>

					<Field>
						<FieldLabel htmlFor="name">Document Name</FieldLabel>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Installation Photo"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="tags">Tags</FieldLabel>
						<Input
							id="tags"
							value={tags}
							onChange={(e) => setTags(e.target.value)}
							placeholder="e.g., photo, installation, proof"
						/>
						<FieldDescription>Comma-separated tags for organization</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor="notes">Notes</FieldLabel>
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Optional notes about this document"
							rows={3}
						/>
					</Field>
				</FieldGroup>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!isValid || isLoading}>
						{isLoading ? 'Uploading...' : 'Upload'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
