import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
	formatComponentType,
	type QuotePackageWithOptions,
} from '@/hooks/use-quotes';
import type { TenantSettings } from '@/hooks/use-tenant-settings';
import { InscriptionText } from '@/components/inscription-text';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function CustomerView({
	pkg,
	settings,
	formatCurrency,
	formatDate,
}: {
	pkg: QuotePackageWithOptions;
	settings?: TenantSettings;
	formatCurrency: (value: string | number) => string;
	formatDate: (dateString: string) => string;
}) {
	const [selectedOptionId, setSelectedOptionId] = useState<string | null>(pkg.options?.[0]?.id || null);
	const currentOption = pkg.options?.find((opt) => opt.id === selectedOptionId);

	const hasLogo = settings?.logoUrl;
	const hasAddress = settings?.address;
	const hasPhone = settings?.phone;
	const hasEmail = settings?.email;
	const hasWebsite = settings?.website;
	const hasContactInfo = hasPhone || hasEmail || hasWebsite;

	const customerName = pkg.customer
		? `${pkg.customer.firstName} ${pkg.customer.lastName}`
		: 'Walk-in Customer';

	return (
		<div className="max-w-3xl mx-auto">
			<div className="bg-white shadow-lg border border-gray-200 rounded-sm">
				{/* Letterhead Header */}
				{settings && (
					<div className="px-10 sm:px-14 pt-10 pb-6">
						{hasLogo ? (
							<div className="text-center">
								<img
									src={`${API_URL}/api/logo/${settings.id}`}
									alt={settings.name}
									className="h-24 max-w-[280px] object-contain mx-auto"
								/>
								{hasContactInfo && (
									<div className="text-sm text-muted-foreground mt-3 space-y-0.5">
										{hasPhone && <p>{settings.phone}</p>}
										{hasEmail && <p>{settings.email}</p>}
										{hasWebsite && <p>{settings.website}</p>}
									</div>
								)}
							</div>
						) : (
							<div className="text-center">
								<h1 className="text-2xl font-heading font-bold">{settings.name}</h1>
							</div>
						)}
						{hasAddress && (
							<p className="text-sm text-muted-foreground mt-3">
								{settings.address!.formattedAddress}
							</p>
						)}
					</div>
				)}

				<div className="px-10 sm:px-14">
					<Separator />
				</div>

				{/* Document Title */}
				<div className="px-10 sm:px-14 py-8 text-center space-y-2">
					<h2>Quotation</h2>
					<p className="text-sm text-muted-foreground">
						{pkg.options?.length > 1
							? `${pkg.options.length} pricing options for your consideration`
							: pkg.options?.[0]?.quoteNumber || 'Quote'}
					</p>
					<p className="text-sm">
						<span className="text-muted-foreground">Prepared for </span>
						<span className="font-medium">{customerName}</span>
					</p>
					<div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
						<span>Date: {formatDate(pkg.createdAt)}</span>
						{pkg.validUntil && <span>Valid until: {formatDate(pkg.validUntil)}</span>}
					</div>
				</div>

				{/* Option Selector (if multiple options) */}
				{pkg.options && pkg.options.length > 1 && (
					<div className="px-10 sm:px-14 pb-6 space-y-2">
						{pkg.options.map((option) => (
							<button
								key={option.id}
								onClick={() => setSelectedOptionId(option.id)}
								className={cn(
									'w-full flex items-center justify-between px-4 py-3 border rounded-sm text-sm transition-colors',
									selectedOptionId === option.id
										? 'border-primary/50 bg-primary/5 font-medium'
										: 'border-gray-200 hover:border-gray-300'
								)}
							>
								<span>{option.quoteNumber}</span>
								<span>{formatCurrency(option.total)}</span>
							</button>
						))}
					</div>
				)}

				{currentOption && (
					<>
						<div className="px-10 sm:px-14">
							<Separator />
						</div>

						<div className="px-10 sm:px-14 py-8 space-y-8">
							{/* Product Details */}
							{currentOption.product && (
								<div>
									<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Product</p>
									<p className="text-xl font-semibold">{currentOption.product.name}</p>
								</div>
							)}

							{/* Components Summary */}
							{currentOption.components.length > 0 && (
								<div>
									<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Components</p>
									<div className="space-y-1">
										{currentOption.components.map((comp) => (
											<div key={comp.id} className="text-sm">
												{formatComponentType(comp.componentType)}
												{comp.height && comp.width && comp.depth && (
													<span className="text-muted-foreground ml-2">
														({comp.height}" × {comp.width}" × {comp.depth}")
													</span>
												)}
												{comp.materialName && (
													<span className="text-muted-foreground ml-1">– {comp.materialName}</span>
												)}
											</div>
										))}
									</div>
								</div>
							)}

							{/* Flower Holes */}
							{currentOption.flowerHoles && (
								<div>
									<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Flower Holes</p>
									<p className="text-sm">{currentOption.flowerHoles.replace(/_/g, ' ')}</p>
								</div>
							)}

							{/* Proposed Inscription */}
							{pkg.proposedInscription && (
								<div className="text-center">
									<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Proposed Inscription</p>
									<p className="whitespace-pre-wrap italic text-lg py-2">{pkg.proposedInscription}</p>
								</div>
							)}

							{/* Lettering */}
							{currentOption.lettering.length > 0 && (
								<div>
									<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Lettering</p>
									<div className="space-y-4">
										{currentOption.lettering.map((lett) => (
											<div key={lett.id} className="space-y-1">
												<p className="text-sm text-muted-foreground">
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
								</div>
							)}

							{/* Sundries */}
							{currentOption.sundries.length > 0 && (
								<div>
									<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Additional Items</p>
									<div className="space-y-1">
										{currentOption.sundries.map((s) => (
											<p key={s.id} className="text-sm text-muted-foreground">
												{s.sundryName} × {s.quantity}
											</p>
										))}
									</div>
								</div>
							)}

							{/* Custom Line Items - Only visible ones */}
							{currentOption.lineItems &&
								currentOption.lineItems.filter((item) => item.visibleToCustomer).length > 0 && (
									<div>
										<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Other Charges</p>
										<div className="space-y-1">
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
									</div>
								)}
						</div>

						<div className="px-10 sm:px-14">
							<Separator />
						</div>

						{/* Pricing Summary */}
						<div className="px-10 sm:px-14 py-8">
							<div className="max-w-xs ml-auto space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Subtotal</span>
									<span>{formatCurrency(currentOption.subtotal)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">VAT ({(parseFloat(currentOption.vatRate) * 100).toFixed(0)}%)</span>
									<span>{formatCurrency(currentOption.vatAmount)}</span>
								</div>
								<Separator className="my-2" />
								<div className="flex justify-between items-baseline pt-1">
									<span className="text-sm font-medium">Total</span>
									<span className="text-3xl font-heading font-bold">{formatCurrency(currentOption.total)}</span>
								</div>
							</div>
						</div>
					</>
				)}

				{/* Notes */}
				{pkg.notes && (
					<>
						<div className="px-10 sm:px-14">
							<Separator />
						</div>
						<div className="px-10 sm:px-14 py-6">
							<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">{pkg.notes}</p>
						</div>
					</>
				)}

				{/* Footer */}
				{settings && (
					<>
						<div className="px-10 sm:px-14">
							<Separator />
						</div>
						<div className="px-10 sm:px-14 py-8 text-center space-y-2">
							<p className="text-sm text-muted-foreground italic">Thank you for your enquiry</p>
							<p className="font-heading font-semibold">{settings.name}</p>
							{hasContactInfo && (
								<p className="text-sm text-muted-foreground">
									{[settings.phone, settings.email, settings.website].filter(Boolean).join(' · ')}
								</p>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
