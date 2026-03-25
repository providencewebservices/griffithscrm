import {
	CheckCircle2,
	Factory,
	Package,
	Truck,
} from 'lucide-react';
import type { JobStatus } from '@/hooks/use-jobs';

// Status icons mapping
export const STATUS_ICONS: Record<JobStatus, React.ElementType> = {
	pending: Package,
	materials_ordered: Package,
	in_production: Factory,
	ready_for_install: Truck,
	installed: CheckCircle2,
	completed: CheckCircle2,
};

// Distinct status colors for workflow visualization
export const STATUS_COLORS: Record<JobStatus, { bg: string; text: string }> = {
	pending: { bg: 'bg-amber-500', text: 'text-white' },
	materials_ordered: { bg: 'bg-blue-500', text: 'text-white' },
	in_production: { bg: 'bg-purple-500', text: 'text-white' },
	ready_for_install: { bg: 'bg-cyan-500', text: 'text-white' },
	installed: { bg: 'bg-emerald-500', text: 'text-white' },
	completed: { bg: 'bg-green-600', text: 'text-white' },
};

// Memorial details heading per quote type
export const MEMORIAL_HEADINGS: Record<string, string> = {
	new_memorial: 'Memorial Specifications',
	additional_inscription: 'Inscription Details',
	refurbishment: 'Refurbishment Scope',
	ashes: 'Interment Details',
	sundry_only: 'Order Items',
};

// Review outcome labels
export function formatReviewOutcome(outcome: string): string {
	const labels: Record<string, string> = {
		satisfied: 'Satisfied',
		issue_reported: 'Issue Reported',
		follow_up_needed: 'Follow-Up Needed',
		no_response: 'No Response',
	};
	return labels[outcome] || outcome;
}

export function formatCurrency(value: string | number): string {
	const numValue = typeof value === 'string' ? Number.parseFloat(value) : value;
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
	}).format(numValue);
}

export function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

export function toDateInputValue(dateStr: string | null | undefined): string {
	if (!dateStr) return '';
	return new Date(dateStr).toISOString().split('T')[0];
}
