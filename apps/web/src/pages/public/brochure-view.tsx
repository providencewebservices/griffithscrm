import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Heart, Loader2, MessageSquare } from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type PublicBrochureProduct = {
	id: string;
	productId: string;
	sortOrder: number;
	isInterested: boolean;
	interestedAt: string | null;
	productName: string;
	productDescription: string | null;
	productImageUrl: string | null;
	categoryName: string | null;
};

type PublicBrochureData = {
	brochure: {
		id: string;
		message: string | null;
		readyToDiscussAt: string | null;
		createdAt: string;
		expiresAt: string | null;
	};
	products: PublicBrochureProduct[];
	tenant: { id: string; name: string; hasLogo: boolean } | null;
};

export function PublicBrochureViewPage() {
	const { token } = useParams();
	const queryClient = useQueryClient();

	const { data, isLoading, error } = useQuery<PublicBrochureData, Error>({
		queryKey: ['public-brochure', token],
		queryFn: async () => {
			const res = await fetch(`${API_URL}/api/public/brochures/${token}`);
			if (res.status === 410) throw new Error('expired');
			if (!res.ok) throw new Error('not-found');
			return res.json();
		},
		enabled: !!token,
	});

	const toggleInterest = useMutation({
		mutationFn: async (productId: string) => {
			const res = await fetch(`${API_URL}/api/public/brochures/${token}/interest/${productId}`, {
				method: 'POST',
			});
			if (!res.ok) throw new Error('Failed to toggle interest');
			return res.json();
		},
		onMutate: async (productId) => {
			await queryClient.cancelQueries({ queryKey: ['public-brochure', token] });
			const previous = queryClient.getQueryData<PublicBrochureData>(['public-brochure', token]);
			queryClient.setQueryData<PublicBrochureData>(['public-brochure', token], (old) => {
				if (!old) return old;
				return {
					...old,
					products: old.products.map((p) =>
						p.productId === productId ? { ...p, isInterested: !p.isInterested } : p,
					),
				};
			});
			return { previous };
		},
		onError: (_err, _productId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(['public-brochure', token], context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ['public-brochure', token] });
		},
	});

	const readyMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch(`${API_URL}/api/public/brochures/${token}/ready`, {
				method: 'POST',
			});
			if (!res.ok) throw new Error('Failed to submit');
			return res.json();
		},
		onSuccess: () => {
			queryClient.setQueryData<PublicBrochureData>(['public-brochure', token], (old) => {
				if (!old) return old;
				return {
					...old,
					brochure: { ...old.brochure, readyToDiscussAt: new Date().toISOString() },
				};
			});
		},
	});

	// Loading state
	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="bg-white border-b">
					<div className="max-w-5xl mx-auto px-4 py-6">
						<Skeleton className="h-8 w-48" />
					</div>
				</div>
				<div className="max-w-5xl mx-auto px-4 py-8">
					<div
						className="grid gap-6"
						style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
					>
						{[1, 2, 3, 4].map((i) => (
							<Card key={i}>
								<Skeleton className="h-48 w-full rounded-t-lg rounded-b-none" />
								<CardContent className="pt-4 space-y-2">
									<Skeleton className="h-5 w-3/4" />
									<Skeleton className="h-4 w-1/2" />
									<Skeleton className="h-4 w-full" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		);
	}

	// Expired state
	if (error instanceof Error && error.message === 'expired') {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-yellow-700">
							<AlertCircle className="h-5 w-5" />
							Brochure Expired
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							This brochure has expired. Please contact your memorial mason directly for up-to-date
							options.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Error state
	if (error || !data) {
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
							This link may be invalid. Please check the link and try again.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const { brochure, products, tenant } = data;
	const isReady = !!brochure.readyToDiscussAt;

	return (
		<div className="min-h-screen bg-gray-50 pb-24">
			{/* Header */}
			<div className="bg-white border-b">
				<div className="max-w-5xl mx-auto px-4 py-6">
					<div className="flex items-center gap-4">
						{tenant?.hasLogo && (
							<img
								src={`${API_URL}/api/logo/${tenant.id}`}
								alt={tenant.name}
								className="h-12 max-w-[160px] object-contain"
							/>
						)}
						<h1 className="text-2xl font-bold">{tenant?.name || 'Product Brochure'}</h1>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-5xl mx-auto px-4 py-8">
				{/* Staff message */}
				{brochure.message && (
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
						<p className="text-blue-800 whitespace-pre-wrap">{brochure.message}</p>
					</div>
				)}

				{/* Product grid */}
				{products.length === 0 ? (
					<p className="text-center text-muted-foreground py-12">No products in this brochure.</p>
				) : (
					<div
						className="grid gap-6"
						style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
					>
						{products.map((product) => (
							<ProductCard
								key={product.id}
								product={product}
								onToggleInterest={() => toggleInterest.mutate(product.productId)}
							/>
						))}
					</div>
				)}
			</div>

			{/* Sticky "Ready to Discuss" bar */}
			<div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
				<div className="max-w-5xl mx-auto px-4 py-4">
					{isReady ? (
						<div className="flex items-center justify-center gap-2 text-green-700">
							<CheckCircle className="h-5 w-5" />
							<span className="font-medium">
								Thanks! Your memorial mason will be in touch soon.
							</span>
						</div>
					) : (
						<Button
							className="w-full sm:w-auto sm:mx-auto sm:flex"
							size="lg"
							onClick={() => readyMutation.mutate()}
							disabled={readyMutation.isPending}
						>
							{readyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							<MessageSquare className="h-4 w-4 mr-2" />
							I'm Ready to Discuss
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

function ProductCard({
	product,
	onToggleInterest,
}: {
	product: PublicBrochureProduct;
	onToggleInterest: () => void;
}) {
	return (
		<Card className="overflow-hidden">
			{/* Product image */}
			{product.productImageUrl ? (
				<img
					src={product.productImageUrl}
					alt={product.productName}
					className="w-full h-48 object-cover"
				/>
			) : (
				<div className="w-full h-48 bg-muted flex items-center justify-center">
					<span className="text-muted-foreground text-sm">No image</span>
				</div>
			)}

			<CardContent className="pt-4">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold text-base truncate">{product.productName}</h3>
						{product.categoryName && (
							<p className="text-sm text-muted-foreground">{product.categoryName}</p>
						)}
					</div>
					<button
						type="button"
						onClick={onToggleInterest}
						className="shrink-0 p-2 rounded-full hover:bg-muted transition-colors touch-manipulation"
						aria-label={product.isInterested ? 'Remove from interested' : 'Mark as interested'}
					>
						<Heart
							className={`h-6 w-6 transition-colors ${
								product.isInterested ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
							}`}
						/>
					</button>
				</div>
				{product.productDescription && (
					<p className="text-sm text-muted-foreground mt-2 line-clamp-3">
						{product.productDescription}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
