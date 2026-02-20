import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
	const hex = process.env.TAKEPAYMENTS_ENCRYPTION_KEY;
	if (!hex) {
		throw new Error('TAKEPAYMENTS_ENCRYPTION_KEY environment variable is not set');
	}
	const key = Buffer.from(hex, 'hex');
	if (key.length !== 32) {
		throw new Error('TAKEPAYMENTS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
	}
	return key;
}

export function encrypt(plaintext: string): string {
	const key = getKey();
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decrypt(encrypted: string): string {
	const key = getKey();
	const parts = encrypted.split(':');
	if (parts.length !== 3) {
		throw new Error('Invalid encrypted format');
	}
	const iv = Buffer.from(parts[0], 'base64');
	const authTag = Buffer.from(parts[1], 'base64');
	const ciphertext = Buffer.from(parts[2], 'base64');
	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
	decipher.setAuthTag(authTag);
	return decipher.update(ciphertext) + decipher.final('utf8');
}
