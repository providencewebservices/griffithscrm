import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	AlertCircle,
	Bookmark,
	CheckCircle,
	ImageIcon,
	Loader2,
	Mail,
	MessageSquare,
	Phone,
} from 'lucide-react';
import { useParams } from 'react-router';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
	tenant: {
		id: string;
		name: string;
		hasLogo: boolean;
		phone: string | null;
		email: string | null;
		website: string | null;
	} | null;
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
			<div className="min-h-screen bg-stone-50">
				<div className="bg-background border-b">
					<div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
						<div className="flex flex-col items-center text-center">
							<Skeleton className="h-20 w-48 sm:h-28 sm:w-64 rounded" />
						</div>
					</div>
				</div>
				<div className="max-w-5xl mx-auto px-4 py-8">
					<Skeleton className="h-5 w-80 mb-8" />
					<div
						className="grid gap-6"
						style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
					>
						{[1, 2, 3, 4].map((i) => (
							<Card key={i}>
								<Skeleton className="aspect-[4/3] w-full rounded-t-lg rounded-b-none" />
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
			<div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
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
			<div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
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
	const interestedProducts = products.filter((p) => p.isInterested);
	const interestedCount = interestedProducts.length;

	return (
		<div className="min-h-screen bg-stone-50 pb-24">
			{/* Header */}
			<div className="bg-background border-b">
				<div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
					<div className="flex flex-col items-center text-center">
						{tenant?.hasLogo ? (
							<img
								src={`${API_URL}/api/logo/${tenant.id}`}
								alt={tenant.name}
								className="h-20 sm:h-28 max-w-[320px] object-contain"
							/>
						) : (
							<h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{tenant?.name || 'Memorial Selections'}</h1>
						)}
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-5xl mx-auto px-4 py-8">
				{/* Staff message */}
				{brochure.message && <CollapsibleMessage message={brochure.message} tenantName={tenant?.name} />}

				{/* Orientation text */}
				<p className="text-base text-muted-foreground mb-8">
					Browse the selections below. Bookmark any you'd like to discuss, then let us know when
					you're ready to talk.
				</p>

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
			<div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-10">
				<div className="max-w-5xl mx-auto px-4 py-4">
					{isReady ? (
						<div className="text-center space-y-3">
							<div className="flex items-center justify-center gap-2 text-green-700">
								<CheckCircle className="h-5 w-5" />
								<span className="font-medium">
									Thank you. {tenant?.name || 'Your memorial mason'} will be in touch soon.
								</span>
							</div>
							{(tenant?.phone || tenant?.email) && (
								<div className="flex items-center justify-center gap-5 text-sm">
									{tenant?.phone && (
										<a
											href={`tel:${tenant.phone}`}
											className="inline-flex items-center gap-2 font-medium hover:text-primary transition-colors"
										>
											<Phone className="h-4 w-4" />
											{tenant.phone}
										</a>
									)}
									{tenant?.email && (
										<a
											href={`mailto:${tenant.email}`}
											className="inline-flex items-center gap-2 font-medium hover:text-primary transition-colors"
										>
											<Mail className="h-4 w-4" />
											{tenant.email}
										</a>
									)}
								</div>
							)}
						</div>
					) : (
						<div className="flex items-center justify-center">
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button size="lg" className="w-full sm:w-auto">
										<MessageSquare className="h-4 w-4 mr-2" />
										I'm Ready to Discuss
										{interestedCount > 0 && (
											<Badge variant="secondary" className="ml-2">
												{interestedCount}
											</Badge>
										)}
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Ready to discuss?</AlertDialogTitle>
										<AlertDialogDescription asChild>
											<div>
												{interestedCount > 0 ? (
													<>
														You've bookmarked {interestedCount}{' '}
														{interestedCount === 1 ? 'memorial' : 'memorials'}:
														<ul className="mt-2 space-y-1">
															{interestedProducts.map((p) => (
																<li
																	key={p.id}
																	className="flex items-center gap-2"
																>
																	<Bookmark className="h-3 w-3 fill-primary text-primary shrink-0" />
																	{p.productName}
																</li>
															))}
														</ul>
													</>
												) : (
													"You haven't bookmarked any memorials yet, but you can still let your mason know you're ready to talk."
												)}
											</div>
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Go Back</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => readyMutation.mutate()}
											disabled={readyMutation.isPending}
										>
											{readyMutation.isPending && (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											)}
											Yes, I'm Ready
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function CollapsibleMessage({ message, tenantName }: { message: string; tenantName?: string }) {
	const [expanded, setExpanded] = useState(false);
	const [clamped, setClamped] = useState(false);
	const textRef = useRef<HTMLParagraphElement>(null);

	// Check if text is actually clamped after first render
	const checkClamped = (el: HTMLParagraphElement | null) => {
		textRef.current = el;
		if (el) {
			setClamped(el.scrollHeight > el.clientHeight);
		}
	};

	return (
		<div className="bg-background border border-border rounded-lg p-5 sm:p-6 mb-6">
			{tenantName && (
				<p className="text-sm font-medium text-muted-foreground mb-2">
					A note from {tenantName}
				</p>
			)}
			<p
				ref={checkClamped}
				className={`text-foreground whitespace-pre-wrap leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}
			>
				{message}
			</p>
			{clamped && (
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="text-sm text-muted-foreground hover:text-foreground mt-2 transition-colors"
				>
					{expanded ? 'Show less' : 'Read more'}
				</button>
			)}
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
		<Card
			className={`overflow-hidden transition-all duration-200 ${
				product.isInterested
					? 'ring-2 ring-primary/30 shadow-md'
					: ''
			}`}
		>
			{/* Product image */}
			{product.productImageUrl ? (
				<div className="w-full aspect-[4/3] bg-stone-100 flex items-center justify-center">
					<img
						src={product.productImageUrl}
						alt={product.productName}
						className="max-w-full max-h-full object-contain"
					/>
				</div>
			) : (
				<div className="w-full aspect-[4/3] bg-stone-100 flex items-center justify-center">
					<ImageIcon className="h-10 w-10 text-muted-foreground/40" />
				</div>
			)}

			<CardContent className="pt-4">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold text-base">{product.productName}</h3>
						{product.categoryName && (
							<p className="text-sm text-muted-foreground">{product.categoryName}</p>
						)}
					</div>
					<button
						type="button"
						onClick={onToggleInterest}
						className={`shrink-0 p-2 rounded-full transition-all duration-200 touch-manipulation ${
							product.isInterested
								? 'bg-primary/10 hover:bg-primary/20'
								: 'hover:bg-muted'
						}`}
						aria-label={product.isInterested ? 'Remove bookmark' : 'Bookmark this memorial'}
					>
						<Bookmark
							className={`h-6 w-6 transition-all duration-200 ${
								product.isInterested
									? 'fill-primary text-primary scale-110'
									: 'text-muted-foreground'
							}`}
						/>
					</button>
				</div>
				{product.productDescription && (
					<p className="text-sm text-muted-foreground/80 mt-2 line-clamp-2">
						{product.productDescription}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
