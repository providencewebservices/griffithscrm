import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QuoteOption } from '@/hooks/use-quotes';

export function PricingCard({
	option,
	formatCurrency,
}: {
	option: QuoteOption;
	formatCurrency: (value: string | number) => string;
}) {
	const grossMargin =
		parseFloat(option.total) - parseFloat(option.vatAmount) - parseFloat(option.totalCost);
	const marginBase = parseFloat(option.total) - parseFloat(option.vatAmount) || 1;
	const marginPercent = (grossMargin / marginBase) * 100;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Pricing</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Customer-facing totals */}
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Subtotal</span>
						<span className="tabular-nums">{formatCurrency(option.subtotal)}</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">
							VAT ({(parseFloat(option.vatRate) * 100).toFixed(0)}%)
						</span>
						<span className="tabular-nums">{formatCurrency(option.vatAmount)}</span>
					</div>
					<div className="flex items-baseline justify-between border-t border-border/60 pt-3">
						<span className="font-semibold">Total</span>
						<span className="text-xl font-semibold tabular-nums">
							{formatCurrency(option.total)}
						</span>
					</div>
				</div>

				{/* Internal metrics — hidden entirely in Customer View via the layout-level toggle */}
				<div className="rounded-md bg-muted/50 p-3">
					<p className="text-sm font-medium text-muted-foreground mb-2">Internal</p>
					<div className="space-y-1.5">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Cost</span>
							<span className="tabular-nums text-orange-600">
								{formatCurrency(option.totalCost)}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Gross margin</span>
							<span className="tabular-nums text-green-600">{formatCurrency(grossMargin)}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Margin %</span>
							<span className="tabular-nums text-green-600">{marginPercent.toFixed(1)}%</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
