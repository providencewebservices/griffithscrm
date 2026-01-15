import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
	useTenantSettingsQuery,
	useUpdateTenantSettingsMutation,
	type AddressInput,
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
			const payload: { name?: string; address?: AddressInput | null } = {};

			if (name !== settings?.name) {
				payload.name = name;
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
		return (
			<div className="text-destructive">
				Error loading settings: {error.message}
			</div>
		);
	}

	return (
		<div className="max-w-2xl space-y-8">
			{/* Business Name */}
			<div className="border rounded-lg p-6">
				<h3 className="text-lg font-semibold mb-4">Business Information</h3>
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
				</FieldGroup>
			</div>

			{/* Business Address */}
			<div className="border rounded-lg p-6">
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-semibold">Business Address</h3>
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
				</div>

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
			</div>

			{/* Save Button */}
			<div className="flex justify-end">
				<Button
					onClick={handleSave}
					disabled={updateMutation.isPending}
				>
					{updateMutation.isPending ? 'Saving...' : 'Save Settings'}
				</Button>
			</div>
		</div>
	);
}
