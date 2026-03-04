import { useState } from 'react';
import { useParams } from 'react-router';
import { InscriptionText } from '@/components/inscription-text';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
	CheckCircle,
	XCircle,
	Loader2,
	Package,
	AlertCircle,
	Clock,
} from 'lucide-react';
import { toast } from 'sonner';

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
		packageNumber: string;
		status: string;
		quoteType: string;
		notes: string | null;
		proposedInscription: string | null;
		validUntil: string | null;
		createdAt: string;
		customerFeedback: string | null;
		customerFeedbackAt: string | null;
		acceptedOptionId: string | null;
		customerDecisionAt: string | null;
	};
	customer: { firstName: string; lastName: string } | null;
	tenant: { id: string; name: string; hasLogo: boolean } | null;
	options: PublicOption[];
};

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
					<p className="text-muted-foreground">Loading quote package...</p>
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
	const acceptedOption = options.find(o => o.id === pkg.acceptedOptionId);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b">
				<div className="max-w-5xl mx-auto px-4 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							{tenant?.hasLogo && (
								<img
									src={`${API_URL}/api/logo/${tenant.id}`}
									alt={tenant.name}
									className="h-12 max-w-[160px] object-contain"
								/>
							)}
							<div>
								<h1 className="text-2xl font-bold">{tenant?.name || 'Quote Package'}</h1>
								<p className="text-muted-foreground mt-1">
									Package {pkg.packageNumber}
								</p>
							</div>
						</div>
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
						{isExpired && pkg.status !== 'accepted' && (
							<Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
								<Clock className="h-4 w-4 mr-1" />
								Expired
							</Badge>
						)}
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-5xl mx-auto px-4 py-8">
				{/* Welcome Message */}
				{customer && (
					<p className="text-lg mb-6">
						Dear {customer.firstName} {customer.lastName},
					</p>
				)}

				{pkg.notes && (
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
						<p className="text-blue-800">{pkg.notes}</p>
					</div>
				)}

				{/* Status Messages */}
				{hasDecided && pkg.status === 'accepted' && acceptedOption && (
					<div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
						<div className="flex items-start gap-3">
							<CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
							<div>
								<p className="font-medium text-green-800">
									You accepted {acceptedOption.optionLabel || 'an option'} on{' '}
									{formatDate(pkg.customerDecisionAt)}
								</p>
								<p className="text-green-700 text-sm mt-1">
									Thank you for your response. We will be in touch shortly.
								</p>
							</div>
						</div>
					</div>
				)}

				{hasDecided && pkg.status === 'rejected' && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
						<div className="flex items-start gap-3">
							<XCircle className="h-5 w-5 text-red-600 mt-0.5" />
							<div>
								<p className="font-medium text-red-800">
									You declined all options on {formatDate(pkg.customerDecisionAt)}
								</p>
								<p className="text-red-700 text-sm mt-1">
									Thank you for your feedback.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Validity Notice */}
				{!hasDecided && pkg.validUntil && (
					<div className={`border rounded-lg p-4 mb-6 ${isExpired ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}>
						<div className="flex items-center gap-2">
							<Clock className={`h-4 w-4 ${isExpired ? 'text-yellow-600' : 'text-muted-foreground'}`} />
							<span className={isExpired ? 'text-yellow-800' : 'text-muted-foreground'}>
								{isExpired
									? `This quote expired on ${formatDate(pkg.validUntil)}`
									: `Valid until ${formatDate(pkg.validUntil)}`}
							</span>
						</div>
					</div>
				)}

				{/* Proposed Inscription */}
				{pkg.proposedInscription && (
					<Card className="mb-6">
						<CardHeader>
							<CardTitle>Proposed Inscription</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className="whitespace-pre-wrap font-sans text-sm bg-muted p-4 rounded-md">
								{pkg.proposedInscription}
							</pre>
						</CardContent>
					</Card>
				)}

				{/* Options */}
				<h2 className="text-xl font-semibold mb-4">
					{options.length} Option{options.length !== 1 ? 's' : ''} Available
				</h2>

				<div className="space-y-4 mb-8">
					{options.map((option) => (
						<OptionCard
							key={option.id}
							option={option}
							isSelected={selectedOption === option.id}
							isAccepted={pkg.acceptedOptionId === option.id}
							canSelect={canRespond}
							formatCurrency={formatCurrency}
							onSelect={() => setSelectedOption(option.id)}
						/>
					))}
				</div>

				{/* Action Buttons */}
				{canRespond && (
					<div className="flex gap-4 justify-center">
						<Button
							size="lg"
							onClick={() => setShowAcceptDialog(true)}
							disabled={!selectedOption || respondMutation.isPending}
						>
							{respondMutation.isPending && (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							)}
							<CheckCircle className="h-4 w-4 mr-2" />
							Accept Selected Option
						</Button>
						<Button
							size="lg"
							variant="outline"
							onClick={() => setShowRejectDialog(true)}
							disabled={respondMutation.isPending}
						>
							<XCircle className="h-4 w-4 mr-2" />
							Decline All Options
						</Button>
					</div>
				)}

				{/* Notes Button */}
				{canRespond && (
					<div className="text-center mt-4">
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
				)}
			</div>

			{/* Accept Dialog */}
			<Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Accept Option</DialogTitle>
						<DialogDescription>
							{selectedOption && (
								<>
									You are accepting{' '}
									<strong>
										{options.find(o => o.id === selectedOption)?.optionLabel || 'this option'}
									</strong>{' '}
									for{' '}
									<strong>
										{formatCurrency(options.find(o => o.id === selectedOption)?.total || '0')}
									</strong>
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
						<DialogTitle>Decline All Options</DialogTitle>
						<DialogDescription>
							Are you sure you want to decline all options? We would appreciate
							your feedback on why these options don't meet your needs.
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
							Decline All
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Notes Dialog */}
			<Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Save Notes</DialogTitle>
						<DialogDescription>
							Save your notes without making a decision. You can come back later.
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

// Option Card Component
function OptionCard({
	option,
	isSelected,
	isAccepted,
	canSelect,
	formatCurrency,
	onSelect,
}: {
	option: PublicOption;
	isSelected: boolean;
	isAccepted: boolean;
	canSelect: boolean;
	formatCurrency: (value: string) => string;
	onSelect: () => void;
}) {
	const [expanded, setExpanded] = useState(false);

	return (
		<Card
			className={`cursor-pointer transition-all ${
				isAccepted
					? 'border-green-500 border-2 bg-green-50'
					: isSelected
						? 'border-primary border-2'
						: 'hover:border-primary/50'
			}`}
			onClick={canSelect ? onSelect : undefined}
		>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							{option.optionLabel || `Option ${String.fromCharCode(65 + option.optionOrder)}`}
							{isAccepted && (
								<Badge className="bg-green-100 text-green-800 border-green-200">
									<CheckCircle className="h-3 w-3 mr-1" />
									Accepted
								</Badge>
							)}
						</CardTitle>
						{option.product && (
							<p className="text-lg font-medium mt-1">{option.product.name}</p>
						)}
					</div>
					<div className="text-right">
						<div className="text-2xl font-bold">{formatCurrency(option.total)}</div>
						{parseFloat(option.vatAmount) > 0 && (
							<p className="text-sm text-muted-foreground">
								inc. {formatCurrency(option.vatAmount)} VAT
							</p>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent>
				<Button
					variant="ghost"
					size="sm"
					onClick={(e) => {
						e.stopPropagation();
						setExpanded(!expanded);
					}}
				>
					{expanded ? 'Hide Details' : 'Show Details'}
				</Button>

				{expanded && (
					<div className="mt-4 space-y-4">
						{/* Components */}
						{option.components.length > 0 && (
							<div>
								<h4 className="font-medium mb-2">Components</h4>
								<div className="space-y-1 text-sm">
									{option.components.map((comp, idx) => (
										<div key={idx} className="flex justify-between">
											<span>
												{comp.quantity}x {comp.materialName || comp.componentType}
												{comp.finishName && ` (${comp.finishName})`}
											</span>
											<span>{formatCurrency(comp.lineTotal)}</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Lettering */}
						{option.lettering.length > 0 && (
							<div>
								<h4 className="font-medium mb-2">Lettering</h4>
								<div className="space-y-2 text-sm">
									{option.lettering.map((lett, idx) => (
										<div key={idx} className="space-y-1">
											<div className="flex justify-between">
												<span>
													{lett.techniqueName}
													{lett.colorName && ` - ${lett.colorName}`}
													{' '}({lett.letterCount} letters)
												</span>
												<span>{formatCurrency(lett.lineTotal)}</span>
											</div>
											{lett.text && (
												<InscriptionText
													text={`"${lett.text}"`}
													fontId={lett.fontId}
													fontName={lett.fontName}
													fontS3Key={lett.fontS3Key}
													className="italic text-muted-foreground"
												/>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Sundries */}
						{option.sundries.length > 0 && (
							<div>
								<h4 className="font-medium mb-2">Sundries</h4>
								<div className="space-y-1 text-sm">
									{option.sundries.map((sund, idx) => (
										<div key={idx} className="flex justify-between">
											<span>
												{sund.quantity}x {sund.sundryName}
											</span>
											<span>{formatCurrency(sund.lineTotal)}</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Line Items */}
						{option.lineItems.length > 0 && (
							<div>
								<h4 className="font-medium mb-2">Additional Items</h4>
								<div className="space-y-1 text-sm">
									{option.lineItems.map((li, idx) => (
										<div key={idx} className="flex justify-between">
											<span>{li.description}</span>
											{!li.priceHidden && li.price != null && (
												<span>{formatCurrency(li.price)}</span>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Totals */}
						<div className="border-t pt-2">
							<div className="flex justify-between text-sm">
								<span>Subtotal</span>
								<span>{formatCurrency(option.subtotal)}</span>
							</div>
							{parseFloat(option.vatAmount) > 0 && (
								<div className="flex justify-between text-sm">
									<span>VAT ({(parseFloat(option.vatRate) * 100).toFixed(0)}%)</span>
									<span>{formatCurrency(option.vatAmount)}</span>
								</div>
							)}
							<div className="flex justify-between font-bold mt-1">
								<span>Total</span>
								<span>{formatCurrency(option.total)}</span>
							</div>
						</div>
					</div>
				)}
			</CardContent>

			{canSelect && (
				<CardFooter className="pt-0">
					<div className="flex items-center gap-2">
						<div
							className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
								isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
							}`}
						>
							{isSelected && <CheckCircle className="h-3 w-3 text-white" />}
						</div>
						<span className="text-sm text-muted-foreground">
							{isSelected ? 'Selected' : 'Click to select'}
						</span>
					</div>
				</CardFooter>
			)}
		</Card>
	);
}
