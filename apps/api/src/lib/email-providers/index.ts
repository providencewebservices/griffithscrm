import { GmailProvider } from './gmail';
import type { IEmailProvider } from './types';

const providers: Record<string, IEmailProvider> = {
	gmail: new GmailProvider(),
};

export function getEmailProvider(providerName: 'gmail' | 'microsoft'): IEmailProvider {
	const provider = providers[providerName];
	if (!provider) {
		throw new Error(`Email provider "${providerName}" is not implemented`);
	}
	return provider;
}

export { getValidAccessToken } from './token-manager';
export type { IEmailProvider } from './types';
