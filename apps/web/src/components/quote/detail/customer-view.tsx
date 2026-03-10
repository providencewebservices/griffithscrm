import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	formatComponentType,
	type QuotePackageWithOptions,
} from '@/hooks/use-quotes';
import { InscriptionText } from '@/components/inscription-text';

export function CustomerView({
	pkg,
	formatCurrency,
	formatDate,
}: {
	pkg: QuotePackageWithOptions;
	formatCurrency: (value: string | number) => string;
	formatDate: (dateString: string) => string;
}) {
	const [selectedOptionId, setSelectedOptionId] = useState<string | null>(pkg.options?.[0]?.id || null);
	const currentOption = pkg.options?.find((opt) => opt.id === selectedOptionId);

	return (
		<div className="max-w-3xl mx-auto">
			<Card className="border-2">
				<CardHeader className="text-center border-b pb-6">
					<CardTitle className="text-2xl">Quotation</CardTitle>
					<CardDescription className="text-base">
						{pkg.options?.length > 1
							? `${pkg.options.length} pricing options for your consideration`
							: pkg.options?.[0]?.quoteNumber || 'Quote'}
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-6 space-y-6">
					{/* Customer Info */}
					<div className="text-center">
						<p className="text-sm text-muted-foreground">Prepared for</p>
						<p className="text-lg font-medium">
							{pkg.customer ? `${pkg.customer.firstName} ${pkg.customer.lastName}` : 'Walk-in Customer'}
						</p>
						<p className="text-sm text-muted-foreground mt-2">Date: {formatDate(pkg.createdAt)}</p>
						{pkg.validUntil && (
							<p className="text-sm text-muted-foreground">Valid Until: {formatDate(pkg.validUntil)}</p>
						)}
					</div>

					<hr />

					{/* Option Selector (if multiple options) */}
					{pkg.options && pkg.options.length > 1 && (
						<div className="flex justify-center gap-2">
							{pkg.options.map((option) => (
								<Button
									key={option.id}
									variant={selectedOptionId === option.id ? 'default' : 'outline'}
									onClick={() => setSelectedOptionId(option.id)}
								>
									{option.quoteNumber}
									<span className="ml-2 opacity-75">{formatCurrency(option.total)}</span>
								</Button>
							))}
						</div>
					)}

					{currentOption && (
						<>
							{/* Product Details */}
							<div className="space-y-4">
								{currentOption.product && (
									<div className="text-center">
										<p className="text-sm text-muted-foreground">Product</p>
										<p className="font-bold text-2xl">{currentOption.product.name}</p>
									</div>
								)}

								{/* Components Summary */}
								{currentOption.components.length > 0 && (
									<div className="space-y-1">
										{currentOption.components.map((comp) => (
											<div key={comp.id} className="flex justify-between text-sm">
												<span>
													{formatComponentType(comp.componentType)}
													{comp.height && comp.width && comp.depth && (
														<span className="text-muted-foreground ml-2">
															({comp.height}" × {comp.width}" × {comp.depth}")
														</span>
													)}
													{comp.materialName && (
														<span className="text-muted-foreground ml-1">- {comp.materialName}</span>
													)}
												</span>
											</div>
										))}
									</div>
								)}

								{/* Flower Holes */}
								{currentOption.flowerHoles && (
									<p className="text-sm">
										<span className="text-muted-foreground">Flower Holes: </span>
										{currentOption.flowerHoles.replace(/_/g, ' ')}
									</p>
								)}

								{/* Inscription */}
								{pkg.proposedInscription && (
									<div className="space-y-1 text-center">
										<p className="text-sm font-medium text-muted-foreground">Proposed Inscription</p>
										<p className="whitespace-pre-wrap italic text-lg py-3">
											{pkg.proposedInscription}
										</p>
									</div>
								)}

								{/* Lettering */}
								{currentOption.lettering.length > 0 && (
									<div className="space-y-4">
										<p className="text-sm font-medium">Lettering</p>
										{currentOption.lettering.map((lett) => (
											<div key={lett.id} className="space-y-2">
												<p className="text-muted-foreground text-xs">
													{lett.techniqueName}
													{lett.colorName && ` with ${lett.colorName}`} · {lett.letterCount} letters
												</p>
												{lett.text && (
													<InscriptionText
														text={`"${lett.text}"`}
														fontId={lett.fontId}
														fontName={lett.fontName}
														fontS3Key={lett.fontS3Key}
														className="italic text-sm"
													/>
												)}
											</div>
										))}
									</div>
								)}

								{/* Sundries */}
								{currentOption.sundries.length > 0 && (
									<div className="space-y-1">
										<p className="text-sm font-medium">Additional Items:</p>
										{currentOption.sundries.map((s) => (
											<p key={s.id} className="text-sm text-muted-foreground">
												{s.sundryName} × {s.quantity}
											</p>
										))}
									</div>
								)}

								{/* Custom Line Items - Only visible ones */}
								{currentOption.lineItems &&
									currentOption.lineItems.filter((item) => item.visibleToCustomer).length > 0 && (
										<div className="space-y-1">
											<p className="text-sm font-medium">Other Charges:</p>
											{currentOption.lineItems
												.filter((item) => item.visibleToCustomer)
												.map((item) => (
													<div key={item.id} className="flex justify-between text-sm">
														<span className="text-muted-foreground">
															{item.description}
															{item.vatExempt && <span className="text-xs ml-1">(VAT Exempt)</span>}
														</span>
														{item.priceVisibleToCustomer && (
															<span>{formatCurrency(item.price)}</span>
														)}
													</div>
												))}
										</div>
									)}
							</div>

							<hr />

							{/* Pricing */}
							<div className="space-y-2 text-right">
								<div className="flex justify-between">
									<span>Subtotal</span>
									<span>{formatCurrency(currentOption.subtotal)}</span>
								</div>
								<div className="flex justify-between text-muted-foreground">
									<span>VAT ({(parseFloat(currentOption.vatRate) * 100).toFixed(0)}%)</span>
									<span>{formatCurrency(currentOption.vatAmount)}</span>
								</div>
								<hr />
								<div className="flex justify-between font-bold text-xl pt-2">
									<span>Total</span>
									<span>{formatCurrency(currentOption.total)}</span>
								</div>
							</div>
						</>
					)}

					{/* Notes */}
					{pkg.notes && (
						<>
							<hr />
							<div>
								<p className="text-sm text-muted-foreground">{pkg.notes}</p>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
