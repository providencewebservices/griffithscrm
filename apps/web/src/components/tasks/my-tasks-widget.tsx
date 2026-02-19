import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	useTaskSummaryQuery,
	useUpdateTaskStatusMutation,
} from '@/hooks/use-tasks';
import { CheckCircle2, Circle, ArrowRight, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export function MyTasksWidget() {
	const { data: summary, isLoading } = useTaskSummaryQuery();
	const updateStatus = useUpdateTaskStatusMutation();

	const handleToggle = async (taskId: string, currentStatus: string) => {
		try {
			await updateStatus.mutateAsync({
				id: taskId,
				status: currentStatus === 'done' ? 'todo' : 'done',
			});
		} catch (e) {
			toast.error('Failed to update task');
		}
	};

	// Don't render if loading or no tasks
	if (isLoading || !summary || (summary.urgentTasks.length === 0 && summary.myOpenCount === 0)) {
		return null;
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-semibold">My Tasks</CardTitle>
					<Link to="/app/tasks">
						<Button variant="ghost" size="sm" className="text-xs">
							View all tasks
							<ArrowRight className="h-3 w-3 ml-1" />
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				{summary.urgentTasks.length > 0 ? (
					<div className="space-y-1">
						{summary.urgentTasks.map((task) => {
							const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
							return (
								<div
									key={task.id}
									className="flex items-center gap-3 py-1.5 px-1 rounded-md hover:bg-muted/50"
								>
									<button
										onClick={() => handleToggle(task.id, task.status)}
										className="text-muted-foreground hover:text-foreground shrink-0"
									>
										{task.status === 'done' ? (
											<CheckCircle2 className="h-4 w-4 text-green-600" />
										) : (
											<Circle className="h-4 w-4" />
										)}
									</button>
									<Link
										to={`/app/tasks/${task.id}`}
										className="flex-1 min-w-0 text-sm truncate hover:underline"
									>
										{task.title}
									</Link>
									{task.dueDate && (
										<span className={`text-xs shrink-0 flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
											{isOverdue ? (
												<AlertCircle className="h-3 w-3" />
											) : (
												<Calendar className="h-3 w-3" />
											)}
											{new Date(task.dueDate).toLocaleDateString('en-GB', {
												day: 'numeric',
												month: 'short',
											})}
										</span>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						{summary.myOpenCount > 0
							? `${summary.myOpenCount} open task${summary.myOpenCount === 1 ? '' : 's'}, none due today.`
							: 'No open tasks assigned to you.'}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
