import { Loader2, Shield } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	useTakepaymentsSettingsQuery,
	useTestTakepaymentsConnectionMutation,
	useUpdateTakepaymentsSettingsMutation,
} from '@/hooks/use-takepayments-settings';

export function PaymentsTab() {
	const { data, isLoading } = useTakepaymentsSettingsQuery();
	const updateMutation = useUpdateTakepaymentsSettingsMutation();
	const testMutation = useTestTakepaymentsConnectionMutation();

	const [merchantId, setMerchantId] = useState('');
	const [gatewayPassword, setGatewayPassword] = useState('');
	const [preSharedKey, setPreSharedKey] = useState('');
	const [hashMethod, setHashMethod] = useState('SHA1');
	const [initialized, setInitialized] = useState(false);

	// Initialize form values when data loads
	const settings = data?.settings;
	if (settings && !initialized) {
		setMerchantId(settings.merchantId || '');
		setHashMethod(settings.hashMethod || 'SHA1');
		setInitialized(true);
	}

	const handleSave = async () => {
		if (!merchantId.trim()) {
			toast.error('Merchant ID is required');
			return;
		}

		if (!settings?.isConfigured && (!gatewayPassword || !preSharedKey)) {
			toast.error('Gateway password and pre-shared key are required for initial setup');
			return;
		}

		try {
			await updateMutation.mutateAsync({
				merchantId: merchantId.trim(),
				gatewayPassword: gatewayPassword || undefined,
				preSharedKey: preSharedKey || undefined,
				hashMethod,
			});
			setGatewayPassword('');
			setPreSharedKey('');

			if (settings?.isConfigured) {
				toast.success('Settings saved — testing connection…');
				try {
					const result = await testMutation.mutateAsync();
					if (result.success) {
						toast.success(result.message || 'Connection test passed');
					}
				} catch (err) {
					toast.error(err instanceof Error ? err.message : 'Connection test failed');
				}
			} else {
				toast.success('Payment settings saved');
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save settings');
		}
	};

	if (isLoading) {
		return (
			<div className="max-w-2xl space-y-4">
				<div className="h-8 w-48 bg-muted animate-pulse rounded" />
				<div className="h-32 bg-muted animate-pulse rounded" />
			</div>
		);
	}

	const isSaving = updateMutation.isPending || testMutation.isPending;

	return (
		<div className="max-w-2xl space-y-6">
			<div>
				<h3 className="text-lg font-semibold">TakePayments Gateway</h3>
				<p className="text-sm text-muted-foreground mt-1">
					Configure your TakePayments gateway credentials to accept online card payments.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Shield className="h-5 w-5 text-primary" />
						TakePayments
						{settings?.isConfigured ? (
							<Badge variant="success">Connected</Badge>
						) : (
							<Badge variant="secondary">Not Configured</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{!settings?.isConfigured && (
						<div className="space-y-3 pb-4 border-b mb-4">
							<p className="text-sm font-medium">What you'll need</p>
							<p className="text-sm text-muted-foreground">
								Gather these from your TakePayments Merchant Management System (MMS):
							</p>
							<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
								<li>Merchant ID — Account Admin → Gateway Account Admin</li>
								<li>Gateway Password — can be reset in MMS</li>
								<li>Pre-Shared Key — Account Admin → Gateway Account Settings</li>
							</ul>
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="merchantId">Merchant ID</Label>
						<Input
							id="merchantId"
							value={merchantId}
							onChange={(e) => setMerchantId(e.target.value)}
							placeholder="PAYZON-XXXXXXX"
						/>
						<p className="text-xs text-muted-foreground">
							Found in MMS &rarr; Account Admin &rarr; Gateway Account Admin
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="gatewayPassword">Gateway Password</Label>
						<PasswordInput
							id="gatewayPassword"
							value={gatewayPassword}
							onChange={(e) => setGatewayPassword(e.target.value)}
							placeholder={
								settings?.hasPassword ? '••••••••  (unchanged)' : 'Enter gateway password'
							}
						/>
						<p className="text-xs text-muted-foreground">
							Gateway Account password (can be reset in MMS)
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="preSharedKey">Pre-Shared Key</Label>
						<PasswordInput
							id="preSharedKey"
							value={preSharedKey}
							onChange={(e) => setPreSharedKey(e.target.value)}
							placeholder={
								settings?.hasPreSharedKey ? '••••••••  (unchanged)' : 'Enter pre-shared key'
							}
						/>
						<p className="text-xs text-muted-foreground">
							Found in MMS &rarr; Account Admin &rarr; Gateway Account Settings
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="hashMethod">Hash Method</Label>
						<Select value={hashMethod} onValueChange={setHashMethod}>
							<SelectTrigger id="hashMethod">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="SHA1">SHA1</SelectItem>
								<SelectItem value="HMACSHA1">HMACSHA1</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Leave as SHA1 unless instructed otherwise by TakePayments support.
						</p>
					</div>

					<div className="flex items-center gap-3 pt-2">
						<Button onClick={handleSave} disabled={isSaving}>
							{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{settings?.isConfigured ? 'Save & Test Connection' : 'Save Settings'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
