import { WORKFLOW_STEP_CATEGORIES } from '@griffiths-crm/shared/db/schema';
import {
	Calendar,
	Check,
	ChevronRight,
	Circle,
	CircleCheck,
	CircleDashed,
	CircleMinus,
	ListChecks,
	Loader2,
	MoreHorizontal,
	Play,
	Plus,
	Save,
	Trash2,
	User,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
	useAddWorkflowTaskMutation,
	useCompleteWorkflowTaskMutation,
	useDeleteWorkflowTaskMutation,
	useGenerateWorkflowMutation,
	useJobWorkflowTasksQuery,
	useSkipWorkflowTaskMutation,
	useUpdateWorkflowTaskMutation,
	type WorkflowStepCategory,
} from '@/hooks/use-job-workflow-tasks';
import { useTeamQuery } from '@/hooks/use-team';
import { formatDate } from './types';

export function JobWorkflowTab({ jobId }: { jobId: string }) {
	const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
	const [showAddTask, setShowAddTask] = useState(false);
	const [newTaskName, setNewTaskName] = useState('');
	const [newTaskCategory, setNewTaskCategory] = useState<WorkflowStepCategory>('admin');
	const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
	const [newTaskDueDate, setNewTaskDueDate] = useState('');
	const [editingTaskNotes, setEditingTaskNotes] = useState<Record<string, string>>({});

	const { data: workflowTasks, isLoading: workflowTasksLoading } =
		useJobWorkflowTasksQuery(jobId);
	const generateWorkflowMutation = useGenerateWorkflowMutation(jobId);
	const completeTaskMutation = useCompleteWorkflowTaskMutation(jobId);
	const skipTaskMutation = useSkipWorkflowTaskMutation(jobId);
	const updateTaskMutation = useUpdateWorkflowTaskMutation(jobId);
	const addTaskMutation = useAddWorkflowTaskMutation(jobId);
	const deleteTaskMutation = useDeleteWorkflowTaskMutation(jobId);
	const { data: teamMembers } = useTeamQuery();

	const workflowCompleted = workflowTasks?.filter((t) => t.status === 'completed').length ?? 0;
	const workflowTotal = workflowTasks?.length ?? 0;
	const workflowProgressPercent =
		workflowTotal > 0 ? Math.round((workflowCompleted / workflowTotal) * 100) : 0;

	return (
		<div className="max-w-2xl space-y-6">
			{workflowTasksLoading ? (
				<div className="text-muted-foreground flex items-center gap-2">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading workflow...
				</div>
			) : !workflowTasks || workflowTasks.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<div className="text-center py-8">
							<ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<p className="text-muted-foreground mb-4">
								No workflow tasks have been created for this job yet.
							</p>
							<Button
								onClick={() => {
									generateWorkflowMutation.mutate(undefined, {
										onSuccess: () => toast.success('Workflow generated'),
										onError: (err) => toast.error(err.message),
									});
								}}
								disabled={generateWorkflowMutation.isPending}
							>
								{generateWorkflowMutation.isPending ? (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								) : (
									<ListChecks className="h-4 w-4 mr-2" />
								)}
								Generate Workflow
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				<>
					{/* Progress indicator */}
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium">
									{workflowCompleted} of {workflowTotal} steps complete
								</span>
								<span className="text-sm text-muted-foreground">
									{workflowProgressPercent}%
								</span>
							</div>
							<Progress value={workflowProgressPercent} />
						</CardContent>
					</Card>

					{/* Task list */}
					<Card>
						<CardHeader>
							<CardTitle>Workflow Steps</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-1">
								{workflowTasks.map((task, index) => {
									const isCompleted = task.status === 'completed';
									const isSkipped = task.status === 'skipped';
									const isInProgress = task.status === 'in_progress';
									const isPending = task.status === 'pending';
									const isExpanded = expandedTaskId === task.id;
									const isAdHoc = !task.workflowStepId;
									const taskNotes = editingTaskNotes[task.id] ?? task.notes ?? '';

									return (
										<div
											key={task.id}
											className={index < workflowTasks.length - 1 ? 'border-b' : ''}
										>
											{/* Task row - clickable */}
											<div
												className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2"
												onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
											>
												{/* Expand chevron */}
												<ChevronRight
													className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
												/>

												{/* Status icon */}
												<div className="flex-shrink-0">
													{isCompleted ? (
														<CircleCheck className="h-5 w-5 text-green-500" />
													) : isSkipped ? (
														<CircleMinus className="h-5 w-5 text-gray-400" />
													) : isInProgress ? (
														<CircleDashed className="h-5 w-5 text-blue-500" />
													) : (
														<Circle className="h-5 w-5 text-gray-300" />
													)}
												</div>

												{/* Task info */}
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<span
															className={`font-medium text-sm ${isSkipped ? 'line-through text-muted-foreground' : ''}`}
														>
															{task.name}
														</span>
														<Badge variant="outline" className="text-xs capitalize">
															{task.category}
														</Badge>
														{isAdHoc && (
															<Badge variant="secondary" className="text-xs">
																Ad-hoc
															</Badge>
														)}
													</div>
													<div className="flex items-center gap-3 mt-0.5">
														<span className="text-xs text-muted-foreground flex items-center gap-1">
															<User className="h-3 w-3" />
															{task.assigneeName || 'Unassigned'}
														</span>
														{task.dueDate && (
															<span className="text-xs text-muted-foreground flex items-center gap-1">
																<Calendar className="h-3 w-3" />
																{formatDate(task.dueDate)}
															</span>
														)}
													</div>
												</div>

												{/* Status badge */}
												<div className="flex-shrink-0">
													<Badge
														variant={
															isCompleted ? 'default' : isInProgress ? 'default' : 'secondary'
														}
														className={
															isCompleted
																? 'bg-green-100 text-green-800 hover:bg-green-100'
																: isInProgress
																	? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
																	: isSkipped
																		? 'bg-gray-100 text-gray-500 hover:bg-gray-100'
																		: ''
														}
													>
														{isCompleted
															? 'Completed'
															: isInProgress
																? 'In Progress'
																: isSkipped
																	? 'Skipped'
																	: 'Pending'}
													</Badge>
												</div>
											</div>

											{/* Expanded panel */}
											{isExpanded && (
												<div className="ml-9 pb-4 pt-1 space-y-4">
													{/* Description */}
													{task.description && (
														<p className="text-sm text-muted-foreground">
															{task.description}
														</p>
													)}

													{/* Editable fields */}
													<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
														{/* Assignee */}
														<div>
															<Label className="text-xs text-muted-foreground">
																Assignee
															</Label>
															<Select
																value={task.assigneeId || 'unassigned'}
																onValueChange={(value) => {
																	updateTaskMutation.mutate(
																		{
																			taskId: task.id,
																			input: {
																				assigneeId:
																					value === 'unassigned' ? null : value,
																			},
																		},
																		{
																			onError: (err) => toast.error(err.message),
																		},
																	);
																}}
															>
																<SelectTrigger className="h-8 mt-1">
																	<SelectValue />
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
														</div>

														{/* Due date */}
														<div>
															<Label className="text-xs text-muted-foreground">
																Due Date
															</Label>
															<Input
																type="date"
																className="h-8 mt-1"
																value={
																	task.dueDate
																		? new Date(task.dueDate).toISOString().split('T')[0]
																		: ''
																}
																onChange={(e) => {
																	updateTaskMutation.mutate(
																		{
																			taskId: task.id,
																			input: { dueDate: e.target.value || null },
																		},
																		{
																			onError: (err) => toast.error(err.message),
																		},
																	);
																}}
															/>
														</div>

														{/* Task date (for requiresDate steps) */}
														{task.taskDate !== undefined && (
															<div>
																<Label className="text-xs text-muted-foreground">
																	Task Date
																</Label>
																<Input
																	type="date"
																	className="h-8 mt-1"
																	value={
																		task.taskDate
																			? new Date(task.taskDate)
																					.toISOString()
																					.split('T')[0]
																			: ''
																	}
																	onChange={(e) => {
																		updateTaskMutation.mutate(
																			{
																				taskId: task.id,
																				input: { taskDate: e.target.value || null },
																			},
																			{
																				onError: (err) => toast.error(err.message),
																			},
																		);
																	}}
																/>
															</div>
														)}
													</div>

													{/* Notes */}
													<div>
														<Label className="text-xs text-muted-foreground">Notes</Label>
														<div className="flex gap-2 mt-1">
															<Textarea
																className="text-sm min-h-[60px]"
																placeholder="Add notes..."
																value={taskNotes}
																onChange={(e) =>
																	setEditingTaskNotes((prev) => ({
																		...prev,
																		[task.id]: e.target.value,
																	}))
																}
															/>
														</div>
														{editingTaskNotes[task.id] !== undefined &&
															editingTaskNotes[task.id] !== (task.notes ?? '') && (
																<div className="flex gap-2 mt-2">
																	<Button
																		size="sm"
																		variant="outline"
																		onClick={() => {
																			updateTaskMutation.mutate(
																				{
																					taskId: task.id,
																					input: {
																						notes: editingTaskNotes[task.id] || null,
																					},
																				},
																				{
																					onSuccess: () => {
																						toast.success('Notes saved');
																						setEditingTaskNotes((prev) => {
																							const next = { ...prev };
																							delete next[task.id];
																							return next;
																						});
																					},
																					onError: (err) => toast.error(err.message),
																				},
																			);
																		}}
																	>
																		<Save className="h-3 w-3 mr-1" />
																		Save
																	</Button>
																	<Button
																		size="sm"
																		variant="ghost"
																		onClick={() =>
																			setEditingTaskNotes((prev) => {
																				const next = { ...prev };
																				delete next[task.id];
																				return next;
																			})
																		}
																	>
																		Cancel
																	</Button>
																</div>
															)}
													</div>

													{/* Action buttons */}
													<div className="flex items-center gap-2 pt-1">
														{(isPending || isInProgress) && (
															<Button
																size="sm"
																onClick={(e) => {
																	e.stopPropagation();
																	completeTaskMutation.mutate(task.id, {
																		onSuccess: () =>
																			toast.success(`"${task.name}" completed`),
																		onError: (err) => toast.error(err.message),
																	});
																}}
																disabled={completeTaskMutation.isPending}
															>
																<Check className="h-3 w-3 mr-1" />
																Complete
															</Button>
														)}
														{isPending && (
															<Button
																size="sm"
																variant="outline"
																onClick={(e) => {
																	e.stopPropagation();
																	updateTaskMutation.mutate(
																		{
																			taskId: task.id,
																			input: { status: 'in_progress' },
																		},
																		{
																			onSuccess: () =>
																				toast.success(`"${task.name}" started`),
																			onError: (err) => toast.error(err.message),
																		},
																	);
																}}
																disabled={updateTaskMutation.isPending}
															>
																<Play className="h-3 w-3 mr-1" />
																In Progress
															</Button>
														)}
														{(isPending || isInProgress) && (
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button size="sm" variant="ghost">
																		<MoreHorizontal className="h-4 w-4" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<DropdownMenuItem
																		onClick={() => {
																			skipTaskMutation.mutate(task.id, {
																				onSuccess: () =>
																					toast.success(`"${task.name}" skipped`),
																				onError: (err) => toast.error(err.message),
																			});
																		}}
																	>
																		<CircleMinus className="h-4 w-4 mr-2" />
																		Skip
																	</DropdownMenuItem>
																	{isAdHoc && (
																		<DropdownMenuItem
																			className="text-destructive"
																			onClick={() => {
																				deleteTaskMutation.mutate(task.id, {
																					onSuccess: () => {
																						toast.success(`"${task.name}" deleted`);
																						setExpandedTaskId(null);
																					},
																					onError: (err) => toast.error(err.message),
																				});
																			}}
																		>
																			<Trash2 className="h-4 w-4 mr-2" />
																			Delete
																		</DropdownMenuItem>
																	)}
																</DropdownMenuContent>
															</DropdownMenu>
														)}
														{/* Delete for ad-hoc tasks that are completed/skipped */}
														{(isCompleted || isSkipped) && isAdHoc && (
															<Button
																size="sm"
																variant="ghost"
																className="text-destructive hover:text-destructive"
																onClick={(e) => {
																	e.stopPropagation();
																	deleteTaskMutation.mutate(task.id, {
																		onSuccess: () => {
																			toast.success(`"${task.name}" deleted`);
																			setExpandedTaskId(null);
																		},
																		onError: (err) => toast.error(err.message),
																	});
																}}
															>
																<Trash2 className="h-3 w-3 mr-1" />
																Delete
															</Button>
														)}
													</div>

													{/* Completed info */}
													{isCompleted && task.completedAt && (
														<p className="text-xs text-muted-foreground">
															Completed {formatDate(task.completedAt)}
														</p>
													)}
												</div>
											)}
										</div>
									);
								})}
							</div>

							{/* Add Task button & form */}
							<div className="mt-4 pt-4 border-t">
								{showAddTask ? (
									<div className="space-y-3">
										<h4 className="font-medium text-sm">Add Task</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											<div>
												<Label className="text-xs text-muted-foreground">Name</Label>
												<Input
													className="h-8 mt-1"
													placeholder="Task name"
													value={newTaskName}
													onChange={(e) => setNewTaskName(e.target.value)}
												/>
											</div>
											<div>
												<Label className="text-xs text-muted-foreground">Category</Label>
												<Select
													value={newTaskCategory}
													onValueChange={(v) =>
														setNewTaskCategory(v as WorkflowStepCategory)
													}
												>
													<SelectTrigger className="h-8 mt-1">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{WORKFLOW_STEP_CATEGORIES.map((cat) => (
															<SelectItem key={cat} value={cat} className="capitalize">
																{cat}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div>
												<Label className="text-xs text-muted-foreground">Assignee</Label>
												<Select
													value={newTaskAssigneeId || 'unassigned'}
													onValueChange={setNewTaskAssigneeId}
												>
													<SelectTrigger className="h-8 mt-1">
														<SelectValue />
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
											</div>
											<div>
												<Label className="text-xs text-muted-foreground">Due Date</Label>
												<Input
													type="date"
													className="h-8 mt-1"
													value={newTaskDueDate}
													onChange={(e) => setNewTaskDueDate(e.target.value)}
												/>
											</div>
										</div>
										<div className="flex justify-end gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													setShowAddTask(false);
													setNewTaskName('');
													setNewTaskCategory('admin');
													setNewTaskAssigneeId('');
													setNewTaskDueDate('');
												}}
											>
												Cancel
											</Button>
											<Button
												size="sm"
												disabled={!newTaskName.trim() || addTaskMutation.isPending}
												onClick={() => {
													addTaskMutation.mutate(
														{
															name: newTaskName.trim(),
															category: newTaskCategory,
															assigneeId:
																newTaskAssigneeId && newTaskAssigneeId !== 'unassigned'
																	? newTaskAssigneeId
																	: null,
															dueDate: newTaskDueDate || null,
														},
														{
															onSuccess: () => {
																toast.success('Task added');
																setShowAddTask(false);
																setNewTaskName('');
																setNewTaskCategory('admin');
																setNewTaskAssigneeId('');
																setNewTaskDueDate('');
															},
															onError: (err) => toast.error(err.message),
														},
													);
												}}
											>
												{addTaskMutation.isPending && (
													<Loader2 className="h-3 w-3 mr-1 animate-spin" />
												)}
												Add
											</Button>
										</div>
									</div>
								) : (
									<Button variant="outline" size="sm" onClick={() => setShowAddTask(true)}>
										<Plus className="h-4 w-4 mr-1" />
										Add Task
									</Button>
								)}
							</div>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
