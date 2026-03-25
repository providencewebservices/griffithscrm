import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosave(options: {
	value: string;
	onSave: (value: string) => Promise<void>;
	delay?: number;
	enabled?: boolean;
}): { status: AutosaveStatus; isDirty: boolean } {
	const { value, onSave, delay = 1500, enabled = true } = options;

	const [status, setStatus] = useState<AutosaveStatus>('idle');
	const savedValueRef = useRef(value);
	const latestValueRef = useRef(value);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const onSaveRef = useRef(onSave);
	const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Keep refs current
	onSaveRef.current = onSave;
	latestValueRef.current = value;

	const isDirty = value !== savedValueRef.current;

	const doSave = useCallback(async (val: string) => {
		if (val === savedValueRef.current) return;
		setStatus('saving');
		try {
			await onSaveRef.current(val);
			savedValueRef.current = val;
			setStatus('saved');
			savedTimerRef.current = setTimeout(() => setStatus('idle'), 2000);
		} catch {
			setStatus('error');
			setTimeout(() => setStatus('idle'), 3000);
		}
	}, []);

	// Debounced save on value change
	useEffect(() => {
		if (!enabled) return;
		if (value === savedValueRef.current) return;

		if (timerRef.current) clearTimeout(timerRef.current);
		if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

		timerRef.current = setTimeout(() => {
			doSave(value);
		}, delay);

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [value, delay, enabled, doSave]);

	// Flush pending save on unmount
	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			if (savedTimerRef.current) {
				clearTimeout(savedTimerRef.current);
				savedTimerRef.current = null;
			}
			// Fire-and-forget flush if there are unsaved changes
			if (latestValueRef.current !== savedValueRef.current) {
				onSaveRef.current(latestValueRef.current).catch(() => {});
			}
		};
	}, []);

	return { status, isDirty };
}
