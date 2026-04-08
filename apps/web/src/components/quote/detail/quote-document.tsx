import type { ReactNode } from 'react';
import { InscriptionText } from '@/components/inscription-text';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// --- Shared display types ---

export type DisplayComponent = {
	key: string;
	componentType: string;
	height: string | null;
	width: string | null;
	depth: string | null;
	materialName: string | null;
	finishName: string | null;
};

export type DisplayLettering = {
	key: string;
	text: string | null;
	letterCount: number;
	techniqueName: string | null;
	colorName: string | null;
	fontId: string | null;
	fontName: string | null;
	fontS3Key: string | null;
};

export type DisplaySundry = {
	key: string;
	sundryName: string | null;
	quantity: number;
};

export type DisplayLineItem = {
	key: string;
	description: string;
	price: string | null;
	vatExempt: boolean;
	showPrice: boolean;
};

export type DisplayOption = {
	id: string;
	label: string;
	isAccepted?: boolean;
	total: string;
	subtotal: string;
	vatAmount: string;
	vatRate: string;
	flowerHoles: string | null;
	product: { name: string; imageUrl: string | null } | null;
	components: DisplayComponent[];
	lettering: DisplayLettering[];
	sundries: DisplaySundry[];
	lineItems: DisplayLineItem[];
};

export type DisplayTenant = {
	id: string;
	name: string;
	hasLogo: boolean;
	phone: string | null;
	email: string | null;
	website: string | null;
};

type QuoteDocumentProps = {
	tenant: DisplayTenant;
	customerName: string;
	createdAt: string;
	validUntil: string | null;
	isExpired?: boolean;
	proposedInscription: string | null;
	notes: string | null;
	options: DisplayOption[];
	selectedOptionId: string | null;
	onSelectOption: (id: string) => void;
	formatCurrency: (value: string | number) => string;
	formatDate: (dateString: string) => string;
	/** Rendered between the document title and the option selector */
	statusBanner?: ReactNode;
	/** Rendered between the pricing summary and the footer */
	actionArea?: ReactNode;
};

function formatComponentType(type: string): string {
	return type
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

// --- Section label component ---

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<p
			className={cn(
				'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2',
				className,
			)}
		>
			{children}
		</p>
	);
}

// --- Main component ---

export function QuoteDocument({
	tenant,
	customerName,
	createdAt,
	validUntil,
	isExpired,
	proposedInscription,
	notes,
	options,
	selectedOptionId,
	onSelectOption,
	formatCurrency,
	formatDate,
	statusBanner,
	actionArea,
}: QuoteDocumentProps) {
	const isSingleOption = options.length === 1;
	const currentOption = options.find((o) => o.id === selectedOptionId);
	const hasContactInfo = tenant.phone || tenant.email || tenant.website;

	return (
		<div className="bg-white shadow-lg border border-gray-200 print:shadow-none print:border-none">
			{/* Letterhead */}
			<div className="px-10 sm:px-14 pt-10 pb-6">
				{tenant.hasLogo ? (
					<div className="text-center">
						<img
							src={`${API_URL}/api/logo/${tenant.id}`}
							alt={tenant.name}
							className="h-32 max-w-[320px] object-contain mx-auto"
						/>
						{hasContactInfo && (
							<div className="text-sm text-muted-foreground mt-3 space-y-0.5">
								{tenant.phone && <p>{tenant.phone}</p>}
								{tenant.email && <p>{tenant.email}</p>}
								{tenant.website && <p>{tenant.website}</p>}
							</div>
						)}
					</div>
				) : (
					<div className="text-center">
						<h1 className="text-2xl font-heading font-bold">{tenant.name}</h1>
						{hasContactInfo && (
							<div className="text-sm text-muted-foreground mt-3 space-y-0.5">
								{tenant.phone && <p>{tenant.phone}</p>}
								{tenant.email && <p>{tenant.email}</p>}
								{tenant.website && <p>{tenant.website}</p>}
							</div>
						)}
					</div>
				)}
			</div>

			<div className="px-10 sm:px-14">
				<Separator />
			</div>

			{/* Document Title */}
			<div className="px-10 sm:px-14 py-8 text-center space-y-2">
				<p className="text-2xl font-heading font-light tracking-wide text-foreground/80">
					Quotation
				</p>
				<p className="text-sm">
					<span className="text-muted-foreground">Prepared for </span>
					<span className="font-medium">{customerName}</span>
				</p>
				<div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
					<span>Date: {formatDate(createdAt)}</span>
					{validUntil && !isExpired && <span>Valid until: {formatDate(validUntil)}</span>}
				</div>
			</div>

			{/* Status Banner (slot) */}
			{statusBanner}

			{/* Staff Notes */}
			{notes && (
				<div className="px-10 sm:px-14 pb-6">
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 print:bg-white print:border-gray-300">
						<p className="text-blue-800 text-sm print:text-foreground">{notes}</p>
					</div>
				</div>
			)}

			{/* Option Selector (multiple options only) */}
			{!isSingleOption && (
				<>
					<div className="px-10 sm:px-14">
						<Separator />
					</div>
					<div className="px-10 sm:px-14 py-6">
						<SectionLabel className="mb-3">
							{options.length} options for your consideration
						</SectionLabel>
						<div className="space-y-2">
							{options.map((option) => (
								<button
									key={option.id}
									onClick={() => onSelectOption(option.id)}
									className={cn(
										'w-full flex items-center justify-between px-4 py-3 border text-sm transition-colors print:border-gray-300',
										option.isAccepted
											? 'border-green-500 bg-green-50 font-medium print:bg-white'
											: selectedOptionId === option.id
												? 'border-primary/50 bg-primary/5 font-medium print:bg-white'
												: 'border-gray-200 hover:border-gray-300',
									)}
								>
									<span className="flex items-center gap-2">
										{option.label}
										{option.product && (
											<span className="text-muted-foreground">
												– {option.product.name}
											</span>
										)}
										{option.isAccepted && (
											<span className="inline-flex items-center rounded-full bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 text-xs font-medium">
												Accepted
											</span>
										)}
									</span>
									<span className="font-medium">{formatCurrency(option.total)}</span>
								</button>
							))}
						</div>
					</div>
				</>
			)}

			{/* Option Details */}
			{currentOption && (
				<>
					<div className="px-10 sm:px-14">
						<Separator />
					</div>

					<div className="px-10 sm:px-14 py-8 space-y-8">
						{/* Product */}
						{currentOption.product && (
							<div>
								<SectionLabel>Product</SectionLabel>
								{currentOption.product.imageUrl && (
									<div className="my-3">
										<img
											src={currentOption.product.imageUrl}
											alt={currentOption.product.name}
											className="max-h-48 max-w-full object-contain rounded"
										/>
									</div>
								)}
								<p className="text-base font-medium">{currentOption.product.name}</p>
							</div>
						)}

						{/* Components */}
						{currentOption.components.length > 0 && (
							<div>
								<SectionLabel>Components</SectionLabel>
								<div className="space-y-1">
									{currentOption.components.map((comp) => (
										<div key={comp.key} className="text-sm">
											<span>{formatComponentType(comp.componentType)}</span>
											{comp.height && comp.width && comp.depth && (
												<span className="text-muted-foreground ml-2">
													({comp.height}" × {comp.width}" × {comp.depth}")
												</span>
											)}
											{comp.materialName && (
												<span className="ml-1">– {comp.materialName}</span>
											)}
											{comp.finishName && (
												<span className="text-muted-foreground ml-1">
													({comp.finishName})
												</span>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Flower Holes */}
						{currentOption.flowerHoles && (
							<div>
								<SectionLabel>Flower Holes</SectionLabel>
								<p className="text-sm">
									{currentOption.flowerHoles.replace(/_/g, ' ')}
								</p>
							</div>
						)}

						{/* Proposed Inscription — elevated treatment */}
						{proposedInscription && (
							<div className="text-center bg-stone-50 -mx-10 sm:-mx-14 px-10 sm:px-14 py-8 print:bg-white">
								<SectionLabel className="mb-4">Proposed Inscription</SectionLabel>
								<p className="whitespace-pre-wrap italic text-xl leading-relaxed py-2">
									{proposedInscription}
								</p>
							</div>
						)}

						{/* Lettering */}
						{currentOption.lettering.length > 0 && (
							<div>
								<SectionLabel className="mb-3">Lettering</SectionLabel>
								<div className="space-y-4">
									{currentOption.lettering.map((lett) => (
										<div key={lett.key} className="space-y-1">
											<p className="text-sm">
												<span>{lett.techniqueName}</span>
												{lett.colorName && (
													<span> with {lett.colorName}</span>
												)}
												<span className="text-muted-foreground">
													{' '}
													· {lett.letterCount} letters
												</span>
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
								<SectionLabel>Additional Items</SectionLabel>
								<div className="space-y-1">
									{currentOption.sundries.map((s) => (
										<p key={s.key} className="text-sm text-muted-foreground">
											{s.sundryName} × {s.quantity}
										</p>
									))}
								</div>
							</div>
						)}

						{/* Custom Line Items */}
						{currentOption.lineItems.length > 0 && (
							<div>
								<SectionLabel>Other Charges</SectionLabel>
								<div className="space-y-1">
									{currentOption.lineItems.map((li) => (
										<div key={li.key} className="flex justify-between text-sm">
											<span className="text-muted-foreground">
												{li.description}
												{li.vatExempt && (
													<span className="text-xs ml-1">(VAT Exempt)</span>
												)}
											</span>
											{li.showPrice && li.price != null && (
												<span>{formatCurrency(li.price)}</span>
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
							{parseFloat(currentOption.vatAmount) > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">
										VAT (
										{(parseFloat(currentOption.vatRate) * 100).toFixed(0)}
										%)
									</span>
									<span>{formatCurrency(currentOption.vatAmount)}</span>
								</div>
							)}
							<Separator className="my-2" />
							<div className="flex justify-between items-baseline pt-1">
								<span className="text-sm font-medium">Total</span>
								<span className="text-2xl font-heading font-semibold">
									{formatCurrency(currentOption.total)}
								</span>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Action Area (slot) */}
			{actionArea}

			{/* Footer */}
			<div className="px-10 sm:px-14">
				<Separator />
			</div>
			<div className="px-10 sm:px-14 py-8 text-center space-y-2">
				<p className="text-sm text-muted-foreground italic">Thank you for your enquiry</p>
				<p className="font-heading font-semibold">{tenant.name}</p>
				{hasContactInfo && (
					<p className="text-sm text-muted-foreground">
						{[tenant.phone, tenant.email, tenant.website]
							.filter(Boolean)
							.join(' · ')}
					</p>
				)}
			</div>
		</div>
	);
}
