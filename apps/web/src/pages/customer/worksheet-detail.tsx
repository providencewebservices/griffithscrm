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
import { Progress } from '@/components/ui/progress';
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useWorksheetQuery,
	useUpdateWorksheetMutation,
	useUpdateWorksheetStatusMutation,
	useArchiveWorksheetMutation,
	useAddTasksToWorksheetMutation,
	useRemoveTaskFromWorksheetMutation,
	formatWorksheetStatus,
	getWorksheetStatusVariant,
	type WorksheetStatus,
	type WorksheetTask,
} from '@/hooks/use-worksheets';
import {
	useCreateTaskMutation,
	useUpdateTaskStatusMutation,
	useTasksQuery,
	formatTaskPriority,
	getTaskPriorityVariant,
	TASK_PRIORITIES,
	type TaskPriority,
	type TaskStatus,
} from '@/hooks/use-tasks';
import { useTeamQuery } from '@/hooks/use-team';
import {
	ArrowLeft,
	Save,
	Loader2,
	Trash2,
	Plus,
	CheckCircle2,
	Circle,
	X,
	Calendar,
	User,
	AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const NONE_VALUE = '_none';

export function WorksheetDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data, isLoading, error } = useWorksheetQuery(id);
	const { data: teamMembers } = useTeamQuery();

	const updateWorksheet = useUpdateWorksheetMutation();
	const updateStatus = useUpdateWorksheetStatusMutation();
	const archiveWorksheet = useArchiveWorksheetMutation();
	const updateTaskStatus = useUpdateTaskStatusMutation();
	const removeTask = useRemoveTaskFromWorksheetMutation();

	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState('');
	const [editAssigneeId, setEditAssigneeId] = useState('');
	const [editDate, setEditDate] = useState('');
	const [editNotes, setEditNotes] = useState('');
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);

	const worksheet = data?.worksheet;
	const worksheetTasks = data?.tasks || [];

	const startEditing = () => {
		if (!worksheet) return;
		setEditTitle(worksheet.title);
		setEditAssigneeId(worksheet.assigneeId || '');
		setEditDate(worksheet.date ? new Date(worksheet.date).toISOString().split('T')[0] : '');
		setEditNotes(worksheet.notes || '');
		setIsEditing(true);
	};

	const handleSave = async () => {
		if (!worksheet || !editTitle.trim()) return;

		try {
			await updateWorksheet.mutateAsync({
				id: worksheet.id,
				title: editTitle.trim(),
				assigneeId: editAssigneeId || null,
				date: editDate ? new Date(editDate).toISOString() : null,
				notes: editNotes.trim() || null,
			});
			toast.success('Worksheet updated');
			setIsEditing(false);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to update');
		}
	};

	const handleStatusChange = async (status: WorksheetStatus) => {
		if (!worksheet) return;
		try {
			await updateStatus.mutateAsync({ id: worksheet.id, status });
			toast.success(`Worksheet marked as ${formatWorksheetStatus(status)}`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to update status');
		}
	};

	const handleArchive = async () => {
		if (!worksheet) return;
		try {
			await archiveWorksheet.mutateAsync(worksheet.id);
			toast.success('Worksheet archived');
			navigate('/app/tasks');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to archive');
		}
	};

	const handleToggleTask = async (task: WorksheetTask) => {
		try {
			const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
			await updateTaskStatus.mutateAsync({ id: task.id, status: newStatus });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to update task');
		}
	};

	const handleRemoveTask = async (taskId: string) => {
		if (!worksheet) return;
		try {
			await removeTask.mutateAsync({ id: worksheet.id, taskId });
			toast.success('Task removed from worksheet');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to remove task');
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !worksheet) {
		return (
			<div className="text-center py-12">
				<p className="text-destructive">{error?.message || 'Worksheet not found'}</p>
				<Link to="/app/tasks">
					<Button variant="link" className="mt-2">Back to Tasks</Button>
				</Link>
			</div>
		);
	}

	const doneCount = worksheetTasks.filter((t) => t.status === 'done').length;
	const totalCount = worksheetTasks.length;
	const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

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
						<BreadcrumbPage>{worksheet.title}</BreadcrumbPage>
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
							<h1 className="text-2xl font-bold">{worksheet.title}</h1>
							<Badge variant={getWorksheetStatusVariant(worksheet.status as WorksheetStatus)}>
								{formatWorksheetStatus(worksheet.status as WorksheetStatus)}
							</Badge>
						</div>
						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							{worksheet.assigneeName && (
								<span className="flex items-center gap-1">
									<User className="h-3.5 w-3.5" />
									{worksheet.assigneeName}
								</span>
							)}
							{worksheet.date && (
								<span className="flex items-center gap-1">
									<Calendar className="h-3.5 w-3.5" />
									{new Date(worksheet.date).toLocaleDateString('en-GB', {
										weekday: 'short',
										day: 'numeric',
										month: 'short',
									})}
								</span>
							)}
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					{worksheet.status === 'draft' && (
						<Button onClick={() => handleStatusChange('active')}>
							Mark Active
						</Button>
					)}
					{worksheet.status === 'active' && (
						<Button onClick={() => handleStatusChange('completed')}>
							<CheckCircle2 className="h-4 w-4 mr-2" />
							Mark Complete
						</Button>
					)}
					{worksheet.status === 'completed' && (
						<Button variant="outline" onClick={() => handleStatusChange('active')}>
							Reopen
						</Button>
					)}
				</div>
			</div>

			{/* Progress */}
			{totalCount > 0 && (
				<div className="space-y-1">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Progress</span>
						<span className="font-medium">{doneCount} of {totalCount} tasks done</span>
					</div>
					<Progress value={progress} className="h-2" />
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Task list */}
				<div className="lg:col-span-2 space-y-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Tasks</CardTitle>
							<Button size="sm" onClick={() => setShowAddTaskDialog(true)}>
								<Plus className="h-4 w-4 mr-1" />
								Add Task
							</Button>
						</CardHeader>
						<CardContent>
							{worksheetTasks.length === 0 ? (
								<p className="text-muted-foreground text-sm text-center py-8">
									No tasks yet. Add tasks to this worksheet.
								</p>
							) : (
								<div className="space-y-1">
									{worksheetTasks.map((task) => {
										const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
										return (
											<div
												key={task.id}
												className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 group"
											>
												<button
													onClick={() => handleToggleTask(task)}
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
													className={`flex-1 min-w-0 text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}
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
														<span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
															{new Date(task.dueDate).toLocaleDateString('en-GB', {
																day: 'numeric',
																month: 'short',
															})}
															{isOverdue && <AlertCircle className="h-3 w-3 inline ml-0.5" />}
														</span>
													)}
													<button
														onClick={() => handleRemoveTask(task.id)}
														className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
														title="Remove from worksheet"
													>
														<X className="h-4 w-4" />
													</button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle className="text-base">Details</CardTitle>
							{!isEditing ? (
								<Button variant="outline" size="sm" onClick={startEditing}>
									Edit
								</Button>
							) : (
								<div className="flex gap-2">
									<Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
										Cancel
									</Button>
									<Button size="sm" onClick={handleSave} disabled={updateWorksheet.isPending}>
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
									<div>
										<Label>Date</Label>
										<Input
											type="date"
											value={editDate}
											onChange={(e) => setEditDate(e.target.value)}
										/>
									</div>
									<div>
										<Label>Notes</Label>
										<Textarea
											value={editNotes}
											onChange={(e) => setEditNotes(e.target.value)}
											rows={4}
										/>
									</div>
								</>
							) : (
								<>
									<div>
										<Label className="text-muted-foreground text-xs">Assignee</Label>
										<p className="mt-1 text-sm">{worksheet.assigneeName || 'Unassigned'}</p>
									</div>
									<div>
										<Label className="text-muted-foreground text-xs">Date</Label>
										<p className="mt-1 text-sm">
											{worksheet.date
												? new Date(worksheet.date).toLocaleDateString('en-GB', {
													weekday: 'long',
													day: 'numeric',
													month: 'long',
													year: 'numeric',
												})
												: 'No date set'}
										</p>
									</div>
									{worksheet.notes && (
										<div>
											<Label className="text-muted-foreground text-xs">Notes</Label>
											<p className="mt-1 text-sm whitespace-pre-wrap">{worksheet.notes}</p>
										</div>
									)}
								</>
							)}

							<div className="pt-2 border-t">
								<Button
									variant="destructive"
									size="sm"
									className="w-full"
									onClick={() => setShowDeleteDialog(true)}
								>
									<Trash2 className="h-4 w-4 mr-2" />
									Archive Worksheet
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{showAddTaskDialog && id && (
				<AddTaskDialog
					worksheetId={id}
					open={showAddTaskDialog}
					onClose={() => setShowAddTaskDialog(false)}
				/>
			)}

			<DeleteConfirmDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				onConfirm={handleArchive}
				title="Archive Worksheet"
				description="Are you sure? Tasks in this worksheet will become standalone tasks."
			/>
		</div>
	);
}

// ============================================
// ADD TASK DIALOG
// ============================================

function AddTaskDialog({ worksheetId, open, onClose }: { worksheetId: string; open: boolean; onClose: () => void }) {
	const [mode, setMode] = useState<'new' | 'existing'>('new');
	const [title, setTitle] = useState('');
	const [priority, setPriority] = useState<TaskPriority>('normal');
	const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

	const createTask = useCreateTaskMutation();
	const addTasks = useAddTasksToWorksheetMutation();

	// Fetch unassigned tasks (no worksheet)
	const { data: availableTasks } = useTasksQuery({
		status: 'todo,in_progress',
	});

	const unassignedTasks = availableTasks?.filter((t) => !t.worksheetId) || [];

	const handleCreateAndAdd = async () => {
		if (!title.trim()) return;
		try {
			const task = await createTask.mutateAsync({
				title: title.trim(),
				priority,
				worksheetId,
			});
			toast.success('Task created and added');
			setTitle('');
			onClose();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to create task');
		}
	};

	const handleAddExisting = async () => {
		if (selectedTaskIds.length === 0) return;
		try {
			await addTasks.mutateAsync({ id: worksheetId, taskIds: selectedTaskIds });
			toast.success(`${selectedTaskIds.length} task(s) added`);
			setSelectedTaskIds([]);
			onClose();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to add tasks');
		}
	};

	const toggleTaskSelection = (taskId: string) => {
		setSelectedTaskIds((prev) =>
			prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
		);
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Task</DialogTitle>
				</DialogHeader>

				<div className="flex gap-2 mb-4">
					<Button
						variant={mode === 'new' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setMode('new')}
					>
						Create New
					</Button>
					<Button
						variant={mode === 'existing' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setMode('existing')}
					>
						Add Existing
					</Button>
				</div>

				{mode === 'new' ? (
					<div className="space-y-4">
						<div>
							<Label>Title</Label>
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="What needs to be done?"
								autoFocus
							/>
						</div>
						<div>
							<Label>Priority</Label>
							<Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
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
						<DialogFooter>
							<Button variant="outline" onClick={onClose}>Cancel</Button>
							<Button onClick={handleCreateAndAdd} disabled={!title.trim() || createTask.isPending}>
								{createTask.isPending ? 'Creating...' : 'Create & Add'}
							</Button>
						</DialogFooter>
					</div>
				) : (
					<div className="space-y-4">
						{unassignedTasks.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								No unassigned tasks available.
							</p>
						) : (
							<div className="max-h-[300px] overflow-y-auto space-y-1">
								{unassignedTasks.map((task) => (
									<label
										key={task.id}
										className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
									>
										<input
											type="checkbox"
											checked={selectedTaskIds.includes(task.id)}
											onChange={() => toggleTaskSelection(task.id)}
											className="rounded"
										/>
										<span className="flex-1 text-sm">{task.title}</span>
										<Badge
											variant={getTaskPriorityVariant(task.priority as TaskPriority)}
											className="text-xs"
										>
											{formatTaskPriority(task.priority as TaskPriority)}
										</Badge>
									</label>
								))}
							</div>
						)}
						<DialogFooter>
							<Button variant="outline" onClick={onClose}>Cancel</Button>
							<Button
								onClick={handleAddExisting}
								disabled={selectedTaskIds.length === 0 || addTasks.isPending}
							>
								{addTasks.isPending ? 'Adding...' : `Add ${selectedTaskIds.length} Task(s)`}
							</Button>
						</DialogFooter>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
