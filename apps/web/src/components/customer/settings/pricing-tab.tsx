import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldSeparator } from '@/components/ui/field';
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

	// Dirty state tracking
	const isDirty = useMemo(() => {
		if (!settings) return false;
		if (defaultMarkupPercent !== settings.defaultMarkupPercent) return true;
		const settingsVatPercent = String(parseFloat(settings.vatRate) * 100);
		if (vatRate !== settingsVatPercent) return true;
		if (defaultDepositPercent !== settings.defaultDepositPercent) return true;
		if (quoteValidityDays !== String(settings.quoteValidityDays ?? 30)) return true;
		return false;
	}, [settings, defaultMarkupPercent, vatRate, defaultDepositPercent, quoteValidityDays]);

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

	// Calculate example values
	const markupNum = parseFloat(defaultMarkupPercent) || 0;
	const multiplier = 1 + markupNum / 100;
	const exampleCost = 100;
	const exampleRetail = exampleCost * multiplier;

	const vatNum = parseFloat(vatRate) || 0;
	const exampleVatBase = 1000;
	const exampleVatTotal = exampleVatBase * (1 + vatNum / 100);

	const validityDays = parseInt(quoteValidityDays) || 30;
	const exampleExpiryDate = new Date();
	exampleExpiryDate.setDate(exampleExpiryDate.getDate() + validityDays);
	const formattedExpiryDate = exampleExpiryDate.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});

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
			<Card>
				<CardHeader>
					<CardTitle>Pricing & Defaults</CardTitle>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						{/* Default Markup */}
						<Field>
							<FieldLabel htmlFor="defaultMarkup">Default Markup Percentage</FieldLabel>
							<FieldDescription>
								The default markup percentage applied to supplier costs. 100% markup means the retail price is 2x the supplier cost.
							</FieldDescription>
							<div className="flex items-center border border-input rounded-md w-32 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
								<Input
									id="defaultMarkup"
									type="number"
									min="0"
									step="any"
									value={defaultMarkupPercent}
									onChange={(e) => setDefaultMarkupPercent(e.target.value)}
									className="border-0 shadow-none focus-visible:ring-0 w-full"
								/>
								<span className="text-muted-foreground text-sm px-3 border-l border-input bg-muted/50 h-9 flex items-center shrink-0">%</span>
							</div>
							<div className="mt-3 p-3 bg-muted/50 rounded-lg">
								<p className="text-sm text-muted-foreground">
									<strong>Example:</strong> A supplier cost of {'\u00A3'}{exampleCost.toFixed(2)} with {markupNum}% markup = {'\u00A3'}{exampleRetail.toFixed(2)} retail price (multiplier: {multiplier.toFixed(2)}x)
								</p>
							</div>
						</Field>

						<FieldSeparator />

						{/* VAT Rate */}
						<Field>
							<FieldLabel htmlFor="vatRate">VAT Rate</FieldLabel>
							<FieldDescription>
								The default VAT rate applied to quotes. Standard UK rate is 20%.
							</FieldDescription>
							<div className="flex items-center border border-input rounded-md w-32 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
								<Input
									id="vatRate"
									type="number"
									min="0"
									max="100"
									step="any"
									value={vatRate}
									onChange={(e) => setVatRate(e.target.value)}
									className="border-0 shadow-none focus-visible:ring-0 w-full"
								/>
								<span className="text-muted-foreground text-sm px-3 border-l border-input bg-muted/50 h-9 flex items-center shrink-0">%</span>
							</div>
							<div className="mt-3 p-3 bg-muted/50 rounded-lg">
								<p className="text-sm text-muted-foreground">
									<strong>Example:</strong> {'\u00A3'}{exampleVatBase.toLocaleString('en-GB', { minimumFractionDigits: 2 })} + {vatNum}% VAT = {'\u00A3'}{exampleVatTotal.toLocaleString('en-GB', { minimumFractionDigits: 2 })} total
								</p>
							</div>
						</Field>

						<FieldSeparator />

						{/* Deposit Percentage */}
						<Field>
							<FieldLabel htmlFor="depositPercent">Default Deposit Percentage</FieldLabel>
							<FieldDescription>
								The default deposit percentage for new jobs. When a quote is accepted and a job is created, this percentage of the total will be set as the initial deposit payment.
							</FieldDescription>
							<div className="flex items-center border border-input rounded-md w-32 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
								<Input
									id="depositPercent"
									type="number"
									min="0"
									max="100"
									step="any"
									value={defaultDepositPercent}
									onChange={(e) => setDefaultDepositPercent(e.target.value)}
									className="border-0 shadow-none focus-visible:ring-0 w-full"
								/>
								<span className="text-muted-foreground text-sm px-3 border-l border-input bg-muted/50 h-9 flex items-center shrink-0">%</span>
							</div>
							<div className="mt-3 p-3 bg-muted/50 rounded-lg">
								<p className="text-sm text-muted-foreground">
									<strong>Example:</strong> For a {'\u00A3'}1,000 job with {defaultDepositPercent}% deposit — Deposit: {'\u00A3'}{(1000 * parseFloat(defaultDepositPercent || '0') / 100).toFixed(2)}, Balance: {'\u00A3'}{(1000 * (1 - parseFloat(defaultDepositPercent || '0') / 100)).toFixed(2)}
								</p>
							</div>
						</Field>

						<FieldSeparator />

						{/* Quote Validity */}
						<Field>
							<FieldLabel htmlFor="quoteValidity">Default Quote Validity</FieldLabel>
							<FieldDescription>
								How many days a quote remains valid by default. This will be used to automatically set the "Valid Until" date when creating new quotes.
							</FieldDescription>
							<div className="flex items-center border border-input rounded-md w-36 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
								<Input
									id="quoteValidity"
									type="number"
									min="1"
									max="365"
									step="1"
									value={quoteValidityDays}
									onChange={(e) => setQuoteValidityDays(e.target.value)}
									className="border-0 shadow-none focus-visible:ring-0 w-full"
								/>
								<span className="text-muted-foreground text-sm px-3 border-l border-input bg-muted/50 h-9 flex items-center shrink-0">days</span>
							</div>
							<div className="mt-3 p-3 bg-muted/50 rounded-lg">
								<p className="text-sm text-muted-foreground">
									<strong>Example:</strong> A quote created today would expire on {formattedExpiryDate}
								</p>
							</div>
						</Field>
					</FieldGroup>
				</CardContent>
			</Card>

			{/* Save Button */}
			<div className="flex items-center justify-end gap-3">
				{isDirty && (
					<span className="text-sm text-muted-foreground">Unsaved changes</span>
				)}
				<Button
					onClick={handleSave}
					disabled={!isDirty || updateMutation.isPending}
				>
					{updateMutation.isPending ? 'Saving...' : 'Save Pricing Settings'}
				</Button>
			</div>
		</div>
	);
}
