import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, CreditCard } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type PaymentStatus = {
	status: string;
	message: string | null;
	amount: number;
	cardLastFour: string | null;
	cardType: string | null;
	jobNumber: string | null;
};

export function PaymentSuccessPage() {
	const [searchParams] = useSearchParams();
	const orderId = searchParams.get('orderId');

	const { data, isLoading } = useQuery<PaymentStatus>({
		queryKey: ['payment-status', orderId],
		queryFn: async () => {
			const res = await fetch(`${API_URL}/api/public/payments/status?orderId=${orderId}`);
			if (!res.ok) throw new Error('Failed to fetch payment status');
			return res.json();
		},
		enabled: !!orderId,
	});

	const formatCurrency = (pence: number) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(pence / 100);
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<Card className="w-full max-w-md">
				<CardContent className="pt-8 pb-8 text-center space-y-4">
					<div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
						<CheckCircle className="h-8 w-8 text-green-600" />
					</div>
					<h2 className="text-2xl font-semibold">Payment Successful</h2>
					<p className="text-muted-foreground">
						Your payment has been processed successfully.
					</p>

					{isLoading && (
						<div className="flex items-center justify-center gap-2 text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading details...
						</div>
					)}

					{data && (
						<div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
							{data.jobNumber && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Job Reference</span>
									<span className="font-medium">{data.jobNumber}</span>
								</div>
							)}
							<div className="flex justify-between">
								<span className="text-muted-foreground">Amount Paid</span>
								<span className="font-medium">{formatCurrency(data.amount)}</span>
							</div>
							{data.cardLastFour && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Card</span>
									<span className="font-medium flex items-center gap-1">
										<CreditCard className="h-3.5 w-3.5" />
										****{data.cardLastFour}
									</span>
								</div>
							)}
						</div>
					)}

					<p className="text-xs text-muted-foreground">
						You can safely close this page. A confirmation will be sent to your email address.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
