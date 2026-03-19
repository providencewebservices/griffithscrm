import { eq, and, inArray } from 'drizzle-orm';
import { db } from './auth';
import { jobWorkflowTasks } from '@griffiths-crm/shared/db/schema';

/**
 * Auto-complete a workflow task by exact name match for a given job.
 * Only completes tasks that are currently 'pending' or 'in_progress'.
 * Silently does nothing if no matching task is found.
 */
export async function autoCompleteWorkflowTask(
	jobId: string,
	taskName: string,
	userId: string
): Promise<void> {
	const [task] = await db
		.select({ id: jobWorkflowTasks.id })
		.from(jobWorkflowTasks)
		.where(
			and(
				eq(jobWorkflowTasks.jobId, jobId),
				eq(jobWorkflowTasks.name, taskName),
				inArray(jobWorkflowTasks.status, ['pending', 'in_progress'])
			)
		)
		.limit(1);

	if (!task) return;

	await db
		.update(jobWorkflowTasks)
		.set({
			status: 'completed',
			completedAt: new Date(),
			completedBy: userId,
			updatedAt: new Date(),
		})
		.where(eq(jobWorkflowTasks.id, task.id));
}
