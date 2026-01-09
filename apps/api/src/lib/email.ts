import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Lazy-initialized SES client
let sesClient: SESClient | null = null;

function getSesClient(): SESClient | null {
	// Use SES when SES_REGION is configured (indicates production)
	const sesRegion = process.env.SES_REGION;
	if (!sesRegion) {
		return null;
	}
	if (!sesClient) {
		sesClient = new SESClient({ region: sesRegion });
	}
	return sesClient;
}

export async function sendEmail({
	to,
	subject,
	text,
	html,
}: {
	to: string;
	subject: string;
	text: string;
	html?: string;
}) {
	const from = process.env.EMAIL_FROM || 'noreply@griffiths-crm.local';
	const client = getSesClient();

	// In development, just log the email
	if (!client) {
		console.log('📧 [DEV] Email would be sent:');
		console.log(`   To: ${to}`);
		console.log(`   From: ${from}`);
		console.log(`   Subject: ${subject}`);
		console.log(`   Body: ${text.substring(0, 100)}...`);
		return;
	}

	// In production, send via SES
	console.log(`📧 Sending email via SES to ${to}`);
	const command = new SendEmailCommand({
		Source: from,
		Destination: {
			ToAddresses: [to],
		},
		Message: {
			Subject: {
				Data: subject,
				Charset: 'UTF-8',
			},
			Body: {
				Text: {
					Data: text,
					Charset: 'UTF-8',
				},
				...(html && {
					Html: {
						Data: html,
						Charset: 'UTF-8',
					},
				}),
			},
		},
	});

	await client.send(command);
	console.log(`📧 Email sent successfully to ${to}`);
}
