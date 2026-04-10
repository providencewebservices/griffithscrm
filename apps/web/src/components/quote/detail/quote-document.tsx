import type { ReactNode } from 'react';
import { InscriptionText } from '@/components/inscription-text';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// --- Shared display types ---

export type DisplayComponent = {
	key: string;
	componentId: string;
	componentType: string;
	height: string | null;
	width: string | null;
	depth: string | null;
	materialName: string | null;
	finishName: string | null;
};

export type DisplayLettering = {
	key: string;
	quoteComponentId: string | null;
	text: string | null;
	letterCount: number;
	techniqueName: string | null;
	colorName: string | null;
	fontId: string | null;
	fontName: string | null;
	fontS3Key: string | null;
	placementDescription: string | null;
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
	address?: string | null;
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
	const getLetteringComponentLabel = (quoteComponentId: string | null) => {
		if (!currentOption || !quoteComponentId) return null;
		const component = currentOption.components.find(
			(item) => item.componentId === quoteComponentId,
		);
		return component ? formatComponentType(component.componentType) : null;
	};

	const px = 'px-10 sm:px-14';
	const sectionLabelClass =
		'text-xs font-medium text-primary/45 tracking-wide border-b border-primary/10 pb-1 mb-2';

	function optionButtonClass(option: DisplayOption): string {
		const isSelected = selectedOptionId === option.id;
		if (option.isAccepted) return 'border-primary/30 bg-primary/5 font-medium print:bg-white';
		if (isSelected) return 'border-primary/20 bg-primary/[0.03] font-medium print:bg-white';
		return 'border-primary/10 hover:border-primary/20';
	}

	const renderSep = () => (
		<div className={px}>
			<div className="border-t border-primary/10" />
		</div>
	);

	return (
		<div className="bg-white shadow-sm border border-primary/10 border-t-2 border-t-primary print:shadow-none print:border-none">
			{/* ── Letterhead ── */}
			<div className={cn(px, 'pt-10 pb-8')}>
				{tenant.hasLogo ? (
					<div className="flex items-start justify-between gap-6">
						<div className="shrink-0">
							<img
								src={`${API_URL}/api/logo/${tenant.id}`}
								alt={tenant.name}
								className="h-24 max-w-[200px] object-contain"
							/>
						</div>
						<div className="text-right space-y-0.5 pt-1">
							<p className="font-heading font-semibold text-primary text-lg tracking-tight">
								{tenant.name}
							</p>
							{tenant.address && (
								<p className="text-sm text-primary/60 whitespace-pre-line">
									{tenant.address.split(', ').join('\n')}
								</p>
							)}
							{tenant.phone && (
								<p className="text-sm text-primary/60 tabular-nums">{tenant.phone}</p>
							)}
						</div>
					</div>
				) : (
					<div className="text-center space-y-2">
						<p className="text-3xl font-heading font-semibold text-primary tracking-tight">
							{tenant.name}
						</p>
						{(tenant.address || tenant.phone) && (
							<div className="text-sm text-primary/60 space-y-0.5">
								{tenant.address && <p>{tenant.address}</p>}
								{tenant.phone && <p className="tabular-nums">{tenant.phone}</p>}
							</div>
						)}
					</div>
				)}
			</div>

			<div className={px}>
				<div className="border-t border-primary/15" />
			</div>

			{/* ── Document Title ── */}
			<div className={cn(px, 'py-10 text-center space-y-3')}>
				<p className="text-3xl font-heading tracking-wider text-primary/70">Quotation</p>
				<p className="text-sm">
					<span className="text-primary/50">Prepared for </span>
					<span className="font-medium text-primary">{customerName}</span>
				</p>
				<div className="flex items-center justify-center gap-4 text-sm text-primary/40 tabular-nums">
					<span>Date: {formatDate(createdAt)}</span>
					{validUntil && !isExpired && <span>Valid until: {formatDate(validUntil)}</span>}
				</div>
			</div>

			{/* ── Status Banner (slot) ── */}
			{statusBanner}

			{/* ── Staff Notes ── */}
			{notes && (
				<div className={cn(px, 'pb-6')}>
					<div className="border-l-4 border-primary/20 pl-4 py-2 bg-primary/[0.03] rounded-r">
						<p className="text-primary/70 text-sm">{notes}</p>
					</div>
				</div>
			)}

			{/* ── Option Selector (multiple options only) ── */}
			{!isSingleOption && (
				<>
					{renderSep()}
					<div className={cn(px, 'py-6')}>
						<p className={cn(sectionLabelClass, 'mb-3')}>
							{options.length} options for your consideration
						</p>
						<div className="space-y-2">
							{options.map((option) => (
								<button
									key={option.id}
									onClick={() => onSelectOption(option.id)}
									className={cn(
										'w-full flex items-center justify-between px-4 py-3 border text-sm transition-colors print:border-gray-300',
										optionButtonClass(option),
									)}
								>
									<span className="flex items-center gap-2">
										{option.label}
										{option.product && (
											<span className="text-muted-foreground">– {option.product.name}</span>
										)}
										{option.isAccepted && (
											<span className="inline-flex items-center rounded-full bg-primary/5 text-primary/80 border border-primary/15 px-2 py-0.5 text-xs font-medium">
												Accepted
											</span>
										)}
									</span>
									<span className="font-medium tabular-nums">{formatCurrency(option.total)}</span>
								</button>
							))}
						</div>
					</div>
				</>
			)}

			{/* ── Option Details ── */}
			{currentOption && (
				<>
					{renderSep()}

					<div className={cn(px, 'py-10 space-y-10')}>
						{/* Product */}
						{currentOption.product && (
							<div>
								<p className={sectionLabelClass}>Product</p>
								{currentOption.product.imageUrl && (
									<div className="my-3">
										<img
											src={currentOption.product.imageUrl}
											alt={currentOption.product.name}
											className="max-h-48 max-w-full object-contain rounded"
										/>
									</div>
								)}
								<p className="text-lg font-medium text-primary">{currentOption.product.name}</p>
							</div>
						)}

						{/* Components */}
						{currentOption.components.length > 0 && (
							<div>
								<p className={sectionLabelClass}>Components</p>
								<div className="space-y-2">
									{currentOption.components.map((comp) => (
										<div key={comp.key} className="text-sm bg-primary/[0.03] rounded px-3 py-1.5">
											<span className="font-medium text-primary/80">
												{formatComponentType(comp.componentType)}
											</span>
											{comp.height && comp.width && comp.depth && (
												<span className="text-muted-foreground ml-2">
													({comp.height}" × {comp.width}" × {comp.depth}")
												</span>
											)}
											{comp.materialName && <span className="ml-1">– {comp.materialName}</span>}
											{comp.finishName && (
												<span className="text-muted-foreground ml-1">({comp.finishName})</span>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Flower Holes */}
						{currentOption.flowerHoles && (
							<div>
								<p className={sectionLabelClass}>Flower Holes</p>
								<p className="text-sm">{currentOption.flowerHoles.replace(/_/g, ' ')}</p>
							</div>
						)}

						{/* Proposed Inscription */}
						{proposedInscription && (
							<div className="text-center py-6">
								<p className={cn(sectionLabelClass, 'mb-6')}>Proposed Inscription</p>
								<p className="whitespace-pre-wrap text-3xl font-heading leading-relaxed max-w-lg mx-auto text-primary/80">
									{proposedInscription}
								</p>
							</div>
						)}

						{/* Lettering */}
						{currentOption.lettering.length > 0 && (
							<div>
								<p className={cn(sectionLabelClass, 'mb-3')}>Lettering</p>
								<div className="space-y-4">
									{currentOption.lettering.map((lett) => (
										<div key={lett.key} className="space-y-1">
											<p className="text-sm">
												{getLetteringComponentLabel(lett.quoteComponentId) && (
													<span className="font-medium text-primary/80">
														{getLetteringComponentLabel(lett.quoteComponentId)} ·{' '}
													</span>
												)}
												<span className="font-medium text-primary/80">{lett.techniqueName}</span>
												{lett.colorName && <span> with {lett.colorName}</span>}
												<span className="text-muted-foreground"> · {lett.letterCount} letters</span>
											</p>
											{lett.placementDescription && (
												<p className="text-sm text-muted-foreground">
													Placement: {lett.placementDescription}
												</p>
											)}
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
								<p className={sectionLabelClass}>Additional Items</p>
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
								<p className={sectionLabelClass}>Other Charges</p>
								<div className="space-y-1">
									{currentOption.lineItems.map((li) => (
										<div key={li.key} className="flex justify-between text-sm">
											<span className="text-muted-foreground">
												{li.description}
												{li.vatExempt && <span className="text-xs ml-1">(VAT Exempt)</span>}
											</span>
											{li.showPrice && li.price != null && (
												<span className="tabular-nums">{formatCurrency(li.price)}</span>
											)}
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{renderSep()}

					{/* ── Pricing Summary ── */}
					<div className={cn(px, 'py-10')}>
						<div className="max-w-xs ml-auto space-y-2 tabular-nums border border-primary/10 rounded-lg p-4">
							<div className="flex justify-between text-sm">
								<span className="text-primary/50">Subtotal</span>
								<span className="text-primary/80">{formatCurrency(currentOption.subtotal)}</span>
							</div>
							{parseFloat(currentOption.vatAmount) > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-primary/50">
										VAT ({(parseFloat(currentOption.vatRate) * 100).toFixed(0)}
										%)
									</span>
									<span className="text-primary/80">{formatCurrency(currentOption.vatAmount)}</span>
								</div>
							)}
							<div className="border-t border-primary/10 my-2" />
							<div className="flex justify-between items-baseline pt-1">
								<span className="text-sm font-medium text-primary/60">Total</span>
								<span className="text-2xl font-heading font-semibold text-primary">
									{formatCurrency(currentOption.total)}
								</span>
							</div>
						</div>
					</div>
				</>
			)}

			{/* ── Action Area (slot) ── */}
			{actionArea}

			{/* ── Footer ── */}
			<div className={px}>
				<div className="border-t border-primary/15" />
			</div>
			<div className={cn(px, 'py-10 text-center space-y-4')}>
				<p className="text-sm text-primary/40 italic">Thank you for your enquiry</p>
				<p className="font-heading font-semibold text-primary text-lg">{tenant.name}</p>
				{hasContactInfo && (
					<div className="flex items-center justify-center gap-4 flex-wrap text-sm text-primary/50">
						{tenant.phone && <span className="tabular-nums">{tenant.phone}</span>}
						{tenant.email && <span>{tenant.email}</span>}
						{tenant.website && <span>{tenant.website}</span>}
					</div>
				)}
			</div>
		</div>
	);
}
