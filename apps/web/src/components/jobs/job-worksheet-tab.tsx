import { Check, ClipboardList, Loader2, Plus, Printer } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	useCreateMemorialWorksheetMutation,
	useMemorialWorksheetQuery,
	useUpdateMemorialWorksheetMutation,
} from '@/hooks/use-memorial-worksheet';
import { useAutosave, type AutosaveStatus } from './use-autosave';

function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
	if (status === 'saving') {
		return (
			<span className="text-sm text-muted-foreground flex items-center gap-1">
				<Loader2 className="h-3 w-3 animate-spin" />
				Saving...
			</span>
		);
	}
	if (status === 'saved') {
		return (
			<span className="text-sm text-green-600 flex items-center gap-1">
				<Check className="h-4 w-4" />
				Saved
			</span>
		);
	}
	if (status === 'error') {
		return <span className="text-sm text-destructive">Save failed</span>;
	}
	return null;
}

type WorksheetFormData = {
	date: string;
	deceasedName: string;
	cemeteryChurchyard: string;
	location: string;
	existingDescription: string;
	requirements: string;
	inscription: string;
};

export function JobWorksheetTab({ jobId, jobNumber }: { jobId: string; jobNumber: string }) {
	const [worksheetForm, setWorksheetForm] = useState<WorksheetFormData | null>(null);
	const [worksheetInitialized, setWorksheetInitialized] = useState(false);

	const { data: worksheet, isLoading: worksheetLoading } = useMemorialWorksheetQuery(jobId);
	const createWorksheetMutation = useCreateMemorialWorksheetMutation();
	const updateWorksheetMutation = useUpdateMemorialWorksheetMutation();

	// Initialize worksheet form when worksheet loads
	if (worksheet && !worksheetInitialized) {
		setWorksheetForm({
			date: worksheet.date ? new Date(worksheet.date).toISOString().split('T')[0] : '',
			deceasedName: worksheet.deceasedName || '',
			cemeteryChurchyard: worksheet.cemeteryChurchyard || '',
			location: worksheet.location || '',
			existingDescription: worksheet.existingDescription || '',
			requirements: worksheet.requirements || '',
			inscription: worksheet.inscription || '',
		});
		setWorksheetInitialized(true);
	}

	// Serialize form for autosave comparison
	const serializedForm = worksheetForm ? JSON.stringify(worksheetForm) : '';

	const { status: autosaveStatus } = useAutosave({
		value: serializedForm,
		onSave: async (val) => {
			const parsed = JSON.parse(val) as WorksheetFormData;
			await updateWorksheetMutation.mutateAsync({
				jobId,
				input: parsed,
			});
		},
		delay: 2000,
		enabled: !!worksheet && !!worksheetForm,
	});

	const updateWorksheetField = (field: string, value: string) => {
		setWorksheetForm((prev) => (prev ? { ...prev, [field]: value } : null));
	};

	const handleCreateWorksheet = async () => {
		try {
			const created = await createWorksheetMutation.mutateAsync(jobId);
			setWorksheetForm({
				date: created.date ? new Date(created.date).toISOString().split('T')[0] : '',
				deceasedName: created.deceasedName || '',
				cemeteryChurchyard: created.cemeteryChurchyard || '',
				location: created.location || '',
				existingDescription: created.existingDescription || '',
				requirements: created.requirements || '',
				inscription: created.inscription || '',
			});
			setWorksheetInitialized(true);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create worksheet');
		}
	};

	return (
		<div className="max-w-2xl space-y-6">
			{worksheetLoading ? (
				<div className="text-muted-foreground flex items-center gap-2">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading worksheet...
				</div>
			) : !worksheet ? (
				<Card>
					<CardContent className="pt-6">
						<div className="text-center py-8">
							<ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<p className="text-muted-foreground mb-4">
								No memorial worksheet has been created for this job yet.
							</p>
							<Button
								onClick={handleCreateWorksheet}
								disabled={createWorksheetMutation.isPending}
							>
								{createWorksheetMutation.isPending ? (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								) : (
									<Plus className="h-4 w-4 mr-2" />
								)}
								Create Memorial Worksheet
							</Button>
						</div>
					</CardContent>
				</Card>
			) : worksheetForm ? (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Memorial Worksheet</CardTitle>
								<CardDescription>Reference: {jobNumber}</CardDescription>
							</div>
							<div className="flex items-center gap-2">
								<AutosaveIndicator status={autosaveStatus} />
								<Link to={`/app/jobs/${jobId}/worksheet/print`} target="_blank">
									<Button variant="outline" size="sm">
										<Printer className="h-4 w-4 mr-2" />
										Print
									</Button>
								</Link>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="ws-date">Date</Label>
								<Input
									id="ws-date"
									type="date"
									value={worksheetForm.date}
									onChange={(e) => updateWorksheetField('date', e.target.value)}
								/>
							</div>
							<div>
								<Label htmlFor="ws-deceased">Memorial Of</Label>
								<Input
									id="ws-deceased"
									placeholder="Name of deceased"
									value={worksheetForm.deceasedName}
									onChange={(e) => updateWorksheetField('deceasedName', e.target.value)}
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="ws-cemetery">Cemetery / Churchyard</Label>
								<Input
									id="ws-cemetery"
									placeholder="Cemetery or churchyard name"
									value={worksheetForm.cemeteryChurchyard}
									onChange={(e) =>
										updateWorksheetField('cemeteryChurchyard', e.target.value)
									}
								/>
							</div>
							<div>
								<Label htmlFor="ws-location">Location</Label>
								<Input
									id="ws-location"
									placeholder="Location details"
									value={worksheetForm.location}
									onChange={(e) => updateWorksheetField('location', e.target.value)}
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="ws-existing">Existing Memorial Description</Label>
							<Input
								id="ws-existing"
								placeholder="Description of existing memorial"
								value={worksheetForm.existingDescription}
								onChange={(e) =>
									updateWorksheetField('existingDescription', e.target.value)
								}
							/>
						</div>

						<div>
							<Label htmlFor="ws-requirements">Requirements</Label>
							<Textarea
								id="ws-requirements"
								placeholder="Describe the work required..."
								value={worksheetForm.requirements}
								onChange={(e) => updateWorksheetField('requirements', e.target.value)}
								rows={6}
							/>
						</div>

						<div>
							<Label htmlFor="ws-inscription">Proposed Inscription</Label>
							<Textarea
								id="ws-inscription"
								placeholder="Enter the proposed inscription text..."
								value={worksheetForm.inscription}
								onChange={(e) => updateWorksheetField('inscription', e.target.value)}
								rows={6}
								className="font-serif text-center"
							/>
						</div>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
