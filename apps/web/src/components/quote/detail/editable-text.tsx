import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

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
			<div className="flex items-center gap-1">
				<Input
					ref={inputRef}
					type="text"
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onBlur={handleSave}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className="h-8"
					disabled={isSaving}
				/>
				{isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
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
			className={`hover:bg-muted/80 bg-muted/40 border-b border-dashed border-muted-foreground/30 px-1.5 py-1 rounded-sm transition-colors cursor-pointer text-left ${className || ''}`}
			title="Click to edit"
		>
			{value}
		</button>
	);
}
