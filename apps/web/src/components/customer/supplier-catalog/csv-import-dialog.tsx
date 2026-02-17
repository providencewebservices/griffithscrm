import { useState, useRef } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Upload } from 'lucide-react';
import type { SupplierCategory } from '@/hooks/use-supplier-categories';

type CsvImportDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { file: File; supplierId: string; collectionId: string; categoryId?: string }) => void;
	supplierId: string;
	collectionId: string;
	categories: SupplierCategory[];
	isLoading?: boolean;
	result?: { imported: number; errors: { row: number; message: string }[] } | null;
	error?: string | null;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function CsvImportDialog({
	open,
	onOpenChange,
	onSubmit,
	supplierId,
	collectionId,
	categories,
	isLoading,
	result,
	error,
}: CsvImportDialogProps) {
	const [file, setFile] = useState<File | null>(null);
	const [categoryId, setCategoryId] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			setFile(selectedFile);
		}
	};

	const handleSubmit = () => {
		if (!file) return;
		onSubmit({
			file,
			supplierId,
			collectionId,
			categoryId: categoryId || undefined,
		});
	};

	const handleDownloadTemplate = () => {
		window.open(`${API_URL}/api/tenant/supplier-products/csv-template`, '_blank');
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Import Products from CSV</DialogTitle>
					<DialogDescription>
						Upload a CSV file to bulk import products into this collection.
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
						{error}
					</div>
				)}

				{result && (
					<div className="space-y-2">
						<div className="bg-green-50 text-green-700 px-4 py-2 rounded dark:bg-green-900/20 dark:text-green-400">
							Successfully imported {result.imported} product{result.imported !== 1 ? 's' : ''}.
						</div>
						{result.errors.length > 0 && (
							<div className="bg-destructive/10 text-destructive px-4 py-2 rounded max-h-32 overflow-y-auto">
								<p className="font-medium mb-1">{result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:</p>
								{result.errors.map((err, i) => (
									<p key={i} className="text-sm">Row {err.row}: {err.message}</p>
								))}
							</div>
						)}
					</div>
				)}

				<FieldGroup>
					<Field>
						<FieldLabel>CSV File</FieldLabel>
						<div
							className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
							onClick={() => fileInputRef.current?.click()}
						>
							<Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
							{file ? (
								<p className="text-sm font-medium">{file.name}</p>
							) : (
								<p className="text-sm text-muted-foreground">
									Click to select a CSV file
								</p>
							)}
							<input
								ref={fileInputRef}
								type="file"
								accept=".csv"
								className="hidden"
								onChange={handleFileChange}
							/>
						</div>
					</Field>

					<Field>
						<FieldLabel>Default Category (optional)</FieldLabel>
						<Select
							value={categoryId || 'none'}
							onValueChange={(value) => setCategoryId(value === 'none' ? null : value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Rows without a category column will use this" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None</SelectItem>
								{categories.map((cat) => (
									<SelectItem key={cat.id} value={cat.id}>
										{cat.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					<Button variant="link" className="px-0 h-auto" onClick={handleDownloadTemplate}>
						Download CSV template
					</Button>
				</FieldGroup>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{result ? 'Close' : 'Cancel'}
					</Button>
					{!result && (
						<Button onClick={handleSubmit} disabled={!file || isLoading}>
							{isLoading ? 'Importing...' : 'Import'}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
