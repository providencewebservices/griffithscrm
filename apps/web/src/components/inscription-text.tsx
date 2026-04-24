import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const loadedFonts = new Set<string>();

interface InscriptionTextProps {
	text: string;
	fontId?: string | null;
	fontName?: string | null;
	fontS3Key?: string | null;
	className?: string;
	placeholder?: string;
}

type FontStatus = 'idle' | 'loading' | 'ready' | 'error';

export function InscriptionText({
	text,
	fontId,
	fontName,
	className,
	placeholder,
}: InscriptionTextProps) {
	const [fontFamily, setFontFamily] = useState<string | null>(null);
	const [status, setStatus] = useState<FontStatus>('idle');

	useEffect(() => {
		if (!fontId || !fontName) {
			setFontFamily(null);
			setStatus('idle');
			return;
		}

		const family = `custom-font-${fontId}`;

		if (loadedFonts.has(fontId)) {
			setFontFamily(family);
			setStatus('ready');
			return;
		}

		setStatus('loading');
		const url = `${API_URL}/api/fonts/${fontId}/file`;
		const fontFace = new FontFace(family, `url("${url}")`);

		let cancelled = false;
		fontFace
			.load()
			.then((loaded) => {
				if (cancelled) return;
				document.fonts.add(loaded);
				loadedFonts.add(fontId);
				setFontFamily(family);
				setStatus('ready');
			})
			.catch(() => {
				if (cancelled) return;
				setFontFamily(null);
				setStatus('error');
			});

		return () => {
			cancelled = true;
		};
	}, [fontId, fontName]);

	const hasText = text.length > 0;
	const display = hasText ? text : placeholder || '';
	const isLoading = status === 'loading';

	return (
		<p
			className={cn(
				'whitespace-pre-wrap text-center transition-opacity',
				!hasText && 'text-muted-foreground italic',
				isLoading && 'opacity-40',
				className,
			)}
			style={fontFamily ? { fontFamily: `"${fontFamily}", serif` } : undefined}
			aria-busy={isLoading || undefined}
		>
			{display}
		</p>
	);
}
