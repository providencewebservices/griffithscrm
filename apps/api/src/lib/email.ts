import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST || 'localhost',
	port: parseInt(process.env.SMTP_PORT || '1025'),
	secure: false,
});

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
	await transporter.sendMail({
		from: process.env.EMAIL_FROM || 'noreply@griffiths-crm.local',
		to,
		subject,
		text,
		html,
	});
}
