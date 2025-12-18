import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
import {
	useTenantPricingSettingsQuery,
	useUpdateTenantPricingSettingsMutation,
} from '@/hooks/use-tenant-pricing-settings';

export function PricingTab() {
	const { data: settings, isLoading, error } = useTenantPricingSettingsQuery();
	const updateMutation = useUpdateTenantPricingSettingsMutation();

	const [defaultMarkupPercent, setDefaultMarkupPercent] = useState('100');
	const [vatRate, setVatRate] = useState('0');
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveSuccess, setSaveSuccess] = useState(false);

	// Load settings into form
	useEffect(() => {
		if (settings) {
			setDefaultMarkupPercent(settings.defaultMarkupPercent);
			// Convert VAT rate from decimal (0.20) to percentage (20)
			const vatPercent = parseFloat(settings.vatRate) * 100;
			setVatRate(String(vatPercent));
		}
	}, [settings]);

	const handleSave = async () => {
		setSaveError(null);
		setSaveSuccess(false);

		try {
			const markupNum = parseFloat(defaultMarkupPercent);
			const vatNum = parseFloat(vatRate) / 100; // Convert percentage back to decimal

			if (isNaN(markupNum) || markupNum < 0) {
				setSaveError('Markup percentage must be a valid number 0 or greater');
				return;
			}

			if (isNaN(vatNum) || vatNum < 0 || vatNum > 1) {
				setSaveError('VAT rate must be between 0 and 100%');
				return;
			}

			await updateMutation.mutateAsync({
				defaultMarkupPercent: markupNum,
				vatRate: vatNum,
			});

			setSaveSuccess(true);
			setTimeout(() => setSaveSuccess(false), 3000);
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
		}
	};

	// Calculate example retail price
	const markupNum = parseFloat(defaultMarkupPercent) || 0;
	const multiplier = 1 + markupNum / 100;
	const exampleCost = 100;
	const exampleRetail = exampleCost * multiplier;

	if (isLoading) {
		return <div className="text-muted-foreground">Loading pricing settings...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading pricing settings: {error.message}
			</div>
		);
	}

	return (
		<div className="max-w-2xl space-y-8">
			{saveError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
					{saveError}
				</div>
			)}

			{saveSuccess && (
				<div className="bg-green-500/10 text-green-600 px-4 py-2 rounded">
					Pricing settings saved successfully!
				</div>
			)}

			{/* Default Markup */}
			<div className="border rounded-lg p-6">
				<h3 className="text-lg font-semibold mb-4">Default Markup</h3>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="defaultMarkup">Default Markup Percentage</FieldLabel>
						<FieldDescription>
							The default markup percentage applied to supplier costs. 100% markup means the retail price is 2x the supplier cost.
						</FieldDescription>
						<div className="flex items-center gap-2 mt-2">
							<Input
								id="defaultMarkup"
								type="number"
								min="0"
								step="1"
								value={defaultMarkupPercent}
								onChange={(e) => setDefaultMarkupPercent(e.target.value)}
								className="w-24"
							/>
							<span className="text-muted-foreground">%</span>
						</div>
					</Field>
				</FieldGroup>

				<div className="mt-4 p-4 bg-muted/50 rounded-lg">
					<p className="text-sm text-muted-foreground">
						<strong>Example:</strong> A supplier cost of {'\u00A3'}{exampleCost.toFixed(2)} with {markupNum}% markup = {'\u00A3'}{exampleRetail.toFixed(2)} retail price
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						Multiplier: {multiplier.toFixed(2)}x
					</p>
				</div>
			</div>

			{/* VAT Rate */}
			<div className="border rounded-lg p-6">
				<h3 className="text-lg font-semibold mb-4">VAT Settings</h3>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="vatRate">VAT Rate</FieldLabel>
						<FieldDescription>
							The default VAT rate applied to quotes. Standard UK rate is 20%.
						</FieldDescription>
						<div className="flex items-center gap-2 mt-2">
							<Input
								id="vatRate"
								type="number"
								min="0"
								max="100"
								step="0.1"
								value={vatRate}
								onChange={(e) => setVatRate(e.target.value)}
								className="w-24"
							/>
							<span className="text-muted-foreground">%</span>
						</div>
					</Field>
				</FieldGroup>
			</div>

			{/* Save Button */}
			<div className="flex justify-end">
				<Button onClick={handleSave} disabled={updateMutation.isPending}>
					{updateMutation.isPending ? 'Saving...' : 'Save Pricing Settings'}
				</Button>
			</div>
		</div>
	);
}
