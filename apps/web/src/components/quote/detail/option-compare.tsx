import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	QUOTE_TYPE_SECTION_CONFIG,
	type QuotePackageWithOptions,
	type QuoteType,
} from '@/hooks/use-quotes';

export function OptionCompareDialog({
	pkg,
	open,
	onOpenChange,
	formatCurrency,
}: {
	pkg: QuotePackageWithOptions;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	formatCurrency: (value: string | number) => string;
}) {
	const options = pkg.options ?? [];
	const quoteType = (pkg.quoteType as QuoteType) || 'new_memorial';
	const sectionConfig = QUOTE_TYPE_SECTION_CONFIG[quoteType];

	const itemCount = (n: number) => `${n} item${n === 1 ? '' : 's'}`;
	const anyLineItems = options.some((o) => o.lineItems.length > 0);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-5xl">
				<DialogHeader>
					<DialogTitle>Compare options</DialogTitle>
					<DialogDescription>
						Side-by-side view of all {options.length} options in this quote.
					</DialogDescription>
				</DialogHeader>

				<div className="-mx-6 overflow-x-auto">
					<div className="inline-block min-w-full px-6 align-middle">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-40">Field</TableHead>
									{options.map((opt, i) => (
										<TableHead key={opt.id} className="text-right whitespace-nowrap">
											{opt.optionLabel || `Option ${i + 1}`}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{sectionConfig.showProductSelection && (
									<TableRow>
										<TableCell className="font-medium">Product</TableCell>
										{options.map((opt) => (
											<TableCell key={opt.id} className="text-right text-sm">
												{opt.product?.name || '—'}
											</TableCell>
										))}
									</TableRow>
								)}
								{sectionConfig.showComponents && (
									<TableRow>
										<TableCell className="font-medium">Components</TableCell>
										{options.map((opt) => (
											<TableCell key={opt.id} className="text-right text-sm tabular-nums">
												{itemCount(opt.components.length)}
											</TableCell>
										))}
									</TableRow>
								)}
								{sectionConfig.showLettering && (
									<TableRow>
										<TableCell className="font-medium">Lettering</TableCell>
										{options.map((opt) => (
											<TableCell key={opt.id} className="text-right text-sm tabular-nums">
												{itemCount(opt.lettering.length)}
											</TableCell>
										))}
									</TableRow>
								)}
								{sectionConfig.showSundries && (
									<TableRow>
										<TableCell className="font-medium">Sundries</TableCell>
										{options.map((opt) => (
											<TableCell key={opt.id} className="text-right text-sm tabular-nums">
												{itemCount(opt.sundries.length)}
											</TableCell>
										))}
									</TableRow>
								)}
								{anyLineItems && (
									<TableRow>
										<TableCell className="font-medium">Custom line items</TableCell>
										{options.map((opt) => (
											<TableCell key={opt.id} className="text-right text-sm tabular-nums">
												{itemCount(opt.lineItems.length)}
											</TableCell>
										))}
									</TableRow>
								)}
								<TableRow>
									<TableCell className="font-medium">Subtotal</TableCell>
									{options.map((opt) => (
										<TableCell key={opt.id} className="text-right tabular-nums">
											{formatCurrency(opt.subtotal)}
										</TableCell>
									))}
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">VAT</TableCell>
									{options.map((opt) => (
										<TableCell key={opt.id} className="text-right tabular-nums">
											{formatCurrency(opt.vatAmount)}
										</TableCell>
									))}
								</TableRow>
								<TableRow>
									<TableCell className="font-semibold">Total</TableCell>
									{options.map((opt) => (
										<TableCell
											key={opt.id}
											className="text-right text-lg font-semibold tabular-nums"
										>
											{formatCurrency(opt.total)}
										</TableCell>
									))}
								</TableRow>
							</TableBody>
						</Table>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
