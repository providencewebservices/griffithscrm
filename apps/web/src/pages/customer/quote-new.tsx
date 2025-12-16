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
	type ComponentInput,
	type LetteringInput,
	type SundryInput,
	type ServiceInput,
	type ComponentType,
	type FlowerHoleChoice,
	type CustomerDetailsInput,
} from '@/hooks/use-quotes';
import { useCustomersQuery } from '@/hooks/use-customers';
import { useProductsQuery } from '@/hooks/use-products';
import { useDimensionCombosQuery, type DimensionCombo } from '@/hooks/use-dimension-combos';
import { useMaterialSectionsQuery, useMaterialSectionQuery } from '@/hooks/use-material-sections';
import { useFinishesQuery } from '@/hooks/use-finishes';
import { useLetteringTechniquesQuery } from '@/hooks/use-lettering-techniques';
import { useLetteringColorsQuery } from '@/hooks/use-lettering-colors';
import { useSundriesQuery } from '@/hooks/use-sundries';
import { useServicesQuery } from '@/hooks/use-services';
import { COMPONENT_TYPES } from '@griffiths-crm/shared/db/schema';
import { ArrowLeft, Plus, Trash2, User } from 'lucide-react';

// Types for form state
type ComponentFormItem = ComponentInput & { id: string };
type LetteringFormItem = LetteringInput & { id: string };
type SundryFormItem = SundryInput & { id: string };
type ServiceFormItem = ServiceInput & { id: string };

const NONE_VALUE = '_none';

export function QuoteNewPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const reviseId = searchParams.get('revise');

	// Form state
	const [customerId, setCustomerId] = useState<string>('');
	const [productId, setProductId] = useState<string>('');
	const [dimensionComboId, setDimensionComboId] = useState<string>('');
	const [flowerHoles, setFlowerHoles] = useState<FlowerHoleChoice | ''>('');
	const [notes, setNotes] = useState('');
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
	const [services, setServices] = useState<ServiceFormItem[]>([]);

	const [mutationError, setMutationError] = useState<string | null>(null);

	// For loading materials under a section
	const [selectedSectionId, setSelectedSectionId] = useState<string>('');

	// Fetch reference data
	const { data: customers } = useCustomersQuery();
	const { data: productsData } = useProductsQuery({ isActive: 'true' });
	const { data: dimensionCombos } = useDimensionCombosQuery(productId || undefined);
	const { data: materialSections } = useMaterialSectionsQuery();
	const { data: selectedSection } = useMaterialSectionQuery(selectedSectionId || undefined);
	const { data: finishes } = useFinishesQuery();
	const { data: techniques } = useLetteringTechniquesQuery();
	const { data: colors } = useLetteringColorsQuery();
	const { data: sundryItems } = useSundriesQuery();
	const { data: serviceItems } = useServicesQuery();

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

	// Pre-fill form if revising
	useEffect(() => {
		if (originalQuote) {
			setCustomerId(originalQuote.customerId || '');
			setProductId(originalQuote.productId || '');
			setDimensionComboId(originalQuote.dimensionComboId || '');
			setFlowerHoles(originalQuote.flowerHoles || '');
			setNotes(originalQuote.notes || '');
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
					appliesTo: 'new_memorial' as const,
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

			setServices(
				originalQuote.services.map((s) => ({
					id: crypto.randomUUID(),
					serviceId: s.serviceId || '',
					quantity: s.quantity,
					unitPrice: parseFloat(s.unitPrice),
					notes: s.notes || undefined,
				}))
			);
		}
	}, [originalQuote]);

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
				appliesTo: 'new_memorial',
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

	const handleAddService = () => {
		setServices([
			...services,
			{
				id: generateId(),
				serviceId: '',
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

	const updateService = (id: string, updates: Partial<ServiceFormItem>) => {
		setServices(services.map((s) => (s.id === id ? { ...s, ...updates } : s)));
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

	const removeService = (id: string) => {
		setServices(services.filter((s) => s.id !== id));
	};

	// Get all materials from all sections for display
	const allSectionMaterials = useMemo(() => {
		if (!materialSections) return [];
		return materialSections.map((section) => ({
			...section,
			materials: [] as { id: string; name: string; supplierCost: string }[],
		}));
	}, [materialSections]);

	// Validate form
	const canSubmit = useMemo(() => {
		// Must have at least one line item
		const hasLineItems =
			components.length > 0 ||
			lettering.length > 0 ||
			sundries.length > 0 ||
			services.length > 0;

		// All components must have materialId
		const componentsValid = components.every((c) => c.materialId);

		// All lettering must have techniqueId and text
		const letteringValid = lettering.every((l) => l.techniqueId && l.text);

		// All sundries must have sundryId
		const sundriesValid = sundries.every((s) => s.sundryId);

		// All services must have serviceId
		const servicesValid = services.every((s) => s.serviceId);

		return hasLineItems && componentsValid && letteringValid && sundriesValid && servicesValid;
	}, [components, lettering, sundries, services]);

	const handleSubmit = async () => {
		setMutationError(null);

		const quoteData = {
			customerId: customerId || undefined,
			productId: productId || undefined,
			dimensionComboId: dimensionComboId || undefined,
			flowerHoles: flowerHoles || undefined,
			notes: notes || undefined,
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
			services: services.map(({ id, ...s }) => ({
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
				{/* Quote Header Card */}
				<Card>
					<CardHeader>
						<CardTitle>Quote Details</CardTitle>
						<CardDescription>Basic information about the quote</CardDescription>
					</CardHeader>
					<CardContent>
						<FieldGroup>
							{/* Customer Section */}
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<FieldLabel>Customer</FieldLabel>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => {
											setIsCreatingCustomer(!isCreatingCustomer);
											if (!isCreatingCustomer) {
												setCustomerId('');
											}
										}}
									>
										<User className="h-4 w-4 mr-2" />
										{isCreatingCustomer ? 'Select Existing' : 'New Customer'}
									</Button>
								</div>

								{!isCreatingCustomer ? (
									<Select
										value={customerId || NONE_VALUE}
										onValueChange={(v) => setCustomerId(v === NONE_VALUE ? '' : v)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select customer or leave for walk-in" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NONE_VALUE}>Walk-in Customer</SelectItem>
											{customers?.map((customer) => (
												<SelectItem key={customer.id} value={customer.id}>
													{customer.firstName} {customer.lastName}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
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
							</div>

							{/* Product and Dimension Combo */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<Field>
									<FieldLabel>Product Reference (optional)</FieldLabel>
									<Select
										value={productId || NONE_VALUE}
										onValueChange={(v) => {
											const newValue = v === NONE_VALUE ? '' : v;
											setProductId(newValue);
											setDimensionComboId(''); // Reset combo when product changes
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select product" />
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
							</div>

							{/* Flower Holes */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<Field>
									<FieldLabel>Flower Holes</FieldLabel>
									<Select
										value={flowerHoles}
										onValueChange={(v) => setFlowerHoles(v as FlowerHoleChoice | '')}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select flower holes option" />
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

								<Field>
									<FieldLabel>Valid Until (optional)</FieldLabel>
									<Input
										type="date"
										value={validUntil}
										onChange={(e) => setValidUntil(e.target.value)}
									/>
								</Field>
							</div>

							<Field>
								<FieldLabel>Notes (optional)</FieldLabel>
								<Textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Any special instructions or notes..."
									rows={3}
								/>
							</Field>
						</FieldGroup>
					</CardContent>
				</Card>

				{/* Stone Components Card */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Stone Components</CardTitle>
								<CardDescription>Add stone pieces to this quote</CardDescription>
							</div>
							<Button onClick={handleAddComponent}>
								<Plus className="h-4 w-4 mr-2" />
								Add Component
							</Button>
						</div>
					</CardHeader>
					<CardContent>
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
													value={comp.materialId}
													onValueChange={(v) => updateComponent(comp.id, { materialId: v })}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select material" />
													</SelectTrigger>
													<SelectContent>
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
													value={comp.finishId || ''}
													onValueChange={(v) =>
														updateComponent(comp.id, { finishId: v || undefined })
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select finish" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="">No finish</SelectItem>
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
					</CardContent>
				</Card>

				{/* Lettering Card */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Lettering</CardTitle>
								<CardDescription>Add inscriptions to this quote</CardDescription>
							</div>
							<Button onClick={handleAddLettering}>
								<Plus className="h-4 w-4 mr-2" />
								Add Lettering
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{lettering.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground border rounded-lg">
								No lettering added yet.
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
													value={lett.techniqueId}
													onValueChange={(v) => updateLettering(lett.id, { techniqueId: v })}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select technique" />
													</SelectTrigger>
													<SelectContent>
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
													value={lett.colorId || ''}
													onValueChange={(v) =>
														updateLettering(lett.id, { colorId: v || undefined })
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select color" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="">No color</SelectItem>
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

											<Field>
												<FieldLabel>Applies To</FieldLabel>
												<Select
													value={lett.appliesTo || 'new_memorial'}
													onValueChange={(v) =>
														updateLettering(lett.id, {
															appliesTo: v as 'new_memorial' | 'refurbishment' | 'both',
														})
													}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="new_memorial">New Memorial</SelectItem>
														<SelectItem value="refurbishment">Refurbishment</SelectItem>
														<SelectItem value="both">Both</SelectItem>
													</SelectContent>
												</Select>
											</Field>

											<Field className="md:col-span-3">
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
					</CardContent>
				</Card>

				{/* Sundries Card */}
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
														value={sundry.sundryId}
														onValueChange={(v) =>
															updateSundry(sundry.id, { sundryId: v })
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select item" />
														</SelectTrigger>
														<SelectContent>
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

				{/* Services Card */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Services</CardTitle>
								<CardDescription>Add labor and services</CardDescription>
							</div>
							<Button onClick={handleAddService}>
								<Plus className="h-4 w-4 mr-2" />
								Add Service
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{services.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground border rounded-lg">
								No services added yet.
							</div>
						) : (
							<div className="border rounded-lg">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Service</TableHead>
											<TableHead className="w-[100px]">Quantity</TableHead>
											<TableHead className="w-[150px]">Custom Price</TableHead>
											<TableHead className="w-[80px]"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{services.map((service) => {
											const selectedService = serviceItems?.find(
												(s) => s.id === service.serviceId
											);
											const isQuoted = selectedService?.pricingType === 'quoted';
											return (
												<TableRow key={service.id}>
													<TableCell>
														<Select
															value={service.serviceId}
															onValueChange={(v) =>
																updateService(service.id, { serviceId: v })
															}
														>
															<SelectTrigger>
																<SelectValue placeholder="Select service" />
															</SelectTrigger>
															<SelectContent>
																{serviceItems
																	?.filter((s) => s.isActive)
																	.map((item) => (
																		<SelectItem key={item.id} value={item.id}>
																			{item.name}
																			{item.pricingType === 'quoted' && ' (Quoted)'}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell>
														<Input
															type="number"
															min="1"
															value={service.quantity}
															onChange={(e) =>
																updateService(service.id, {
																	quantity: parseInt(e.target.value) || 1,
																})
															}
														/>
													</TableCell>
													<TableCell>
														<Input
															type="number"
															step="0.01"
															placeholder={isQuoted ? 'Required' : 'Optional'}
															value={service.unitPrice || ''}
															onChange={(e) =>
																updateService(service.id, {
																	unitPrice: e.target.value
																		? parseFloat(e.target.value)
																		: undefined,
																})
															}
														/>
													</TableCell>
													<TableCell>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => removeService(service.id)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						)}
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
