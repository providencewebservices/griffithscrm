import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Use SES in production, fall back to console logging in development
const sesClient =
	process.env.NODE_ENV === 'production'
		? new SESClient({ region: process.env.SES_REGION || 'us-east-2' })
		: null;

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

	// In development, just log the email
	if (!sesClient) {
		console.log('📧 [DEV] Email would be sent:');
		console.log(`   To: ${to}`);
		console.log(`   From: ${from}`);
		console.log(`   Subject: ${subject}`);
		console.log(`   Body: ${text.substring(0, 100)}...`);
		return;
	}

	// In production, send via SES
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

	await sesClient.send(command);
}
