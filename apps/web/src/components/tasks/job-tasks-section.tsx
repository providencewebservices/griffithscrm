import { AlertCircle, Calendar, CheckCircle2, Circle, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	formatTaskPriority,
	getTaskPriorityVariant,
	TASK_PRIORITIES,
	type TaskListItem,
	type TaskPriority,
	useCreateTaskMutation,
	useTasksQuery,
	useUpdateTaskStatusMutation,
} from '@/hooks/use-tasks';
import { useTeamQuery } from '@/hooks/use-team';

const NONE_VALUE = '_none';

export function JobTasksSection({ jobId, tasks }: { jobId: string; tasks?: TaskListItem[] }) {
	const [showCreateDialog, setShowCreateDialog] = useState(false);

	const { data: fetchedTasks, isLoading: isFetching } = useTasksQuery({
		entityType: 'job',
		entityId: jobId,
	});
	const jobTasks = tasks ?? fetchedTasks;
	const isLoading = !tasks && isFetching;
	const updateStatus = useUpdateTaskStatusMutation();

	const handleToggle = async (task: TaskListItem) => {
		try {
			await updateStatus.mutateAsync({
				id: task.id,
				status: task.status === 'done' ? 'todo' : 'done',
			});
		} catch (_e) {
			toast.error('Failed to update task');
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Tasks</CardTitle>
				<Button size="sm" onClick={() => setShowCreateDialog(true)}>
					<Plus className="h-4 w-4 mr-1" />
					Add Task
				</Button>
			</CardHeader>
			<CardContent>
				{isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

				{!isLoading && (!jobTasks || jobTasks.length === 0) && (
					<p className="text-sm text-muted-foreground text-center py-4">
						No tasks linked to this job.
					</p>
				)}

				{!isLoading && jobTasks && jobTasks.length > 0 && (
					<div className="space-y-1">
						{jobTasks.map((task) => {
							const isOverdue =
								task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
							return (
								<div
									key={task.id}
									className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50"
								>
									<button
										onClick={() => handleToggle(task)}
										className="text-muted-foreground hover:text-foreground shrink-0"
									>
										{task.status === 'done' ? (
											<CheckCircle2 className="h-5 w-5 text-green-600" />
										) : (
											<Circle className="h-5 w-5" />
										)}
									</button>
									<Link
										to={`/app/tasks/${task.id}`}
										className={`flex-1 min-w-0 text-sm hover:underline ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}
									>
										{task.title}
									</Link>
									<div className="flex items-center gap-2 shrink-0">
										<Badge
											variant={getTaskPriorityVariant(task.priority as TaskPriority)}
											className="text-xs"
										>
											{formatTaskPriority(task.priority as TaskPriority)}
										</Badge>
										{task.dueDate && (
											<span
												className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}
											>
												<Calendar className="h-3 w-3 inline mr-0.5" />
												{new Date(task.dueDate).toLocaleDateString('en-GB', {
													day: 'numeric',
													month: 'short',
												})}
												{isOverdue && <AlertCircle className="h-3 w-3 inline ml-0.5" />}
											</span>
										)}
										{task.assigneeName && (
											<span className="text-xs text-muted-foreground">{task.assigneeName}</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>

			{showCreateDialog && (
				<CreateJobTaskDialog
					jobId={jobId}
					open={showCreateDialog}
					onClose={() => setShowCreateDialog(false)}
				/>
			)}
		</Card>
	);
}

function CreateJobTaskDialog({
	jobId,
	open,
	onClose,
}: {
	jobId: string;
	open: boolean;
	onClose: () => void;
}) {
	const [title, setTitle] = useState('');
	const [priority, setPriority] = useState<TaskPriority>('normal');
	const [assigneeId, setAssigneeId] = useState('');
	const [dueDate, setDueDate] = useState('');

	const { data: teamMembers } = useTeamQuery();
	const createTask = useCreateTaskMutation();

	const handleSubmit = async () => {
		if (!title.trim()) return;

		try {
			await createTask.mutateAsync({
				title: title.trim(),
				priority,
				assigneeId: assigneeId || undefined,
				dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
				entityType: 'job',
				entityId: jobId,
			});
			toast.success('Task created');
			onClose();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to create task');
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New Task for this Job</DialogTitle>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel>Title</FieldLabel>
						<Input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="What needs to be done?"
							autoFocus
						/>
					</Field>
					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel>Priority</FieldLabel>
							<Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TASK_PRIORITIES.map((p) => (
										<SelectItem key={p} value={p}>
											{formatTaskPriority(p)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						<Field>
							<FieldLabel>Assignee</FieldLabel>
							<Select
								value={assigneeId || NONE_VALUE}
								onValueChange={(v) => setAssigneeId(v === NONE_VALUE ? '' : v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Unassigned" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
									{teamMembers?.map((m) => (
										<SelectItem key={m.id} value={m.id}>
											{m.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					</div>
					<Field>
						<FieldLabel>Due Date</FieldLabel>
						<Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
					</Field>
				</FieldGroup>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!title.trim() || createTask.isPending}>
						{createTask.isPending ? 'Creating...' : 'Create Task'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
