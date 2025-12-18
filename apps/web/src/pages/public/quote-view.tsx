import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertCircle, Clock, Loader2 } from 'lucide-react';

const API_URL = 'http://localhost:3000';

// Types for public quote response
interface PublicQuote {
	id: string;
	quoteNumber: string;
	status: string;
	subtotal: string;
	vatAmount: string;
	total: string;
	vatRate: string;
	notes: string | null;
	flowerHoles: string | null;
	proposedInscription: string | null;
	validUntil: string | null;
	createdAt: string;
	customerFeedback: string | null;
	customerDecision: string | null;
	customerDecisionAt: string | null;
}

interface PublicQuoteResponse {
	quote: PublicQuote;
	customer: { firstName: string; lastName: string } | null;
	product: { name: string } | null;
	tenant: { name: string } | null;
	components: Array<{
		componentType: string;
		height: string | null;
		width: string | null;
		depth: string | null;
		quantity: number;
		unitPrice: string;
		lineTotal: string;
		materialName: string | null;
		finishName: string | null;
	}>;
	lettering: Array<{
		text: string | null;
		letterCount: number;
		unitPrice: string;
		lineTotal: string;
		techniqueName: string | null;
		colorName: string | null;
	}>;
	sundries: Array<{
		quantity: number;
		unitPrice: string;
		lineTotal: string;
		sundryName: string | null;
	}>;
	services: Array<{
		quantity: number;
		unitPrice: string;
		lineTotal: string;
		serviceName: string | null;
	}>;
}

async function fetchPublicQuote(token: string): Promise<PublicQuoteResponse> {
	const response = await fetch(`${API_URL}/api/public/quotes/view/${token}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to load quote');
	}

	return response.json();
}

async function submitResponse(
	token: string,
	decision: 'accepted' | 'rejected',
	feedback?: string
) {
	const response = await fetch(`${API_URL}/api/public/quotes/view/${token}/respond`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ decision, feedback }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to submit response');
	}

	return response.json();
}

async function saveNotes(token: string, notes: string) {
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

export function PublicQuoteViewPage() {
	const { token } = useParams<{ token: string }>();
	const [notes, setNotes] = useState('');
	const [notesSaved, setNotesSaved] = useState(false);

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['public-quote', token],
		queryFn: () => fetchPublicQuote(token!),
		enabled: !!token,
		retry: false,
	});

	const respondMutation = useMutation({
		mutationFn: ({
			decision,
			feedback,
		}: {
			decision: 'accepted' | 'rejected';
			feedback?: string;
		}) => submitResponse(token!, decision, feedback),
		onSuccess: () => {
			refetch();
		},
	});

	const saveNotesMutation = useMutation({
		mutationFn: (notesText: string) => saveNotes(token!, notesText),
		onSuccess: () => {
			setNotesSaved(true);
			refetch();
		},
	});

	// Initialize notes from existing customer feedback
	const existingFeedback = data?.quote?.customerFeedback;
	if (existingFeedback && notes === '' && !notesSaved) {
		setNotes(existingFeedback);
	}

	const handleSaveNotes = () => {
		if (notes.trim()) {
			saveNotesMutation.mutate(notes);
		}
	};

	const formatCurrency = (value: string) => {
		return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
			parseFloat(value)
		);
	};

	const formatComponentType = (type: string) => {
		return type
			.split('_')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	};

	const handleDecision = (decision: 'accepted' | 'rejected') => {
		respondMutation.mutate({ decision, feedback: notes || undefined });
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
					<p className="text-muted-foreground">Loading your quote...</p>
				</div>
			</div>
		);
	}

	if (error) {
		const errorMessage = error instanceof Error ? error.message : 'An error occurred';
		const isExpired = errorMessage.includes('expired');

		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardContent className="pt-6 text-center">
						{isExpired ? (
							<Clock className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
						) : (
							<AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
						)}
						<h2 className="text-xl font-semibold mb-2">
							{isExpired ? 'Quote Expired' : 'Unable to Load Quote'}
						</h2>
						<p className="text-muted-foreground">
							{isExpired
								? 'This quote is no longer valid. Please contact us for an updated quote.'
								: errorMessage}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!data) return null;

	const { quote, customer, product, tenant, components, lettering, sundries, services } = data;
	const hasResponded = !!quote.customerDecision;
	const canRespond = quote.status === 'presented' && !hasResponded;

	return (
		<div className="min-h-screen bg-gray-50 py-8 px-4">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-2xl font-bold text-gray-900">{tenant?.name}</h1>
					<p className="text-muted-foreground">Quote {quote.quoteNumber}</p>
				</div>

				{/* Previous Response Banner */}
				{hasResponded && (
					<Card
						className={`mb-6 ${quote.customerDecision === 'accepted' ? 'border-green-500' : 'border-red-500'}`}
					>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								{quote.customerDecision === 'accepted' ? (
									<Check className="h-6 w-6 text-green-500" />
								) : (
									<X className="h-6 w-6 text-red-500" />
								)}
								<div>
									<p className="font-semibold">
										You {quote.customerDecision === 'accepted' ? 'accepted' : 'declined'}{' '}
										this quote
									</p>
									{quote.customerDecisionAt && (
										<p className="text-sm text-muted-foreground">
											on{' '}
											{new Date(quote.customerDecisionAt).toLocaleDateString('en-GB', {
												day: 'numeric',
												month: 'long',
												year: 'numeric',
											})}
										</p>
									)}
								</div>
							</div>
							{quote.customerFeedback && (
								<p className="mt-4 text-sm bg-gray-50 p-3 rounded">
									Your feedback: "{quote.customerFeedback}"
								</p>
							)}
						</CardContent>
					</Card>
				)}

				{/* Main Quote Card */}
				<Card>
					<CardHeader className="text-center border-b">
						<CardTitle className="text-xl">Quotation</CardTitle>
						{customer && (
							<CardDescription>
								Prepared for {customer.firstName} {customer.lastName}
							</CardDescription>
						)}
						{quote.validUntil && (
							<p className="text-sm text-muted-foreground mt-2">
								Valid until{' '}
								{new Date(quote.validUntil).toLocaleDateString('en-GB', {
									day: 'numeric',
									month: 'long',
									year: 'numeric',
								})}
							</p>
						)}
					</CardHeader>

					<CardContent className="pt-6 space-y-6">
						{/* Product Info */}
						{product && (
							<div>
								<p className="font-semibold text-lg">{product.name}</p>
							</div>
						)}

						{/* Components */}
						{components.length > 0 && (
							<div className="space-y-2">
								<p className="font-medium text-sm text-muted-foreground">Components</p>
								{components.map((comp, idx) => (
									<div key={idx} className="flex justify-between text-sm">
										<span>
											{formatComponentType(comp.componentType)}
											{comp.materialName && ` - ${comp.materialName}`}
											{comp.height && comp.width && comp.depth && (
												<span className="text-muted-foreground ml-1">
													({comp.height}" x {comp.width}" x {comp.depth}")
												</span>
											)}
											{comp.quantity > 1 && ` x${comp.quantity}`}
										</span>
										<span>{formatCurrency(comp.lineTotal)}</span>
									</div>
								))}
							</div>
						)}

						{/* Lettering */}
						{lettering.length > 0 && (
							<div className="space-y-2">
								<p className="font-medium text-sm text-muted-foreground">Lettering</p>
								{lettering.map((lett, idx) => (
									<div key={idx} className="flex justify-between text-sm">
										<span>
											{lett.techniqueName} - {lett.letterCount} letters
											{lett.colorName && ` (${lett.colorName})`}
										</span>
										<span>{formatCurrency(lett.lineTotal)}</span>
									</div>
								))}
							</div>
						)}

						{/* Sundries */}
						{sundries.length > 0 && (
							<div className="space-y-2">
								<p className="font-medium text-sm text-muted-foreground">Additional Items</p>
								{sundries.map((s, idx) => (
									<div key={idx} className="flex justify-between text-sm">
										<span>
											{s.sundryName} {s.quantity > 1 && `x${s.quantity}`}
										</span>
										<span>{formatCurrency(s.lineTotal)}</span>
									</div>
								))}
							</div>
						)}

						{/* Services */}
						{services.length > 0 && (
							<div className="space-y-2">
								<p className="font-medium text-sm text-muted-foreground">Services</p>
								{services.map((s, idx) => (
									<div key={idx} className="flex justify-between text-sm">
										<span>
											{s.serviceName} {s.quantity > 1 && `x${s.quantity}`}
										</span>
										<span>{formatCurrency(s.lineTotal)}</span>
									</div>
								))}
							</div>
						)}

						{/* Flower Holes */}
						{quote.flowerHoles && (
							<div className="text-sm">
								<span className="text-muted-foreground">Flower Holes: </span>
								{quote.flowerHoles.replace(/_/g, ' ')}
							</div>
						)}

						{/* Proposed Inscription */}
						{quote.proposedInscription && (
							<div className="space-y-1">
								<p className="text-sm font-medium">
									Proposed Inscription ({quote.proposedInscription.length} characters):
								</p>
								<p className="whitespace-pre-wrap bg-gray-100 p-3 rounded font-mono text-sm">
									{quote.proposedInscription}
								</p>
							</div>
						)}

						{/* Notes */}
						{quote.notes && (
							<div className="bg-gray-50 p-4 rounded">
								<p className="text-sm">{quote.notes}</p>
							</div>
						)}

						{/* Totals */}
						<div className="border-t pt-4 space-y-2">
							<div className="flex justify-between">
								<span>Subtotal</span>
								<span>{formatCurrency(quote.subtotal)}</span>
							</div>
							<div className="flex justify-between text-muted-foreground">
								<span>VAT ({(parseFloat(quote.vatRate) * 100).toFixed(0)}%)</span>
								<span>{formatCurrency(quote.vatAmount)}</span>
							</div>
							<div className="flex justify-between font-bold text-xl pt-2 border-t">
								<span>Total</span>
								<span>{formatCurrency(quote.total)}</span>
							</div>
						</div>

						{/* Response Actions */}
						{canRespond && (
							<div className="border-t pt-6 space-y-6">
								<div className="space-y-3">
									<p className="font-medium">Your Notes (optional)</p>
									<Textarea
										value={notes}
										onChange={(e) => {
											setNotes(e.target.value);
											setNotesSaved(false);
										}}
										placeholder="Add any comments, questions, or special requests..."
										rows={3}
									/>
									<div className="flex items-center gap-3">
										<Button
											variant="outline"
											onClick={handleSaveNotes}
											disabled={saveNotesMutation.isPending || !notes.trim()}
										>
											{saveNotesMutation.isPending ? (
												<>
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													Saving...
												</>
											) : (
												'Save Notes'
											)}
										</Button>
										{notesSaved && (
											<span className="text-sm text-green-600 flex items-center gap-1">
												<Check className="h-4 w-4" />
												Notes saved
											</span>
										)}
									</div>
									<p className="text-sm text-muted-foreground">
										You can save notes now and decide later, or make your decision below.
									</p>
								</div>
								<div className="border-t pt-6">
									<p className="text-center font-medium mb-4">
										Ready to make a decision?
									</p>
									<div className="flex gap-4 justify-center">
										<Button
											size="lg"
											onClick={() => handleDecision('accepted')}
											disabled={respondMutation.isPending || saveNotesMutation.isPending}
											className="bg-green-600 hover:bg-green-700"
										>
											{respondMutation.isPending ? (
												<Loader2 className="h-5 w-5 mr-2 animate-spin" />
											) : (
												<Check className="h-5 w-5 mr-2" />
											)}
											Accept Quote
										</Button>
										<Button
											variant="outline"
											size="lg"
											onClick={() => handleDecision('rejected')}
											disabled={respondMutation.isPending || saveNotesMutation.isPending}
										>
											<X className="h-5 w-5 mr-2" />
											Decline
										</Button>
									</div>
								</div>
							</div>
						)}

						{/* Errors */}
						{(respondMutation.error || saveNotesMutation.error) && (
							<div className="bg-red-50 text-red-600 p-4 rounded text-sm">
								{respondMutation.error instanceof Error
									? respondMutation.error.message
									: saveNotesMutation.error instanceof Error
										? saveNotesMutation.error.message
										: 'An error occurred'}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Footer */}
				<p className="text-center text-sm text-muted-foreground mt-8">
					Questions? Contact {tenant?.name} for assistance.
				</p>
			</div>
		</div>
	);
}
