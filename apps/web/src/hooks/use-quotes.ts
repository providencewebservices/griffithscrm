import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	QUOTE_STATUSES,
	COMPONENT_TYPES,
	FLOWER_HOLE_CHOICES,
} from '@griffiths-crm/shared/db/schema';

const API_URL = 'http://localhost:3000';

// Types
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type ComponentType = (typeof COMPONENT_TYPES)[number];
export type FlowerHoleChoice = (typeof FLOWER_HOLE_CHOICES)[number];

export type QuoteComponent = {
	id: string;
	quoteId: string;
	componentType: ComponentType;
	materialId: string | null;
	finishId: string | null;
	height: string | null;
	width: string | null;
	depth: string | null;
	quantity: number;
	supplierCost: string;
	multiplier: string;
	unitPrice: string;
	lineTotal: string;
	materialName: string | null;
	finishName: string | null;
	notes: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type QuoteLettering = {
	id: string;
	quoteId: string;
	techniqueId: string | null;
	colorId: string | null;
	text: string | null;
	letterCount: number;
	appliesTo: string | null;
	supplierCost: string;
	multiplier: string;
	unitPrice: string;
	lineTotal: string;
	techniqueName: string | null;
	colorName: string | null;
	notes: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type QuoteSundry = {
	id: string;
	quoteId: string;
	sundryId: string | null;
	quantity: number;
	supplierCost: string;
	multiplier: string;
	unitPrice: string;
	lineTotal: string;
	sundryName: string | null;
	notes: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type QuoteLineItem = {
	id: string;
	quoteId: string;
	description: string;
	price: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type QuoteServiceInfo = {
	id: string;
	name: string;
	description: string | null;
	pricingType: string;
};

export type QuoteCustomer = {
	id: string;
	firstName: string;
	lastName: string;
};

export type QuoteProduct = {
	id: string;
	name: string;
	sku: string;
};

export type QuoteVersion = {
	id: string;
	version: number;
	status: QuoteStatus;
	total: string;
	createdAt: string;
};

export type Quote = {
	id: string;
	tenantId: string;
	parentQuoteId: string | null;
	version: number;
	serviceId: string | null;
	customerId: string | null;
	productId: string | null;
	dimensionComboId: string | null;
	quoteNumber: string;
	status: QuoteStatus;
	subtotal: string;
	vatAmount: string;
	total: string;
	totalCost: string;
	vatRate: string;
	notes: string | null;
	internalNotes: string | null;
	flowerHoles: FlowerHoleChoice | null;
	proposedInscription: string | null;
	validUntil: string | null;
	createdAt: string;
	updatedAt: string;
	// Customer email notification fields
	accessToken: string | null;
	accessTokenCreatedAt: string | null;
	customerFeedback: string | null;
	customerFeedbackAt: string | null;
	customerDecision: 'accepted' | 'rejected' | null;
	customerDecisionAt: string | null;
	emailSentAt: string | null;
	emailSentCount: number;
};

export type QuoteListItem = Quote & {
	customerFirstName: string | null;
	customerLastName: string | null;
	customerName: string | null;
};

export type QuoteWithLineItems = Quote & {
	customer: QuoteCustomer | null;
	product: QuoteProduct | null;
	service: QuoteServiceInfo | null;
	components: QuoteComponent[];
	lettering: QuoteLettering[];
	sundries: QuoteSundry[];
	lineItems: QuoteLineItem[];
	versions: QuoteVersion[];
};

// Input types for creating/revising quotes
export type ComponentInput = {
	componentType: ComponentType;
	materialId: string;
	finishId?: string;
	height?: number;
	width?: number;
	depth?: number;
	quantity?: number;
	notes?: string;
};

export type LetteringInput = {
	techniqueId: string;
	colorId?: string;
	text: string;
	appliesTo?: 'new_memorial' | 'refurbishment' | 'both';
	notes?: string;
};

export type SundryInput = {
	sundryId: string;
	quantity?: number;
	notes?: string;
};

export type CustomerDetailsInput = {
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	address?: {
		line1: string;
		line2?: string;
		city: string;
		county?: string;
		postcode: string;
		country?: string;
	};
};

export type CreateQuoteInput = {
	serviceId: string;
	customerId?: string;
	productId?: string;
	dimensionComboId?: string;
	flowerHoles?: FlowerHoleChoice;
	proposedInscription?: string;
	notes?: string;
	internalNotes?: string;
	validUntil?: string;
	components?: ComponentInput[];
	lettering?: LetteringInput[];
	sundries?: SundryInput[];
	customerDetails?: CustomerDetailsInput;
};

export type QuoteSearchParams = {
	status?: QuoteStatus;
	customerId?: string;
	search?: string;
	latestOnly?: boolean;
};

// Response types
type QuotesResponse = {
	quotes: QuoteListItem[];
};

type QuoteResponse = {
	quote: QuoteWithLineItems;
};

// Fetch functions
async function fetchQuotes(params?: QuoteSearchParams): Promise<QuoteListItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.status) searchParams.set('status', params.status);
	if (params?.customerId) searchParams.set('customerId', params.customerId);
	if (params?.search) searchParams.set('search', params.search);
	if (params?.latestOnly !== undefined) {
		searchParams.set('latestOnly', params.latestOnly ? 'true' : 'false');
	}

	const url = `${API_URL}/api/quotes${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

	const response = await fetch(url, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch quotes');
	}

	const data: QuotesResponse = await response.json();
	return data.quotes;
}

async function fetchQuote(id: string): Promise<QuoteWithLineItems> {
	const response = await fetch(`${API_URL}/api/quotes/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch quote');
	}

	const data: QuoteResponse = await response.json();
	return data.quote;
}

async function createQuote(input: CreateQuoteInput): Promise<QuoteWithLineItems> {
	const response = await fetch(`${API_URL}/api/quotes`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create quote');
	}

	const data: QuoteResponse = await response.json();
	return data.quote;
}

async function reviseQuote({
	id,
	...input
}: CreateQuoteInput & { id: string }): Promise<QuoteWithLineItems> {
	const response = await fetch(`${API_URL}/api/quotes/${id}/revise`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to revise quote');
	}

	const data: QuoteResponse = await response.json();
	return data.quote;
}

async function updateQuoteStatus({
	id,
	status,
}: {
	id: string;
	status: QuoteStatus;
}): Promise<Quote> {
	const response = await fetch(`${API_URL}/api/quotes/${id}/status`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ status }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update quote status');
	}

	const data: { quote: Quote } = await response.json();
	return data.quote;
}

async function deleteQuote(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/quotes/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete quote');
	}
}

export type SendQuoteEmailInput = {
	id: string;
	recipientEmail?: string;
	customMessage?: string;
};

export type SendQuoteEmailResponse = {
	success: boolean;
	message: string;
	recipientEmail: string;
	emailSentCount: number;
};

async function sendQuoteEmail({
	id,
	recipientEmail,
	customMessage,
}: SendQuoteEmailInput): Promise<SendQuoteEmailResponse> {
	const response = await fetch(`${API_URL}/api/quotes/${id}/send-email`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ recipientEmail, customMessage }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to send quote email');
	}

	return response.json();
}

// React Query hooks
export function useQuotesQuery(params?: QuoteSearchParams) {
	return useQuery({
		queryKey: ['quotes', params],
		queryFn: () => fetchQuotes(params),
	});
}

export function useQuoteQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['quote', id],
		queryFn: () => fetchQuote(id!),
		enabled: !!id,
	});
}

export function useCreateQuoteMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createQuote,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

export function useReviseQuoteMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: reviseQuote,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
			queryClient.invalidateQueries({ queryKey: ['quote', data.id] });
		},
	});
}

export function useUpdateQuoteStatusMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateQuoteStatus,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
			queryClient.invalidateQueries({ queryKey: ['quote', data.id] });
		},
	});
}

export function useDeleteQuoteMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteQuote,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

export function useSendQuoteEmailMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: sendQuoteEmail,
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['quote', variables.id] });
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

// Line item pricing update types
type UpdateLineItemPricingInput = {
	quoteId: string;
	itemId: string;
	supplierCost?: number;
	multiplier?: number;
	quantity?: number;
};

// Custom line item types
export type LineItemInput = {
	description: string;
	price: number;
};

export type AddLineItemInput = {
	quoteId: string;
	description: string;
	price: number;
};

export type UpdateLineItemInput = {
	quoteId: string;
	itemId: string;
	description?: string;
	price?: number;
};

export type DeleteLineItemInput = {
	quoteId: string;
	itemId: string;
};

// Line item update functions
async function updateComponentPricing({
	quoteId,
	itemId,
	...input
}: UpdateLineItemPricingInput): Promise<QuoteWithLineItems> {
	const response = await fetch(`${API_URL}/api/quotes/${quoteId}/components/${itemId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update component pricing');
	}

	const data: QuoteResponse = await response.json();
	return data.quote;
}

async function updateLetteringPricing({
	quoteId,
	itemId,
	...input
}: UpdateLineItemPricingInput): Promise<QuoteWithLineItems> {
	const response = await fetch(`${API_URL}/api/quotes/${quoteId}/lettering/${itemId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update lettering pricing');
	}

	const data: QuoteResponse = await response.json();
	return data.quote;
}

async function updateSundryPricing({
	quoteId,
	itemId,
	...input
}: UpdateLineItemPricingInput): Promise<QuoteWithLineItems> {
	const response = await fetch(`${API_URL}/api/quotes/${quoteId}/sundries/${itemId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update sundry pricing');
	}

	const data: QuoteResponse = await response.json();
	return data.quote;
}

// Line item pricing mutation hooks
export function useUpdateComponentPricingMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateComponentPricing,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.id], data);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

export function useUpdateLetteringPricingMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateLetteringPricing,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.id], data);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

export function useUpdateSundryPricingMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateSundryPricing,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.id], data);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

// Custom line item CRUD functions
async function addLineItem({
	quoteId,
	description,
	price,
}: AddLineItemInput): Promise<QuoteWithLineItems> {
	const response = await fetch(`${API_URL}/api/quotes/${quoteId}/line-items`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ description, price }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to add line item');
	}

	const data: QuoteResponse = await response.json();
	return data.quote;
}

async function updateLineItem({
	quoteId,
	itemId,
	description,
	price,
}: UpdateLineItemInput): Promise<QuoteWithLineItems> {
	const response = await fetch(`${API_URL}/api/quotes/${quoteId}/line-items/${itemId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ description, price }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update line item');
	}

	const data: QuoteResponse = await response.json();
	return data.quote;
}

async function deleteLineItem({
	quoteId,
	itemId,
}: DeleteLineItemInput): Promise<QuoteWithLineItems> {
	const response = await fetch(`${API_URL}/api/quotes/${quoteId}/line-items/${itemId}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete line item');
	}

	const data: QuoteResponse = await response.json();
	return data.quote;
}

// Custom line item mutation hooks
export function useAddLineItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: addLineItem,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.id], data);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

export function useUpdateLineItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateLineItem,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.id], data);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

export function useDeleteLineItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteLineItem,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.id], data);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

// Helper: Component type groupings for UI
export const COMPONENT_TYPE_GROUPS = {
	Monuments: ['headstone', 'base', 'die', 'desk', 'tablet', 'flat_tablet', 'desk_headstone'],
	Decorative: ['cross', 'heart', 'book', 'vase', 'wing'],
	Structural: ['kerb', 'post', 'column', 'column_cap', 'gate', 'capping_piece'],
	Accessories: ['rest', 'slab', 'candle_box', 'plaque'],
	Other: ['riser', 'filler', 'wedge', 'piece'],
} as const;

// Helper: Format component type for display
export function formatComponentType(type: ComponentType): string {
	return type
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

// Helper: Format status for display
export function formatQuoteStatus(status: QuoteStatus): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

// Helper: Get status color for badges
export function getQuoteStatusVariant(
	status: QuoteStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'draft':
			return 'secondary';
		case 'review':
			return 'outline';
		case 'ready':
			return 'outline';
		case 'presented':
			return 'default';
		case 'accepted':
			return 'default';
		case 'rejected':
			return 'destructive';
		case 'expired':
			return 'secondary';
		default:
			return 'secondary';
	}
}

// Re-export for convenience
export { FLOWER_HOLE_CHOICES };
