import { Link } from 'react-router';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	QUOTE_TYPE_LABELS,
	QUOTE_TYPE_SECTION_CONFIG,
	PRODUCTION_METHODS,
	PRODUCTION_METHOD_LABELS,
	useUpdateProductionMethodMutation,
	type QuoteType,
	type QuotePackageWithOptions,
	type ProductionMethod,
} from '@/hooks/use-quotes';

export function SharedContextCard({
	pkg,
	formatDate,
}: {
	pkg: QuotePackageWithOptions;
	formatDate: (dateString: string) => string;
}) {
	const quoteType = (pkg.quoteType as QuoteType) || 'new_memorial';
	const sectionConfig = QUOTE_TYPE_SECTION_CONFIG[quoteType];
	const updateProductionMethod = useUpdateProductionMethodMutation();
	const canEdit = pkg.status === 'draft';

	return (
		<Card>
			<CardHeader>
				<CardTitle>Quote Context</CardTitle>
				<CardDescription>Shared information across all options</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							{pkg.payerType === 'funeral_director' ? 'Funeral Director (Payer)' : 'Customer'}
						</p>
						<p>
							{pkg.payerType === 'funeral_director' && pkg.funeralDirector ? (
								<Link to={`/app/funeral-directors/${pkg.funeralDirectorId}`} className="text-primary hover:underline">
									{pkg.funeralDirector.tradingName || pkg.funeralDirector.businessName}
								</Link>
							) : pkg.customer ? (
								<Link to={`/app/contacts/${pkg.customerId}`} className="text-primary hover:underline">
									{pkg.customer.firstName} {pkg.customer.lastName}
								</Link>
							) : (
								'Walk-in Customer'
							)}
						</p>
					</div>
					{sectionConfig.showRelationToDeceased && pkg.relationToDeceased && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Relation to Deceased</p>
							<p>{pkg.relationToDeceased}</p>
						</div>
					)}
					{pkg.quoteType && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Quote Type</p>
							<p>{QUOTE_TYPE_LABELS[pkg.quoteType as QuoteType]}</p>
						</div>
					)}
					{quoteType === 'new_memorial' && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Production Method</p>
							{canEdit ? (
								<Select
									value={pkg.productionMethod || ''}
									onValueChange={(value) => {
										updateProductionMethod.mutate({
											id: pkg.id,
											productionMethod: (value || null) as ProductionMethod | null,
										});
									}}
								>
									<SelectTrigger className="mt-1">
										<SelectValue placeholder="Select method..." />
									</SelectTrigger>
									<SelectContent>
										{PRODUCTION_METHODS.map((method) => (
											<SelectItem key={method} value={method}>
												{PRODUCTION_METHOD_LABELS[method]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<p>{pkg.productionMethod ? PRODUCTION_METHOD_LABELS[pkg.productionMethod] : 'Not set'}</p>
							)}
						</div>
					)}
					{pkg.validUntil && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Valid Until</p>
							<p>{formatDate(pkg.validUntil)}</p>
						</div>
					)}
					{pkg.funeralDirector && pkg.payerType !== 'funeral_director' && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Funeral Director</p>
							<p>
								<Link to={`/app/funeral-directors/${pkg.funeralDirectorId}`} className="text-primary hover:underline">
									{pkg.funeralDirector.tradingName || pkg.funeralDirector.businessName}
								</Link>
							</p>
						</div>
					)}
					{pkg.council && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Council</p>
							<p>{pkg.council.name}</p>
						</div>
					)}
					{sectionConfig.showMemorialSite && pkg.memorialSite && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Memorial Site</p>
							<p>{pkg.memorialSite.name}</p>
						</div>
					)}
				</div>

				{sectionConfig.showProposedInscription && pkg.proposedInscription && (
					<div className="mt-4 pt-4 border-t">
						<p className="text-sm font-medium text-muted-foreground mb-2">
							Proposed Inscription ({pkg.proposedInscription.length} characters)
						</p>
						<p className="whitespace-pre-wrap bg-muted p-3 rounded font-mono text-sm">{pkg.proposedInscription}</p>
					</div>
				)}

				{sectionConfig.showExistingMemorial && pkg.existingMemorialDescription && (
					<div className="mt-4 pt-4 border-t">
						<p className="text-sm font-medium text-muted-foreground mb-2">Existing Memorial Description</p>
						<p className="whitespace-pre-wrap bg-muted p-3 rounded text-sm">{pkg.existingMemorialDescription}</p>
					</div>
				)}

				{pkg.notes && (
					<div className="mt-4 pt-4 border-t">
						<p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
						<p className="whitespace-pre-wrap text-sm">{pkg.notes}</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
