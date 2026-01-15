import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
	const [defaultDepositPercent, setDefaultDepositPercent] = useState('50');
	const [quoteValidityDays, setQuoteValidityDays] = useState('30');

	// Load settings into form
	useEffect(() => {
		if (settings) {
			setDefaultMarkupPercent(settings.defaultMarkupPercent);
			// Convert VAT rate from decimal (0.20) to percentage (20)
			const vatPercent = parseFloat(settings.vatRate) * 100;
			setVatRate(String(vatPercent));
			setDefaultDepositPercent(settings.defaultDepositPercent);
			setQuoteValidityDays(String(settings.quoteValidityDays ?? 30));
		}
	}, [settings]);

	const handleSave = async () => {
		try {
			const markupNum = parseFloat(defaultMarkupPercent);
			const vatNum = parseFloat(vatRate) / 100; // Convert percentage back to decimal
			const depositNum = parseFloat(defaultDepositPercent);

			if (isNaN(markupNum) || markupNum < 0) {
				toast.error('Markup percentage must be a valid number 0 or greater');
				return;
			}

			if (isNaN(vatNum) || vatNum < 0 || vatNum > 1) {
				toast.error('VAT rate must be between 0 and 100%');
				return;
			}

			if (isNaN(depositNum) || depositNum < 0 || depositNum > 100) {
				toast.error('Deposit percentage must be between 0 and 100%');
				return;
			}

			const validityNum = parseInt(quoteValidityDays);
			if (isNaN(validityNum) || validityNum < 1 || validityNum > 365) {
				toast.error('Quote validity must be between 1 and 365 days');
				return;
			}

			await updateMutation.mutateAsync({
				defaultMarkupPercent: markupNum,
				vatRate: vatNum,
				defaultDepositPercent: depositNum,
				quoteValidityDays: validityNum,
			});

			toast.success('Pricing settings saved');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save settings');
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
		<div className="space-y-8">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

				{/* Payment Settings */}
				<div className="border rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Payment Settings</h3>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="depositPercent">Default Deposit Percentage</FieldLabel>
							<FieldDescription>
								The default deposit percentage for new jobs. When a quote is accepted and a job is created, this percentage of the total will be set as the initial deposit payment.
							</FieldDescription>
							<div className="flex items-center gap-2 mt-2">
								<Input
									id="depositPercent"
									type="number"
									min="0"
									max="100"
									step="1"
									value={defaultDepositPercent}
									onChange={(e) => setDefaultDepositPercent(e.target.value)}
									className="w-24"
								/>
								<span className="text-muted-foreground">%</span>
							</div>
						</Field>
					</FieldGroup>

					<div className="mt-4 p-4 bg-muted/50 rounded-lg">
						<p className="text-sm text-muted-foreground">
							<strong>Example:</strong> For a {'\u00A3'}1,000 job with {defaultDepositPercent}% deposit, the payment schedule will be:
						</p>
						<ul className="text-sm text-muted-foreground mt-2 space-y-1">
							<li>• Deposit: {'\u00A3'}{(1000 * parseFloat(defaultDepositPercent || '0') / 100).toFixed(2)}</li>
							<li>• Balance: {'\u00A3'}{(1000 * (1 - parseFloat(defaultDepositPercent || '0') / 100)).toFixed(2)}</li>
						</ul>
					</div>
				</div>

				{/* Quote Settings */}
				<div className="border rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Quote Settings</h3>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="quoteValidity">Default Quote Validity</FieldLabel>
							<FieldDescription>
								How many days a quote remains valid by default. This will be used to automatically set the "Valid Until" date when creating new quotes.
							</FieldDescription>
							<div className="flex items-center gap-2 mt-2">
								<Input
									id="quoteValidity"
									type="number"
									min="1"
									max="365"
									step="1"
									value={quoteValidityDays}
									onChange={(e) => setQuoteValidityDays(e.target.value)}
									className="w-24"
								/>
								<span className="text-muted-foreground">days</span>
							</div>
						</Field>
					</FieldGroup>
				</div>
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
