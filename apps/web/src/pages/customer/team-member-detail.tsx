import { format } from 'date-fns';
import { Calendar, CalendarDays, Check, Clock, Mail, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { TimeOffRequestDialog } from '@/components/time-off';
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
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useTeamMemberQuery } from '@/hooks/use-team';
import {
	type TimeOffRequest,
	useApproveTimeOffMutation,
	useCreateTimeOffMutation,
	useDeleteTimeOffMutation,
	useRejectTimeOffMutation,
	useTimeOffRequestsQuery,
} from '@/hooks/use-time-off';
import { useSession } from '@/lib/auth';

export function TeamMemberDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { data: session } = useSession();
	const currentUserId = session?.user?.id;
	const isOwnProfile = id === currentUserId;

	const { data: member, isLoading, error } = useTeamMemberQuery(id || '');
	const { data: timeOffRequests = [], isLoading: timeOffLoading } = useTimeOffRequestsQuery(id);

	const createTimeOffMutation = useCreateTimeOffMutation();
	const deleteTimeOffMutation = useDeleteTimeOffMutation();
	const approveTimeOffMutation = useApproveTimeOffMutation();
	const rejectTimeOffMutation = useRejectTimeOffMutation();

	const [requestDialogOpen, setRequestDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [approveDialogOpen, setApproveDialogOpen] = useState(false);
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
	const [actionRequest, setActionRequest] = useState<TimeOffRequest | null>(null);

	const handleCreateRequest = async (data: {
		startDate: string;
		endDate: string;
		reason?: string;
	}) => {
		setMutationError(null);
		try {
			await createTimeOffMutation.mutateAsync(data);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to create request');
			throw err;
		}
	};

	const handleDeleteRequest = (request: TimeOffRequest) => {
		setSelectedRequest(request);
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!selectedRequest) return;
		setMutationError(null);
		try {
			await deleteTimeOffMutation.mutateAsync(selectedRequest.id);
			setDeleteDialogOpen(false);
			setSelectedRequest(null);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to delete request');
		}
	};

	const handleApproveClick = (request: TimeOffRequest) => {
		setActionRequest(request);
		setApproveDialogOpen(true);
	};

	const handleApproveConfirm = async () => {
		if (!actionRequest) return;
		setMutationError(null);
		try {
			await approveTimeOffMutation.mutateAsync({ id: actionRequest.id });
			setApproveDialogOpen(false);
			setActionRequest(null);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to approve request');
		}
	};

	const handleRejectClick = (request: TimeOffRequest) => {
		setActionRequest(request);
		setRejectDialogOpen(true);
	};

	const handleRejectConfirm = async () => {
		if (!actionRequest) return;
		setMutationError(null);
		try {
			await rejectTimeOffMutation.mutateAsync({ id: actionRequest.id });
			setRejectDialogOpen(false);
			setActionRequest(null);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to reject request');
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'approved':
				return <Badge className="bg-green-600">Approved</Badge>;
			case 'rejected':
				return <Badge variant="destructive">Rejected</Badge>;
			default:
				return <Badge variant="secondary">Pending</Badge>;
		}
	};

	const formatDateRange = (startDate: string, endDate: string) => {
		const start = new Date(startDate);
		const end = new Date(endDate);
		if (startDate === endDate) {
			return format(start, 'MMM d, yyyy');
		}
		if (start.getFullYear() === end.getFullYear()) {
			if (start.getMonth() === end.getMonth()) {
				return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
			}
			return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
		}
		return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Team Member</h2>
				</div>
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	if (error || !member) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Team Member</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error: ${error.message}` : 'Team member not found'}
				</div>
				<Button variant="outline" className="mt-4" asChild>
					<Link to="/app/team">Back to Team</Link>
				</Button>
			</div>
		);
	}

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/team">Team</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{member.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex justify-between items-start mb-6">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">{member.name}</h2>
						{isOwnProfile && <Badge variant="outline">You</Badge>}
						{member.emailVerified ? (
							<Badge variant="default">Active</Badge>
						) : (
							<Badge variant="secondary">Pending</Badge>
						)}
					</div>
					<p className="text-muted-foreground mt-1">
						Team member since{' '}
						{new Date(member.createdAt).toLocaleDateString('en-GB', {
							day: 'numeric',
							month: 'long',
							year: 'numeric',
						})}
					</p>
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			<Card className="mb-6">
				<CardContent className="pt-6">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
						<div className="flex items-start gap-3">
							<Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
							<div>
								<p className="text-xs text-muted-foreground">Email</p>
								<p className="text-sm">{member.email}</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
							<div>
								<p className="text-xs text-muted-foreground">Joined</p>
								<p className="text-sm">
									{new Date(member.createdAt).toLocaleDateString('en-GB', {
										day: 'numeric',
										month: 'long',
										year: 'numeric',
									})}
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
							<div>
								<p className="text-xs text-muted-foreground">Status</p>
								<p className="text-sm">
									{member.emailVerified ? 'Active member' : 'Invitation pending'}
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Time-off Requests */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<CalendarDays className="h-5 w-5" />
							Time Off Requests
						</CardTitle>
						{isOwnProfile && (
							<Button onClick={() => setRequestDialogOpen(true)}>
								<Plus className="h-4 w-4 mr-2" />
								Request Time Off
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{timeOffLoading ? (
						<p className="text-muted-foreground">Loading requests...</p>
					) : timeOffRequests.length === 0 ? (
						<div className="text-center py-8">
							<CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
							<p className="text-muted-foreground">No time off requests</p>
							{isOwnProfile && (
								<Button
									variant="outline"
									className="mt-4"
									onClick={() => setRequestDialogOpen(true)}
								>
									Request Time Off
								</Button>
							)}
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Dates</TableHead>
									<TableHead>Reason</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Requested</TableHead>
									<TableHead className="w-[100px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{timeOffRequests.map((request) => (
									<TableRow key={request.id}>
										<TableCell className="font-medium">
											{formatDateRange(request.startDate, request.endDate)}
										</TableCell>
										<TableCell>
											{request.reason || <span className="text-muted-foreground">-</span>}
										</TableCell>
										<TableCell>{getStatusBadge(request.status)}</TableCell>
										<TableCell>
											{new Date(request.createdAt).toLocaleDateString('en-GB', {
												day: 'numeric',
												month: 'short',
												year: 'numeric',
											})}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												{/* Manager actions for pending requests */}
												{!isOwnProfile && request.status === 'pending' && (
													<>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
															onClick={() => handleApproveClick(request)}
															disabled={approveTimeOffMutation.isPending}
															title="Approve"
														>
															<Check className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
															onClick={() => handleRejectClick(request)}
															disabled={rejectTimeOffMutation.isPending}
															title="Reject"
														>
															<X className="h-4 w-4" />
														</Button>
													</>
												)}
												{/* User can cancel their own pending requests */}
												{isOwnProfile && request.status === 'pending' && (
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive hover:text-destructive"
														onClick={() => handleDeleteRequest(request)}
													>
														Cancel
													</Button>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<TimeOffRequestDialog
				open={requestDialogOpen}
				onOpenChange={setRequestDialogOpen}
				onSubmit={handleCreateRequest}
				isLoading={createTimeOffMutation.isPending}
			/>

			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				title="Cancel Time Off Request"
				description="Are you sure you want to cancel this time off request? This action cannot be undone."
				isLoading={deleteTimeOffMutation.isPending}
			/>

			{/* Approve confirmation dialog */}
			<AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Approve Time Off Request</AlertDialogTitle>
						<AlertDialogDescription>
							{actionRequest && (
								<>
									Are you sure you want to approve the time off request for{' '}
									<span className="font-medium text-foreground">
										{formatDateRange(actionRequest.startDate, actionRequest.endDate)}
									</span>
									?
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-green-600 hover:bg-green-700"
							onClick={handleApproveConfirm}
							disabled={approveTimeOffMutation.isPending}
						>
							Approve
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Reject confirmation dialog */}
			<AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reject Time Off Request</AlertDialogTitle>
						<AlertDialogDescription>
							{actionRequest && (
								<>
									Are you sure you want to reject the time off request for{' '}
									<span className="font-medium text-foreground">
										{formatDateRange(actionRequest.startDate, actionRequest.endDate)}
									</span>
									?
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
							onClick={handleRejectConfirm}
							disabled={rejectTimeOffMutation.isPending}
						>
							Reject
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
