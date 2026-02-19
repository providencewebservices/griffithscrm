import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useTaskQuery,
	useUpdateTaskMutation,
	useUpdateTaskStatusMutation,
	useArchiveTaskMutation,
	formatTaskStatus,
	formatTaskPriority,
	formatEntityType,
	getTaskStatusVariant,
	getTaskPriorityVariant,
	TASK_STATUSES,
	TASK_PRIORITIES,
	type TaskStatus,
	type TaskPriority,
} from '@/hooks/use-tasks';
import { useTeamQuery } from '@/hooks/use-team';
import {
	ArrowLeft,
	Save,
	Loader2,
	Trash2,
	CheckCircle2,
	Circle,
	Clock,
	ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const NONE_VALUE = '_none';

export function TaskDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: task, isLoading, error } = useTaskQuery(id);
	const { data: teamMembers } = useTeamQuery();

	const updateTask = useUpdateTaskMutation();
	const updateStatus = useUpdateTaskStatusMutation();
	const archiveTask = useArchiveTaskMutation();

	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState('');
	const [editDescription, setEditDescription] = useState('');
	const [editPriority, setEditPriority] = useState<TaskPriority>('normal');
	const [editAssigneeId, setEditAssigneeId] = useState('');
	const [editDueDate, setEditDueDate] = useState('');
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const startEditing = () => {
		if (!task) return;
		setEditTitle(task.title);
		setEditDescription(task.description || '');
		setEditPriority(task.priority as TaskPriority);
		setEditAssigneeId(task.assigneeId || '');
		setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
		setIsEditing(true);
	};

	const handleSave = async () => {
		if (!task || !editTitle.trim()) return;

		try {
			await updateTask.mutateAsync({
				id: task.id,
				title: editTitle.trim(),
				description: editDescription.trim() || null,
				priority: editPriority,
				assigneeId: editAssigneeId || null,
				dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
			});
			toast.success('Task updated');
			setIsEditing(false);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to update task');
		}
	};

	const handleStatusChange = async (status: TaskStatus) => {
		if (!task) return;
		try {
			await updateStatus.mutateAsync({ id: task.id, status });
			toast.success(`Task marked as ${formatTaskStatus(status)}`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to update status');
		}
	};

	const handleArchive = async () => {
		if (!task) return;
		try {
			await archiveTask.mutateAsync(task.id);
			toast.success('Task archived');
			navigate('/app/tasks');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to archive task');
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !task) {
		return (
			<div className="text-center py-12">
				<p className="text-destructive">{error?.message || 'Task not found'}</p>
				<Link to="/app/tasks">
					<Button variant="link" className="mt-2">Back to Tasks</Button>
				</Link>
			</div>
		);
	}

	const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();

	const entityLink = task.entityType && task.entityId
		? task.entityType === 'job' ? `/app/jobs/${task.entityId}`
		: task.entityType === 'quote' ? `/app/quotes/${task.entityId}`
		: task.entityType === 'customer' ? `/app/customers/${task.entityId}`
		: null
		: null;

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/tasks">Tasks</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{task.title}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<Link to="/app/tasks">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-2 mb-1">
							<h1 className="text-2xl font-bold">{task.title}</h1>
							<Badge variant={getTaskPriorityVariant(task.priority as TaskPriority)}>
								{formatTaskPriority(task.priority as TaskPriority)}
							</Badge>
							<Badge variant={getTaskStatusVariant(task.status as TaskStatus)}>
								{formatTaskStatus(task.status as TaskStatus)}
							</Badge>
						</div>
						{task.description && (
							<p className="text-muted-foreground">{task.description}</p>
						)}
					</div>
				</div>
				<div className="flex gap-2">
					{task.status !== 'done' && (
						<>
							{task.status === 'todo' && (
								<Button variant="outline" onClick={() => handleStatusChange('in_progress')}>
									<Clock className="h-4 w-4 mr-2" />
									Start
								</Button>
							)}
							<Button onClick={() => handleStatusChange('done')}>
								<CheckCircle2 className="h-4 w-4 mr-2" />
								Complete
							</Button>
						</>
					)}
					{task.status === 'done' && (
						<Button variant="outline" onClick={() => handleStatusChange('todo')}>
							<Circle className="h-4 w-4 mr-2" />
							Reopen
						</Button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main content */}
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Details</CardTitle>
							{!isEditing ? (
								<Button variant="outline" size="sm" onClick={startEditing}>
									Edit
								</Button>
							) : (
								<div className="flex gap-2">
									<Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
										Cancel
									</Button>
									<Button size="sm" onClick={handleSave} disabled={updateTask.isPending}>
										<Save className="h-4 w-4 mr-1" />
										Save
									</Button>
								</div>
							)}
						</CardHeader>
						<CardContent className="space-y-4">
							{isEditing ? (
								<>
									<div>
										<Label>Title</Label>
										<Input
											value={editTitle}
											onChange={(e) => setEditTitle(e.target.value)}
										/>
									</div>
									<div>
										<Label>Description</Label>
										<Textarea
											value={editDescription}
											onChange={(e) => setEditDescription(e.target.value)}
											rows={4}
										/>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Priority</Label>
											<Select value={editPriority} onValueChange={(v) => setEditPriority(v as TaskPriority)}>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{TASK_PRIORITIES.map((p) => (
														<SelectItem key={p} value={p}>{formatTaskPriority(p)}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div>
											<Label>Assignee</Label>
											<Select value={editAssigneeId || NONE_VALUE} onValueChange={(v) => setEditAssigneeId(v === NONE_VALUE ? '' : v)}>
												<SelectTrigger>
													<SelectValue placeholder="Unassigned" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
													{teamMembers?.map((m) => (
														<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
									<div>
										<Label>Due Date</Label>
										<Input
											type="date"
											value={editDueDate}
											onChange={(e) => setEditDueDate(e.target.value)}
										/>
									</div>
								</>
							) : (
								<>
									{task.description ? (
										<div>
											<Label className="text-muted-foreground">Description</Label>
											<p className="mt-1 whitespace-pre-wrap">{task.description}</p>
										</div>
									) : (
										<p className="text-muted-foreground text-sm">No description</p>
									)}
								</>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<Card>
						<CardContent className="pt-6 space-y-4">
							<div>
								<Label className="text-muted-foreground text-xs">Status</Label>
								<div className="mt-1">
									<Badge variant={getTaskStatusVariant(task.status as TaskStatus)}>
										{formatTaskStatus(task.status as TaskStatus)}
									</Badge>
								</div>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs">Priority</Label>
								<div className="mt-1">
									<Badge variant={getTaskPriorityVariant(task.priority as TaskPriority)}>
										{formatTaskPriority(task.priority as TaskPriority)}
									</Badge>
								</div>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs">Assignee</Label>
								<p className="mt-1 text-sm">{task.assigneeName || 'Unassigned'}</p>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs">Due Date</Label>
								<p className={`mt-1 text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
									{task.dueDate
										? new Date(task.dueDate).toLocaleDateString('en-GB', {
											weekday: 'short',
											day: 'numeric',
											month: 'short',
											year: 'numeric',
										})
										: 'No due date'}
									{isOverdue && ' (Overdue)'}
								</p>
							</div>

							{task.entityType && task.entityId && (
								<div>
									<Label className="text-muted-foreground text-xs">Linked {formatEntityType(task.entityType)}</Label>
									<div className="mt-1">
										{entityLink ? (
											<Link to={entityLink}>
												<Button variant="outline" size="sm">
													<ExternalLink className="h-3 w-3 mr-1" />
													View {formatEntityType(task.entityType)}
												</Button>
											</Link>
										) : (
											<span className="text-sm">{task.entityId}</span>
										)}
									</div>
								</div>
							)}

							{task.worksheetId && (
								<div>
									<Label className="text-muted-foreground text-xs">Worksheet</Label>
									<div className="mt-1">
										<Link to={`/app/tasks/worksheets/${task.worksheetId}`}>
											<Button variant="outline" size="sm">
												<ExternalLink className="h-3 w-3 mr-1" />
												View Worksheet
											</Button>
										</Link>
									</div>
								</div>
							)}

							{task.completedAt && (
								<div>
									<Label className="text-muted-foreground text-xs">Completed</Label>
									<p className="mt-1 text-sm">
										{new Date(task.completedAt).toLocaleDateString('en-GB', {
											day: 'numeric',
											month: 'short',
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit',
										})}
									</p>
								</div>
							)}

							<div className="pt-2 border-t">
								<Button
									variant="destructive"
									size="sm"
									className="w-full"
									onClick={() => setShowDeleteDialog(true)}
								>
									<Trash2 className="h-4 w-4 mr-2" />
									Archive Task
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<DeleteConfirmDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				onConfirm={handleArchive}
				title="Archive Task"
				description="Are you sure you want to archive this task? It will be hidden from task lists."
			/>
		</div>
	);
}
