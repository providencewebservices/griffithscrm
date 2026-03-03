import { useParams, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { useMemorialWorksheetQuery } from '@/hooks/use-memorial-worksheet';

function formatPrintDate(dateString: string | null): string {
	if (!dateString) return '';
	const date = new Date(dateString);
	return date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

export function MemorialWorksheetPrintPage() {
	const { id } = useParams<{ id: string }>();
	const { data: worksheet, isLoading, error } = useMemorialWorksheetQuery(id);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !worksheet) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen gap-4">
				<p className="text-muted-foreground">
					{error ? `Error: ${error.message}` : 'Worksheet not found'}
				</p>
				<Link to={`/app/jobs/${id}`}>
					<Button variant="outline">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Job
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<>
			<style>{`
				@media print {
					.no-print { display: none !important; }
					body { margin: 0; padding: 0; }
					@page {
						size: A4;
						margin: 15mm 20mm;
					}
				}
			`}</style>

			{/* Screen-only toolbar */}
			<div className="no-print fixed top-0 left-0 right-0 bg-white border-b z-50 px-4 py-3 flex items-center gap-3">
				<Link to={`/app/jobs/${id}`}>
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
				</Link>
				<Button size="sm" onClick={() => window.print()}>
					<Printer className="h-4 w-4 mr-2" />
					Print
				</Button>
			</div>

			{/* Worksheet document */}
			<div
				className="max-w-[210mm] mx-auto bg-white"
				style={{
					fontFamily: 'Georgia, "Times New Roman", Times, serif',
					padding: '15mm 20mm',
					marginTop: '60px',
				}}
			>
				{/* Header */}
				<div
					style={{
						textAlign: 'center',
						marginBottom: '8mm',
						borderBottom: '2px solid #000',
						paddingBottom: '4mm',
					}}
				>
					<h1
						style={{
							fontSize: '22pt',
							fontWeight: 'bold',
							letterSpacing: '2px',
							margin: 0,
							textTransform: 'uppercase',
						}}
					>
						Memorial Worksheet
					</h1>
				</div>

				{/* Fields */}
				<table
					style={{
						width: '100%',
						borderCollapse: 'collapse',
						fontSize: '12pt',
						marginBottom: '8mm',
					}}
				>
					<tbody>
						<tr>
							<td
								style={{
									padding: '3mm 0',
									fontWeight: 'bold',
									textDecoration: 'underline',
									width: '45mm',
									verticalAlign: 'top',
								}}
							>
								REFERENCE NUMBER:
							</td>
							<td style={{ padding: '3mm 0', verticalAlign: 'top' }}>
								{worksheet.jobNumber}
							</td>
						</tr>
						<tr>
							<td
								style={{
									padding: '3mm 0',
									fontWeight: 'bold',
									textDecoration: 'underline',
									verticalAlign: 'top',
								}}
							>
								DATE:
							</td>
							<td style={{ padding: '3mm 0', verticalAlign: 'top' }}>
								{formatPrintDate(worksheet.date)}
							</td>
						</tr>
						<tr>
							<td
								style={{
									padding: '3mm 0',
									fontWeight: 'bold',
									textDecoration: 'underline',
									verticalAlign: 'top',
								}}
							>
								CEMETERY/CHURCHYARD:
							</td>
							<td style={{ padding: '3mm 0', verticalAlign: 'top' }}>
								{worksheet.cemeteryChurchyard || '\u2014'}
							</td>
						</tr>
						<tr>
							<td
								style={{
									padding: '3mm 0',
									fontWeight: 'bold',
									textDecoration: 'underline',
									verticalAlign: 'top',
								}}
							>
								MEMORIAL OF:
							</td>
							<td style={{ padding: '3mm 0', verticalAlign: 'top' }}>
								{worksheet.deceasedName || '\u2014'}
							</td>
						</tr>
						<tr>
							<td
								style={{
									padding: '3mm 0',
									fontWeight: 'bold',
									textDecoration: 'underline',
									verticalAlign: 'top',
								}}
							>
								LOCATION:
							</td>
							<td style={{ padding: '3mm 0', verticalAlign: 'top' }}>
								{worksheet.location || '\u2014'}
							</td>
						</tr>
						<tr>
							<td
								style={{
									padding: '3mm 0',
									fontWeight: 'bold',
									textDecoration: 'underline',
									verticalAlign: 'top',
								}}
							>
								EXISTING:
							</td>
							<td style={{ padding: '3mm 0', verticalAlign: 'top' }}>
								{worksheet.existingDescription || '\u2014'}
							</td>
						</tr>
					</tbody>
				</table>

				{/* Requirements section */}
				<div style={{ marginBottom: '8mm' }}>
					<div
						style={{
							fontSize: '14pt',
							fontWeight: 'bold',
							textDecoration: 'underline',
							marginBottom: '3mm',
						}}
					>
						REQUIREMENTS.
					</div>
					<div
						style={{
							borderTop: '1px solid #000',
							paddingTop: '4mm',
							fontSize: '12pt',
							whiteSpace: 'pre-wrap',
							minHeight: '30mm',
							lineHeight: '1.6',
						}}
					>
						{worksheet.requirements || ''}
					</div>
				</div>

				{/* Inscription section */}
				<div>
					<div
						style={{
							fontSize: '14pt',
							fontWeight: 'bold',
							textDecoration: 'underline',
							marginBottom: '3mm',
						}}
					>
						Proposed inscription.
					</div>
					<div
						style={{
							borderTop: '1px solid #000',
							paddingTop: '4mm',
							fontSize: '13pt',
							whiteSpace: 'pre-wrap',
							textAlign: 'center',
							minHeight: '40mm',
							lineHeight: '1.8',
						}}
					>
						{worksheet.inscription || ''}
					</div>
				</div>
			</div>
		</>
	);
}
