import {
	ArrowDown,
	ArrowUp,
	CalendarClock,
	ChevronDown,
	ChevronUp,
	Plus,
	RotateCcw,
	Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { QUOTE_TYPE_LABELS, type QuoteType } from '@/hooks/use-quotes';
import { type TeamMember, useTeamQuery } from '@/hooks/use-team';
import {
	useCreateStepMutation,
	useDeleteStepMutation,
	useReorderStepsMutation,
	useSeedTemplatesMutation,
	useUpdateStepMutation,
	useWorkflowTemplateQuery,
	useWorkflowTemplatesQuery,
	type WorkflowStep,
	type WorkflowTemplate,
} from '@/hooks/use-workflow-templates';

const CATEGORY_LABELS: Record<string, string> = {
	admin: 'Admin',
	production: 'Production',
	installation: 'Installation',
	invoicing: 'Invoicing',
	review: 'Review',
};

const CATEGORY_COLORS: Record<string, string> = {
	admin: 'bg-blue-100 text-blue-800',
	production: 'bg-purple-100 text-purple-800',
	installation: 'bg-amber-100 text-amber-800',
	invoicing: 'bg-green-100 text-green-800',
	review: 'bg-gray-100 text-gray-800',
};

const CATEGORIES = ['admin', 'production', 'installation', 'invoicing', 'review'];

const PRODUCTION_METHOD_LABELS: Record<string, string> = {
	in_house: 'In-House',
	external: 'External',
};

export function WorkflowTemplatesTab() {
	const { data: templates, isLoading, error } = useWorkflowTemplatesQuery();
	const seedMutation = useSeedTemplatesMutation();
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [resetDialogOpen, setResetDialogOpen] = useState(false);

	const handleReset = async () => {
		try {
			await seedMutation.mutateAsync();
			setResetDialogOpen(false);
		} catch {
			// Error handled by mutation
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-9 w-36" />
				</div>
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-16 w-full" />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-destructive">Error loading workflow templates: {error.message}</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold">Workflow Templates</h3>
					<p className="text-sm text-muted-foreground">Define the steps for each job type</p>
				</div>
				<Button
					variant="outline"
					onClick={() => setResetDialogOpen(true)}
					disabled={seedMutation.isPending}
				>
					<RotateCcw className="h-4 w-4 mr-2" />
					{seedMutation.isPending ? 'Resetting...' : 'Reset to Defaults'}
				</Button>
			</div>

			{templates && templates.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					<p>No workflow templates yet.</p>
					<Button
						variant="outline"
						className="mt-4"
						onClick={() => seedMutation.mutateAsync()}
						disabled={seedMutation.isPending}
					>
						{seedMutation.isPending ? 'Creating...' : 'Create Default Templates'}
					</Button>
				</div>
			) : (
				<div className="space-y-2">
					{templates?.map((template) => (
						<TemplateRow
							key={template.id}
							template={template}
							isExpanded={expandedId === template.id}
							onToggle={() => setExpandedId(expandedId === template.id ? null : template.id)}
						/>
					))}
				</div>
			)}

			<AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reset to Defaults</AlertDialogTitle>
						<AlertDialogDescription>
							This will create any missing default workflow templates. Existing templates will not
							be modified.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={seedMutation.isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleReset} disabled={seedMutation.isPending}>
							{seedMutation.isPending ? 'Resetting...' : 'Reset'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function TemplateRow({
	template,
	isExpanded,
	onToggle,
}: {
	template: WorkflowTemplate;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	return (
		<Collapsible open={isExpanded} onOpenChange={onToggle}>
			<div className="border rounded-lg">
				<CollapsibleTrigger asChild>
					<button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left">
						<div className="flex items-center gap-3">
							<span className="font-medium">{template.name}</span>
							<Badge variant="outline">
								{QUOTE_TYPE_LABELS[template.quoteType as QuoteType] || template.quoteType}
							</Badge>
							{template.productionMethod && (
								<Badge variant="secondary">
									{PRODUCTION_METHOD_LABELS[template.productionMethod] || template.productionMethod}
								</Badge>
							)}
							{!template.isActive && <Badge variant="secondary">Inactive</Badge>}
						</div>
						<div className="flex items-center gap-3">
							<span className="text-sm text-muted-foreground">
								{template.stepCount} {template.stepCount === 1 ? 'step' : 'steps'}
							</span>
							{isExpanded ? (
								<ChevronUp className="h-4 w-4 text-muted-foreground" />
							) : (
								<ChevronDown className="h-4 w-4 text-muted-foreground" />
							)}
						</div>
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="border-t">
						<TemplateSteps templateId={template.id} />
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}

function TemplateSteps({ templateId }: { templateId: string }) {
	const { data: template, isLoading } = useWorkflowTemplateQuery(templateId);
	const { data: teamMembers } = useTeamQuery();
	const createStepMutation = useCreateStepMutation();
	const updateStepMutation = useUpdateStepMutation();
	const deleteStepMutation = useDeleteStepMutation();
	const reorderMutation = useReorderStepsMutation();

	const [showAddForm, setShowAddForm] = useState(false);
	const [newStepName, setNewStepName] = useState('');
	const [newStepCategory, setNewStepCategory] = useState('admin');
	const [newStepAssignee, setNewStepAssignee] = useState<string>('');
	const [deleteStep, setDeleteStep] = useState<WorkflowStep | null>(null);

	if (isLoading) {
		return (
			<div className="p-4 space-y-2">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-10 w-full" />
				))}
			</div>
		);
	}

	const steps = template?.steps || [];

	const handleMoveStep = async (stepIndex: number, direction: 'up' | 'down') => {
		if (!template) return;
		const swapIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
		if (swapIndex < 0 || swapIndex >= steps.length) return;

		const newSteps = [...steps];
		[newSteps[stepIndex], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[stepIndex]];

		const reorderPayload = newSteps.map((s, i) => ({ id: s.id, sortOrder: i + 1 }));
		await reorderMutation.mutateAsync({ templateId, steps: reorderPayload });
	};

	const handleAddStep = async () => {
		if (!newStepName.trim()) return;
		const maxSort = steps.length > 0 ? Math.max(...steps.map((s) => s.sortOrder)) : 0;
		try {
			await createStepMutation.mutateAsync({
				templateId,
				name: newStepName.trim(),
				category: newStepCategory,
				sortOrder: maxSort + 1,
				defaultAssigneeId: newStepAssignee || null,
			});
			setNewStepName('');
			setNewStepCategory('admin');
			setNewStepAssignee('');
			setShowAddForm(false);
		} catch {
			// Error handled by mutation
		}
	};

	const handleAssigneeChange = async (step: WorkflowStep, assigneeId: string) => {
		await updateStepMutation.mutateAsync({
			templateId,
			stepId: step.id,
			defaultAssigneeId: assigneeId === 'unassigned' ? null : assigneeId,
		});
	};

	const handleDeleteConfirm = async () => {
		if (!deleteStep) return;
		try {
			await deleteStepMutation.mutateAsync({ templateId, stepId: deleteStep.id });
			setDeleteStep(null);
		} catch {
			// Error handled by mutation
		}
	};

	return (
		<div className="p-4 space-y-2">
			{steps.length === 0 ? (
				<p className="text-sm text-muted-foreground text-center py-4">
					No steps defined. Add a step to get started.
				</p>
			) : (
				<div className="space-y-1">
					{steps.map((step, index) => (
						<StepRow
							key={step.id}
							step={step}
							index={index}
							totalSteps={steps.length}
							teamMembers={teamMembers || []}
							onMoveUp={() => handleMoveStep(index, 'up')}
							onMoveDown={() => handleMoveStep(index, 'down')}
							onDelete={() => setDeleteStep(step)}
							onAssigneeChange={(assigneeId) => handleAssigneeChange(step, assigneeId)}
							isReordering={reorderMutation.isPending}
						/>
					))}
				</div>
			)}

			{showAddForm ? (
				<div className="flex items-center gap-2 pt-2 border-t">
					<Input
						value={newStepName}
						onChange={(e) => setNewStepName(e.target.value)}
						placeholder="Step name"
						className="flex-1"
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleAddStep();
							if (e.key === 'Escape') setShowAddForm(false);
						}}
						autoFocus
					/>
					<Select value={newStepCategory} onValueChange={setNewStepCategory}>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CATEGORIES.map((cat) => (
								<SelectItem key={cat} value={cat}>
									{CATEGORY_LABELS[cat]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={newStepAssignee || 'unassigned'} onValueChange={setNewStepAssignee}>
						<SelectTrigger className="w-[160px]">
							<SelectValue placeholder="Assignee" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="unassigned">Unassigned</SelectItem>
							{teamMembers?.map((member) => (
								<SelectItem key={member.id} value={member.id}>
									{member.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						size="sm"
						onClick={handleAddStep}
						disabled={!newStepName.trim() || createStepMutation.isPending}
					>
						{createStepMutation.isPending ? 'Adding...' : 'Add'}
					</Button>
					<Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
						Cancel
					</Button>
				</div>
			) : (
				<Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddForm(true)}>
					<Plus className="h-4 w-4 mr-2" />
					Add Step
				</Button>
			)}

			<DeleteConfirmDialog
				open={!!deleteStep}
				onOpenChange={(open) => {
					if (!open) setDeleteStep(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Delete Step"
				description={`Are you sure you want to delete "${deleteStep?.name}"? This will not affect existing jobs that already use this template.`}
				isLoading={deleteStepMutation.isPending}
			/>
		</div>
	);
}

function StepRow({
	step,
	index,
	totalSteps,
	teamMembers,
	onMoveUp,
	onMoveDown,
	onDelete,
	onAssigneeChange,
	isReordering,
}: {
	step: WorkflowStep;
	index: number;
	totalSteps: number;
	teamMembers: TeamMember[];
	onMoveUp: () => void;
	onMoveDown: () => void;
	onDelete: () => void;
	onAssigneeChange: (assigneeId: string) => void;
	isReordering: boolean;
}) {
	return (
		<div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group">
			<span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">
				{index + 1}.
			</span>
			<span className="text-sm font-medium flex-1 min-w-0 truncate">{step.name}</span>
			{step.requiresDate && (
				<span className="flex-shrink-0" title={step.dateFieldLabel || 'Requires date'}>
					<CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
				</span>
			)}
			<span
				className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[step.category] || 'bg-gray-100 text-gray-800'}`}
			>
				{CATEGORY_LABELS[step.category] || step.category}
			</span>
			<Select value={step.defaultAssigneeId || 'unassigned'} onValueChange={onAssigneeChange}>
				<SelectTrigger className="w-[140px] h-7 text-xs flex-shrink-0">
					<SelectValue placeholder="Unassigned" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="unassigned">Unassigned</SelectItem>
					{teamMembers.map((member) => (
						<SelectItem key={member.id} value={member.id}>
							{member.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={onMoveUp}
					disabled={index === 0 || isReordering}
				>
					<ArrowUp className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={onMoveDown}
					disabled={index === totalSteps - 1 || isReordering}
				>
					<ArrowDown className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-destructive hover:text-destructive"
					onClick={onDelete}
				>
					<Trash2 className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
}
