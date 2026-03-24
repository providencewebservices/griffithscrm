import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function EditableText({
	value,
	onSave,
	disabled,
	placeholder,
	className,
}: {
	value: string;
	onSave: (value: string) => Promise<void>;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(value);
	const [isSaving, setIsSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const handleSave = async () => {
		const trimmed = editValue.trim();
		if (!trimmed || trimmed === value) {
			setEditValue(value);
			setIsEditing(false);
			return;
		}

		setIsSaving(true);
		try {
			await onSave(trimmed);
			setIsEditing(false);
		} catch (_error) {
			setEditValue(value);
		} finally {
			setIsSaving(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSave();
		} else if (e.key === 'Escape') {
			setEditValue(value);
			setIsEditing(false);
		}
	};

	if (disabled) {
		return <span className={className}>{value}</span>;
	}

	if (isEditing) {
		return (
			<div className="relative inline-flex items-center w-full">
				<input
					ref={inputRef}
					type="text"
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onBlur={handleSave}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={isSaving}
					className={cn(
						'h-7 w-full rounded-sm border border-input bg-background px-1.5 py-0.5 text-sm outline-none',
						'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
						'disabled:pointer-events-none disabled:opacity-50',
						className,
					)}
				/>
				{isSaving && (
					<Loader2 className="absolute right-1 h-3 w-3 animate-spin text-muted-foreground" />
				)}
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={() => {
				setEditValue(value);
				setIsEditing(true);
			}}
			className={cn(
				'inline-block w-full rounded-sm px-1.5 py-0.5 text-sm text-left transition-colors cursor-pointer',
				'border border-transparent hover:border-input hover:bg-muted/60',
				className,
			)}
			title="Click to edit"
		>
			{value}
		</button>
	);
}
