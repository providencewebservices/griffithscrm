import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
	useQuoteQuery,
	useCreateQuoteMutation,
	useReviseQuoteMutation,
	formatComponentType,
	COMPONENT_TYPE_GROUPS,
	FLOWER_HOLE_CHOICES,
	QUOTE_TYPES,
	QUOTE_TYPE_LABELS,
	QUOTE_TYPE_DESCRIPTIONS,
	QUOTE_TYPE_SECTION_CONFIG,
	type ComponentInput,
	type LetteringInput,
	type SundryInput,
	type ComponentType,
	type FlowerHoleChoice,
	type QuoteType,
	type CustomerDetailsInput,
} from '@/hooks/use-quotes';
import { useCustomersQuery } from '@/hooks/use-customers';
import { useProductsQuery } from '@/hooks/use-products';
import { useDimensionCombosQuery, useDimensionComboQuery, type DimensionCombo } from '@/hooks/use-dimension-combos';
import { useMaterialSectionsQuery, useMaterialSectionQuery } from '@/hooks/use-material-sections';
import { useMaterialsQuery } from '@/hooks/use-materials';
import { useFinishesQuery } from '@/hooks/use-finishes';
import { useLetteringTechniquesQuery } from '@/hooks/use-lettering-techniques';
import { useLetteringColorsQuery } from '@/hooks/use-lettering-colors';
import { useSundriesQuery } from '@/hooks/use-sundries';
import { useServicesQuery } from '@/hooks/use-services';
import { useJobsQuery, type JobListItem } from '@/hooks/use-jobs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { COMPONENT_TYPES, ENQUIRY_SOURCES } from '@griffiths-crm/shared/db/schema';
import { ArrowLeft, Plus, Trash2, User, Check, ChevronsUpDown, FileText, PlusCircle, RefreshCw, Flower, Package } from 'lucide-react';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Types for form state
type ComponentFormItem = ComponentInput & { id: string };
type LetteringFormItem = LetteringInput & { id: string };
type SundryFormItem = SundryInput & { id: string };
type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

// Human-readable labels for enquiry sources
const ENQUIRY_SOURCE_LABELS: Record<EnquirySource, string> = {
	walk_in: 'Walk-in',
	phone: 'Phone',
	email: 'Email',
	website: 'Website',
	facebook: 'Facebook',
	instagram: 'Instagram',
	whatsapp: 'WhatsApp',
	referral: 'Referral',
	other: 'Other',
};

const NONE_VALUE = '_none';

export function QuoteNewPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const reviseId = searchParams.get('revise');

	// Form state
	const [quoteType, setQuoteType] = useState<QuoteType>('new_memorial');
	const [serviceId, setServiceId] = useState<string>('');
	const [customerId, setCustomerId] = useState<string>('');
	const [customerComboOpen, setCustomerComboOpen] = useState(false);
	const [productId, setProductId] = useState<string>('');
	const [dimensionComboId, setDimensionComboId] = useState<string>('');
	const [stoneColourMaterialId, setStoneColourMaterialId] = useState<string>('');
	const [flowerHoles, setFlowerHoles] = useState<FlowerHoleChoice | ''>('');
	const [source, setSource] = useState<EnquirySource | ''>('');
	const [proposedInscription, setProposedInscription] = useState('');
	const [existingMemorialDescription, setExistingMemorialDescription] = useState('');
	const [relatedJobId, setRelatedJobId] = useState<string>('');
	const [relatedJobComboOpen, setRelatedJobComboOpen] = useState(false);
	const [notes, setNotes] = useState('');
	const [internalNotes, setInternalNotes] = useState('');
	const [validUntil, setValidUntil] = useState('');

	// Customer creation state (for new customers)
	const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
	const [customerDetails, setCustomerDetails] = useState<CustomerDetailsInput>({
		firstName: '',
		lastName: '',
		email: '',
		phone: '',
		address: {
			line1: '',
			line2: '',
			city: '',
			county: '',
			postcode: '',
			country: 'United Kingdom',
		},
	});

	// Line items state
	const [components, setComponents] = useState<ComponentFormItem[]>([]);
	const [lettering, setLettering] = useState<LetteringFormItem[]>([]);
	const [sundries, setSundries] = useState<SundryFormItem[]>([]);

	const [mutationError, setMutationError] = useState<string | null>(null);

	// For loading materials under a section
	const [selectedSectionId, setSelectedSectionId] = useState<string>('');

	// Fetch reference data
	const { data: customers } = useCustomersQuery();
	const { data: productsData } = useProductsQuery({ isActive: 'true' });
	const { data: dimensionCombos } = useDimensionCombosQuery(productId || undefined);
	const { data: selectedCombo } = useDimensionComboQuery(dimensionComboId || undefined);
	const { data: materialSections } = useMaterialSectionsQuery();
	const { data: allMaterials } = useMaterialsQuery();
	const { data: selectedSection } = useMaterialSectionQuery(selectedSectionId || undefined);
	const { data: finishes } = useFinishesQuery();
	const { data: techniques } = useLetteringTechniquesQuery();
	const { data: colors } = useLetteringColorsQuery();
	const { data: sundryItems } = useSundriesQuery();
	const { data: serviceItems } = useServicesQuery();
	// Fetch completed jobs for related job selector (only when needed)
	const sectionConfig = QUOTE_TYPE_SECTION_CONFIG[quoteType];
	const { data: completedJobs } = useJobsQuery(
		sectionConfig?.showRelatedJob ? { status: 'completed' } : undefined
	);

	// Fetch quote to revise if applicable
	const { data: originalQuote, isLoading: isLoadingOriginal } = useQuoteQuery(reviseId || undefined);

	const createMutation = useCreateQuoteMutation();
	const reviseMutation = useReviseQuoteMutation();

	const isRevising = !!reviseId;
	const isLoading = isRevising && isLoadingOriginal;

	// Helper to format dimension combo for display
	const formatDimensionCombo = (combo: DimensionCombo): string => {
		return combo.values
			.map((v) => {
				const label = v.componentName || v.componentType;
				return `${label} ${v.dimension1} x ${v.dimension2} x ${v.dimension3}`;
			})
			.join(', ');
	};

	// Group materials by section for Stone Colour selector
	const materialsGroupedBySection = useMemo(() => {
		if (!materialSections || !allMaterials) return [];
		return materialSections
			.map((section) => ({
				...section,
				materials: allMaterials.filter((m) => m.sectionId === section.id && m.isActive),
			}))
			.filter((section) => section.materials.length > 0);
	}, [materialSections, allMaterials]);

	// Pre-fill form if revising
	useEffect(() => {
		if (originalQuote) {
			setQuoteType(originalQuote.quoteType || 'new_memorial');
			setServiceId(originalQuote.serviceId || '');
			setCustomerId(originalQuote.customerId || '');
			setProductId(originalQuote.productId || '');
			setDimensionComboId(originalQuote.dimensionComboId || '');
			setFlowerHoles(originalQuote.flowerHoles || '');
			setSource((originalQuote.source as EnquirySource) || '');
			setProposedInscription(originalQuote.proposedInscription || '');
			setExistingMemorialDescription(originalQuote.existingMemorialDescription || '');
			setRelatedJobId(originalQuote.relatedJobId || '');
			setNotes(originalQuote.notes || '');
			setInternalNotes(originalQuote.internalNotes || '');
			setValidUntil(originalQuote.validUntil ? originalQuote.validUntil.split('T')[0] : '');

			setComponents(
				originalQuote.components.map((c) => ({
					id: crypto.randomUUID(),
					componentType: c.componentType as ComponentType,
					materialId: c.materialId || '',
					finishId: c.finishId || undefined,
					height: c.height ? parseFloat(c.height) : undefined,
					width: c.width ? parseFloat(c.width) : undefined,
					depth: c.depth ? parseFloat(c.depth) : undefined,
					quantity: c.quantity,
					notes: c.notes || undefined,
				}))
			);

			setLettering(
				originalQuote.lettering.map((l) => ({
					id: crypto.randomUUID(),
					techniqueId: l.techniqueId || '',
					colorId: l.colorId || undefined,
					text: l.text || '',
					notes: l.notes || undefined,
				}))
			);

			setSundries(
				originalQuote.sundries.map((s) => ({
					id: crypto.randomUUID(),
					sundryId: s.sundryId || '',
					quantity: s.quantity,
					notes: s.notes || undefined,
				}))
			);
		}
	}, [originalQuote]);

	// Auto-populate components when dimension combo is selected
	useEffect(() => {
		if (selectedCombo?.values && selectedCombo.values.length > 0) {
			const autoComponents = selectedCombo.values.map((v) => ({
				id: crypto.randomUUID(),
				componentType: v.componentType as ComponentType,
				materialId: stoneColourMaterialId || '',
				height: v.dimension1 ? parseFloat(v.dimension1) : undefined,
				width: v.dimension2 ? parseFloat(v.dimension2) : undefined,
				depth: v.dimension3 ? parseFloat(v.dimension3) : undefined,
				quantity: v.componentQuantity || 1,
			}));
			setComponents(autoComponents);
		}
	}, [selectedCombo]);

	// Update material on all components when Stone Colour changes
	useEffect(() => {
		if (stoneColourMaterialId && dimensionComboId && components.length > 0) {
			setComponents((prevComponents) =>
				prevComponents.map((c) => ({
					...c,
					materialId: stoneColourMaterialId,
				}))
			);
		}
	}, [stoneColourMaterialId, dimensionComboId]);

	// Clear components when switching away from product-based mode
	useEffect(() => {
		if (!dimensionComboId) {
			// Only clear if we had auto-populated components (product-based mode)
			// Check if all components have the same material (sign of auto-population)
			const allSameMaterial = components.every((c) => c.materialId === components[0]?.materialId);
			if (allSameMaterial && components.length > 1) {
				setComponents([]);
			}
		}
	}, [dimensionComboId]);

	// Helper to check if in product-based mode
	const isProductBasedMode = !!dimensionComboId && !!selectedCombo;

	// Helper to generate unique IDs
	const generateId = () => crypto.randomUUID();

	// Add handlers
	const handleAddComponent = () => {
		setComponents([
			...components,
			{
				id: generateId(),
				componentType: 'headstone',
				materialId: '',
				quantity: 1,
			},
		]);
	};

	const handleAddLettering = () => {
		setLettering([
			...lettering,
			{
				id: generateId(),
				techniqueId: '',
				text: '',
			},
		]);
	};

	const handleAddSundry = () => {
		setSundries([
			...sundries,
			{
				id: generateId(),
				sundryId: '',
				quantity: 1,
			},
		]);
	};

	// Update handlers
	const updateComponent = (id: string, updates: Partial<ComponentFormItem>) => {
		setComponents(components.map((c) => (c.id === id ? { ...c, ...updates } : c)));
	};

	const updateLettering = (id: string, updates: Partial<LetteringFormItem>) => {
		setLettering(lettering.map((l) => (l.id === id ? { ...l, ...updates } : l)));
	};

	const updateSundry = (id: string, updates: Partial<SundryFormItem>) => {
		setSundries(sundries.map((s) => (s.id === id ? { ...s, ...updates } : s)));
	};

	// Remove handlers
	const removeComponent = (id: string) => {
		setComponents(components.filter((c) => c.id !== id));
	};

	const removeLettering = (id: string) => {
		setLettering(lettering.filter((l) => l.id !== id));
	};

	const removeSundry = (id: string) => {
		setSundries(sundries.filter((s) => s.id !== id));
	};

	// Get all materials from all sections for display
	const allSectionMaterials = useMemo(() => {
		if (!materialSections) return [];
		return materialSections.map((section) => ({
			...section,
			materials: [] as { id: string; name: string; supplierCost: string }[],
		}));
	}, [materialSections]);

	// Validate form based on quote type
	const canSubmit = useMemo(() => {
		// Must have a service selected
		if (!serviceId) return false;

		const config = QUOTE_TYPE_SECTION_CONFIG[quoteType];

		// All components must have materialId (if components section is shown)
		const componentsValid = components.every((c) => c.materialId);

		// All lettering must have techniqueId and text
		const letteringValid = lettering.every((l) => l.techniqueId && l.text);

		// All sundries must have sundryId
		const sundriesValid = sundries.every((s) => s.sundryId);

		// Type-specific validation
		switch (quoteType) {
			case 'sundry_only':
				// Must have at least one sundry
				return sundries.length > 0 && sundriesValid;

			case 'additional_inscription':
				// Must have lettering
				return lettering.length > 0 && letteringValid && sundriesValid;

			case 'refurbishment':
				// Must have at least lettering, sundries, or line items
				return (lettering.length > 0 || sundries.length > 0) && letteringValid && sundriesValid;

			default:
				// Must have at least one line item
				const hasLineItems =
					components.length > 0 ||
					lettering.length > 0 ||
					sundries.length > 0;

				return hasLineItems && componentsValid && letteringValid && sundriesValid;
		}
	}, [serviceId, quoteType, components, lettering, sundries]);

	const handleSubmit = async () => {
		setMutationError(null);

		const quoteData = {
			quoteType,
			serviceId,
			customerId: customerId || undefined,
			productId: productId || undefined,
			dimensionComboId: dimensionComboId || undefined,
			flowerHoles: flowerHoles || undefined,
			source: source || undefined,
			proposedInscription: proposedInscription || undefined,
			existingMemorialDescription: existingMemorialDescription || undefined,
			relatedJobId: relatedJobId || undefined,
			notes: notes || undefined,
			internalNotes: internalNotes || undefined,
			validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
			components: components.map(({ id, ...c }) => ({
				...c,
				quantity: c.quantity || 1,
			})),
			lettering: lettering.map(({ id, ...l }) => l),
			sundries: sundries.map(({ id, ...s }) => ({
				...s,
				quantity: s.quantity || 1,
			})),
			// Include customer details if creating a new customer
			customerDetails:
				isCreatingCustomer && customerDetails.firstName && customerDetails.lastName
					? customerDetails
					: undefined,
		};

		try {
			let result;
			if (isRevising && reviseId) {
				result = await reviseMutation.mutateAsync({ id: reviseId, ...quoteData });
			} else {
				result = await createMutation.mutateAsync(quoteData);
			}
			navigate(`/app/quotes/${result.id}`);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to save quote');
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">
						{isRevising ? 'Revise Quote' : 'New Quote'}
					</h2>
				</div>
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	return (
		<div>
			{/* Breadcrumb */}
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/quotes">Quotes</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>
							{isRevising ? `Revise ${originalQuote?.quoteNumber}` : 'New Quote'}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/quotes">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h2 className="text-2xl font-bold">
							{isRevising ? `Revise ${originalQuote?.quoteNumber}` : 'New Quote'}
						</h2>
						<p className="text-muted-foreground mt-1">
							{isRevising
								? 'Create a new version of this quote'
								: 'Create a new quote for a customer'}
						</p>
					</div>
				</div>
				<div className="flex gap-2">
					<Link to="/app/quotes">
						<Button variant="outline">Cancel</Button>
					</Link>
					<Button
						onClick={handleSubmit}
						disabled={!canSubmit || createMutation.isPending || reviseMutation.isPending}
					>
						{createMutation.isPending || reviseMutation.isPending
							? 'Saving...'
							: isRevising
								? 'Create Revision'
								: 'Create Quote'}
					</Button>
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			<div className="space-y-6">
				{/* Quote Type Selector */}
				<Card>
					<CardHeader>
						<CardTitle>Quote Type</CardTitle>
						<CardDescription>Select the type of work for this quote</CardDescription>
					</CardHeader>
					<CardContent>
						<RadioGroup
							value={quoteType}
							onValueChange={(v) => setQuoteType(v as QuoteType)}
							className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
						>
							{QUOTE_TYPES.map((type) => {
								const icons: Record<QuoteType, typeof FileText> = {
									new_memorial: FileText,
									additional_inscription: PlusCircle,
									refurbishment: RefreshCw,
									ashes: Flower,
									sundry_only: Package,
								};
								const Icon = icons[type];
								const isSelected = quoteType === type;
								return (
									<div key={type}>
										<RadioGroupItem
											value={type}
											id={`quote-type-${type}`}
											className="sr-only"
										/>
										<Label
											htmlFor={`quote-type-${type}`}
											className={cn(
												'flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
												isSelected
													? 'border-primary bg-primary/5 ring-1 ring-primary'
													: 'hover:bg-muted/50'
											)}
										>
											<Icon className={cn('h-5 w-5 mt-0.5 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
											<div>
												<div className={cn('font-medium', isSelected && 'text-primary')}>
													{QUOTE_TYPE_LABELS[type]}
												</div>
												<div className="text-sm text-muted-foreground">
													{QUOTE_TYPE_DESCRIPTIONS[type]}
												</div>
											</div>
										</Label>
									</div>
								);
							})}
						</RadioGroup>
					</CardContent>
				</Card>

				{/* Service & Customer */}
				<Card>
					<CardHeader>
						<CardTitle>Service & Customer</CardTitle>
						<CardDescription>Select the service type and assign a customer to this quote</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Primary fields - Service & Customer side by side */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Service Selection */}
							<div className="space-y-2">
								<div className="flex items-center justify-between h-7">
									<FieldLabel className="mb-0">Service *</FieldLabel>
								</div>
								<Select
									value={serviceId || NONE_VALUE}
									onValueChange={(v) => setServiceId(v === NONE_VALUE ? '' : v)}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select service type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={NONE_VALUE}>Select service type</SelectItem>
										{serviceItems
											?.filter((s) => s.isActive)
											.map((item) => (
												<SelectItem key={item.id} value={item.id}>
													{item.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>

							{/* Customer Selection */}
							<div className="space-y-2">
								<div className="flex items-center justify-between h-7">
									<FieldLabel className="mb-0">Customer</FieldLabel>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-7 text-xs"
										onClick={() => {
											setIsCreatingCustomer(!isCreatingCustomer);
											if (!isCreatingCustomer) {
												setCustomerId('');
											}
										}}
									>
										<User className="h-3 w-3 mr-1" />
										{isCreatingCustomer ? 'Select Existing' : 'New Customer'}
									</Button>
								</div>
								{!isCreatingCustomer && (
									<Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												aria-expanded={customerComboOpen}
												className="w-full justify-between font-normal"
											>
												{customerId
													? customers?.find((c) => c.id === customerId)
														? `${customers.find((c) => c.id === customerId)?.firstName} ${customers.find((c) => c.id === customerId)?.lastName}`
														: 'Search or select customer...'
													: 'Search or select customer...'}
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search customers..." />
												<CommandList>
													<CommandEmpty>
														<div className="py-2 text-center">
															<p className="text-sm text-muted-foreground mb-2">No customer found.</p>
															<Button
																variant="outline"
																size="sm"
																onClick={() => {
																	setIsCreatingCustomer(true);
																	setCustomerComboOpen(false);
																}}
															>
																<User className="h-4 w-4 mr-2" />
																Create New Customer
															</Button>
														</div>
													</CommandEmpty>
													<CommandGroup>
														{customers?.map((customer) => (
															<CommandItem
																key={customer.id}
																value={`${customer.firstName} ${customer.lastName}`}
																onSelect={() => {
																	setCustomerId(customer.id);
																	setCustomerComboOpen(false);
																}}
															>
																<Check
																	className={cn(
																		'mr-2 h-4 w-4',
																		customerId === customer.id ? 'opacity-100' : 'opacity-0'
																	)}
																/>
																{customer.firstName} {customer.lastName}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								)}
							</div>
						</div>

						{/* New Customer Form - expands below when creating */}
						{isCreatingCustomer && (
							<div className="border rounded-lg p-4 space-y-4 bg-muted/30">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Field>
										<FieldLabel>First Name *</FieldLabel>
										<Input
											value={customerDetails.firstName}
											onChange={(e) =>
												setCustomerDetails({
													...customerDetails,
													firstName: e.target.value,
												})
											}
											placeholder="First name"
										/>
									</Field>
									<Field>
										<FieldLabel>Last Name *</FieldLabel>
										<Input
											value={customerDetails.lastName}
											onChange={(e) =>
												setCustomerDetails({
													...customerDetails,
													lastName: e.target.value,
												})
											}
											placeholder="Last name"
										/>
									</Field>
									<Field>
										<FieldLabel>Email</FieldLabel>
										<Input
											type="email"
											value={customerDetails.email}
											onChange={(e) =>
												setCustomerDetails({
													...customerDetails,
													email: e.target.value,
												})
											}
											placeholder="email@example.com"
										/>
									</Field>
									<Field>
										<FieldLabel>Phone</FieldLabel>
										<Input
											type="tel"
											value={customerDetails.phone}
											onChange={(e) =>
												setCustomerDetails({
													...customerDetails,
													phone: e.target.value,
												})
											}
											placeholder="Phone number"
										/>
									</Field>
								</div>

								<div className="border-t pt-4">
									<FieldLabel className="mb-2 block">Address</FieldLabel>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<Field className="md:col-span-2">
											<Input
												value={customerDetails.address?.line1}
												onChange={(e) =>
													setCustomerDetails({
														...customerDetails,
														address: {
															...customerDetails.address!,
															line1: e.target.value,
														},
													})
												}
												placeholder="Street address"
											/>
										</Field>
										<Field className="md:col-span-2">
											<Input
												value={customerDetails.address?.line2}
												onChange={(e) =>
													setCustomerDetails({
														...customerDetails,
														address: {
															...customerDetails.address!,
															line2: e.target.value,
														},
													})
												}
												placeholder="Apartment, suite, etc. (optional)"
											/>
										</Field>
										<Field>
											<Input
												value={customerDetails.address?.city}
												onChange={(e) =>
													setCustomerDetails({
														...customerDetails,
														address: {
															...customerDetails.address!,
															city: e.target.value,
														},
													})
												}
												placeholder="City"
											/>
										</Field>
										<Field>
											<Input
												value={customerDetails.address?.county}
												onChange={(e) =>
													setCustomerDetails({
														...customerDetails,
														address: {
															...customerDetails.address!,
															county: e.target.value,
														},
													})
												}
												placeholder="County (optional)"
											/>
										</Field>
										<Field>
											<Input
												value={customerDetails.address?.postcode}
												onChange={(e) =>
													setCustomerDetails({
														...customerDetails,
														address: {
															...customerDetails.address!,
															postcode: e.target.value,
														},
													})
												}
												placeholder="Postcode"
											/>
										</Field>
										<Field>
											<Input
												value={customerDetails.address?.country}
												onChange={(e) =>
													setCustomerDetails({
														...customerDetails,
														address: {
															...customerDetails.address!,
															country: e.target.value,
														},
													})
												}
												placeholder="Country"
											/>
										</Field>
									</div>
								</div>
							</div>
						)}

						{/* Secondary field - Enquiry Source (aligned to Customer column) */}
						<div className="pt-4 border-t">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>{/* Empty left column for alignment */}</div>
								<Field>
									<FieldLabel className="text-muted-foreground text-sm">
										How did they contact us?
									</FieldLabel>
									<Select
										value={source || NONE_VALUE}
										onValueChange={(v) => setSource(v === NONE_VALUE ? '' : (v as EnquirySource))}
									>
										<SelectTrigger className="bg-muted/30">
											<SelectValue placeholder="Select enquiry source" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NONE_VALUE}>Not specified</SelectItem>
											{ENQUIRY_SOURCES.map((src) => (
												<SelectItem key={src} value={src}>
													{ENQUIRY_SOURCE_LABELS[src]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Existing Memorial & Related Job - shown for additional inscription and refurbishment */}
				{sectionConfig?.showExistingMemorial && (
					<Card>
						<CardHeader>
							<CardTitle>Existing Memorial</CardTitle>
							<CardDescription>
								Details about the memorial being worked on
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Existing Memorial Description */}
								<Field className="md:col-span-2">
									<FieldLabel>Memorial Description</FieldLabel>
									<Textarea
										value={existingMemorialDescription}
										onChange={(e) => setExistingMemorialDescription(e.target.value)}
										placeholder="Describe the existing memorial (e.g., Black granite headstone with white lettering, located in Row B, Plot 15)"
										rows={3}
									/>
								</Field>

								{/* Related Job Selector */}
								{sectionConfig?.showRelatedJob && (
									<Field className="md:col-span-2">
										<FieldLabel>Related Previous Job</FieldLabel>
										<Popover open={relatedJobComboOpen} onOpenChange={setRelatedJobComboOpen}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													aria-expanded={relatedJobComboOpen}
													className="w-full justify-between font-normal"
												>
													{relatedJobId
														? (() => {
															const job = completedJobs?.find((j) => j.id === relatedJobId);
															return job
																? `${job.jobNumber} - ${job.customerFirstName} ${job.customerLastName}`
																: 'Select a previous job...';
														})()
														: 'Select a previous job (optional)...'}
													<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
												<Command>
													<CommandInput placeholder="Search by job number or customer..." />
													<CommandList>
														<CommandEmpty>No completed jobs found.</CommandEmpty>
														<CommandGroup>
															{relatedJobId && (
																<CommandItem
																	value="_clear"
																	onSelect={() => {
																		setRelatedJobId('');
																		setRelatedJobComboOpen(false);
																	}}
																>
																	<span className="text-muted-foreground">Clear selection</span>
																</CommandItem>
															)}
															{completedJobs?.map((job) => (
																<CommandItem
																	key={job.id}
																	value={`${job.jobNumber} ${job.customerFirstName} ${job.customerLastName}`}
																	onSelect={() => {
																		setRelatedJobId(job.id);
																		setRelatedJobComboOpen(false);
																	}}
																>
																	<Check
																		className={cn(
																			'mr-2 h-4 w-4',
																			relatedJobId === job.id ? 'opacity-100' : 'opacity-0'
																		)}
																	/>
																	<div>
																		<span className="font-medium">{job.jobNumber}</span>
																		<span className="text-muted-foreground ml-2">
																			{job.customerFirstName} {job.customerLastName}
																		</span>
																	</div>
																</CommandItem>
															))}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
										<p className="text-sm text-muted-foreground mt-1">
											Link this quote to a previous job if this work relates to one
										</p>
									</Field>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Memorial Details - shown for new memorial and ashes */}
				{sectionConfig?.showProductSelection && (
					<Card>
						<CardHeader>
							<CardTitle>Memorial Details</CardTitle>
							<CardDescription>Product selection and specifications</CardDescription>
						</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Product Reference */}
							<Field>
								<FieldLabel>Product Reference</FieldLabel>
								<Select
									value={productId || NONE_VALUE}
									onValueChange={(v) => {
										const newValue = v === NONE_VALUE ? '' : v;
										setProductId(newValue);
										setDimensionComboId('');
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select product (optional)" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={NONE_VALUE}>No product</SelectItem>
										{productsData?.products?.map((product) => (
											<SelectItem key={product.id} value={product.id}>
												{product.name} ({product.sku})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>

							{/* Dimensions - only show when product selected */}
							{productId && dimensionCombos && dimensionCombos.length > 0 && (
								<Field>
									<FieldLabel>Memorial Dimensions</FieldLabel>
									<Select
										value={dimensionComboId || NONE_VALUE}
										onValueChange={(v) => setDimensionComboId(v === NONE_VALUE ? '' : v)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select dimensions" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NONE_VALUE}>Custom dimensions</SelectItem>
											{dimensionCombos
												.filter((c) => c.isActive)
												.map((combo) => (
													<SelectItem key={combo.id} value={combo.id}>
														{combo.name || formatDimensionCombo(combo)}
														{parseFloat(combo.priceAdjustment) > 0 &&
															` (+£${combo.priceAdjustment})`}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								</Field>
							)}

							{/* Stone Colour - only show in product-based mode */}
							{isProductBasedMode && (
								<Field>
									<FieldLabel>Stone Colour *</FieldLabel>
									<Select
										value={stoneColourMaterialId || NONE_VALUE}
										onValueChange={(v) => setStoneColourMaterialId(v === NONE_VALUE ? '' : v)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select stone colour" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NONE_VALUE}>Select a colour</SelectItem>
											{materialsGroupedBySection.map((section) => (
												<SelectGroup key={section.id}>
													<SelectLabel>{section.name}</SelectLabel>
													{section.materials.map((material) => (
														<SelectItem key={material.id} value={material.id}>
															{material.name}
														</SelectItem>
													))}
												</SelectGroup>
											))}
										</SelectContent>
									</Select>
								</Field>
							)}

							{/* Flower Holes - only for new memorial */}
							{sectionConfig?.showFlowerHoles && (
								<Field>
									<FieldLabel>Flower Holes</FieldLabel>
									<Select
										value={flowerHoles}
										onValueChange={(v) => setFlowerHoles(v as FlowerHoleChoice | '')}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select option" />
										</SelectTrigger>
										<SelectContent>
											{FLOWER_HOLE_CHOICES.map((choice) => (
												<SelectItem key={choice} value={choice}>
													{choice}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							)}
						</div>
					</CardContent>
				</Card>
				)}

	
				{/* Stone Components Card - shown for types that need components */}
				{sectionConfig?.showComponents && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Stone Components</CardTitle>
								<CardDescription>
									{isProductBasedMode
										? 'Components from selected product and dimensions'
										: 'Add stone pieces to this quote'}
								</CardDescription>
							</div>
							{!isProductBasedMode && (
								<Button onClick={handleAddComponent}>
									<Plus className="h-4 w-4 mr-2" />
									Add Component
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent>
						{isProductBasedMode ? (
							// Read-only summary for product-based mode
							components.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground border rounded-lg">
									Select a dimension combo above to populate components.
								</div>
							) : (
								<div className="border rounded-lg">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Component</TableHead>
												<TableHead>Dimensions (H × W × D)</TableHead>
												<TableHead className="w-[80px]">Qty</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{components.map((comp) => (
												<TableRow key={comp.id}>
													<TableCell className="font-medium">
														{formatComponentType(comp.componentType)}
													</TableCell>
													<TableCell>
														{comp.height || '—'} × {comp.width || '—'} × {comp.depth || '—'}
													</TableCell>
													<TableCell>{comp.quantity}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
									{!stoneColourMaterialId && (
										<div className="p-3 bg-yellow-50 text-yellow-800 text-sm border-t">
											Please select a Stone Colour above to complete the components.
										</div>
									)}
								</div>
							)
						) : (
							// Manual entry mode
							<>
								{components.length === 0 ? (
									<div className="text-center py-8 text-muted-foreground border rounded-lg">
										No components added yet. Click "Add Component" to start.
									</div>
								) : (
									<div className="space-y-4">
										{components.map((comp, index) => (
											<div key={comp.id} className="border rounded-lg p-4">
												<div className="flex items-center justify-between mb-4">
													<span className="font-medium">Component {index + 1}</span>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => removeComponent(comp.id)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
													<Field>
														<FieldLabel>Type</FieldLabel>
														<Select
															value={comp.componentType}
															onValueChange={(v) =>
																updateComponent(comp.id, { componentType: v as ComponentType })
															}
														>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{Object.entries(COMPONENT_TYPE_GROUPS).map(([group, types]) => (
																	<SelectGroup key={group}>
																		<SelectLabel>{group}</SelectLabel>
																		{types.map((type) => (
																			<SelectItem key={type} value={type}>
																				{formatComponentType(type as ComponentType)}
																			</SelectItem>
																		))}
																	</SelectGroup>
																))}
															</SelectContent>
														</Select>
													</Field>

													<Field>
														<FieldLabel>Material Section</FieldLabel>
														<Select
															value={selectedSectionId}
															onValueChange={setSelectedSectionId}
														>
															<SelectTrigger>
																<SelectValue placeholder="Select section" />
															</SelectTrigger>
															<SelectContent>
																{materialSections?.map((section) => (
																	<SelectItem key={section.id} value={section.id}>
																		{section.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</Field>

													<Field>
														<FieldLabel>Material *</FieldLabel>
														<Select
															value={comp.materialId || NONE_VALUE}
															onValueChange={(v) => updateComponent(comp.id, { materialId: v === NONE_VALUE ? '' : v })}
														>
															<SelectTrigger>
																<SelectValue placeholder="Select material" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value={NONE_VALUE}>Select material</SelectItem>
																{selectedSection?.materials
																	?.filter((m) => m.isActive)
																	.map((material) => (
																		<SelectItem key={material.id} value={material.id}>
																			{material.name}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													</Field>

													<Field>
														<FieldLabel>Finish</FieldLabel>
														<Select
															value={comp.finishId || NONE_VALUE}
															onValueChange={(v) =>
																updateComponent(comp.id, { finishId: v === NONE_VALUE ? undefined : v })
															}
														>
															<SelectTrigger>
																<SelectValue placeholder="Select finish" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value={NONE_VALUE}>No finish</SelectItem>
																{finishes
																	?.filter((f) => f.isActive)
																	.map((finish) => (
																		<SelectItem key={finish.id} value={finish.id}>
																			{finish.name}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													</Field>

													<Field>
														<FieldLabel>Dimensions (H x W x D inches)</FieldLabel>
														<div className="flex gap-2">
															<Input
																type="number"
																placeholder="H"
																value={comp.height || ''}
																onChange={(e) =>
																	updateComponent(comp.id, {
																		height: e.target.value ? parseFloat(e.target.value) : undefined,
																	})
																}
															/>
															<Input
																type="number"
																placeholder="W"
																value={comp.width || ''}
																onChange={(e) =>
																	updateComponent(comp.id, {
																		width: e.target.value ? parseFloat(e.target.value) : undefined,
																	})
																}
															/>
															<Input
																type="number"
																placeholder="D"
																value={comp.depth || ''}
																onChange={(e) =>
																	updateComponent(comp.id, {
																		depth: e.target.value ? parseFloat(e.target.value) : undefined,
																	})
																}
															/>
														</div>
													</Field>

													<Field>
														<FieldLabel>Quantity</FieldLabel>
														<Input
															type="number"
															min="1"
															value={comp.quantity}
															onChange={(e) =>
																updateComponent(comp.id, {
																	quantity: parseInt(e.target.value) || 1,
																})
															}
														/>
													</Field>
												</div>
											</div>
										))}
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>
				)}

				{/* Inscription & Lettering Card - unified */}
				{(sectionConfig?.showProposedInscription || sectionConfig?.showLettering) && (
				<Card>
					<CardHeader>
						<CardTitle>
							{sectionConfig?.showProposedInscription && sectionConfig?.showLettering
								? 'Inscription & Lettering'
								: 'Lettering'}
						</CardTitle>
						<CardDescription>
							{sectionConfig?.showProposedInscription
								? 'Enter the proposed text and lettering specifications'
								: 'Add lettering work for this quote'}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Section: Proposed Inscription */}
						{sectionConfig?.showProposedInscription && (
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
										Proposed Inscription
									</span>
									{proposedInscription && (
										<span className="text-sm text-muted-foreground">
											{proposedInscription.length} characters
										</span>
									)}
								</div>
								<Textarea
									value={proposedInscription}
									onChange={(e) => setProposedInscription(e.target.value)}
									placeholder="Enter the full text of the desired inscription..."
									rows={4}
									className="font-mono"
								/>
							</div>
						)}

						{/* Divider - only when both sections are shown */}
						{sectionConfig?.showProposedInscription && sectionConfig?.showLettering && (
							<div className="border-t" />
						)}

						{/* Section: Lettering Items */}
						{sectionConfig?.showLettering && (
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
										Lettering Details
									</span>
									<Button size="sm" onClick={handleAddLettering}>
										<Plus className="h-4 w-4 mr-2" />
										Add Lettering
									</Button>
								</div>

								{lettering.length === 0 ? (
									<div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
										No lettering items added yet. Add at least one to specify technique and pricing.
									</div>
								) : (
									<div className="space-y-4">
										{lettering.map((lett, index) => (
											<div key={lett.id} className="border rounded-lg p-4">
												<div className="flex items-center justify-between mb-4">
													<span className="font-medium">Inscription {index + 1}</span>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => removeLettering(lett.id)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
													<Field>
														<FieldLabel>Technique *</FieldLabel>
														<Select
															value={lett.techniqueId || NONE_VALUE}
															onValueChange={(v) => updateLettering(lett.id, { techniqueId: v === NONE_VALUE ? '' : v })}
														>
															<SelectTrigger>
																<SelectValue placeholder="Select technique" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value={NONE_VALUE}>Select technique</SelectItem>
																{techniques
																	?.filter((t) => t.isActive)
																	.map((technique) => (
																		<SelectItem key={technique.id} value={technique.id}>
																			{technique.name}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													</Field>

													<Field>
														<FieldLabel>Color</FieldLabel>
														<Select
															value={lett.colorId || NONE_VALUE}
															onValueChange={(v) =>
																updateLettering(lett.id, { colorId: v === NONE_VALUE ? undefined : v })
															}
														>
															<SelectTrigger>
																<SelectValue placeholder="Select color" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value={NONE_VALUE}>No color</SelectItem>
																{colors
																	?.filter((c) => c.isActive)
																	.map((color) => (
																		<SelectItem key={color.id} value={color.id}>
																			{color.name}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													</Field>

													<Field className="md:col-span-2">
														<FieldLabel>
															Text * ({lett.text?.replace(/\s/g, '').length || 0} letters)
														</FieldLabel>
														<Textarea
															value={lett.text}
															onChange={(e) => updateLettering(lett.id, { text: e.target.value })}
															placeholder="Enter inscription text..."
															rows={2}
														/>
													</Field>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
				)}

				{/* Sundries Card - shown for all types, required for sundry_only */}
				{sectionConfig?.showSundries && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Sundries</CardTitle>
								<CardDescription>Add additional items</CardDescription>
							</div>
							<Button onClick={handleAddSundry}>
								<Plus className="h-4 w-4 mr-2" />
								Add Sundry
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{sundries.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground border rounded-lg">
								No sundries added yet.
							</div>
						) : (
							<div className="border rounded-lg">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Item</TableHead>
											<TableHead className="w-[100px]">Quantity</TableHead>
											<TableHead className="w-[80px]"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{sundries.map((sundry) => (
											<TableRow key={sundry.id}>
												<TableCell>
													<Select
														value={sundry.sundryId || NONE_VALUE}
														onValueChange={(v) =>
															updateSundry(sundry.id, { sundryId: v === NONE_VALUE ? '' : v })
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select item" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value={NONE_VALUE}>Select item</SelectItem>
															{sundryItems
																?.filter((s) => s.isActive)
																.map((item) => (
																	<SelectItem key={item.id} value={item.id}>
																		{item.name}
																	</SelectItem>
																))}
														</SelectContent>
													</Select>
												</TableCell>
												<TableCell>
													<Input
														type="number"
														min="1"
														value={sundry.quantity}
														onChange={(e) =>
															updateSundry(sundry.id, {
																quantity: parseInt(e.target.value) || 1,
															})
														}
													/>
												</TableCell>
												<TableCell>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => removeSundry(sundry.id)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
				)}

				{/* Card: Additional Information */}
				<Card>
					<CardHeader>
						<CardTitle>Additional Information</CardTitle>
						<CardDescription>Notes and quote validity</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-6">
							{/* Valid Until - standalone at top */}
							<div className="max-w-xs">
								<Field>
									<FieldLabel>Valid Until</FieldLabel>
									<Input
										type="date"
										value={validUntil}
										onChange={(e) => setValidUntil(e.target.value)}
									/>
								</Field>
							</div>

							{/* Notes side by side */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<Field>
									<FieldLabel>Notes for Customer</FieldLabel>
									<Textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										placeholder="Any special instructions or notes visible to the customer..."
										rows={3}
									/>
								</Field>

								<Field>
									<FieldLabel>Internal Notes</FieldLabel>
									<Textarea
										value={internalNotes}
										onChange={(e) => setInternalNotes(e.target.value)}
										placeholder="Internal notes - not shown to customer..."
										rows={3}
										className="bg-orange-50/50 border-orange-200"
									/>
								</Field>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Submit Actions */}
				<div className="flex justify-end gap-2">
					<Link to="/app/quotes">
						<Button variant="outline">Cancel</Button>
					</Link>
					<Button
						onClick={handleSubmit}
						disabled={!canSubmit || createMutation.isPending || reviseMutation.isPending}
					>
						{createMutation.isPending || reviseMutation.isPending
							? 'Saving...'
							: isRevising
								? 'Create Revision'
								: 'Create Quote'}
					</Button>
				</div>
			</div>
		</div>
	);
}
