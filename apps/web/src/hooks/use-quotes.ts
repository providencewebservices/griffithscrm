import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	QUOTE_STATUSES,
	QUOTE_TYPES,
	COMPONENT_TYPES,
	FLOWER_HOLE_CHOICES,
} from '@griffiths-crm/shared/db/schema';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type QuoteType = (typeof QUOTE_TYPES)[number];
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
	markupPercent: string;
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
	markupPercent: string;
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
	markupPercent: string;
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
	vatExempt: boolean;
	visibleToCustomer: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
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

export type QuoteFuneralDirector = {
	id: string;
	name: string;
};

export type QuoteCouncil = {
	id: string;
	name: string;
};

export type QuoteMemorialSite = {
	id: string;
	name: string;
};

// Quote Option - represents a single quote within a package
export type QuoteOption = {
	id: string;
	packageId: string;
	quoteNumber: string;
	optionLabel: string | null;
	optionOrder: number;
	productId: string | null;
	dimensionComboId: string | null;
	flowerHoles: FlowerHoleChoice | null;
	subtotal: string;
	vatAmount: string;
	total: string;
	totalCost: string;
	vatRate: string;
	product: QuoteProduct | null;
	components: QuoteComponent[];
	lettering: QuoteLettering[];
	sundries: QuoteSundry[];
	lineItems: QuoteLineItem[];
	createdAt: string;
	updatedAt: string;
};

// Quote Package - container for quote options with shared context
export type QuotePackage = {
	id: string;
	tenantId: string;
	status: QuoteStatus;
	quoteType: QuoteType;
	customerId: string | null;
	funeralDirectorId: string | null;
	councilId: string | null;
	memorialSiteId: string | null;
	source: string | null;
	notes: string | null;
	internalNotes: string | null;
	proposedInscription: string | null;
	existingMemorialDescription: string | null;
	relatedJobId: string | null;
	validUntil: string | null;
	accessToken: string | null;
	accessTokenCreatedAt: string | null;
	emailSentAt: string | null;
	emailSentCount: number;
	customerFeedback: string | null;
	customerFeedbackAt: string | null;
	acceptedOptionId: string | null;
	customerDecisionAt: string | null;
	createdAt: string;
	updatedAt: string;
};

// List item - package summary for quotes list
export type QuotePackageListItem = {
	id: string;
	tenantId: string;
	status: QuoteStatus;
	quoteType: QuoteType;
	customerId: string | null;
	customerFirstName: string | null;
	customerLastName: string | null;
	notes: string | null;
	validUntil: string | null;
	createdAt: string;
	updatedAt: string;
	optionCount: number;
	priceRange: {
		minPrice: string;
		maxPrice: string;
	};
	firstQuoteNumber: string;
	acceptedOptionId: string | null;
};

// Full package with all options and related data
export type QuotePackageWithOptions = QuotePackage & {
	customer: QuoteCustomer | null;
	funeralDirector: QuoteFuneralDirector | null;
	council: QuoteCouncil | null;
	memorialSite: QuoteMemorialSite | null;
	options: QuoteOption[];
};

// Input types for creating/updating
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

// Create quote - creates package with first option
export type CreateQuoteInput = {
	// Package-level fields (shared context)
	quoteType?: QuoteType;
	customerId?: string;
	funeralDirectorId?: string;
	councilId?: string;
	memorialSiteId?: string;
	source?: string;
	proposedInscription?: string;
	existingMemorialDescription?: string;
	relatedJobId?: string;
	notes?: string;
	internalNotes?: string;
	validUntil?: string;
	customerDetails?: CustomerDetailsInput;
	// First option fields
	productId?: string;
	dimensionComboId?: string;
	flowerHoles?: FlowerHoleChoice;
	components?: ComponentInput[];
	lettering?: LetteringInput[];
	sundries?: SundryInput[];
};

// Add option to existing package
export type AddOptionInput = {
	packageId: string;
	optionLabel?: string;
	copyFromOptionId?: string;
	productId?: string;
	dimensionComboId?: string;
	flowerHoles?: FlowerHoleChoice;
	components?: ComponentInput[];
	lettering?: LetteringInput[];
	sundries?: SundryInput[];
};

export type QuoteSearchParams = {
	status?: QuoteStatus;
	quoteType?: QuoteType;
	customerId?: string;
	search?: string;
};

// Response types
type PackagesResponse = {
	packages: QuotePackageListItem[];
};

type PackageResponse = {
	package: QuotePackageWithOptions;
};

// Fetch functions
async function fetchQuotes(params?: QuoteSearchParams): Promise<QuotePackageListItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.status) searchParams.set('status', params.status);
	if (params?.quoteType) searchParams.set('quoteType', params.quoteType);
	if (params?.customerId) searchParams.set('customerId', params.customerId);
	if (params?.search) searchParams.set('search', params.search);

	const url = `${API_URL}/api/quotes${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

	const response = await fetch(url, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch quotes');
	}

	const data: PackagesResponse = await response.json();
	return data.packages;
}

async function fetchQuote(id: string): Promise<QuotePackageWithOptions> {
	const response = await fetch(`${API_URL}/api/quotes/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch quote');
	}

	const data: PackageResponse = await response.json();
	return data.package;
}

async function createQuote(input: CreateQuoteInput): Promise<QuotePackageWithOptions> {
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

	const data: PackageResponse = await response.json();
	return data.package;
}

async function addOption({ packageId, ...input }: AddOptionInput): Promise<QuotePackageWithOptions> {
	const response = await fetch(`${API_URL}/api/quotes/${packageId}/options`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to add option');
	}

	const data: PackageResponse = await response.json();
	return data.package;
}

async function cloneOption({
	packageId,
	optionId,
	optionLabel,
}: {
	packageId: string;
	optionId: string;
	optionLabel?: string;
}): Promise<QuotePackageWithOptions> {
	const response = await fetch(`${API_URL}/api/quotes/${packageId}/options/${optionId}/clone`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ optionLabel }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to clone option');
	}

	const data: PackageResponse = await response.json();
	return data.package;
}

async function deleteOption({
	packageId,
	optionId,
}: {
	packageId: string;
	optionId: string;
}): Promise<QuotePackageWithOptions> {
	const response = await fetch(`${API_URL}/api/quotes/${packageId}/options/${optionId}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete option');
	}

	const data: PackageResponse = await response.json();
	return data.package;
}

async function updateQuoteStatus({
	id,
	status,
}: {
	id: string;
	status: QuoteStatus;
}): Promise<QuotePackageWithOptions> {
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

	const data: PackageResponse = await response.json();
	return data.package;
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

async function acceptOption({
	packageId,
	optionId,
}: {
	packageId: string;
	optionId: string;
}): Promise<{ package: QuotePackageWithOptions; jobId: string; jobNumber: string }> {
	const response = await fetch(`${API_URL}/api/quotes/${packageId}/accept/${optionId}`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to accept option');
	}

	return response.json();
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

export function useAddOptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: addOption,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.id], data);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

export function useCloneOptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cloneOption,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.id], data);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

export function useDeleteOptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteOption,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.id], data);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
		},
	});
}

export function useUpdateQuoteStatusMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateQuoteStatus,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.id], data);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
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

export function useAcceptOptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: acceptOption,
		onSuccess: (data) => {
			queryClient.setQueryData(['quote', data.package.id], data.package);
			queryClient.invalidateQueries({ queryKey: ['quotes'] });
			queryClient.invalidateQueries({ queryKey: ['jobs'] });
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

// Line item pricing update types - now include packageId and optionId
type UpdateLineItemPricingInput = {
	packageId: string;
	optionId: string;
	itemId: string;
	supplierCost?: number;
	markupPercent?: number;
	quantity?: number;
};

// Custom line item types
export type LineItemInput = {
	description: string;
	price: number;
	vatExempt?: boolean;
	visibleToCustomer?: boolean;
};

export type AddLineItemInput = {
	packageId: string;
	optionId: string;
	description: string;
	price: number;
	vatExempt?: boolean;
	visibleToCustomer?: boolean;
};

export type UpdateLineItemInput = {
	packageId: string;
	optionId: string;
	itemId: string;
	description?: string;
	price?: number;
	vatExempt?: boolean;
	visibleToCustomer?: boolean;
};

export type DeleteLineItemInput = {
	packageId: string;
	optionId: string;
	itemId: string;
};

// Line item update functions
async function updateComponentPricing({
	packageId,
	optionId,
	itemId,
	...input
}: UpdateLineItemPricingInput): Promise<QuotePackageWithOptions> {
	const response = await fetch(
		`${API_URL}/api/quotes/${packageId}/options/${optionId}/components/${itemId}`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(input),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update component pricing');
	}

	const data: PackageResponse = await response.json();
	return data.package;
}

async function updateLetteringPricing({
	packageId,
	optionId,
	itemId,
	...input
}: UpdateLineItemPricingInput): Promise<QuotePackageWithOptions> {
	const response = await fetch(
		`${API_URL}/api/quotes/${packageId}/options/${optionId}/lettering/${itemId}`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(input),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update lettering pricing');
	}

	const data: PackageResponse = await response.json();
	return data.package;
}

async function updateSundryPricing({
	packageId,
	optionId,
	itemId,
	...input
}: UpdateLineItemPricingInput): Promise<QuotePackageWithOptions> {
	const response = await fetch(
		`${API_URL}/api/quotes/${packageId}/options/${optionId}/sundries/${itemId}`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(input),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update sundry pricing');
	}

	const data: PackageResponse = await response.json();
	return data.package;
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
	packageId,
	optionId,
	description,
	price,
	vatExempt,
	visibleToCustomer,
}: AddLineItemInput): Promise<QuotePackageWithOptions> {
	const response = await fetch(`${API_URL}/api/quotes/${packageId}/options/${optionId}/line-items`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ description, price, vatExempt, visibleToCustomer }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to add line item');
	}

	const data: PackageResponse = await response.json();
	return data.package;
}

async function updateLineItem({
	packageId,
	optionId,
	itemId,
	description,
	price,
	vatExempt,
	visibleToCustomer,
}: UpdateLineItemInput): Promise<QuotePackageWithOptions> {
	const response = await fetch(
		`${API_URL}/api/quotes/${packageId}/options/${optionId}/line-items/${itemId}`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ description, price, vatExempt, visibleToCustomer }),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update line item');
	}

	const data: PackageResponse = await response.json();
	return data.package;
}

async function deleteLineItem({
	packageId,
	optionId,
	itemId,
}: DeleteLineItemInput): Promise<QuotePackageWithOptions> {
	const response = await fetch(
		`${API_URL}/api/quotes/${packageId}/options/${optionId}/line-items/${itemId}`,
		{
			method: 'DELETE',
			credentials: 'include',
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete line item');
	}

	const data: PackageResponse = await response.json();
	return data.package;
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

// Quote type labels and helpers
export const QUOTE_TYPE_LABELS: Record<QuoteType, string> = {
	new_memorial: 'New Memorial',
	additional_inscription: 'Additional Inscription',
	refurbishment: 'Refurbishment',
	ashes: 'Ashes',
	sundry_only: 'Sundry Only',
};

export const QUOTE_TYPE_DESCRIPTIONS: Record<QuoteType, string> = {
	new_memorial: 'Full memorial installation',
	additional_inscription: 'Add text to existing memorial',
	refurbishment: 'Clean or restore existing memorial',
	ashes: 'Ashes interment with marker',
	sundry_only: 'Accessories only',
};

export function formatQuoteType(type: QuoteType): string {
	return QUOTE_TYPE_LABELS[type] || type;
}

export function getQuoteTypeVariant(
	type: QuoteType
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (type) {
		case 'new_memorial':
			return 'default';
		case 'additional_inscription':
			return 'secondary';
		case 'refurbishment':
			return 'outline';
		case 'ashes':
			return 'secondary';
		case 'sundry_only':
			return 'outline';
		default:
			return 'secondary';
	}
}

// Section visibility configuration based on quote type
export const QUOTE_TYPE_SECTION_CONFIG: Record<
	QuoteType,
	{
		showProductSelection: boolean;
		showComponents: boolean;
		showFlowerHoles: boolean;
		showProposedInscription: boolean;
		showLettering: boolean;
		showSundries: boolean;
		showExistingMemorial: boolean;
		showRelatedJob: boolean;
	}
> = {
	new_memorial: {
		showProductSelection: true,
		showComponents: true,
		showFlowerHoles: true,
		showProposedInscription: true,
		showLettering: true,
		showSundries: true,
		showExistingMemorial: false,
		showRelatedJob: false,
	},
	additional_inscription: {
		showProductSelection: false,
		showComponents: false,
		showFlowerHoles: false,
		showProposedInscription: true,
		showLettering: true,
		showSundries: true,
		showExistingMemorial: true,
		showRelatedJob: true,
	},
	refurbishment: {
		showProductSelection: false,
		showComponents: false,
		showFlowerHoles: false,
		showProposedInscription: false,
		showLettering: true,
		showSundries: true,
		showExistingMemorial: true,
		showRelatedJob: true,
	},
	ashes: {
		showProductSelection: true,
		showComponents: true,
		showFlowerHoles: false,
		showProposedInscription: true,
		showLettering: true,
		showSundries: true,
		showExistingMemorial: false,
		showRelatedJob: false,
	},
	sundry_only: {
		showProductSelection: false,
		showComponents: false,
		showFlowerHoles: false,
		showProposedInscription: false,
		showLettering: false,
		showSundries: true,
		showExistingMemorial: false,
		showRelatedJob: false,
	},
};

// Helper to format price range for display
export function formatPriceRange(priceRange: { minPrice: string; maxPrice: string } | undefined | null): string {
	if (!priceRange) {
		return '£0.00';
	}
	const min = parseFloat(priceRange.minPrice);
	const max = parseFloat(priceRange.maxPrice);

	if (min === max) {
		return `£${min.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	return `£${min.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - £${max.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to format quote number with option count
export function formatQuoteNumberWithOptions(
	firstQuoteNumber: string,
	optionCount: number
): string {
	if (optionCount <= 1) {
		return firstQuoteNumber;
	}
	return `${firstQuoteNumber} (+${optionCount - 1})`;
}

// Re-export for convenience
export { FLOWER_HOLE_CHOICES, QUOTE_TYPES };
