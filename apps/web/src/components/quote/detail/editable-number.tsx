import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export function EditableNumber({
	value,
	onSave,
	disabled,
	isCurrency = false,
	formatValue,
	min = 0,
	step = 0.01,
}: {
	value: number;
	onSave: (value: number) => Promise<void>;
	disabled?: boolean;
	isCurrency?: boolean;
	formatValue?: (val: number) => string;
	min?: number;
	step?: number;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(String(value));
	const [isSaving, setIsSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const handleSave = async () => {
		const numValue = parseFloat(editValue);
		if (isNaN(numValue) || numValue < min) {
			setEditValue(String(value));
			setIsEditing(false);
			return;
		}

		if (numValue === value) {
			setIsEditing(false);
			return;
		}

		setIsSaving(true);
		try {
			await onSave(numValue);
			setIsEditing(false);
		} catch (error) {
			setEditValue(String(value));
		} finally {
			setIsSaving(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSave();
		} else if (e.key === 'Escape') {
			setEditValue(String(value));
			setIsEditing(false);
		}
	};

	if (disabled) {
		const displayValue = formatValue
			? formatValue(value)
			: isCurrency
				? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
				: value.toFixed(2);
		return <span>{displayValue}</span>;
	}

	if (isEditing) {
		return (
			<div className="flex items-center gap-1">
				{isCurrency && <span className="text-muted-foreground">£</span>}
				<Input
					ref={inputRef}
					type="number"
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onBlur={handleSave}
					onKeyDown={handleKeyDown}
					min={min}
					step={step}
					className="h-8 w-24 text-right"
					disabled={isSaving}
				/>
				{isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
			</div>
		);
	}

	const displayValue = formatValue
		? formatValue(value)
		: isCurrency
			? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
			: value.toFixed(2);

	return (
		<button
			type="button"
			onClick={() => {
				setEditValue(String(value));
				setIsEditing(true);
			}}
			className="hover:bg-muted/80 bg-muted/40 border-b border-dashed border-muted-foreground/30 px-1.5 py-1 rounded-sm transition-colors cursor-pointer text-left"
			title="Click to edit"
		>
			{displayValue}
		</button>
	);
}
