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
			const res = await fetch(
				`${API_URL}/api/public/brochures/${token}/interest/${productId}`,
				{ method: 'POST' },
			);
			if (!res.ok) throw new Error('Failed to toggle interest');
			return res.json();
		},
		onMutate: async (productId) => {
			await queryClient.cancelQueries({ queryKey: ['public-brochure', token] });
			const previous = queryClient.getQueryData<PublicBrochureData>([
				'public-brochure',
				token,
			]);
			queryClient.setQueryData<PublicBrochureData>(
				['public-brochure', token],
				(old) => {
					if (!old) return old;
					return {
						...old,
						products: old.products.map((p) =>
							p.productId === productId
								? { ...p, isInterested: !p.isInterested }
								: p,
						),
					};
				},
			);
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
			queryClient.setQueryData<PublicBrochureData>(
				['public-brochure', token],
				(old) => {
					if (!old) return old;
					return {
						...old,
						brochure: {
							...old.brochure,
							readyToDiscussAt: new Date().toISOString(),
						},
					};
				},
			);
		},
	});

	if (isLoading) {
		return (
			<div className="min-h-dvh bg-white">
				<div className="py-14 sm:py-20">
					<div className="max-w-5xl mx-auto px-6 text-center">
						<Skeleton className="h-20 w-48 sm:h-24 sm:w-64 rounded mx-auto" />
						<Skeleton className="h-5 w-80 mt-4 mx-auto" />
					</div>
				</div>
				<div className="max-w-5xl mx-auto px-6">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<div key={i}>
								<Skeleton className="aspect-[3/4] w-full rounded-xl" />
								<div className="mt-3 space-y-1.5">
									<Skeleton className="h-5 w-3/4" />
									<Skeleton className="h-4 w-1/2" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (error instanceof Error && error.message === 'expired') {
		return (
			<div className="min-h-dvh bg-white flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-yellow-700">
							<AlertCircle className="size-5" />
							Brochure Expired
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-pretty">
							This brochure has expired. Please contact your memorial mason
							directly for up-to-date options.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="min-h-dvh bg-white flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<AlertCircle className="size-5" />
							Unable to Load
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-pretty">
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
		<div className="min-h-dvh bg-white pb-24">
			{/* Header */}
			<div className="py-14 sm:py-20">
				<div className="max-w-5xl mx-auto px-6 text-center">
					{tenant?.hasLogo ? (
						<img
							src={`${API_URL}/api/logo/${tenant.id}`}
							alt={tenant.name}
							className="h-20 sm:h-24 max-w-[280px] object-contain mx-auto"
						/>
					) : (
						<h1 className="text-4xl sm:text-5xl text-balance">
							{tenant?.name || 'Memorial Selections'}
						</h1>
					)}
					<p className="text-lg sm:text-base text-muted-foreground mt-4 text-pretty max-w-[50ch] mx-auto">
						Browse the selections below. Bookmark any you'd like to discuss.
					</p>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-5xl mx-auto px-6">
				{brochure.message && (
					<CollapsibleMessage
						message={brochure.message}
						tenantName={tenant?.name}
					/>
				)}

				{products.length === 0 ? (
					<p className="text-center text-muted-foreground py-16 text-pretty">
						This brochure is being prepared — check back soon.
					</p>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{products.map((product) => (
							<div key={product.id} className="group relative">
								{product.productImageUrl ? (
									<div className="aspect-[3/4] rounded-xl bg-stone-50 overflow-hidden outline-1 -outline-offset-1 outline-black/5">
										<img
											src={product.productImageUrl}
											alt=""
											className="size-full object-cover"
										/>
									</div>
								) : (
									<div className="aspect-[3/4] rounded-xl bg-stone-50 flex items-center justify-center outline-1 -outline-offset-1 outline-black/5">
										<ImageIcon className="size-14 text-muted-foreground/20" />
									</div>
								)}

								<button
									type="button"
									onClick={() =>
										toggleInterest.mutate(product.productId)
									}
									className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-sm transition-all duration-200 touch-manipulation ${
										product.isInterested
											? 'bg-primary text-primary-foreground shadow-md'
											: 'bg-white/80 text-foreground/60 hover:bg-white hover:text-foreground shadow-sm'
									}`}
									aria-label={
										product.isInterested
											? 'Remove bookmark'
											: 'Bookmark this memorial'
									}
								>
									<Bookmark
										className={`size-5 ${product.isInterested ? 'fill-current' : ''}`}
									/>
									<span
										className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-x-1/2 -translate-y-1/2 pointer-fine:hidden"
										aria-hidden="true"
									/>
								</button>

								<div className="mt-3 mb-2">
									<h3 className="text-lg sm:text-base font-semibold tracking-tight">
										{product.productName}
									</h3>
									{product.categoryName && (
										<p className="text-base sm:text-sm text-muted-foreground mt-0.5">
											{product.categoryName}
										</p>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Sticky bottom bar */}
			<div className="fixed bottom-0 left-0 right-0 z-10 bg-[#1b294b] text-white shadow-2xl">
				<div className="max-w-5xl mx-auto px-4 py-4">
					{isReady ? (
						<div className="text-center space-y-3">
							<div className="flex items-center justify-center gap-2 text-emerald-300">
								<CheckCircle className="size-5" />
								<span className="font-medium text-base sm:text-sm">
									Thank you. {tenant?.name || 'Your memorial mason'} will
									be in touch soon.
								</span>
							</div>
							{(tenant?.phone || tenant?.email) && (
								<div className="flex items-center justify-center gap-5 text-base sm:text-sm">
									{tenant?.phone && (
										<a
											href={`tel:${tenant.phone}`}
											className="inline-flex items-center gap-2 font-medium hover:opacity-80 transition-opacity"
										>
											<Phone className="size-4" />
											{tenant.phone}
										</a>
									)}
									{tenant?.email && (
										<a
											href={`mailto:${tenant.email}`}
											className="inline-flex items-center gap-2 font-medium hover:opacity-80 transition-opacity"
										>
											<Mail className="size-4" />
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
									<Button
										size="lg"
										className="w-full sm:w-auto bg-white text-[#1b294b] hover:bg-white/90"
									>
										<MessageSquare className="size-4 mr-2" />
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
										<AlertDialogTitle>
											Ready to discuss?
										</AlertDialogTitle>
										<AlertDialogDescription asChild>
											<div>
												{interestedCount > 0 ? (
													<>
														You've bookmarked{' '}
														{interestedCount}{' '}
														{interestedCount === 1
															? 'memorial'
															: 'memorials'}
														:
														<ul
															className="mt-2 space-y-1"
															role="list"
														>
															{interestedProducts.map(
																(p) => (
																	<li
																		key={p.id}
																		className="flex items-center gap-2"
																	>
																		<Bookmark className="size-3 fill-primary text-primary shrink-0" />
																		{p.productName}
																	</li>
																),
															)}
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
												<Loader2 className="size-4 mr-2 animate-spin" />
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

function CollapsibleMessage({
	message,
	tenantName,
}: {
	message: string;
	tenantName?: string;
}) {
	const [expanded, setExpanded] = useState(false);
	const [clamped, setClamped] = useState(false);
	const textRef = useRef<HTMLParagraphElement>(null);

	const checkClamped = (el: HTMLParagraphElement | null) => {
		textRef.current = el;
		if (el) {
			setClamped(el.scrollHeight > el.clientHeight);
		}
	};

	return (
		<div className="border border-black/10 rounded-xl p-5 sm:p-6 mb-6">
			{tenantName && (
				<p className="text-base sm:text-sm font-medium text-muted-foreground mb-2">
					A note from {tenantName}
				</p>
			)}
			<p
				ref={checkClamped}
				className={`text-foreground whitespace-pre-wrap text-pretty ${
					!expanded ? 'line-clamp-3' : ''
				}`}
			>
				{message}
			</p>
			{clamped && (
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="text-base sm:text-sm text-muted-foreground hover:text-foreground mt-2 transition-colors"
				>
					{expanded ? 'Show less' : 'Read more'}
				</button>
			)}
		</div>
	);
}
