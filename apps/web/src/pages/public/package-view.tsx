import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Loader2, Mail, Phone, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import { InscriptionText } from '@/components/inscription-text';
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
import { cn } from '@/lib/utils';

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
	product: { name: string } | null;
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

function formatComponentType(type: string): string {
	return type
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

// Fetch package by token
async function fetchPublicPackage(token: string): Promise<PublicPackage> {
	const response = await fetch(`${API_URL}/api/public/quotes/view/${token}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to load quote package');
	}

	return response.json();
}

// Submit response
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

// Save notes
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

	const formatCurrency = (value: string) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(parseFloat(value));
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'Not specified';
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	};

	const handleAccept = () => {
		if (!token || !selectedOption) return;
		respondMutation.mutate({
			token,
			decision: 'accept',
			selectedOptionId: selectedOption,
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
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
							{error instanceof Error ? error.message : 'This link may be invalid or expired.'}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!data) return null;

	const { package: pkg, customer, tenant, options } = data;
	const hasDecided = !!pkg.customerDecisionAt;
	const isExpired = pkg.validUntil && new Date(pkg.validUntil) < new Date();
	const canRespond = pkg.status === 'presented' && !hasDecided && !isExpired;
	const acceptedOption = options.find((o) => o.id === pkg.acceptedOptionId);
	const isSingleOption = options.length === 1;

	// Auto-select the only option for single-option quotes
	const effectiveSelection = isSingleOption ? options[0].id : selectedOption;
	const currentOption = options.find((o) => o.id === effectiveSelection);

	const hasContactInfo = tenant?.phone || tenant?.email || tenant?.website;

	const getOptionLabel = (option: PublicOption) =>
		option.optionLabel || `Option ${String.fromCharCode(65 + option.optionOrder)}`;

	return (
		<div className="min-h-screen bg-gray-50 py-8 px-4">
			<div className="max-w-3xl mx-auto">
				<div className="bg-white shadow-lg border border-gray-200 rounded-sm">
					{/* Letterhead Header */}
					{tenant && (
						<div className="px-10 sm:px-14 pt-10 pb-6">
							{tenant.hasLogo ? (
								<div className="text-center">
									<img
										src={`${API_URL}/api/logo/${tenant.id}`}
										alt={tenant.name}
										className="h-24 max-w-[280px] object-contain mx-auto"
									/>
									{hasContactInfo && (
										<div className="text-sm text-muted-foreground mt-3 space-y-0.5">
											{tenant.phone && <p>{tenant.phone}</p>}
											{tenant.email && <p>{tenant.email}</p>}
											{tenant.website && <p>{tenant.website}</p>}
										</div>
									)}
								</div>
							) : (
								<div className="text-center">
									<h1 className="text-2xl font-heading font-bold">{tenant.name}</h1>
									{hasContactInfo && (
										<div className="text-sm text-muted-foreground mt-3 space-y-0.5">
											{tenant.phone && <p>{tenant.phone}</p>}
											{tenant.email && <p>{tenant.email}</p>}
											{tenant.website && <p>{tenant.website}</p>}
										</div>
									)}
								</div>
							)}
						</div>
					)}

					<div className="px-10 sm:px-14">
						<Separator />
					</div>

					{/* Document Title */}
					<div className="px-10 sm:px-14 py-8 text-center space-y-2">
						<h2>Quotation</h2>
						{customer && (
							<p className="text-sm">
								<span className="text-muted-foreground">Prepared for </span>
								<span className="font-medium">
									{customer.firstName} {customer.lastName}
								</span>
							</p>
						)}
						<div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
							<span>Date: {formatDate(pkg.createdAt)}</span>
							{pkg.validUntil && !isExpired && (
								<span>Valid until: {formatDate(pkg.validUntil)}</span>
							)}
						</div>

						{/* Status badges */}
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

					{/* Status Messages */}
					{(hasDecided || (isExpired && pkg.status !== 'accepted')) && (
						<div className="px-10 sm:px-14 pb-6">
							{hasDecided && pkg.status === 'accepted' && acceptedOption && (
								<div className="bg-green-50 border border-green-200 rounded-lg p-4">
									<div className="flex items-start gap-3">
										<CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
										<div>
											<p className="font-medium text-green-800">
												You accepted{' '}
												{isSingleOption
													? 'this quotation'
													: acceptedOption.optionLabel || 'an option'}{' '}
												on {formatDate(pkg.customerDecisionAt)}
											</p>
											<p className="text-green-700 text-sm mt-1">
												Thank you for your response. We will be in touch shortly.
											</p>
										</div>
									</div>
								</div>
							)}

							{hasDecided && pkg.status === 'rejected' && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-4">
									<div className="flex items-start gap-3">
										<XCircle className="h-5 w-5 text-red-600 mt-0.5" />
										<div>
											<p className="font-medium text-red-800">
												You declined this quotation on {formatDate(pkg.customerDecisionAt)}
											</p>
											<p className="text-red-700 text-sm mt-1">
												Thank you for your feedback.
											</p>
										</div>
									</div>
								</div>
							)}

							{isExpired && !hasDecided && pkg.status !== 'accepted' && (
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
									<p className="text-yellow-800 text-sm">
										This quotation expired on {formatDate(pkg.validUntil)}. Please contact
										us if you would still like to proceed.
									</p>
								</div>
							)}
						</div>
					)}

					{/* Notes from staff */}
					{pkg.notes && (
						<div className="px-10 sm:px-14 pb-6">
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
								<p className="text-blue-800 text-sm">{pkg.notes}</p>
							</div>
						</div>
					)}

					{/* Option Selector (multiple options only) */}
					{!isSingleOption && (
						<>
							<div className="px-10 sm:px-14">
								<Separator />
							</div>
							<div className="px-10 sm:px-14 py-6">
								<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
									{options.length} options for your consideration
								</p>
								<div className="space-y-2">
									{options.map((option) => {
										const isAccepted = pkg.acceptedOptionId === option.id;
										const isSelected = effectiveSelection === option.id;
										return (
											<button
												key={option.id}
												onClick={
													canRespond
														? () => setSelectedOption(option.id)
														: () => setSelectedOption(option.id)
												}
												className={cn(
													'w-full flex items-center justify-between px-4 py-3 border rounded-sm text-sm transition-colors',
													isAccepted
														? 'border-green-500 bg-green-50 font-medium'
														: isSelected
															? 'border-primary/50 bg-primary/5 font-medium'
															: 'border-gray-200 hover:border-gray-300',
												)}
											>
												<span className="flex items-center gap-2">
													{getOptionLabel(option)}
													{option.product && (
														<span className="text-muted-foreground">
															– {option.product.name}
														</span>
													)}
													{isAccepted && (
														<Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
															Accepted
														</Badge>
													)}
												</span>
												<span className="font-medium">
													{formatCurrency(option.total)}
												</span>
											</button>
										);
									})}
								</div>
							</div>
						</>
					)}

					{/* Option Details */}
					{currentOption && (
						<>
							<div className="px-10 sm:px-14">
								<Separator />
							</div>

							<div className="px-10 sm:px-14 py-8 space-y-8">
								{/* Product */}
								{currentOption.product && (
									<div>
										<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
											Product
										</p>
										<p className="text-xl font-semibold">
											{currentOption.product.name}
										</p>
									</div>
								)}

								{/* Components */}
								{currentOption.components.length > 0 && (
									<div>
										<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
											Components
										</p>
										<div className="space-y-1">
											{currentOption.components.map((comp, idx) => (
												<div key={idx} className="text-sm">
													{formatComponentType(comp.componentType)}
													{comp.height && comp.width && comp.depth && (
														<span className="text-muted-foreground ml-2">
															({comp.height}" &times; {comp.width}" &times;{' '}
															{comp.depth}")
														</span>
													)}
													{comp.materialName && (
														<span className="text-muted-foreground ml-1">
															&ndash; {comp.materialName}
														</span>
													)}
													{comp.finishName && (
														<span className="text-muted-foreground ml-1">
															({comp.finishName})
														</span>
													)}
												</div>
											))}
										</div>
									</div>
								)}

								{/* Flower Holes */}
								{currentOption.flowerHoles && (
									<div>
										<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
											Flower Holes
										</p>
										<p className="text-sm">
											{currentOption.flowerHoles.replace(/_/g, ' ')}
										</p>
									</div>
								)}

								{/* Proposed Inscription */}
								{pkg.proposedInscription && (
									<div className="text-center">
										<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
											Proposed Inscription
										</p>
										<p className="whitespace-pre-wrap italic text-lg py-2">
											{pkg.proposedInscription}
										</p>
									</div>
								)}

								{/* Lettering */}
								{currentOption.lettering.length > 0 && (
									<div>
										<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
											Lettering
										</p>
										<div className="space-y-4">
											{currentOption.lettering.map((lett, idx) => (
												<div key={idx} className="space-y-1">
													<p className="text-sm text-muted-foreground">
														{lett.techniqueName}
														{lett.colorName && ` with ${lett.colorName}`} &middot;{' '}
														{lett.letterCount} letters
													</p>
													{lett.text && (
														<InscriptionText
															text={`"${lett.text}"`}
															fontId={lett.fontId}
															fontName={lett.fontName}
															fontS3Key={lett.fontS3Key}
															className="italic text-sm"
														/>
													)}
												</div>
											))}
										</div>
									</div>
								)}

								{/* Sundries */}
								{currentOption.sundries.length > 0 && (
									<div>
										<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
											Additional Items
										</p>
										<div className="space-y-1">
											{currentOption.sundries.map((s, idx) => (
												<p key={idx} className="text-sm text-muted-foreground">
													{s.sundryName} &times; {s.quantity}
												</p>
											))}
										</div>
									</div>
								)}

								{/* Custom Line Items */}
								{currentOption.lineItems.filter((li) => !li.priceHidden || li.price != null)
									.length > 0 && (
									<div>
										<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
											Other Charges
										</p>
										<div className="space-y-1">
											{currentOption.lineItems.map((li, idx) => (
												<div key={idx} className="flex justify-between text-sm">
													<span className="text-muted-foreground">
														{li.description}
														{li.vatExempt && (
															<span className="text-xs ml-1">(VAT Exempt)</span>
														)}
													</span>
													{!li.priceHidden && li.price != null && (
														<span>{formatCurrency(li.price)}</span>
													)}
												</div>
											))}
										</div>
									</div>
								)}
							</div>

							<div className="px-10 sm:px-14">
								<Separator />
							</div>

							{/* Pricing Summary */}
							<div className="px-10 sm:px-14 py-8">
								<div className="max-w-xs ml-auto space-y-2">
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">Subtotal</span>
										<span>{formatCurrency(currentOption.subtotal)}</span>
									</div>
									{parseFloat(currentOption.vatAmount) > 0 && (
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">
												VAT (
												{(parseFloat(currentOption.vatRate) * 100).toFixed(0)}
												%)
											</span>
											<span>{formatCurrency(currentOption.vatAmount)}</span>
										</div>
									)}
									<Separator className="my-2" />
									<div className="flex justify-between items-baseline pt-1">
										<span className="text-sm font-medium">Total</span>
										<span className="text-3xl font-heading font-bold">
											{formatCurrency(currentOption.total)}
										</span>
									</div>
								</div>
							</div>
						</>
					)}

					{/* Action Buttons */}
					{canRespond && (
						<>
							<div className="px-10 sm:px-14">
								<Separator />
							</div>
							<div className="px-10 sm:px-14 py-8 space-y-6">
								<div className="flex flex-col sm:flex-row gap-3 justify-center">
									<Button
										size="lg"
										onClick={() => setShowAcceptDialog(true)}
										disabled={
											(!isSingleOption && !selectedOption) ||
											respondMutation.isPending
										}
									>
										{respondMutation.isPending && (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										)}
										<CheckCircle className="h-4 w-4 mr-2" />
										{isSingleOption
											? 'Accept This Quotation'
											: effectiveSelection
												? `Accept ${getOptionLabel(options.find((o) => o.id === effectiveSelection)!)}`
												: 'Select an Option Above'}
									</Button>
									<Button
										size="lg"
										variant="outline"
										onClick={() => setShowRejectDialog(true)}
										disabled={respondMutation.isPending}
									>
										<XCircle className="h-4 w-4 mr-2" />
										{isSingleOption ? 'Decline' : 'Decline All Options'}
									</Button>
								</div>

								<p className="text-sm text-muted-foreground text-center">
									Once you accept, we will be in touch to confirm the details and
									arrange next steps.
								</p>

								{hasContactInfo && (
									<div className="flex items-center justify-center gap-4 text-sm">
										{tenant?.phone && (
											<a
												href={`tel:${tenant.phone}`}
												className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
											>
												<Phone className="h-3.5 w-3.5" />
												{tenant.phone}
											</a>
										)}
										{tenant?.email && (
											<a
												href={`mailto:${tenant.email}`}
												className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
											>
												<Mail className="h-3.5 w-3.5" />
												{tenant.email}
											</a>
										)}
									</div>
								)}

								<div className="text-center">
									<Button
										variant="link"
										onClick={() => {
											setNotes(pkg.customerFeedback || '');
											setShowNotesDialog(true);
										}}
									>
										Save notes without deciding
									</Button>
								</div>
							</div>
						</>
					)}

					{/* Footer */}
					{tenant && (
						<>
							<div className="px-10 sm:px-14">
								<Separator />
							</div>
							<div className="px-10 sm:px-14 py-8 text-center space-y-2">
								<p className="text-sm text-muted-foreground italic">
									Thank you for your enquiry
								</p>
								<p className="font-heading font-semibold">{tenant.name}</p>
								{hasContactInfo && (
									<p className="text-sm text-muted-foreground">
										{[tenant.phone, tenant.email, tenant.website]
											.filter(Boolean)
											.join(' · ')}
									</p>
								)}
							</div>
						</>
					)}
				</div>
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
													options.find((o) => o.id === effectiveSelection)!,
												)}
									</strong>{' '}
									for{' '}
									<strong>
										{formatCurrency(
											options.find((o) => o.id === effectiveSelection)?.total || '0',
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
							Are you sure? We value your feedback and would appreciate knowing how we can
							help.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Feedback (optional)</Label>
							<Textarea
								placeholder="Please let us know why..."
								value={feedback}
								onChange={(e) => setFeedback(e.target.value)}
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowRejectDialog(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleReject}
							disabled={respondMutation.isPending}
						>
							{respondMutation.isPending && (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							)}
							Decline
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
							Jot down any thoughts or questions. You can return to this page at any time
							to make your decision.
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
