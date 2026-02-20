import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type PaymentStatus = {
	status: string;
	message: string | null;
	amount: number;
	cardLastFour: string | null;
	cardType: string | null;
	jobNumber: string | null;
};

export function PaymentFailurePage() {
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

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<Card className="w-full max-w-md">
				<CardContent className="pt-8 pb-8 text-center space-y-4">
					<div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto">
						<XCircle className="h-8 w-8 text-red-600" />
					</div>
					<h2 className="text-2xl font-semibold">Payment Failed</h2>
					<p className="text-muted-foreground">
						Your payment could not be processed.
					</p>

					{isLoading && (
						<div className="flex items-center justify-center gap-2 text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading details...
						</div>
					)}

					{data?.message && (
						<div className="bg-muted/50 rounded-lg p-4 text-sm">
							<p className="text-muted-foreground">{data.message}</p>
						</div>
					)}

					<p className="text-sm text-muted-foreground">
						Please contact us if you need assistance, or try again using the payment link you were sent.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
