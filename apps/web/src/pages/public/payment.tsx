import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type TokenValidationResponse = {
	milestone: { id: string; description: string; amount: string };
	job: { jobNumber: string };
	customerName: string;
	tenantName: string;
};

type InitiateResponse = {
	formAction: string;
	formFields: Record<string, string>;
};

export function PaymentPage() {
	const { token } = useParams<{ token: string }>();
	const formRef = useRef<HTMLFormElement>(null);
	const [submitting, setSubmitting] = useState(false);

	const { data, isLoading, error } = useQuery<TokenValidationResponse>({
		queryKey: ['payment-token', token],
		queryFn: async () => {
			const res = await fetch(`${API_URL}/api/public/payments/validate-token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token }),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Invalid payment link');
			}
			return res.json();
		},
		enabled: !!token,
	});

	const initiateMutation = useMutation<InitiateResponse>({
		mutationFn: async () => {
			const res = await fetch(`${API_URL}/api/public/payments/initiate-from-token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token }),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to initiate payment');
			}
			return res.json();
		},
		onSuccess: (result) => {
			setSubmitting(true);
			// Create and auto-submit hidden form
			const form = formRef.current;
			if (!form) return;

			form.action = result.formAction;
			form.method = 'POST';

			// Clear existing hidden inputs
			form.innerHTML = '';

			// Add all form fields
			for (const [name, value] of Object.entries(result.formFields)) {
				const input = document.createElement('input');
				input.type = 'hidden';
				input.name = name;
				input.value = value;
				form.appendChild(input);
			}

			form.submit();
		},
	});

	const formatCurrency = (value: string) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(parseFloat(value));
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
					<p className="mt-2 text-muted-foreground">Loading payment details...</p>
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6 text-center">
						<AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
						<h2 className="text-xl font-semibold mb-2">Invalid Payment Link</h2>
						<p className="text-muted-foreground">
							{error instanceof Error
								? error.message
								: 'This payment link is invalid or has expired.'}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (submitting) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
					<p className="mt-2 text-muted-foreground">Redirecting to payment provider...</p>
				</div>
				<form ref={formRef} style={{ display: 'none' }} />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2">
						<CreditCard className="h-6 w-6 text-primary" />
					</div>
					<CardTitle>{data.tenantName}</CardTitle>
					<CardDescription>Secure online payment</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="bg-muted/50 rounded-lg p-4 space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Job Reference</span>
							<span className="font-medium">{data.job.jobNumber}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Description</span>
							<span className="font-medium">{data.milestone.description}</span>
						</div>
						{data.customerName && (
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Customer</span>
								<span className="font-medium">{data.customerName}</span>
							</div>
						)}
						<div className="border-t pt-2 mt-2">
							<div className="flex justify-between">
								<span className="font-medium">Amount Due</span>
								<span className="text-xl font-bold">{formatCurrency(data.milestone.amount)}</span>
							</div>
						</div>
					</div>

					<Button
						className="w-full"
						size="lg"
						onClick={() => initiateMutation.mutate()}
						disabled={initiateMutation.isPending}
					>
						{initiateMutation.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Processing...
							</>
						) : (
							<>
								<CreditCard className="mr-2 h-4 w-4" />
								Pay {formatCurrency(data.milestone.amount)}
							</>
						)}
					</Button>

					{initiateMutation.error && (
						<p className="text-sm text-destructive text-center">
							{initiateMutation.error instanceof Error
								? initiateMutation.error.message
								: 'Failed to initiate payment'}
						</p>
					)}

					<p className="text-xs text-muted-foreground text-center">
						You will be redirected to a secure payment page to enter your card details.
					</p>
				</CardContent>
			</Card>
			<form ref={formRef} style={{ display: 'none' }} />
		</div>
	);
}
