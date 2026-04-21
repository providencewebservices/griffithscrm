import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QuoteOption } from '@/hooks/use-quotes';

export function PricingCard({
	option,
	formatCurrency,
}: {
	option: QuoteOption;
	formatCurrency: (value: string | number) => string;
}) {
	// Session-scoped visibility toggle so the operator can hide internal margin data
	// before a screen-share. Resets on reload.
	const [showInternal, setShowInternal] = useState(true);

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

				{/* Internal metrics — toggleable for screen-share safety */}
				<div className="rounded-md bg-muted/50 p-3">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">Internal</p>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 -mr-1"
							onClick={() => setShowInternal((v) => !v)}
							aria-label={showInternal ? 'Hide internal metrics' : 'Show internal metrics'}
						>
							{showInternal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
						</Button>
					</div>
					<div className="space-y-1.5">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Cost</span>
							<span className="tabular-nums text-orange-600">
								{showInternal ? formatCurrency(option.totalCost) : '••••'}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Gross margin</span>
							<span className="tabular-nums text-green-600">
								{showInternal ? formatCurrency(grossMargin) : '••••'}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Margin %</span>
							<span className="tabular-nums text-green-600">
								{showInternal ? `${marginPercent.toFixed(1)}%` : '••••'}
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
