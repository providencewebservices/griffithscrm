import { Link } from 'react-router';
import { useTenantsQuery } from '@/hooks/use-tenants';
import { useUsersQuery } from '@/hooks/use-users';

export function AdminDashboard() {
	const { data: tenants } = useTenantsQuery();
	const { data: users } = useUsersQuery();

	return (
		<div>
			<div className="mb-8">
				<h2 className="text-2xl font-bold">Overview</h2>
				<p className="text-muted-foreground mt-1">System administration overview</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<Link
					to="/admin/tenants"
					className="block p-6 bg-white rounded-lg border hover:border-purple-300 hover:shadow-md transition-all"
				>
					<div className="text-3xl font-bold text-purple-600">{tenants?.length ?? '-'}</div>
					<div className="text-lg font-medium mt-1">Tenants</div>
					<p className="text-sm text-muted-foreground mt-2">Manage customer organizations</p>
				</Link>

				<Link
					to="/admin/users"
					className="block p-6 bg-white rounded-lg border hover:border-purple-300 hover:shadow-md transition-all"
				>
					<div className="text-3xl font-bold text-purple-600">{users?.length ?? '-'}</div>
					<div className="text-lg font-medium mt-1">Users</div>
					<p className="text-sm text-muted-foreground mt-2">Manage user accounts and roles</p>
				</Link>

				<div className="p-6 bg-white rounded-lg border">
					<div className="text-3xl font-bold text-gray-400">-</div>
					<div className="text-lg font-medium mt-1">Activity</div>
					<p className="text-sm text-muted-foreground mt-2">Coming soon...</p>
				</div>
			</div>
		</div>
	);
}
