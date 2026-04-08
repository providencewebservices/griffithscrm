import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import type { DisplayOption } from '@/components/quote/detail/quote-document';
import { QuoteDocument } from '@/components/quote/detail/quote-document';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
type PublicOption = {
	id: string;
	optionLabel: string | null;
	optionOrder: number;
	subtotal: string;
	vatAmount: string;
	total: string;
	vatRate: string;
	flowerHoles: string | null;
	product: { name: string; imageUrl: string | null } | null;
	components: {
		componentType: string;
		height: string | null;
		width: string | null;
		depth: string | null;
		quantity: number;
		unitPrice: string;
		lineTotal: string;
		materialName: string | null;
		finishName: string | null;
	}[];
	lettering: {
		text: string;
		letterCount: number;
		unitPrice: string;
		lineTotal: string;
		techniqueName: string | null;
		colorName: string | null;
		fontId: string | null;
		fontName: string | null;
		fontS3Key: string | null;
	}[];
	sundries: {
		quantity: number;
		unitPrice: string;
		lineTotal: string;
		sundryName: string | null;
	}[];
	lineItems: {
		description: string;
		price: string | null;
		vatExempt: boolean;
		priceHidden: boolean;
	}[];
};

type PublicPackage = {
	package: {
		id: string;
		status: string;
		quoteType: string;
		notes: string | null;
		proposedInscription: string | null;
		validUntil: string | null;
		createdAt: string;
		customerFeedback: string | null;
		acceptedOptionId: string | null;
		customerDecisionAt: string | null;
	};
	customer: { firstName: string; lastName: string } | null;
	tenant: {
		id: string;
		name: string;
		hasLogo: boolean;
		phone: string | null;
		email: string | null;
		website: string | null;
	} | null;
	options: PublicOption[];
};

// --- API helpers ---

async function fetchPublicPackage(token: string): Promise<PublicPackage> {
	const response = await fetch(`${API_URL}/api/public/quotes/view/${token}`);
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to load quote package');
	}
	return response.json();
}

async function submitResponse({
	token,
	decision,
	selectedOptionId,
	feedback,
}: {
	token: string;
	decision: 'accept' | 'reject';
	selectedOptionId?: string;
	feedback?: string;
}): Promise<{ success: boolean; message: string }> {
	const response = await fetch(`${API_URL}/api/public/quotes/view/${token}/respond`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ decision, selectedOptionId, feedback }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to submit response');
	}
	return response.json();
}

async function saveNotes({
	token,
	notes,
}: {
	token: string;
	notes: string;
}): Promise<{ success: boolean; message: string }> {
	const response = await fetch(`${API_URL}/api/public/quotes/view/${token}/notes`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ notes }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to save notes');
	}
	return response.json();
}

// --- Data mapping ---

function getOptionLabel(option: PublicOption): string {
	return option.optionLabel || `Option ${String.fromCharCode(65 + option.optionOrder)}`;
}

function mapToDisplayOptions(
	options: PublicOption[],
	acceptedOptionId: string | null,
): DisplayOption[] {
	return options.map((opt) => ({
		id: opt.id,
		label: getOptionLabel(opt),
		isAccepted: opt.id === acceptedOptionId,
		total: opt.total,
		subtotal: opt.subtotal,
		vatAmount: opt.vatAmount,
		vatRate: opt.vatRate,
		flowerHoles: opt.flowerHoles,
		product: opt.product,
		components: opt.components.map((c, idx) => ({
			key: `comp-${idx}`,
			componentType: c.componentType,
			height: c.height,
			width: c.width,
			depth: c.depth,
			materialName: c.materialName,
			finishName: c.finishName,
		})),
		lettering: opt.lettering.map((l, idx) => ({
			key: `lett-${idx}`,
			text: l.text,
			letterCount: l.letterCount,
			techniqueName: l.techniqueName,
			colorName: l.colorName,
			fontId: l.fontId,
			fontName: l.fontName,
			fontS3Key: l.fontS3Key,
		})),
		sundries: opt.sundries.map((s, idx) => ({
			key: `sund-${idx}`,
			sundryName: s.sundryName,
			quantity: s.quantity,
		})),
		lineItems: opt.lineItems
			.filter((li) => !li.priceHidden || li.price != null)
			.map((li, idx) => ({
				key: `li-${idx}`,
				description: li.description,
				price: li.price,
				vatExempt: li.vatExempt,
				showPrice: !li.priceHidden && li.price != null,
			})),
	}));
}

// --- Formatting helpers ---

function formatCurrency(value: string | number) {
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
	}).format(typeof value === 'number' ? value : parseFloat(String(value)));
}

function formatDate(dateString: string | null) {
	if (!dateString) return 'Not specified';
	return new Date(dateString).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

// --- Page component ---

export function PublicPackageViewPage() {
	const { token } = useParams();

	const [selectedOption, setSelectedOption] = useState<string | null>(null);
	const [showAcceptDialog, setShowAcceptDialog] = useState(false);
	const [showRejectDialog, setShowRejectDialog] = useState(false);
	const [feedback, setFeedback] = useState('');
	const [notes, setNotes] = useState('');
	const [showNotesDialog, setShowNotesDialog] = useState(false);

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['public-package', token],
		queryFn: () => fetchPublicPackage(token!),
		enabled: !!token,
	});

	const respondMutation = useMutation({
		mutationFn: submitResponse,
		onSuccess: (data) => {
			toast.success(data.message);
			refetch();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const notesMutation = useMutation({
		mutationFn: saveNotes,
		onSuccess: (data) => {
			toast.success(data.message);
			setShowNotesDialog(false);
			refetch();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const handleAccept = () => {
		if (!token || !effectiveSelection) return;
		respondMutation.mutate({
			token,
			decision: 'accept',
			selectedOptionId: effectiveSelection,
			feedback: feedback || undefined,
		});
		setShowAcceptDialog(false);
	};

	const handleReject = () => {
		if (!token) return;
		respondMutation.mutate({
			token,
			decision: 'reject',
			feedback: feedback || undefined,
		});
		setShowRejectDialog(false);
	};

	const handleSaveNotes = () => {
		if (!token) return;
		notesMutation.mutate({ token, notes });
	};

	// Loading state
	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center print:bg-white">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
					<p className="text-muted-foreground">Loading your quotation...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<AlertCircle className="h-5 w-5" />
							Unable to Load
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							{error instanceof Error
								? error.message
								: 'This link may be invalid or expired.'}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!data || !data.tenant) return null;

	const { package: pkg, customer, tenant, options: rawOptions } = data;
	const hasDecided = !!pkg.customerDecisionAt;
	const isExpired = pkg.validUntil && new Date(pkg.validUntil) < new Date();
	const canRespond = pkg.status === 'presented' && !hasDecided && !isExpired;
	const isSingleOption = rawOptions.length === 1;

	const displayOptions = mapToDisplayOptions(rawOptions, pkg.acceptedOptionId);

	// Pre-select the first option so the page is never empty
	const effectiveSelection =
		isSingleOption
			? rawOptions[0].id
			: selectedOption ?? rawOptions[0]?.id ?? null;

	const acceptedOption = rawOptions.find((o) => o.id === pkg.acceptedOptionId);

	const customerName = customer
		? `${customer.firstName} ${customer.lastName}`
		: 'Customer';

	// --- Status banner ---

	const statusBanner = (() => {
		// Show a single, consolidated status banner
		if (hasDecided && pkg.status === 'accepted' && acceptedOption) {
			return (
				<div className="px-10 sm:px-14 pb-6">
					<div className="bg-green-50 border border-green-200 rounded-lg p-4 print:bg-white print:border-gray-300">
						<div className="flex items-start gap-3">
							<CheckCircle className="h-5 w-5 text-green-600 mt-0.5 print:text-foreground" />
							<div>
								<p className="font-medium text-green-800 print:text-foreground">
									You accepted{' '}
									{isSingleOption
										? 'this quotation'
										: acceptedOption.optionLabel || 'an option'}{' '}
									on {formatDate(pkg.customerDecisionAt)}
								</p>
								<p className="text-green-700 text-sm mt-1 print:text-muted-foreground">
									Thank you for your response. We will be in touch shortly.
								</p>
							</div>
						</div>
					</div>
				</div>
			);
		}

		if (hasDecided && pkg.status === 'rejected') {
			return (
				<div className="px-10 sm:px-14 pb-6">
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 print:bg-white print:border-gray-300">
						<div className="flex items-start gap-3">
							<XCircle className="h-5 w-5 text-red-600 mt-0.5 print:text-foreground" />
							<div>
								<p className="font-medium text-red-800 print:text-foreground">
									You declined this quotation on {formatDate(pkg.customerDecisionAt)}
								</p>
								<p className="text-red-700 text-sm mt-1 print:text-muted-foreground">
									Thank you for your feedback.
								</p>
							</div>
						</div>
					</div>
				</div>
			);
		}

		if (isExpired && !hasDecided && pkg.status !== 'accepted') {
			return (
				<div className="px-10 sm:px-14 pb-6">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 print:bg-white print:border-gray-300">
						<p className="text-yellow-800 text-sm print:text-foreground">
							This quotation expired on {formatDate(pkg.validUntil)}. Please contact us
							if you would still like to proceed.
						</p>
					</div>
				</div>
			);
		}

		// Status badges for non-banner states
		if (pkg.status === 'accepted' || pkg.status === 'rejected') {
			return (
				<div className="px-10 sm:px-14 pb-4 text-center">
					{pkg.status === 'accepted' && (
						<Badge className="bg-green-100 text-green-800 border-green-200">
							<CheckCircle className="h-4 w-4 mr-1" />
							Accepted
						</Badge>
					)}
					{pkg.status === 'rejected' && (
						<Badge className="bg-red-100 text-red-800 border-red-200">
							<XCircle className="h-4 w-4 mr-1" />
							Declined
						</Badge>
					)}
				</div>
			);
		}

		return null;
	})();

	// --- Action area ---

	const actionArea = canRespond ? (
		<>
			<div className="px-10 sm:px-14">
				<Separator />
			</div>
			<div className="px-10 sm:px-14 py-10 space-y-6 print:hidden">
				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<Button
						size="lg"
						onClick={() => setShowAcceptDialog(true)}
						disabled={!effectiveSelection || respondMutation.isPending}
					>
						{respondMutation.isPending && (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						)}
						<CheckCircle className="h-4 w-4 mr-2" />
						{isSingleOption
							? 'Accept This Quotation'
							: `Accept ${getOptionLabel(rawOptions.find((o) => o.id === effectiveSelection)!)}`}
					</Button>
					<Button
						size="lg"
						variant="outline"
						onClick={() => setShowRejectDialog(true)}
						disabled={respondMutation.isPending}
					>
						{isSingleOption ? 'Decline' : 'Decline All Options'}
					</Button>
				</div>

				<p className="text-sm text-muted-foreground text-center">
					Once you accept, we will confirm the details and arrange next steps — typically
					within two working days.
				</p>

				<p className="text-xs text-muted-foreground text-center">
					<button
						type="button"
						className="underline hover:text-foreground transition-colors"
						onClick={() => {
							setNotes(pkg.customerFeedback || '');
							setShowNotesDialog(true);
						}}
					>
						Save notes without deciding
					</button>
				</p>
			</div>
		</>
	) : null;

	return (
		<div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:p-0">
			<div className="max-w-3xl mx-auto">
				<QuoteDocument
					tenant={tenant}
					customerName={customerName}
					createdAt={pkg.createdAt}
					validUntil={pkg.validUntil}
					isExpired={!!isExpired}
					proposedInscription={pkg.proposedInscription}
					notes={pkg.notes}
					options={displayOptions}
					selectedOptionId={effectiveSelection}
					onSelectOption={setSelectedOption}
					formatCurrency={formatCurrency}
					formatDate={formatDate}
					statusBanner={statusBanner}
					actionArea={actionArea}
				/>
			</div>

			{/* Accept Dialog */}
			<Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Acceptance</DialogTitle>
						<DialogDescription>
							{effectiveSelection && (
								<>
									You are accepting{' '}
									<strong>
										{isSingleOption
											? 'this quotation'
											: getOptionLabel(
													rawOptions.find((o) => o.id === effectiveSelection)!,
												)}
									</strong>{' '}
									for{' '}
									<strong>
										{formatCurrency(
											rawOptions.find((o) => o.id === effectiveSelection)?.total ||
												'0',
										)}
									</strong>
									. We will be in touch to discuss next steps.
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Additional Comments (optional)</Label>
							<Textarea
								placeholder="Any additional comments..."
								value={feedback}
								onChange={(e) => setFeedback(e.target.value)}
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleAccept} disabled={respondMutation.isPending}>
							{respondMutation.isPending && (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							)}
							Confirm Acceptance
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reject Dialog */}
			<Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Decline Quotation</DialogTitle>
						<DialogDescription>
							We understand — and we're happy to help however we can. If you'd like to
							discuss your options, please don't hesitate to get in touch.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Feedback (optional)</Label>
							<Textarea
								placeholder="Please let us know if there's anything we can help with..."
								value={feedback}
								onChange={(e) => setFeedback(e.target.value)}
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowRejectDialog(false)}>
							Go Back
						</Button>
						<Button
							variant="destructive"
							onClick={handleReject}
							disabled={respondMutation.isPending}
						>
							{respondMutation.isPending && (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							)}
							Decline Quotation
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Notes Dialog */}
			<Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Your Notes</DialogTitle>
						<DialogDescription>
							Jot down any thoughts or questions. You can return to this page at any
							time to make your decision.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Your Notes</Label>
							<Textarea
								placeholder="Enter your notes or questions..."
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={4}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowNotesDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleSaveNotes} disabled={notesMutation.isPending}>
							{notesMutation.isPending && (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							)}
							Save Notes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
