import {
	File,
	FileText,
	FileSpreadsheet,
	FileImage,
	FileVideo,
	FileAudio,
	FileArchive,
	FileCode,
	type LucideIcon,
} from 'lucide-react';

// MIME type categories for icon selection
const IMAGE_TYPES = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'image/bmp',
	'image/tiff',
];

const PDF_TYPES = ['application/pdf'];

const DOCUMENT_TYPES = [
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/rtf',
	'text/plain',
];

const SPREADSHEET_TYPES = [
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'text/csv',
	'application/vnd.oasis.opendocument.spreadsheet',
];

const VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/x-msvideo'];

const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp3'];

const ARCHIVE_TYPES = [
	'application/zip',
	'application/x-rar-compressed',
	'application/x-7z-compressed',
	'application/gzip',
	'application/x-tar',
];

const CODE_TYPES = [
	'text/html',
	'text/css',
	'text/javascript',
	'application/javascript',
	'application/json',
	'application/xml',
	'text/xml',
];

/**
 * Get the appropriate icon component for a given MIME type
 */
export function getFileIcon(contentType: string): LucideIcon {
	if (IMAGE_TYPES.includes(contentType)) return FileImage;
	if (PDF_TYPES.includes(contentType)) return FileText;
	if (DOCUMENT_TYPES.includes(contentType)) return FileText;
	if (SPREADSHEET_TYPES.includes(contentType)) return FileSpreadsheet;
	if (VIDEO_TYPES.includes(contentType)) return FileVideo;
	if (AUDIO_TYPES.includes(contentType)) return FileAudio;
	if (ARCHIVE_TYPES.includes(contentType)) return FileArchive;
	if (CODE_TYPES.includes(contentType)) return FileCode;
	return File;
}

/**
 * Check if the content type is an image that can be previewed
 */
export function isImageType(contentType: string): boolean {
	return IMAGE_TYPES.includes(contentType);
}

/**
 * Check if the content type is a PDF
 */
export function isPdfType(contentType: string): boolean {
	return PDF_TYPES.includes(contentType);
}

/**
 * Check if the content type is a Word document (.docx)
 */
export function isWordDocument(contentType: string): boolean {
	return contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

/**
 * Check if the content type is a legacy Word document (.doc)
 */
export function isLegacyWordDocument(contentType: string): boolean {
	return contentType === 'application/msword';
}

/**
 * Check if the content type is a video
 */
export function isVideoType(contentType: string): boolean {
	return VIDEO_TYPES.includes(contentType);
}

/**
 * Check if the content type is audio
 */
export function isAudioType(contentType: string): boolean {
	return AUDIO_TYPES.includes(contentType);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number | null | undefined): string {
	if (bytes === null || bytes === undefined) return '-';
	if (bytes === 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = bytes / Math.pow(k, i);

	return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
	const parts = filename.split('.');
	if (parts.length < 2) return '';
	return parts[parts.length - 1].toLowerCase();
}

/**
 * Get a friendly file type label
 */
export function getFileTypeLabel(contentType: string): string {
	if (isImageType(contentType)) return 'Image';
	if (isPdfType(contentType)) return 'PDF';
	if (DOCUMENT_TYPES.includes(contentType)) return 'Document';
	if (SPREADSHEET_TYPES.includes(contentType)) return 'Spreadsheet';
	if (isVideoType(contentType)) return 'Video';
	if (isAudioType(contentType)) return 'Audio';
	if (ARCHIVE_TYPES.includes(contentType)) return 'Archive';
	if (CODE_TYPES.includes(contentType)) return 'Code';
	return 'File';
}

/**
 * Check if a file type is previewable in the browser
 */
export function isPreviewable(contentType: string): boolean {
	return isImageType(contentType) || isPdfType(contentType) || isWordDocument(contentType);
}

/**
 * Parse comma-separated tags into an array
 */
export function parseTags(tags: string | null | undefined): string[] {
	if (!tags) return [];
	return tags
		.split(',')
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0);
}

/**
 * Convert array of tags to comma-separated string
 */
export function formatTags(tags: string[]): string {
	return tags.map((tag) => tag.trim()).join(', ');
}
