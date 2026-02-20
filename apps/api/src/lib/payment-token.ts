import crypto from 'crypto';

const TOKEN_EXPIRY_DAYS = 7;

function getSecret(): Buffer {
	const hex = process.env.PAYMENT_TOKEN_SECRET;
	if (!hex) {
		throw new Error('PAYMENT_TOKEN_SECRET environment variable is not set');
	}
	return Buffer.from(hex, 'hex');
}

function base64urlEncode(data: Buffer | string): string {
	const buf = typeof data === 'string' ? Buffer.from(data) : data;
	return buf.toString('base64url');
}

function base64urlDecode(str: string): Buffer {
	return Buffer.from(str, 'base64url');
}

function sign(payload: string): string {
	const secret = getSecret();
	return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createPaymentToken(milestoneId: string, tenantId: string, amount: string): string {
	const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
	const payload = base64urlEncode(JSON.stringify({ milestoneId, tenantId, amount, exp }));
	const signature = sign(payload);
	return `${payload}.${signature}`;
}

export function verifyPaymentToken(token: string): { milestoneId: string; tenantId: string; amount: string } | null {
	const parts = token.split('.');
	if (parts.length !== 2) return null;

	const [payload, signature] = parts;

	// Verify signature with timing-safe comparison
	const expectedSig = sign(payload);
	const sigBuf = Buffer.from(signature, 'base64url');
	const expectedBuf = Buffer.from(expectedSig, 'base64url');

	if (sigBuf.length !== expectedBuf.length) return null;
	if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

	// Decode and validate payload
	try {
		const decoded = JSON.parse(base64urlDecode(payload).toString('utf8'));
		if (!decoded.milestoneId || !decoded.tenantId || !decoded.amount || !decoded.exp) return null;

		// Check expiry
		const now = Math.floor(Date.now() / 1000);
		if (decoded.exp < now) return null;

		return { milestoneId: decoded.milestoneId, tenantId: decoded.tenantId, amount: decoded.amount };
	} catch {
		return null;
	}
}
