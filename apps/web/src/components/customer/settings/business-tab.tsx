import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	type AddressInput,
	useTenantSettingsQuery,
	useUpdateTenantSettingsMutation,
} from '@/hooks/use-tenant-settings';

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

export function BusinessTab() {
	const { data: settings, isLoading, error } = useTenantSettingsQuery();
	const updateMutation = useUpdateTenantSettingsMutation();

	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');
	const [email, setEmail] = useState('');
	const [website, setWebsite] = useState('');
	const [logoUrl, setLogoUrl] = useState<string | null>(null);
	const [logoPreview, setLogoPreview] = useState<string | null>(null);
	const [address, setAddress] = useState<AddressInput>({
		streetNumber: '',
		route: '',
		locality: '',
		administrativeAreaLevel1: '',
		postalCode: '',
		country: 'US',
		formattedAddress: '',
	});
	const [hasAddress, setHasAddress] = useState(false);

	// Load settings into form
	useEffect(() => {
		if (settings) {
			setName(settings.name);
			setPhone(settings.phone || '');
			setEmail(settings.email || '');
			setWebsite(settings.website || '');
			setLogoUrl(settings.logoUrl);
			setLogoPreview(settings.logoSignedUrl);
			if (settings.address) {
				setAddress({
					streetNumber: settings.address.streetNumber || '',
					route: settings.address.route || '',
					locality: settings.address.locality || '',
					administrativeAreaLevel1: settings.address.administrativeAreaLevel1 || '',
					administrativeAreaLevel2: settings.address.administrativeAreaLevel2 || '',
					postalCode: settings.address.postalCode || '',
					postalCodeSuffix: settings.address.postalCodeSuffix || '',
					country: settings.address.country || 'US',
					formattedAddress: settings.address.formattedAddress || '',
					placeId: settings.address.placeId || '',
					latitude: settings.address.latitude || '',
					longitude: settings.address.longitude || '',
					label: settings.address.label || '',
				});
				setHasAddress(true);
			} else {
				setHasAddress(false);
			}
		}
	}, [settings]);

	// Dirty state tracking
	const isDirty = useMemo(() => {
		if (!settings) return false;

		if (name !== settings.name) return true;
		if ((phone || null) !== (settings.phone || null)) {
			if (phone !== (settings.phone || '')) return true;
		}
		if ((email || null) !== (settings.email || null)) {
			if (email !== (settings.email || '')) return true;
		}
		if ((website || null) !== (settings.website || null)) {
			if (website !== (settings.website || '')) return true;
		}
		if (logoUrl !== settings.logoUrl) return true;

		// Address dirty check
		if (hasAddress !== !!settings.address) return true;
		if (hasAddress && settings.address) {
			if ((address.streetNumber || '') !== (settings.address.streetNumber || '')) return true;
			if ((address.route || '') !== (settings.address.route || '')) return true;
			if ((address.locality || '') !== (settings.address.locality || '')) return true;
			if (
				(address.administrativeAreaLevel1 || '') !==
				(settings.address.administrativeAreaLevel1 || '')
			)
				return true;
			if ((address.postalCode || '') !== (settings.address.postalCode || '')) return true;
			if ((address.country || 'US') !== (settings.address.country || 'US')) return true;
		}

		return false;
	}, [settings, name, phone, email, website, logoUrl, hasAddress, address]);

	// Auto-generate formatted address when address components change
	const generateFormattedAddress = (addr: AddressInput): string => {
		const parts = [];
		if (addr.streetNumber && addr.route) {
			parts.push(`${addr.streetNumber} ${addr.route}`);
		} else if (addr.route) {
			parts.push(addr.route);
		}
		if (addr.locality) parts.push(addr.locality);
		if (addr.administrativeAreaLevel1) parts.push(addr.administrativeAreaLevel1);
		if (addr.postalCode) parts.push(addr.postalCode);
		if (addr.country && addr.country !== 'US') parts.push(addr.country);
		return parts.join(', ');
	};

	const updateAddressField = (field: keyof AddressInput, value: string) => {
		const updated = { ...address, [field]: value };
		updated.formattedAddress = generateFormattedAddress(updated);
		setAddress(updated);
	};

	const handleSave = async () => {
		try {
			const payload: {
				name?: string;
				logoUrl?: string | null;
				phone?: string | null;
				email?: string | null;
				website?: string | null;
				address?: AddressInput | null;
			} = {};

			if (name !== settings?.name) {
				payload.name = name;
			}

			if (logoUrl !== settings?.logoUrl) {
				payload.logoUrl = logoUrl;
			}

			if (phone !== (settings?.phone || '')) {
				payload.phone = phone || null;
			}

			if (email !== (settings?.email || '')) {
				payload.email = email || null;
			}

			if (website !== (settings?.website || '')) {
				payload.website = website || null;
			}

			if (hasAddress && address.formattedAddress) {
				payload.address = address;
			} else if (!hasAddress && settings?.address) {
				payload.address = null;
			}

			await updateMutation.mutateAsync(payload);
			toast.success('Business settings saved');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save settings');
		}
	};

	const labels = ADDRESS_LABELS[address.country] || ADDRESS_LABELS.US;
	const countryData = COUNTRIES.find((c) => c.value === address.country);

	if (isLoading) {
		return <div className="text-muted-foreground">Loading settings...</div>;
	}

	if (error) {
		return <div className="text-destructive">Error loading settings: {error.message}</div>;
	}

	return (
		<div className="space-y-8">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Business Information */}
				<Card>
					<CardHeader>
						<CardTitle>Business Information</CardTitle>
					</CardHeader>
					<CardContent>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="businessName">Business Name</FieldLabel>
								<Input
									id="businessName"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Your Business Name"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="businessPhone">Phone</FieldLabel>
								<Input
									id="businessPhone"
									type="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="+44 1234 567890"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="businessEmail">Email</FieldLabel>
								<Input
									id="businessEmail"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="info@yourbusiness.com"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="businessWebsite">Website</FieldLabel>
								<Input
									id="businessWebsite"
									type="url"
									value={website}
									onChange={(e) => setWebsite(e.target.value)}
									placeholder="https://yourbusiness.com"
								/>
							</Field>
						</FieldGroup>
					</CardContent>
				</Card>

				{/* Business Logo */}
				<Card>
					<CardHeader>
						<CardTitle>Business Logo</CardTitle>
					</CardHeader>
					<CardContent>
						<ImageUpload
							value={logoPreview}
							onChange={(url) => {
								setLogoUrl(url);
								if (!url) setLogoPreview(null);
							}}
							category="branding"
							entityId={settings?.id || 'logo'}
							compact
						/>
						<p className="text-sm text-muted-foreground mt-2">
							This logo will appear on customer-facing quotes and emails.
						</p>
					</CardContent>
				</Card>

				{/* Business Address */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex justify-between items-center">
							<span>Business Address</span>
							{!hasAddress && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setHasAddress(true)}
								>
									Add Address
								</Button>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{hasAddress ? (
							<div className="space-y-4">
								<Select
									value={address.country}
									onValueChange={(value) => updateAddressField('country', value)}
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
										onChange={(e) => updateAddressField('streetNumber', e.target.value)}
										className="w-28"
									/>
									<Input
										placeholder="Street Name"
										value={address.route || ''}
										onChange={(e) => updateAddressField('route', e.target.value)}
										className="flex-1"
									/>
								</div>

								<div className="flex gap-2">
									<Input
										placeholder={labels.locality}
										value={address.locality || ''}
										onChange={(e) => updateAddressField('locality', e.target.value)}
										className="flex-1"
									/>
									<Input
										placeholder={labels.region}
										value={address.administrativeAreaLevel1 || ''}
										onChange={(e) => updateAddressField('administrativeAreaLevel1', e.target.value)}
										className="w-24"
									/>
									<Input
										placeholder={labels.postal}
										value={address.postalCode || ''}
										onChange={(e) => updateAddressField('postalCode', e.target.value)}
										className="w-28"
									/>
								</div>

								{address.formattedAddress && (
									<p className="text-sm text-muted-foreground pt-2 border-t">
										{address.formattedAddress}
									</p>
								)}

								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-destructive"
									onClick={() => {
										setHasAddress(false);
										setAddress({
											streetNumber: '',
											route: '',
											locality: '',
											administrativeAreaLevel1: '',
											postalCode: '',
											country: 'US',
											formattedAddress: '',
										});
									}}
								>
									Remove Address
								</Button>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								No business address set. Add one to set the default country for customer addresses.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Save Button */}
			<div className="flex items-center justify-end gap-3">
				{isDirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
				<Button onClick={handleSave} disabled={updateMutation.isPending || !isDirty}>
					{updateMutation.isPending ? 'Saving...' : 'Save Settings'}
				</Button>
			</div>
		</div>
	);
}
