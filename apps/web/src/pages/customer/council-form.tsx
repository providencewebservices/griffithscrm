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
	useCouncilQuery,
	useCreateCouncilMutation,
	useUpdateCouncilMutation,
	type CreateCouncilInput,
	type ContactInfoInput,
	type AddressInput,
} from '@/hooks/use-councils';

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
	country: 'GB',
	formattedAddress: '',
	label: '',
	isPrimary: false,
};

export function CouncilFormPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const isEditing = !!id;

	const { data: existingData, isLoading: isLoadingData } = useCouncilQuery(id);
	const createMutation = useCreateCouncilMutation();
	const updateMutation = useUpdateCouncilMutation();

	const [councilName, setCouncilName] = useState('');
	const [cemeteryName, setCemeteryName] = useState('');
	const [department, setDepartment] = useState('');
	const [permitRequired, setPermitRequired] = useState(false);
	const [permitFee, setPermitFee] = useState('');
	const [foundationSpec, setFoundationSpec] = useState('');
	const [maxHeadstoneHeight, setMaxHeadstoneHeight] = useState('');
	const [maxHeadstoneWidth, setMaxHeadstoneWidth] = useState('');
	const [approvedMaterials, setApprovedMaterials] = useState('');
	const [installationRules, setInstallationRules] = useState('');
	const [notes, setNotes] = useState('');
	const [contacts, setContacts] = useState<ContactInfoInput[]>([]);
	const [addresses, setAddresses] = useState<AddressInput[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (existingData) {
			setCouncilName(existingData.councilName);
			setCemeteryName(existingData.cemeteryName || '');
			setDepartment(existingData.department || '');
			setPermitRequired(existingData.permitRequired);
			setPermitFee(existingData.permitFee || '');
			setFoundationSpec(existingData.foundationSpec || '');
			setMaxHeadstoneHeight(existingData.maxHeadstoneHeight || '');
			setMaxHeadstoneWidth(existingData.maxHeadstoneWidth || '');
			setApprovedMaterials(existingData.approvedMaterials || '');
			setInstallationRules(existingData.installationRules || '');
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

		const data: CreateCouncilInput = {
			councilName,
			cemeteryName: cemeteryName || undefined,
			department: department || undefined,
			permitRequired,
			permitFee: permitFee ? parseFloat(permitFee) : undefined,
			foundationSpec: foundationSpec || undefined,
			maxHeadstoneHeight: maxHeadstoneHeight || undefined,
			maxHeadstoneWidth: maxHeadstoneWidth || undefined,
			approvedMaterials: approvedMaterials || undefined,
			installationRules: installationRules || undefined,
			notes: notes || undefined,
			contactInfo: contacts.filter((c) => c.value.trim()),
			addresses: addresses.filter((a) => a.formattedAddress.trim()),
		};

		try {
			if (isEditing && id) {
				await updateMutation.mutateAsync({ id, ...data });
				navigate(`/app/councils/${id}`);
			} else {
				const result = await createMutation.mutateAsync(data);
				navigate(`/app/councils/${result.id}`);
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
					<h2 className="text-2xl font-bold">Edit Council</h2>
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
							<Link to="/app/councils">Councils</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>
							{isEditing ? 'Edit' : 'New Council'}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="mb-6">
				<h2 className="text-2xl font-bold">
					{isEditing ? 'Edit Council' : 'New Council'}
				</h2>
				<p className="text-muted-foreground mt-1">
					{isEditing
						? 'Update council details'
						: 'Add a new council to your records'}
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
							<CardTitle>Council Information</CardTitle>
							<CardDescription>Basic council details</CardDescription>
						</CardHeader>
						<CardContent>
							<FieldGroup>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Field>
										<FieldLabel htmlFor="councilName">Council Name *</FieldLabel>
										<Input
											id="councilName"
											value={councilName}
											onChange={(e) => setCouncilName(e.target.value)}
											required
											placeholder="e.g., Chester City Council"
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="cemeteryName">Cemetery Name</FieldLabel>
										<Input
											id="cemeteryName"
											value={cemeteryName}
											onChange={(e) => setCemeteryName(e.target.value)}
											placeholder="e.g., Blacon Cemetery"
										/>
									</Field>
								</div>
								<Field>
									<FieldLabel htmlFor="department">Department</FieldLabel>
									<Input
										id="department"
										value={department}
										onChange={(e) => setDepartment(e.target.value)}
										placeholder="e.g., Bereavement Services"
									/>
								</Field>
							</FieldGroup>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Permit Requirements</CardTitle>
							<CardDescription>Memorial installation permit details</CardDescription>
						</CardHeader>
						<CardContent>
							<FieldGroup>
								<label className="flex items-center gap-3 mb-4 cursor-pointer">
									<Checkbox
										id="permitRequired"
										checked={permitRequired}
										onCheckedChange={(checked) => setPermitRequired(checked === true)}
									/>
									<span className="text-sm font-medium">Permit Required</span>
								</label>
								{permitRequired && (
									<Field>
										<FieldLabel htmlFor="permitFee">Permit Fee</FieldLabel>
										<Input
											id="permitFee"
											type="number"
											step="0.01"
											min="0"
											value={permitFee}
											onChange={(e) => setPermitFee(e.target.value)}
											placeholder="e.g., 150.00"
										/>
									</Field>
								)}
							</FieldGroup>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Memorial Specifications</CardTitle>
							<CardDescription>Size limits and material requirements</CardDescription>
						</CardHeader>
						<CardContent>
							<FieldGroup>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Field>
										<FieldLabel htmlFor="maxHeadstoneHeight">Max Headstone Height</FieldLabel>
										<Input
											id="maxHeadstoneHeight"
											value={maxHeadstoneHeight}
											onChange={(e) => setMaxHeadstoneHeight(e.target.value)}
											placeholder="e.g., 3ft 6in or 1067mm"
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="maxHeadstoneWidth">Max Headstone Width</FieldLabel>
										<Input
											id="maxHeadstoneWidth"
											value={maxHeadstoneWidth}
											onChange={(e) => setMaxHeadstoneWidth(e.target.value)}
											placeholder="e.g., 2ft 6in or 762mm"
										/>
									</Field>
								</div>
								<Field>
									<FieldLabel htmlFor="foundationSpec">Foundation Specification</FieldLabel>
									<Textarea
										id="foundationSpec"
										value={foundationSpec}
										onChange={(e) => setFoundationSpec(e.target.value)}
										placeholder="e.g., Concrete foundation required, minimum depth 18 inches..."
										rows={3}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="approvedMaterials">Approved Materials</FieldLabel>
									<Textarea
										id="approvedMaterials"
										value={approvedMaterials}
										onChange={(e) => setApprovedMaterials(e.target.value)}
										placeholder="e.g., Granite, Marble, Slate..."
										rows={3}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="installationRules">Installation Rules</FieldLabel>
									<Textarea
										id="installationRules"
										value={installationRules}
										onChange={(e) => setInstallationRules(e.target.value)}
										placeholder="e.g., Memorials must be fixed with ground anchors..."
										rows={3}
									/>
								</Field>
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
								placeholder="Any additional notes about this council..."
								rows={4}
							/>
						</CardContent>
					</Card>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate('/app/councils')}
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
								: 'Create Council'}
					</Button>
				</div>
			</form>
		</div>
	);
}
