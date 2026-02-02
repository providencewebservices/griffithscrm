import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
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
	useCreateQuoteMutation,
	formatComponentType,
	COMPONENT_TYPE_GROUPS,
	FLOWER_HOLE_CHOICES,
	FLOWER_TOP_COLOR_CHOICES,
	QUOTE_TYPES,
	QUOTE_TYPE_LABELS,
	QUOTE_TYPE_DESCRIPTIONS,
	QUOTE_TYPE_SECTION_CONFIG,
	type ComponentInput,
	type SundryInput,
	type ComponentType,
	type FlowerHoleChoice,
	type FlowerTopColorChoice,
	type QuoteType,
	type CustomerDetailsInput,
} from '@/hooks/use-quotes';
import { useCustomersQuery } from '@/hooks/use-customers';
import { useProductsQuery } from '@/hooks/use-products';
import { useDimensionCombosQuery, useDimensionComboQuery, type DimensionCombo } from '@/hooks/use-dimension-combos';
import { useMaterialSectionsQuery, useMaterialSectionQuery } from '@/hooks/use-material-sections';
import { useMaterialsQuery } from '@/hooks/use-materials';
import { useFinishesQuery } from '@/hooks/use-finishes';
import { useSundriesQuery } from '@/hooks/use-sundries';
import { useJobsQuery } from '@/hooks/use-jobs';
import { useFuneralDirectorsQuery } from '@/hooks/use-funeral-directors';
import { useMemorialSitesQuery, useMemorialSiteQuery } from '@/hooks/use-memorial-sites';
import { useTenantPricingSettingsQuery } from '@/hooks/use-tenant-pricing-settings';
import { Label } from '@/components/ui/label';
import { ENQUIRY_SOURCES } from '@griffiths-crm/shared/db/schema';
import { ArrowLeft, Plus, Trash2, User, Check, ChevronsUpDown, FileText, PlusCircle, RefreshCw, Flower, Package, MapPin, Building2 } from 'lucide-react';
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

	// Form state - Package-level (shared context)
	const [quoteType, setQuoteType] = useState<QuoteType>('new_memorial');
	const [customerId, setCustomerId] = useState<string>('');
	const [customerComboOpen, setCustomerComboOpen] = useState(false);
	const [funeralDirectorId, setFuneralDirectorId] = useState<string>('');
	const [funeralDirectorComboOpen, setFuneralDirectorComboOpen] = useState(false);
	const [memorialSiteId, setMemorialSiteId] = useState<string>('');
	const [memorialSiteComboOpen, setMemorialSiteComboOpen] = useState(false);
	const [source, setSource] = useState<EnquirySource | ''>('');
	const [proposedInscription, setProposedInscription] = useState('');
	const [existingMemorialDescription, setExistingMemorialDescription] = useState('');
	const [relatedJobId, setRelatedJobId] = useState<string>('');
	const [relatedJobComboOpen, setRelatedJobComboOpen] = useState(false);
	const [notes, setNotes] = useState('');
	const [internalNotes, setInternalNotes] = useState('');
	const [validUntil, setValidUntil] = useState('');

	// Form state - First option fields
	const [productId, setProductId] = useState<string>('');
	const [dimensionComboId, setDimensionComboId] = useState<string>('');
	const [stoneColourMaterialId, setStoneColourMaterialId] = useState<string>('');
	const [flowerHoles, setFlowerHoles] = useState<FlowerHoleChoice | ''>('');
	const [flowerTopColor, setFlowerTopColor] = useState<FlowerTopColorChoice | ''>('');

	// Ashes quote specific fields
	const [deceasedNames, setDeceasedNames] = useState('');
	const [intermentDate, setIntermentDate] = useState('');
	const [intermentTime, setIntermentTime] = useState('');

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
	const { data: sundryItems } = useSundriesQuery();
	const { data: funeralDirectors } = useFuneralDirectorsQuery();
	const { data: memorialSites } = useMemorialSitesQuery();
	const { data: selectedMemorialSite } = useMemorialSiteQuery(memorialSiteId || undefined);
	const { data: pricingSettings } = useTenantPricingSettingsQuery();
	// Fetch completed jobs for related job selector (only when needed)
	const sectionConfig = QUOTE_TYPE_SECTION_CONFIG[quoteType];
	const { data: completedJobs } = useJobsQuery(
		sectionConfig?.showRelatedJob ? { status: 'completed' } : undefined
	);

	const createMutation = useCreateQuoteMutation();

	// Set default validUntil date based on tenant settings
	useEffect(() => {
		if (pricingSettings?.quoteValidityDays && !validUntil) {
			const defaultDate = new Date();
			defaultDate.setDate(defaultDate.getDate() + pricingSettings.quoteValidityDays);
			setValidUntil(defaultDate.toISOString().split('T')[0]);
		}
	}, [pricingSettings?.quoteValidityDays]);

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

	const updateSundry = (id: string, updates: Partial<SundryFormItem>) => {
		setSundries(sundries.map((s) => (s.id === id ? { ...s, ...updates } : s)));
	};

	// Remove handlers
	const removeComponent = (id: string) => {
		setComponents(components.filter((c) => c.id !== id));
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
		// All components must have materialId (if any added)
		const componentsValid = components.every((c) => c.materialId);

		// All sundries must have sundryId (if any added)
		const sundriesValid = sundries.every((s) => s.sundryId);

		// Line items are optional, but if added they must be complete
		return componentsValid && sundriesValid;
	}, [components, sundries]);

	const handleSubmit = async () => {
		setMutationError(null);

		const quoteData = {
			// Package-level fields (shared context)
			quoteType,
			customerId: customerId || undefined,
			funeralDirectorId: funeralDirectorId || undefined,
			memorialSiteId: memorialSiteId || undefined,
			source: source || undefined,
			proposedInscription: proposedInscription || undefined,
			existingMemorialDescription: existingMemorialDescription || undefined,
			relatedJobId: relatedJobId || undefined,
			notes: notes || undefined,
			internalNotes: internalNotes || undefined,
			validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
			// Include customer details if creating a new customer
			customerDetails:
				isCreatingCustomer && customerDetails.firstName && customerDetails.lastName
					? customerDetails
					: undefined,
			// First option fields
			productId: productId || undefined,
			dimensionComboId: dimensionComboId || undefined,
			flowerHoles: flowerHoles || undefined,
			flowerTopColor: flowerTopColor || undefined,
			// Ashes quote fields
			deceasedNames: deceasedNames || undefined,
			intermentDate: intermentDate || undefined,
			intermentTime: intermentTime || undefined,
			components: components.map(({ id, ...c }) => ({
				...c,
				quantity: c.quantity || 1,
			})),
			sundries: sundries.map(({ id, ...s }) => ({
				...s,
				quantity: s.quantity || 1,
			})),
		};

		try {
			const result = await createMutation.mutateAsync(quoteData);
			navigate(`/app/quotes/${result.id}`);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to create quote');
		}
	};

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
						<BreadcrumbPage>New Quote</BreadcrumbPage>
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
						<h2 className="text-2xl font-bold">New Quote</h2>
						<p className="text-muted-foreground mt-1">
							Create a new quote for a customer
						</p>
					</div>
				</div>
				<div className="flex gap-2">
					<Link to="/app/quotes">
						<Button variant="outline">Cancel</Button>
					</Link>
					<Button
						onClick={handleSubmit}
						disabled={!canSubmit || createMutation.isPending}
					>
						{createMutation.isPending ? 'Creating...' : 'Create Quote'}
					</Button>
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			<div className="flex gap-6">
			{/* Main Content - Left Column */}
			<div className="flex-1 min-w-0 space-y-6">
				{/* Quote Type Selector */}
				<Card>
					<CardHeader>
						<CardTitle>Quote Type</CardTitle>
						<CardDescription>Select the type of work for this quote</CardDescription>
					</CardHeader>
					<CardContent>
						<Select value={quoteType} onValueChange={(v) => setQuoteType(v as QuoteType)}>
							<SelectTrigger className="w-full">
								<SelectValue>
									{(() => {
										const icons: Record<QuoteType, typeof FileText> = {
											new_memorial: FileText,
											additional_inscription: PlusCircle,
											refurbishment: RefreshCw,
											ashes: Flower,
											sundry_only: Package,
										};
										const Icon = icons[quoteType];
										return (
											<div className="flex items-center gap-2">
												<Icon className="h-4 w-4 text-muted-foreground" />
												<span>{QUOTE_TYPE_LABELS[quoteType]}</span>
											</div>
										);
									})()}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{QUOTE_TYPES.map((type) => {
									const icons: Record<QuoteType, typeof FileText> = {
										new_memorial: FileText,
										additional_inscription: PlusCircle,
										refurbishment: RefreshCw,
										ashes: Flower,
										sundry_only: Package,
									};
									const Icon = icons[type];
									return (
										<SelectItem key={type} value={type}>
											<div className="flex items-start gap-2">
												<Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
												<div>
													<div className="font-medium">{QUOTE_TYPE_LABELS[type]}</div>
													<div className="text-xs text-muted-foreground">{QUOTE_TYPE_DESCRIPTIONS[type]}</div>
												</div>
											</div>
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
					</CardContent>
				</Card>

				{/* New Customer Form - shows when creating new customer from sidebar */}
				{isCreatingCustomer && (
				<Card>
					<CardHeader>
						<CardTitle>New Customer</CardTitle>
						<CardDescription>Enter the customer's details</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
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
					</CardContent>
				</Card>
				)}

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

							{/* Flower Top Color - only for new memorial */}
							{quoteType === 'new_memorial' && (
								<Field>
									<FieldLabel>Flower Top Colour</FieldLabel>
									<Select
										value={flowerTopColor || NONE_VALUE}
										onValueChange={(v) => setFlowerTopColor(v === NONE_VALUE ? '' : v as FlowerTopColorChoice)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select colour" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NONE_VALUE}>None</SelectItem>
											{FLOWER_TOP_COLOR_CHOICES.map((choice) => (
												<SelectItem key={choice} value={choice}>
													{choice === 'gold' ? 'Gold Top' : 'Silver Top'}
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

				{/* Ashes Details - shown only for ashes quotes */}
				{quoteType === 'ashes' && (
					<Card>
						<CardHeader>
							<CardTitle>Ashes Details</CardTitle>
							<CardDescription>Information about the ashes interment</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<Field className="md:col-span-2">
									<FieldLabel>Deceased Names</FieldLabel>
									<Textarea
										value={deceasedNames}
										onChange={(e) => setDeceasedNames(e.target.value)}
										placeholder="Enter names, one per line"
										rows={3}
									/>
									<p className="text-sm text-muted-foreground mt-1">
										Enter each name on a separate line
									</p>
								</Field>

								<Field>
									<FieldLabel>Date of Interment</FieldLabel>
									<Input
										type="date"
										value={intermentDate}
										onChange={(e) => setIntermentDate(e.target.value)}
									/>
								</Field>

								<Field>
									<FieldLabel>Time of Interment</FieldLabel>
									<Input
										type="time"
										value={intermentTime}
										onChange={(e) => setIntermentTime(e.target.value)}
									/>
								</Field>
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

				{/* Proposed Inscription Card */}
				{sectionConfig?.showProposedInscription && (
				<Card>
					<CardHeader>
						<CardTitle>Proposed Inscription</CardTitle>
						<CardDescription>
							Enter the full text for the memorial inscription. Lettering details (technique, color) can be added after creating the quote.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									{proposedInscription ? `${proposedInscription.length} characters` : 'No text entered'}
								</span>
							</div>
							<Textarea
								value={proposedInscription}
								onChange={(e) => setProposedInscription(e.target.value)}
								placeholder="Enter the full text of the desired inscription..."
								rows={4}
								className="font-mono"
							/>
						</div>
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

				{/* Card: Notes */}
				<Card>
					<CardHeader>
						<CardTitle>Notes</CardTitle>
					</CardHeader>
					<CardContent>
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
					</CardContent>
				</Card>
			</div>

			{/* Sidebar - Right Column */}
			<div className="hidden lg:block w-80 shrink-0">
				<div className="sticky top-6 space-y-4">
					{/* Customer */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<FieldLabel className="text-sm font-medium">Customer</FieldLabel>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-6 text-xs px-2"
								onClick={() => {
									setIsCreatingCustomer(!isCreatingCustomer);
									if (!isCreatingCustomer) {
										setCustomerId('');
									}
								}}
							>
								<User className="h-3 w-3 mr-1" />
								{isCreatingCustomer ? 'Select' : 'New'}
							</Button>
						</div>
						{!isCreatingCustomer ? (
							<Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										role="combobox"
										aria-expanded={customerComboOpen}
										className="w-full justify-between font-normal h-9 text-sm"
									>
										{customerId
											? customers?.find((c) => c.id === customerId)
												? `${customers.find((c) => c.id === customerId)?.firstName} ${customers.find((c) => c.id === customerId)?.lastName}`
												: 'Select customer...'
											: 'Select customer...'}
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
														Create New
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
						) : (
							<div className="text-sm text-muted-foreground italic">
								Creating new customer below...
							</div>
						)}
					</div>

					{/* Enquiry Source */}
					<div className="space-y-2">
						<FieldLabel className="text-sm font-medium">How did they contact us?</FieldLabel>
						<Select
							value={source || NONE_VALUE}
							onValueChange={(v) => setSource(v === NONE_VALUE ? '' : (v as EnquirySource))}
						>
							<SelectTrigger className="h-9 text-sm">
								<SelectValue placeholder="Select source" />
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
					</div>

					<div className="border-t pt-4 space-y-4">
						{/* Funeral Director */}
						<div className="space-y-2">
							<FieldLabel className="text-sm font-medium">Funeral Director</FieldLabel>
							<Popover open={funeralDirectorComboOpen} onOpenChange={setFuneralDirectorComboOpen}>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										role="combobox"
										aria-expanded={funeralDirectorComboOpen}
										className="w-full justify-between font-normal h-9 text-sm"
									>
										<span className="truncate">
											{funeralDirectorId
												? funeralDirectors?.find((fd) => fd.id === funeralDirectorId)?.businessName ||
												  'Select...'
												: 'Optional'}
										</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
									<Command>
										<CommandInput placeholder="Search..." />
										<CommandList>
											<CommandEmpty>No funeral directors found.</CommandEmpty>
											<CommandGroup>
												{funeralDirectorId && (
													<CommandItem
														value="_clear"
														onSelect={() => {
															setFuneralDirectorId('');
															setFuneralDirectorComboOpen(false);
														}}
													>
														<span className="text-muted-foreground">Clear selection</span>
													</CommandItem>
												)}
												{funeralDirectors
													?.filter((fd) => fd.isActive)
													.map((fd) => (
														<CommandItem
															key={fd.id}
															value={fd.businessName}
															onSelect={() => {
																setFuneralDirectorId(fd.id);
																setFuneralDirectorComboOpen(false);
															}}
														>
															<Check
																className={cn(
																	'mr-2 h-4 w-4',
																	funeralDirectorId === fd.id ? 'opacity-100' : 'opacity-0'
																)}
															/>
															<div className="flex items-center gap-2 truncate">
																<Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
																<span className="truncate">{fd.businessName}</span>
															</div>
														</CommandItem>
													))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>

						{/* Memorial Site */}
						<div className="space-y-2">
							<FieldLabel className="text-sm font-medium">Memorial Site</FieldLabel>
							<Popover open={memorialSiteComboOpen} onOpenChange={setMemorialSiteComboOpen}>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										role="combobox"
										aria-expanded={memorialSiteComboOpen}
										className="w-full justify-between font-normal h-9 text-sm"
									>
										<span className="truncate">
											{memorialSiteId
												? memorialSites?.find((ms) => ms.id === memorialSiteId)?.name ||
												  'Select...'
												: 'Optional'}
										</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
									<Command>
										<CommandInput placeholder="Search..." />
										<CommandList>
											<CommandEmpty>No memorial sites found.</CommandEmpty>
											<CommandGroup>
												{memorialSiteId && (
													<CommandItem
														value="_clear"
														onSelect={() => {
															setMemorialSiteId('');
															setMemorialSiteComboOpen(false);
														}}
													>
														<span className="text-muted-foreground">Clear selection</span>
													</CommandItem>
												)}
												{memorialSites
													?.filter((ms) => ms.isActive)
													.map((ms) => (
														<CommandItem
															key={ms.id}
															value={ms.name}
															onSelect={() => {
																setMemorialSiteId(ms.id);
																setMemorialSiteComboOpen(false);
															}}
														>
															<Check
																className={cn(
																	'mr-2 h-4 w-4',
																	memorialSiteId === ms.id ? 'opacity-100' : 'opacity-0'
																)}
															/>
															<div className="flex items-center gap-2 truncate">
																<MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
																<span className="truncate">{ms.name}</span>
															</div>
														</CommandItem>
													))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
							{/* Memorial site location display */}
							{selectedMemorialSite?.addresses && selectedMemorialSite.addresses.length > 0 && (
								<div className="text-xs text-muted-foreground pl-1">
									{selectedMemorialSite.addresses.find(a => a.isPrimary)?.formattedAddress ||
									 selectedMemorialSite.addresses[0]?.formattedAddress ||
									 selectedMemorialSite.addresses.find(a => a.isPrimary)?.locality ||
									 selectedMemorialSite.addresses[0]?.locality}
								</div>
							)}
						</div>
					</div>

					{/* Valid Until */}
					<div className="border-t pt-4">
						<div className="space-y-2">
							<FieldLabel className="text-sm font-medium">Valid Until</FieldLabel>
							<Input
								type="date"
								value={validUntil}
								onChange={(e) => setValidUntil(e.target.value)}
								className="h-9 text-sm"
							/>
						</div>
					</div>
				</div>
			</div>
			</div>
		</div>
	);
}
