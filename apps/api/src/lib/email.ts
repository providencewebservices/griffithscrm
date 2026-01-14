import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';

// Lazy-initialized SES client (production)
let sesClient: SESClient | null = null;

function getSesClient(): SESClient | null {
	const sesRegion = process.env.SES_REGION;
	if (!sesRegion) {
		return null;
	}
	if (!sesClient) {
		sesClient = new SESClient({ region: sesRegion });
	}
	return sesClient;
}

// SMTP transport for development (Mailpit)
function getSmtpTransport() {
	const smtpHost = process.env.SMTP_HOST || 'localhost';
	const smtpPort = parseInt(process.env.SMTP_PORT || '1025', 10);

	return nodemailer.createTransport({
		host: smtpHost,
		port: smtpPort,
		secure: false,
	});
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
	const sesClient = getSesClient();

	// Production: use AWS SES
	if (sesClient) {
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

		await sesClient.send(command);
		console.log(`📧 Email sent successfully to ${to}`);
		return;
	}

	// Development: use SMTP (Mailpit)
	console.log(`📧 [DEV] Sending email via SMTP to ${to}`);
	const transport = getSmtpTransport();

	await transport.sendMail({
		from,
		to,
		subject,
		text,
		html,
	});

	console.log(`📧 [DEV] Email sent to Mailpit`);
}
