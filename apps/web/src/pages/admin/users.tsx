import { UsersTab } from './users-tab';

export function UsersPage() {
	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">User Management</h2>
				<p className="text-muted-foreground mt-1">
					Create and manage user accounts
				</p>
			</div>
			<UsersTab />
		</div>
	);
}
