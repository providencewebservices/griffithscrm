import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Field,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Plus, Trash2 } from 'lucide-react';
import {
	useSupplierQuery,
	useCreateSupplierMutation,
	useUpdateSupplierMutation,
	PAYMENT_TERM_LABELS,
	type CreateSupplierInput,
	type ContactInfoInput,
	type AddressInput,
	type PaymentTerms,
} from '@/hooks/use-suppliers';

const CONTACT_TYPES = [
	{ value: 'email', label: 'Email' },
	{ value: 'phone', label: 'Phone' },
	{ value: 'mobile', label: 'Mobile' },
	{ value: 'fax', label: 'Fax' },
	{ value: 'other', label: 'Other' },
] as const;

const PAYMENT_TERM_OPTIONS = Object.entries(PAYMENT_TERM_LABELS).map(([value, label]) => ({
	value,
	label,
}));

const emptyContact: ContactInfoInput = {
	type: 'email',
	value: '',
	label: '',
	isPrimary: false,
};

const emptyAddress: AddressInput = {
	streetNumber: '',
	route: '',
	locality: '',
	administrativeAreaLevel1: '',
	postalCode: '',
	country: 'GB',
	formattedAddress: '',
	label: '',
	isPrimary: false,
};

export function SupplierFormPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const isEditing = !!id;

	const { data: existingData, isLoading: isLoadingData } = useSupplierQuery(id);
	const createMutation = useCreateSupplierMutation();
	const updateMutation = useUpdateSupplierMutation();

	const [businessName, setBusinessName] = useState('');
	const [tradingName, setTradingName] = useState('');
	const [accountNumber, setAccountNumber] = useState('');
	const [website, setWebsite] = useState('');
	const [paymentTerms, setPaymentTerms] = useState<PaymentTerms | ''>('');
	const [defaultLeadTimeDays, setDefaultLeadTimeDays] = useState('');
	const [minimumOrderValue, setMinimumOrderValue] = useState('');
	const [notes, setNotes] = useState('');
	const [contacts, setContacts] = useState<ContactInfoInput[]>([]);
	const [addresses, setAddresses] = useState<AddressInput[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (existingData) {
			setBusinessName(existingData.businessName);
			setTradingName(existingData.tradingName || '');
			setAccountNumber(existingData.accountNumber || '');
			setWebsite(existingData.website || '');
			setPaymentTerms((existingData.paymentTerms as PaymentTerms) || '');
			setDefaultLeadTimeDays(existingData.defaultLeadTimeDays?.toString() || '');
			setMinimumOrderValue(existingData.minimumOrderValue || '');
			setNotes(existingData.notes || '');
			setContacts(
				existingData.contactInfo.map((c) => ({
					type: c.type,
					value: c.value,
					label: c.label || '',
					isPrimary: c.isPrimary,
				}))
			);
			setAddresses(
				existingData.addresses.map((a) => ({
					streetNumber: a.streetNumber || '',
					route: a.route || '',
					locality: a.locality || '',
					administrativeAreaLevel1: a.administrativeAreaLevel1 || '',
					postalCode: a.postalCode || '',
					country: a.country || 'GB',
					formattedAddress: a.formattedAddress,
					label: a.label || '',
					isPrimary: a.isPrimary,
				}))
			);
		}
	}, [existingData]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		const data: CreateSupplierInput = {
			businessName,
			tradingName: tradingName || undefined,
			accountNumber: accountNumber || undefined,
			website: website || undefined,
			paymentTerms: paymentTerms || undefined,
			defaultLeadTimeDays: defaultLeadTimeDays ? parseInt(defaultLeadTimeDays) : undefined,
			minimumOrderValue: minimumOrderValue ? parseFloat(minimumOrderValue) : undefined,
			notes: notes || undefined,
			contactInfo: contacts.filter((c) => c.value.trim()),
			addresses: addresses.filter((a) => a.formattedAddress.trim()),
		};

		try {
			if (isEditing && id) {
				await updateMutation.mutateAsync({ id, ...data });
				navigate(`/app/suppliers/${id}`);
			} else {
				const result = await createMutation.mutateAsync(data);
				navigate(`/app/suppliers/${result.id}`);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const addContact = () => {
		setContacts([...contacts, { ...emptyContact }]);
	};

	const removeContact = (index: number) => {
		setContacts(contacts.filter((_, i) => i !== index));
	};

	const updateContact = (index: number, updates: Partial<ContactInfoInput>) => {
		setContacts(contacts.map((c, i) => (i === index ? { ...c, ...updates } : c)));
	};

	const addAddress = () => {
		setAddresses([...addresses, { ...emptyAddress }]);
	};

	const removeAddress = (index: number) => {
		setAddresses(addresses.filter((_, i) => i !== index));
	};

	const updateAddress = (index: number, updates: Partial<AddressInput>) => {
		setAddresses(addresses.map((a, i) => (i === index ? { ...a, ...updates } : a)));
	};

	const generateFormattedAddress = (address: AddressInput): string => {
		const parts = [];
		if (address.streetNumber && address.route) {
			parts.push(`${address.streetNumber} ${address.route}`);
		} else if (address.route) {
			parts.push(address.route);
		}
		if (address.locality) parts.push(address.locality);
		if (address.administrativeAreaLevel1) parts.push(address.administrativeAreaLevel1);
		if (address.postalCode) parts.push(address.postalCode);
		return parts.join(', ');
	};

	const isLoading = createMutation.isPending || updateMutation.isPending;

	if (isEditing && isLoadingData) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Edit Supplier</h2>
				</div>
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/suppliers">Suppliers</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>
							{isEditing ? 'Edit' : 'New Supplier'}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="mb-6">
				<h2 className="text-2xl font-bold">
					{isEditing ? 'Edit Supplier' : 'New Supplier'}
				</h2>
				<p className="text-muted-foreground mt-1">
					{isEditing
						? 'Update supplier details'
						: 'Add a new supplier to your records'}
				</p>
			</div>

			{error && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit}>
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Business Information</CardTitle>
							<CardDescription>Basic business details</CardDescription>
						</CardHeader>
						<CardContent>
							<FieldGroup>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Field>
										<FieldLabel htmlFor="businessName">Business Name *</FieldLabel>
										<Input
											id="businessName"
											value={businessName}
											onChange={(e) => setBusinessName(e.target.value)}
											required
											placeholder="e.g., ABC Stone Supplies Ltd"
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="tradingName">Trading Name</FieldLabel>
										<Input
											id="tradingName"
											value={tradingName}
											onChange={(e) => setTradingName(e.target.value)}
											placeholder="e.g., ABC Stone"
										/>
									</Field>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Field>
										<FieldLabel htmlFor="accountNumber">Account Number</FieldLabel>
										<Input
											id="accountNumber"
											value={accountNumber}
											onChange={(e) => setAccountNumber(e.target.value)}
											placeholder="Your account number with this supplier"
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="website">Website</FieldLabel>
										<Input
											id="website"
											type="url"
											value={website}
											onChange={(e) => setWebsite(e.target.value)}
											placeholder="https://www.example.com"
										/>
									</Field>
								</div>
							</FieldGroup>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Account Terms</CardTitle>
							<CardDescription>Payment and ordering information</CardDescription>
						</CardHeader>
						<CardContent>
							<FieldGroup>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<Field>
										<FieldLabel htmlFor="paymentTerms">Payment Terms</FieldLabel>
										<Select
											value={paymentTerms}
											onValueChange={(v) => setPaymentTerms(v as PaymentTerms)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select payment terms" />
											</SelectTrigger>
											<SelectContent>
												{PAYMENT_TERM_OPTIONS.map((opt) => (
													<SelectItem key={opt.value} value={opt.value}>
														{opt.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
									<Field>
										<FieldLabel htmlFor="defaultLeadTimeDays">Default Lead Time (days)</FieldLabel>
										<Input
											id="defaultLeadTimeDays"
											type="number"
											min="0"
											value={defaultLeadTimeDays}
											onChange={(e) => setDefaultLeadTimeDays(e.target.value)}
											placeholder="e.g., 14"
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="minimumOrderValue">Minimum Order Value</FieldLabel>
										<Input
											id="minimumOrderValue"
											type="number"
											step="0.01"
											min="0"
											value={minimumOrderValue}
											onChange={(e) => setMinimumOrderValue(e.target.value)}
											placeholder="e.g., 100.00"
										/>
									</Field>
								</div>
							</FieldGroup>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div className="flex justify-between items-center">
								<div>
									<CardTitle>Contact Information</CardTitle>
									<CardDescription>Email addresses and phone numbers</CardDescription>
								</div>
								<Button type="button" variant="outline" size="sm" onClick={addContact}>
									<Plus className="h-4 w-4 mr-1" />
									Add Contact
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							{contacts.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No contact information added.
								</p>
							) : (
								<div className="space-y-3">
									{contacts.map((contact, index) => (
										<div key={index} className="p-3 border rounded-lg space-y-2">
											<div className="flex gap-2">
												<Select
													value={contact.type}
													onValueChange={(value) =>
														updateContact(index, { type: value as ContactInfoInput['type'] })
													}
												>
													<SelectTrigger className="w-28">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{CONTACT_TYPES.map((type) => (
															<SelectItem key={type.value} value={type.value}>
																{type.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<Input
													placeholder={contact.type === 'email' ? 'email@example.com' : '01onal 123456'}
													value={contact.value}
													onChange={(e) => updateContact(index, { value: e.target.value })}
													className="flex-1"
												/>
											</div>
											<div className="flex gap-2 items-center">
												<Input
													placeholder="Label (optional)"
													value={contact.label || ''}
													onChange={(e) => updateContact(index, { label: e.target.value })}
													className="flex-1"
												/>
												<label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
													<Checkbox
														checked={contact.isPrimary}
														onCheckedChange={(checked) =>
															updateContact(index, { isPrimary: checked === true })
														}
													/>
													Primary
												</label>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removeContact(index)}
													className="h-8 w-8 shrink-0"
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div className="flex justify-between items-center">
								<div>
									<CardTitle>Addresses</CardTitle>
									<CardDescription>Physical locations</CardDescription>
								</div>
								<Button type="button" variant="outline" size="sm" onClick={addAddress}>
									<Plus className="h-4 w-4 mr-1" />
									Add Address
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							{addresses.length === 0 ? (
								<p className="text-sm text-muted-foreground">No addresses added.</p>
							) : (
								<div className="space-y-3">
									{addresses.map((address, index) => (
										<div key={index} className="p-3 border rounded-lg space-y-2">
											<div className="flex gap-2">
												<Input
													placeholder="House #/Name"
													value={address.streetNumber || ''}
													onChange={(e) => {
														const updated = { ...address, streetNumber: e.target.value };
														updated.formattedAddress = generateFormattedAddress(updated);
														updateAddress(index, updated);
													}}
													className="w-28"
												/>
												<Input
													placeholder="Street Name"
													value={address.route || ''}
													onChange={(e) => {
														const updated = { ...address, route: e.target.value };
														updated.formattedAddress = generateFormattedAddress(updated);
														updateAddress(index, updated);
													}}
													className="flex-1"
												/>
											</div>
											<div className="flex gap-2">
												<Input
													placeholder="City/Town"
													value={address.locality || ''}
													onChange={(e) => {
														const updated = { ...address, locality: e.target.value };
														updated.formattedAddress = generateFormattedAddress(updated);
														updateAddress(index, updated);
													}}
													className="flex-1"
												/>
												<Input
													placeholder="County"
													value={address.administrativeAreaLevel1 || ''}
													onChange={(e) => {
														const updated = { ...address, administrativeAreaLevel1: e.target.value };
														updated.formattedAddress = generateFormattedAddress(updated);
														updateAddress(index, updated);
													}}
													className="w-32"
												/>
												<Input
													placeholder="Postcode"
													value={address.postalCode || ''}
													onChange={(e) => {
														const updated = { ...address, postalCode: e.target.value };
														updated.formattedAddress = generateFormattedAddress(updated);
														updateAddress(index, updated);
													}}
													className="w-28"
												/>
											</div>
											<div className="flex gap-2 items-center">
												<Input
													placeholder="Label (optional)"
													value={address.label || ''}
													onChange={(e) => updateAddress(index, { label: e.target.value })}
													className="flex-1"
												/>
												<label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
													<Checkbox
														checked={address.isPrimary}
														onCheckedChange={(checked) =>
															updateAddress(index, { isPrimary: checked === true })
														}
													/>
													Primary
												</label>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removeAddress(index)}
													className="h-8 w-8 shrink-0"
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</div>
											{address.formattedAddress && (
												<p className="text-xs text-muted-foreground pt-1 border-t">
													{address.formattedAddress}
												</p>
											)}
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Notes</CardTitle>
							<CardDescription>Additional information</CardDescription>
						</CardHeader>
						<CardContent>
							<Textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Any additional notes about this supplier..."
								rows={4}
							/>
						</CardContent>
					</Card>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate('/app/suppliers')}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isLoading}>
						{isLoading
							? isEditing
								? 'Saving...'
								: 'Creating...'
							: isEditing
								? 'Save Changes'
								: 'Create Supplier'}
					</Button>
				</div>
			</form>
		</div>
	);
}
