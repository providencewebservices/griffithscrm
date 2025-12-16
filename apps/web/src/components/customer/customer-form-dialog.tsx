import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
	FieldError,
} from '@/components/ui/field';
import { Plus, Trash2 } from 'lucide-react';
import type {
	CustomerWithRelations,
	ContactInfoInput,
	AddressInput,
	CreateCustomerInput,
} from '@/hooks/use-customers';

interface CustomerFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: CreateCustomerInput) => void;
	customer?: CustomerWithRelations | null;
	isLoading?: boolean;
	error?: string | null;
	defaultCountry?: string;
}

const CONTACT_TYPES = [
	{ value: 'email', label: 'Email' },
	{ value: 'phone', label: 'Phone' },
	{ value: 'mobile', label: 'Mobile' },
	{ value: 'fax', label: 'Fax' },
	{ value: 'other', label: 'Other' },
] as const;

const COUNTRIES = [
	{ value: 'US', label: 'United States', flag: '🇺🇸' },
	{ value: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
] as const;

const ADDRESS_LABELS: Record<
	string,
	{ streetNumber: string; locality: string; region: string; postal: string }
> = {
	US: { streetNumber: 'Street #', locality: 'City', region: 'State', postal: 'ZIP' },
	GB: { streetNumber: 'House #/Name', locality: 'City/Town', region: 'County', postal: 'Postcode' },
};

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
	country: 'US',
	formattedAddress: '',
	label: '',
	isPrimary: false,
};

export function CustomerFormDialog({
	open,
	onOpenChange,
	onSubmit,
	customer,
	isLoading,
	error,
	defaultCountry = 'US',
}: CustomerFormDialogProps) {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [contacts, setContacts] = useState<ContactInfoInput[]>([]);
	const [addresses, setAddresses] = useState<AddressInput[]>([]);

	const isEditing = !!customer;

	useEffect(() => {
		if (customer) {
			setFirstName(customer.firstName);
			setLastName(customer.lastName);
			setContacts(
				customer.contactInfo.map((c) => ({
					type: c.type,
					value: c.value,
					label: c.label || '',
					isPrimary: c.isPrimary,
				}))
			);
			setAddresses(
				customer.addresses.map((a) => ({
					streetNumber: a.streetNumber || '',
					route: a.route || '',
					locality: a.locality || '',
					administrativeAreaLevel1: a.administrativeAreaLevel1 || '',
					administrativeAreaLevel2: a.administrativeAreaLevel2 || '',
					postalCode: a.postalCode || '',
					postalCodeSuffix: a.postalCodeSuffix || '',
					country: a.country || 'US',
					formattedAddress: a.formattedAddress,
					placeId: a.placeId || '',
					latitude: a.latitude || '',
					longitude: a.longitude || '',
					label: a.label || '',
					isPrimary: a.isPrimary,
				}))
			);
		} else {
			setFirstName('');
			setLastName('');
			setContacts([]);
			setAddresses([]);
		}
	}, [customer, open]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit({
			firstName,
			lastName,
			contactInfo: contacts.filter((c) => c.value.trim()),
			addresses: addresses.filter((a) => a.formattedAddress.trim()),
		});
	};

	const addContact = () => {
		setContacts([...contacts, { ...emptyContact }]);
	};

	const removeContact = (index: number) => {
		setContacts(contacts.filter((_, i) => i !== index));
	};

	const updateContact = (index: number, updates: Partial<ContactInfoInput>) => {
		setContacts(
			contacts.map((c, i) => (i === index ? { ...c, ...updates } : c))
		);
	};

	const addAddress = () => {
		setAddresses([...addresses, { ...emptyAddress, country: defaultCountry }]);
	};

	const removeAddress = (index: number) => {
		setAddresses(addresses.filter((_, i) => i !== index));
	};

	const updateAddress = (index: number, updates: Partial<AddressInput>) => {
		setAddresses(
			addresses.map((a, i) => (i === index ? { ...a, ...updates } : a))
		);
	};

	// Auto-generate formatted address when address components change
	const generateFormattedAddress = (address: AddressInput): string => {
		const parts = [];
		if (address.streetNumber && address.route) {
			parts.push(`${address.streetNumber} ${address.route}`);
		} else if (address.route) {
			parts.push(address.route);
		}
		if (address.locality) parts.push(address.locality);
		if (address.administrativeAreaLevel1)
			parts.push(address.administrativeAreaLevel1);
		if (address.postalCode) parts.push(address.postalCode);
		if (address.country && address.country !== 'US')
			parts.push(address.country);
		return parts.join(', ');
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? 'Edit Customer' : 'Add Customer'}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the customer details.'
							: 'Add a new customer to your database.'}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-6">
						{error && (
							<div className="bg-destructive/10 text-destructive px-4 py-2 rounded text-sm">
								{error}
							</div>
						)}

						{/* Basic Info */}
						<div>
							<h3 className="text-sm font-medium mb-3">Basic Information</h3>
							<FieldGroup>
								<div className="grid grid-cols-2 gap-4">
									<Field>
										<FieldLabel htmlFor="firstName">First Name</FieldLabel>
										<Input
											id="firstName"
											value={firstName}
											onChange={(e) => setFirstName(e.target.value)}
											required
											placeholder="John"
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="lastName">Last Name</FieldLabel>
										<Input
											id="lastName"
											value={lastName}
											onChange={(e) => setLastName(e.target.value)}
											required
											placeholder="Doe"
										/>
									</Field>
								</div>
							</FieldGroup>
						</div>

						{/* Contact Information */}
						<div>
							<div className="flex justify-between items-center mb-3">
								<h3 className="text-sm font-medium">Contact Information</h3>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addContact}
								>
									<Plus className="h-4 w-4 mr-1" />
									Add Contact
								</Button>
							</div>
							{contacts.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No contact information added.
								</p>
							) : (
								<div className="space-y-3">
									{contacts.map((contact, index) => (
										<div
											key={index}
											className="p-3 border rounded-lg space-y-2"
										>
											<div className="flex gap-2">
												<Select
													value={contact.type}
													onValueChange={(value) =>
														updateContact(index, {
															type: value as ContactInfoInput['type'],
														})
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
													placeholder={
														contact.type === 'email'
															? 'email@example.com'
															: '(555) 123-4567'
													}
													value={contact.value}
													onChange={(e) =>
														updateContact(index, { value: e.target.value })
													}
													className="flex-1"
												/>
											</div>
											<div className="flex gap-2 items-center">
												<Input
													placeholder="Label (optional)"
													value={contact.label || ''}
													onChange={(e) =>
														updateContact(index, { label: e.target.value })
													}
													className="flex-1"
												/>
												<label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
													<Checkbox
														checked={contact.isPrimary}
														onCheckedChange={(checked) =>
															updateContact(index, {
																isPrimary: checked === true,
															})
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
						</div>

						{/* Addresses */}
						<div>
							<div className="flex justify-between items-center mb-3">
								<h3 className="text-sm font-medium">Addresses</h3>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addAddress}
								>
									<Plus className="h-4 w-4 mr-1" />
									Add Address
								</Button>
							</div>
							{addresses.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No addresses added.
								</p>
							) : (
								<div className="space-y-3">
									{addresses.map((address, index) => {
										const countryCode = address.country || 'US';
										const labels = ADDRESS_LABELS[countryCode] || ADDRESS_LABELS.US;
										const countryData = COUNTRIES.find((c) => c.value === countryCode);
										return (
											<div
												key={index}
												className="p-3 border rounded-lg space-y-2"
											>
												<Select
													value={address.country}
													onValueChange={(value) => {
														const updated = { ...address, country: value };
														updated.formattedAddress =
															generateFormattedAddress(updated);
														updateAddress(index, updated);
													}}
												>
													<SelectTrigger className="w-full">
														<SelectValue>
															{countryData && `${countryData.flag} ${countryData.label}`}
														</SelectValue>
													</SelectTrigger>
													<SelectContent>
														{COUNTRIES.map((country) => (
															<SelectItem key={country.value} value={country.value}>
																{country.flag} {country.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<div className="flex gap-2">
													<Input
														placeholder={labels.streetNumber}
														value={address.streetNumber || ''}
														onChange={(e) => {
															const updated = {
																...address,
																streetNumber: e.target.value,
															};
															updated.formattedAddress =
																generateFormattedAddress(updated);
															updateAddress(index, updated);
														}}
														className="w-28"
													/>
													<Input
														placeholder="Street Name"
														value={address.route || ''}
														onChange={(e) => {
															const updated = {
																...address,
																route: e.target.value,
															};
															updated.formattedAddress =
																generateFormattedAddress(updated);
															updateAddress(index, updated);
														}}
														className="flex-1"
													/>
												</div>
												<div className="flex gap-2">
													<Input
														placeholder={labels.locality}
														value={address.locality || ''}
														onChange={(e) => {
															const updated = {
																...address,
																locality: e.target.value,
															};
															updated.formattedAddress =
																generateFormattedAddress(updated);
															updateAddress(index, updated);
														}}
														className="flex-1"
													/>
													<Input
														placeholder={labels.region}
														value={address.administrativeAreaLevel1 || ''}
														onChange={(e) => {
															const updated = {
																...address,
																administrativeAreaLevel1: e.target.value,
															};
															updated.formattedAddress =
																generateFormattedAddress(updated);
															updateAddress(index, updated);
														}}
														className="w-24"
													/>
													<Input
														placeholder={labels.postal}
														value={address.postalCode || ''}
														onChange={(e) => {
															const updated = {
																...address,
																postalCode: e.target.value,
															};
															updated.formattedAddress =
																generateFormattedAddress(updated);
															updateAddress(index, updated);
														}}
														className="w-28"
													/>
												</div>
												<div className="flex gap-2 items-center">
													<Input
														placeholder="Label (optional)"
														value={address.label || ''}
														onChange={(e) =>
															updateAddress(index, { label: e.target.value })
														}
														className="flex-1"
													/>
													<label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
														<Checkbox
															checked={address.isPrimary}
															onCheckedChange={(checked) =>
																updateAddress(index, {
																	isPrimary: checked === true,
																})
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
										);
									})}
								</div>
							)}
						</div>
					</div>

					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
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
									: 'Create Customer'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
