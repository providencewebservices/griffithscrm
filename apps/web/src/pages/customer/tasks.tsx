import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
	useTasksQuery,
	useCreateTaskMutation,
	useUpdateTaskStatusMutation,
	formatTaskStatus,
	formatTaskPriority,
	getTaskStatusVariant,
	getTaskPriorityVariant,
	TASK_STATUSES,
	TASK_PRIORITIES,
	type TaskStatus,
	type TaskPriority,
	type TaskListItem,
} from '@/hooks/use-tasks';
import {
	useWorksheetsQuery,
	useCreateWorksheetMutation,
	formatWorksheetStatus,
	getWorksheetStatusVariant,
	WORKSHEET_STATUSES,
	type WorksheetStatus,
	type WorksheetListItem,
} from '@/hooks/use-worksheets';
import { useTeamQuery } from '@/hooks/use-team';
import { useSession } from '@/lib/auth';
import {
	Search,
	Plus,
	List,
	LayoutGrid,
	Calendar,
	User,
	CheckCircle2,
	Circle,
	Clock,
	AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const ALL_VALUE = '_all';

export function TasksPage() {
	const [activeTab, setActiveTab] = useState('tasks');

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
				<p className="text-muted-foreground">Manage tasks and worksheets for your team</p>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="tasks">Tasks</TabsTrigger>
					<TabsTrigger value="worksheets">Worksheets</TabsTrigger>
				</TabsList>

				<TabsContent value="tasks" className="mt-6">
					<TasksTab />
				</TabsContent>

				<TabsContent value="worksheets" className="mt-6">
					<WorksheetsTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}

// ============================================
// TASKS TAB
// ============================================

function TasksTab() {
	const session = useSession();
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('todo,in_progress');
	const [assigneeFilter, setAssigneeFilter] = useState<string>('');
	const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('cards');
	const [showCreateDialog, setShowCreateDialog] = useState(false);

	const { data: teamMembers } = useTeamQuery();

	const debouncedSearch = useMemo(() => {
		let timeout: ReturnType<typeof setTimeout>;
		return (value: string) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => setSearch(value), 300);
		};
	}, []);

	const { data: tasksList, isLoading } = useTasksQuery({
		status: statusFilter || undefined,
		assigneeId: assigneeFilter || undefined,
		search: search || undefined,
	});

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search tasks..."
						className="pl-9"
						onChange={(e) => debouncedSearch(e.target.value)}
					/>
				</div>
				<Select
					value={statusFilter || ALL_VALUE}
					onValueChange={(v) => setStatusFilter(v === ALL_VALUE ? '' : v)}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_VALUE}>All statuses</SelectItem>
						<SelectItem value="todo,in_progress">Open</SelectItem>
						{TASK_STATUSES.map((status) => (
							<SelectItem key={status} value={status}>
								{formatTaskStatus(status)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={assigneeFilter || ALL_VALUE}
					onValueChange={(v) => setAssigneeFilter(v === ALL_VALUE ? '' : v)}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Assignee" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_VALUE}>All assignees</SelectItem>
						{session?.data?.user && (
							<SelectItem value={session.data.user.id}>Me</SelectItem>
						)}
						{teamMembers?.filter(m => m.id !== session?.data?.user?.id).map((member) => (
							<SelectItem key={member.id} value={member.id}>
								{member.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="flex items-center gap-2">
					<div className="flex items-center border rounded-md">
						<Button
							variant={displayMode === 'table' ? 'secondary' : 'ghost'}
							size="sm"
							className="rounded-r-none"
							onClick={() => setDisplayMode('table')}
						>
							<List className="h-4 w-4" />
						</Button>
						<Button
							variant={displayMode === 'cards' ? 'secondary' : 'ghost'}
							size="sm"
							className="rounded-l-none"
							onClick={() => setDisplayMode('cards')}
						>
							<LayoutGrid className="h-4 w-4" />
						</Button>
					</div>
					<Button onClick={() => setShowCreateDialog(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Add Task
					</Button>
				</div>
			</div>

			{/* Loading */}
			{isLoading && <div className="text-muted-foreground">Loading tasks...</div>}

			{/* Empty state */}
			{!isLoading && tasksList?.length === 0 && (
				<div className="text-center py-12 text-muted-foreground border rounded-lg">
					<p>No tasks found.</p>
					<p className="text-sm mt-1">Create a task to get started.</p>
				</div>
			)}

			{/* Tasks list */}
			{!isLoading && tasksList && tasksList.length > 0 && (
				displayMode === 'table' ? (
					<TasksTable tasks={tasksList} />
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{tasksList.map((task) => (
							<TaskCard key={task.id} task={task} />
						))}
					</div>
				)
			)}

			{showCreateDialog && (
				<CreateTaskDialog
					open={showCreateDialog}
					onClose={() => setShowCreateDialog(false)}
				/>
			)}
		</div>
	);
}

function TasksTable({ tasks }: { tasks: TaskListItem[] }) {
	const updateStatus = useUpdateTaskStatusMutation();

	const formatDate = (dateString: string | null) => {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
		});
	};

	const isOverdue = (task: TaskListItem) => {
		if (!task.dueDate || task.status === 'done') return false;
		return new Date(task.dueDate) < new Date();
	};

	return (
		<div className="border rounded-lg">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[40px]"></TableHead>
						<TableHead>Title</TableHead>
						<TableHead>Priority</TableHead>
						<TableHead>Assignee</TableHead>
						<TableHead>Due</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="w-[80px]"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{tasks.map((task) => (
						<TableRow key={task.id}>
							<TableCell>
								<button
									onClick={() => updateStatus.mutate({
										id: task.id,
										status: task.status === 'done' ? 'todo' : 'done',
									})}
									className="text-muted-foreground hover:text-foreground"
								>
									{task.status === 'done' ? (
										<CheckCircle2 className="h-5 w-5 text-green-600" />
									) : (
										<Circle className="h-5 w-5" />
									)}
								</button>
							</TableCell>
							<TableCell className={task.status === 'done' ? 'line-through text-muted-foreground' : ''}>
								{task.title}
							</TableCell>
							<TableCell>
								<Badge variant={getTaskPriorityVariant(task.priority as TaskPriority)}>
									{formatTaskPriority(task.priority as TaskPriority)}
								</Badge>
							</TableCell>
							<TableCell>{task.assigneeName || '-'}</TableCell>
							<TableCell className={isOverdue(task) ? 'text-red-600 font-medium' : ''}>
								{formatDate(task.dueDate)}
								{isOverdue(task) && <AlertCircle className="h-3 w-3 inline ml-1" />}
							</TableCell>
							<TableCell>
								<Badge variant={getTaskStatusVariant(task.status as TaskStatus)}>
									{formatTaskStatus(task.status as TaskStatus)}
								</Badge>
							</TableCell>
							<TableCell>
								<Link to={`/app/tasks/${task.id}`}>
									<Button variant="ghost" size="sm">View</Button>
								</Link>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function TaskCard({ task }: { task: TaskListItem }) {
	const updateStatus = useUpdateTaskStatusMutation();

	const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();

	const formatDate = (dateString: string | null) => {
		if (!dateString) return null;
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
		});
	};

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-start gap-2 flex-1 min-w-0">
						<button
							onClick={() => updateStatus.mutate({
								id: task.id,
								status: task.status === 'done' ? 'todo' : 'done',
							})}
							className="mt-0.5 text-muted-foreground hover:text-foreground shrink-0"
						>
							{task.status === 'done' ? (
								<CheckCircle2 className="h-5 w-5 text-green-600" />
							) : (
								<Circle className="h-5 w-5" />
							)}
						</button>
						<CardTitle className={`text-base font-semibold leading-tight ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
							{task.title}
						</CardTitle>
					</div>
					<Badge variant={getTaskPriorityVariant(task.priority as TaskPriority)} className="shrink-0">
						{formatTaskPriority(task.priority as TaskPriority)}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
					{task.assigneeName && (
						<div className="flex items-center gap-2">
							<User className="h-3.5 w-3.5" />
							<span>{task.assigneeName}</span>
						</div>
					)}
					{task.dueDate && (
						<div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
							<Calendar className="h-3.5 w-3.5" />
							<span>{formatDate(task.dueDate)}</span>
							{isOverdue && <span className="text-xs">Overdue</span>}
						</div>
					)}
					{task.status === 'in_progress' && (
						<div className="flex items-center gap-2 text-blue-600">
							<Clock className="h-3.5 w-3.5" />
							<span>In Progress</span>
						</div>
					)}
				</div>
				<div className="pt-2">
					<Link to={`/app/tasks/${task.id}`}>
						<Button variant="outline" size="sm" className="w-full">
							View Details
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}

// ============================================
// WORKSHEETS TAB
// ============================================

function WorksheetsTab() {
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('');
	const [showCreateDialog, setShowCreateDialog] = useState(false);

	const debouncedSearch = useMemo(() => {
		let timeout: ReturnType<typeof setTimeout>;
		return (value: string) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => setSearch(value), 300);
		};
	}, []);

	const { data: worksheetsList, isLoading } = useWorksheetsQuery({
		status: statusFilter || undefined,
		search: search || undefined,
	});

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search worksheets..."
						className="pl-9"
						onChange={(e) => debouncedSearch(e.target.value)}
					/>
				</div>
				<Select
					value={statusFilter || ALL_VALUE}
					onValueChange={(v) => setStatusFilter(v === ALL_VALUE ? '' : v)}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_VALUE}>All statuses</SelectItem>
						{WORKSHEET_STATUSES.map((status) => (
							<SelectItem key={status} value={status}>
								{formatWorksheetStatus(status)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button onClick={() => setShowCreateDialog(true)}>
					<Plus className="h-4 w-4 mr-2" />
					New Worksheet
				</Button>
			</div>

			{/* Loading */}
			{isLoading && <div className="text-muted-foreground">Loading worksheets...</div>}

			{/* Empty state */}
			{!isLoading && worksheetsList?.length === 0 && (
				<div className="text-center py-12 text-muted-foreground border rounded-lg">
					<p>No worksheets found.</p>
					<p className="text-sm mt-1">Create a worksheet to assign tasks to team members.</p>
				</div>
			)}

			{/* Worksheets grid */}
			{!isLoading && worksheetsList && worksheetsList.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{worksheetsList.map((worksheet) => (
						<WorksheetCard key={worksheet.id} worksheet={worksheet} />
					))}
				</div>
			)}

			{showCreateDialog && (
				<CreateWorksheetDialog
					open={showCreateDialog}
					onClose={() => setShowCreateDialog(false)}
				/>
			)}
		</div>
	);
}

function WorksheetCard({ worksheet }: { worksheet: WorksheetListItem }) {
	const progress = worksheet.taskCount > 0
		? Math.round((worksheet.taskDoneCount / worksheet.taskCount) * 100)
		: 0;

	const formatDate = (dateString: string | null) => {
		if (!dateString) return null;
		return new Date(dateString).toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
		});
	};

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-semibold">{worksheet.title}</CardTitle>
					<Badge variant={getWorksheetStatusVariant(worksheet.status as WorksheetStatus)}>
						{formatWorksheetStatus(worksheet.status as WorksheetStatus)}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
					{worksheet.assigneeName && (
						<div className="flex items-center gap-2">
							<User className="h-3.5 w-3.5" />
							<span>{worksheet.assigneeName}</span>
						</div>
					)}
					{worksheet.date && (
						<div className="flex items-center gap-2">
							<Calendar className="h-3.5 w-3.5" />
							<span>{formatDate(worksheet.date)}</span>
						</div>
					)}
				</div>

				{worksheet.taskCount > 0 && (
					<div className="space-y-1">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Progress</span>
							<span className="font-medium">{worksheet.taskDoneCount} of {worksheet.taskCount}</span>
						</div>
						<Progress value={progress} className="h-2" />
					</div>
				)}

				<div className="pt-2">
					<Link to={`/app/tasks/worksheets/${worksheet.id}`}>
						<Button variant="outline" size="sm" className="w-full">
							View
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}

// ============================================
// CREATE DIALOGS
// ============================================

function CreateTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
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
				description: description.trim() || undefined,
				priority,
				assigneeId: assigneeId || undefined,
				dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
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
					<DialogTitle>New Task</DialogTitle>
				</DialogHeader>
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
						<Label>Description</Label>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional details..."
							rows={3}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
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
						<div>
							<Label>Assignee</Label>
							<Select value={assigneeId || ALL_VALUE} onValueChange={(v) => setAssigneeId(v === ALL_VALUE ? '' : v)}>
								<SelectTrigger>
									<SelectValue placeholder="Unassigned" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ALL_VALUE}>Unassigned</SelectItem>
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
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>Cancel</Button>
					<Button onClick={handleSubmit} disabled={!title.trim() || createTask.isPending}>
						{createTask.isPending ? 'Creating...' : 'Create Task'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function CreateWorksheetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
	const navigate = useNavigate();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [assigneeId, setAssigneeId] = useState('');
	const [date, setDate] = useState('');

	const { data: teamMembers } = useTeamQuery();
	const createWorksheet = useCreateWorksheetMutation();

	const handleSubmit = async () => {
		if (!title.trim()) return;

		try {
			const worksheet = await createWorksheet.mutateAsync({
				title: title.trim(),
				description: description.trim() || undefined,
				assigneeId: assigneeId || undefined,
				date: date ? new Date(date).toISOString() : undefined,
			});
			toast.success('Worksheet created');
			onClose();
			navigate(`/app/tasks/worksheets/${worksheet.id}`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to create worksheet');
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New Worksheet</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label>Title</Label>
						<Input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. Monday Workshop - Dave"
							autoFocus
						/>
					</div>
					<div>
						<Label>Description</Label>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional description..."
							rows={2}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Assignee</Label>
							<Select value={assigneeId || ALL_VALUE} onValueChange={(v) => setAssigneeId(v === ALL_VALUE ? '' : v)}>
								<SelectTrigger>
									<SelectValue placeholder="Unassigned" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ALL_VALUE}>Unassigned</SelectItem>
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
								value={date}
								onChange={(e) => setDate(e.target.value)}
							/>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>Cancel</Button>
					<Button onClick={handleSubmit} disabled={!title.trim() || createWorksheet.isPending}>
						{createWorksheet.isPending ? 'Creating...' : 'Create Worksheet'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
