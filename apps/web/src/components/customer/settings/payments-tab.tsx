import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield, TestTube2 } from 'lucide-react';
import {
	useTakepaymentsSettingsQuery,
	useUpdateTakepaymentsSettingsMutation,
	useTestTakepaymentsConnectionMutation,
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
			toast.success('Payment settings saved');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save settings');
		}
	};

	const handleTest = async () => {
		try {
			const result = await testMutation.mutateAsync();
			if (result.success) {
				toast.success(result.message || 'Connection test passed');
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Connection test failed');
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 bg-muted animate-pulse rounded" />
				<div className="h-32 bg-muted animate-pulse rounded" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">TakePayments Gateway</h3>
				<p className="text-sm text-muted-foreground mt-1">
					Configure your TakePayments gateway credentials to accept online card payments.
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
								<Shield className="h-5 w-5 text-primary" />
							</div>
							<div>
								<CardTitle className="text-base">Payment Gateway</CardTitle>
								<CardDescription>TakePayments Hosted Payment Form</CardDescription>
							</div>
						</div>
						{settings?.isConfigured ? (
							<Badge className="bg-green-100 text-green-800">Connected</Badge>
						) : (
							<Badge variant="secondary">Not Configured</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
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
						<Input
							id="gatewayPassword"
							type="password"
							value={gatewayPassword}
							onChange={(e) => setGatewayPassword(e.target.value)}
							placeholder={settings?.hasPassword ? '••••••••  (unchanged)' : 'Enter gateway password'}
						/>
						<p className="text-xs text-muted-foreground">
							Gateway Account password (can be reset in MMS)
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="preSharedKey">Pre Shared Key</Label>
						<Input
							id="preSharedKey"
							type="password"
							value={preSharedKey}
							onChange={(e) => setPreSharedKey(e.target.value)}
							placeholder={settings?.hasPreSharedKey ? '••••••••  (unchanged)' : 'Enter pre-shared key'}
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
					</div>

					<div className="flex items-center gap-3 pt-2">
						<Button
							onClick={handleSave}
							disabled={updateMutation.isPending}
						>
							{updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Save Settings
						</Button>
						{settings?.isConfigured && (
							<Button
								variant="outline"
								onClick={handleTest}
								disabled={testMutation.isPending}
							>
								{testMutation.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<TestTube2 className="mr-2 h-4 w-4" />
								)}
								Test Connection
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
