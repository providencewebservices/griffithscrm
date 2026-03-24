import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function EditableNumber({
	value,
	onSave,
	disabled,
	isCurrency = false,
	formatValue,
	min = 0,
	step = 0.01,
	align = 'right',
}: {
	value: number;
	onSave: (value: number) => Promise<void>;
	disabled?: boolean;
	isCurrency?: boolean;
	formatValue?: (val: number) => string;
	min?: number;
	step?: number;
	align?: 'left' | 'center' | 'right';
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

	const displayValue = formatValue
		? formatValue(value)
		: isCurrency
			? currencyFormatter.format(value)
			: value.toFixed(2);

	const alignClass = align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right';

	const handleSave = async () => {
		const numValue = Number.parseFloat(editValue);
		if (Number.isNaN(numValue) || numValue < min) {
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
		} catch (_error) {
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
		return <span className={cn('block', alignClass)}>{displayValue}</span>;
	}

	if (isEditing) {
		return (
			<div className={cn('relative inline-flex items-center min-w-[5rem]', alignClass)}>
				<input
					ref={inputRef}
					type="number"
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onBlur={handleSave}
					onKeyDown={handleKeyDown}
					min={min}
					step={step}
					disabled={isSaving}
					className={cn(
						'h-7 w-full rounded-sm border border-input bg-background px-1.5 py-0.5 text-sm outline-none',
						'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
						'disabled:pointer-events-none disabled:opacity-50',
						'[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
						alignClass,
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
				setEditValue(String(value));
				setIsEditing(true);
			}}
			className={cn(
				'inline-block min-w-[5rem] rounded-sm px-1.5 py-0.5 text-sm transition-colors cursor-pointer',
				'border border-transparent hover:border-input hover:bg-muted/60',
				alignClass,
			)}
			title="Click to edit"
		>
			{displayValue}
		</button>
	);
}
