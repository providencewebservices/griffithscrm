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
}

const CONTACT_TYPES = [
	{ value: 'email', label: 'Email' },
	{ value: 'phone', label: 'Phone' },
	{ value: 'mobile', label: 'Mobile' },
	{ value: 'fax', label: 'Fax' },
	{ value: 'other', label: 'Other' },
] as const;

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
		setAddresses([...addresses, { ...emptyAddress }]);
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
											className="flex gap-2 items-start p-3 border rounded-lg"
										>
											<div className="flex-1 grid grid-cols-4 gap-2">
												<Select
													value={contact.type}
													onValueChange={(value) =>
														updateContact(index, {
															type: value as ContactInfoInput['type'],
														})
													}
												>
													<SelectTrigger>
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
													className="col-span-2"
												/>
												<Input
													placeholder="Label (e.g., Work)"
													value={contact.label || ''}
													onChange={(e) =>
														updateContact(index, { label: e.target.value })
													}
												/>
											</div>
											<div className="flex items-center gap-2">
												<label className="flex items-center gap-1 text-xs whitespace-nowrap">
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
													size="sm"
													onClick={() => removeContact(index)}
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
								<div className="space-y-4">
									{addresses.map((address, index) => (
										<div
											key={index}
											className="p-3 border rounded-lg space-y-3"
										>
											<div className="flex justify-between items-start">
												<div className="flex-1 grid grid-cols-4 gap-2">
													<Input
														placeholder="Street #"
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
														className="col-span-3"
													/>
												</div>
											</div>
											<div className="grid grid-cols-4 gap-2">
												<Input
													placeholder="City"
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
													className="col-span-2"
												/>
												<Input
													placeholder="State"
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
												/>
												<Input
													placeholder="ZIP"
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
												/>
											</div>
											<div className="flex gap-2 items-center">
												<Input
													placeholder="Label (e.g., Billing, Home)"
													value={address.label || ''}
													onChange={(e) =>
														updateAddress(index, { label: e.target.value })
													}
													className="w-48"
												/>
												<label className="flex items-center gap-1 text-xs">
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
												<div className="flex-1" />
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => removeAddress(index)}
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</div>
											{address.formattedAddress && (
												<p className="text-xs text-muted-foreground">
													{address.formattedAddress}
												</p>
											)}
										</div>
									))}
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
