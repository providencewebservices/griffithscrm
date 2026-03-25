import { Blocks, ChevronDown, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { JobWithQuoteSummary } from '@/hooks/use-jobs';
import { QUOTE_TYPE_SECTION_CONFIG, type QuoteType } from '@/hooks/use-quotes';
import { MEMORIAL_HEADINGS } from './types';

export function JobSpecificationsSection({ job }: { job: JobWithQuoteSummary }) {
	const [open, setOpen] = useState(false);

	const quoteType = job.quote.quoteType as QuoteType;
	const sectionConfig = QUOTE_TYPE_SECTION_CONFIG[quoteType];
	const heading = MEMORIAL_HEADINGS[quoteType] || 'Memorial Details';

	const hasSpecifications =
		(sectionConfig?.showComponents && job.quote.components.length > 0) ||
		(sectionConfig?.showLettering && job.quote.lettering.length > 0) ||
		(sectionConfig?.showProposedInscription && job.quote.proposedInscription) ||
		(sectionConfig?.showSundries && job.quote.sundries.length > 0) ||
		(sectionConfig?.showFlowerHoles && job.quote.flowerHoles) ||
		(sectionConfig?.showExistingMemorial && job.quote.existingMemorialDescription) ||
		(sectionConfig?.showRelatedJob && job.quote.relatedJobId);

	if (!hasSpecifications) return null;

	return (
		<Card className="mt-6">
			<Collapsible open={open} onOpenChange={setOpen}>
				<CardHeader className="pb-3">
					<CollapsibleTrigger className="flex items-center justify-between w-full">
						<CardTitle className="flex items-center gap-2">
							<Blocks className="h-5 w-5" />
							{heading}
						</CardTitle>
						<ChevronDown
							className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
						/>
					</CollapsibleTrigger>
				</CardHeader>
				<CollapsibleContent>
					<CardContent className="space-y-6 pt-0">
						{/* Existing Memorial Description */}
						{sectionConfig?.showExistingMemorial && job.quote.existingMemorialDescription && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-2">
									EXISTING MEMORIAL
								</h4>
								<div className="bg-muted/50 rounded-lg p-3 text-sm">
									{job.quote.existingMemorialDescription}
								</div>
							</div>
						)}

						{/* Related Job */}
						{sectionConfig?.showRelatedJob && job.quote.relatedJobId && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-2">RELATED JOB</h4>
								<Link to={`/app/jobs/${job.quote.relatedJobId}`}>
									<Button variant="outline" size="sm">
										<ExternalLink className="h-4 w-4 mr-2" />
										View Related Job
									</Button>
								</Link>
							</div>
						)}

						{/* Components */}
						{sectionConfig?.showComponents && job.quote.components.length > 0 && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-2">COMPONENTS</h4>
								<div className="space-y-2">
									{job.quote.components.map((comp) => (
										<div key={comp.id} className="bg-muted/50 rounded-lg p-3">
											<div className="font-medium">
												{comp.componentType
													.split('_')
													.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
													.join(' ')}
												{comp.materialName && ` \u2022 ${comp.materialName}`}
												{comp.finishName && ` (${comp.finishName})`}
											</div>
											{(comp.height || comp.width || comp.depth) && (
												<div className="text-sm text-muted-foreground mt-1">
													{[comp.height, comp.width, comp.depth].filter(Boolean).join('" \u00d7 ')}
													"
													{comp.quantity > 1 && ` \u00d7 ${comp.quantity}`}
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Lettering */}
						{sectionConfig?.showLettering && job.quote.lettering.length > 0 && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-2">LETTERING</h4>
								<div className="space-y-2">
									{job.quote.lettering.map((lett) => (
										<div key={lett.id} className="bg-muted/50 rounded-lg p-3">
											{lett.text && <div className="font-medium">"{lett.text}"</div>}
											<div className="text-sm text-muted-foreground mt-1">
												{lett.techniqueName}
												{lett.colorName && ` \u2022 ${lett.colorName}`}
												{` \u2022 ${lett.letterCount} letters`}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Proposed Inscription */}
						{sectionConfig?.showProposedInscription && job.quote.proposedInscription && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-2">INSCRIPTION</h4>
								<div className="bg-muted/50 rounded-lg p-4 font-mono text-sm text-center whitespace-pre-wrap">
									{job.quote.proposedInscription}
								</div>
							</div>
						)}

						{/* Sundries */}
						{sectionConfig?.showSundries && job.quote.sundries.length > 0 && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-2">
									ADDITIONAL ITEMS
								</h4>
								<ul className="space-y-1">
									{job.quote.sundries.map((sundry) => (
										<li key={sundry.id} className="flex items-center gap-2 text-sm">
											<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
											{sundry.sundryName}
											{sundry.quantity > 1 && ` \u00d7 ${sundry.quantity}`}
										</li>
									))}
								</ul>
							</div>
						)}

						{/* Flower Holes */}
						{sectionConfig?.showFlowerHoles && job.quote.flowerHoles && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-2">FLOWER HOLES</h4>
								<div className="text-sm">
									{job.quote.flowerHoles
										.split('_')
										.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
										.join(' ')}
								</div>
							</div>
						)}
					</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}
