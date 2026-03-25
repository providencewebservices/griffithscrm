import { AlertTriangle } from 'lucide-react';
import type { JobWithQuoteSummary } from '@/hooks/use-jobs';
import { usePaymentScheduleQuery } from '@/hooks/use-jobs';
import { useJobFormsQuery } from '@/hooks/use-job-forms';
import { useJobProofsQuery } from '@/hooks/use-job-proofs';
import { useJobWorkflowTasksQuery } from '@/hooks/use-job-workflow-tasks';
import type { QuoteType } from '@/hooks/use-quotes';

type AttentionItem = {
	label: string;
	tab: string;
};

export function JobNeedsAttention({
	jobId,
	job,
	onSwitchTab,
}: {
	jobId: string;
	job: JobWithQuoteSummary;
	onSwitchTab: (tab: string) => void;
}) {
	const { data: paymentData } = usePaymentScheduleQuery(jobId);
	const { data: jobProofs } = useJobProofsQuery(jobId);
	const { data: jobForms } = useJobFormsQuery(jobId);
	const { data: workflowTasks } = useJobWorkflowTasksQuery(jobId);

	const quoteType = job.quote.quoteType as QuoteType;
	const items: AttentionItem[] = [];

	// Overdue payments
	if (paymentData?.summary?.hasOverdue) {
		const overdueCount =
			paymentData.paymentSchedule.filter((p) => {
				if (!p.dueDate) return false;
				const paid = Number.parseFloat(p.paidAmount);
				const amount = Number.parseFloat(p.amount);
				if (paid >= amount) return false;
				return new Date(p.dueDate) < new Date();
			}).length || 0;
		if (overdueCount > 0) {
			items.push({
				label: `${overdueCount} overdue payment${overdueCount === 1 ? '' : 's'}`,
				tab: 'payments',
			});
		}
	}

	// Deposit not paid
	if (job.depositStatus === 'awaiting_deposit') {
		items.push({ label: 'Deposit not yet paid', tab: 'payments' });
	}

	// Proof needs action (new_memorial only)
	if (quoteType === 'new_memorial' && jobProofs) {
		const currentProof = jobProofs.find((p) => p.status !== 'superseded');
		if (currentProof?.status === 'draft') {
			items.push({ label: 'Proof not sent to customer', tab: 'proof' });
		} else if (currentProof?.status === 'revision_requested') {
			items.push({ label: 'Proof revision requested', tab: 'proof' });
		}
	}

	// Forms not started
	if (jobForms) {
		const notStarted = jobForms.filter((f) => f.status === 'not_started').length;
		if (notStarted > 0) {
			items.push({
				label: `${notStarted} form${notStarted === 1 ? '' : 's'} not started`,
				tab: 'forms',
			});
		}
	}

	// No workflow generated
	if (workflowTasks && workflowTasks.length === 0) {
		items.push({ label: 'No workflow generated', tab: 'workflow' });
	}

	// Overdue workflow tasks
	if (workflowTasks && workflowTasks.length > 0) {
		const now = new Date();
		const overdue = workflowTasks.filter(
			(t) =>
				(t.status === 'pending' || t.status === 'in_progress') &&
				t.dueDate &&
				new Date(t.dueDate) < now,
		).length;
		if (overdue > 0) {
			items.push({
				label: `${overdue} overdue workflow step${overdue === 1 ? '' : 's'}`,
				tab: 'workflow',
			});
		}
	}

	// Post-sales review pending
	if (
		(job.status === 'installed' || job.status === 'completed') &&
		!job.reviewCompletedAt
	) {
		items.push({ label: 'Post-sales review pending', tab: 'overview' });
	}

	if (items.length === 0) return null;

	return (
		<div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg mb-6">
			<AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
			<p className="text-sm text-amber-900">
				{items.map((item, i) => (
					<span key={`${item.tab}-${item.label}`}>
						{i > 0 && ' \u00b7 '}
						<button
							type="button"
							className="font-medium underline underline-offset-2 hover:text-amber-700"
							onClick={() => onSwitchTab(item.tab)}
						>
							{item.label}
						</button>
					</span>
				))}
			</p>
		</div>
	);
}
