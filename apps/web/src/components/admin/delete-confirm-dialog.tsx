import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	title: string;
	description: string;
	isLoading?: boolean;
	confirmLabel?: string;
	loadingLabel?: string;
}

export function DeleteConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
	title,
	description,
	isLoading,
	confirmLabel,
	loadingLabel,
}: DeleteConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={isLoading}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isLoading ? (loadingLabel ?? 'Deleting...') : (confirmLabel ?? 'Delete')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
