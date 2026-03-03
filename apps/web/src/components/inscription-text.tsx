import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Track which fonts have been loaded to avoid duplicate loads
const loadedFonts = new Set<string>();

interface InscriptionTextProps {
	text: string;
	fontId?: string | null;
	fontName?: string | null;
	fontS3Key?: string | null;
	className?: string;
}

export function InscriptionText({ text, fontId, fontName, className }: InscriptionTextProps) {
	const [fontFamily, setFontFamily] = useState<string | null>(null);
	useEffect(() => {
		if (!fontId || !fontName) {
			setFontFamily(null);
			return;
		}

		const family = `custom-font-${fontId}`;

		// Already loaded
		if (loadedFonts.has(fontId)) {
			setFontFamily(family);
			return;
		}

		// Load the font
		const url = `${API_URL}/api/fonts/${fontId}/file`;
		const fontFace = new FontFace(family, `url("${url}")`);

		fontFace
			.load()
			.then((loaded) => {
				document.fonts.add(loaded);
				loadedFonts.add(fontId);
				setFontFamily(family);
			})
			.catch(() => {
				// Fallback to default font on error
				setFontFamily(null);
			});
	}, [fontId, fontName]);

	return (
		<p
			className={`whitespace-pre-wrap text-center ${className || ''}`}
			style={fontFamily ? { fontFamily: `"${fontFamily}", serif` } : undefined}
		>
			{text}
		</p>
	);
}
