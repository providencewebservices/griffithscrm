import { useSession } from '@/lib/auth';

export function CustomerDashboard() {
	const { data: session } = useSession();

	const user = session?.user as {
		name?: string;
		tenantId?: string;
	} | null;

	return (
		<div>
			<div className="mb-8">
				<h2 className="text-2xl font-bold">Welcome, {user?.name || 'User'}!</h2>
				<p className="text-muted-foreground mt-1">
					Your dashboard overview
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="p-6 bg-white rounded-lg border">
					<div className="text-3xl font-bold text-blue-600">0</div>
					<div className="text-lg font-medium mt-1">Contacts</div>
					<p className="text-sm text-muted-foreground mt-2">
						Coming soon...
					</p>
				</div>

				<div className="p-6 bg-white rounded-lg border">
					<div className="text-3xl font-bold text-blue-600">0</div>
					<div className="text-lg font-medium mt-1">Orders</div>
					<p className="text-sm text-muted-foreground mt-2">
						Coming soon...
					</p>
				</div>

				<div className="p-6 bg-white rounded-lg border">
					<div className="text-3xl font-bold text-gray-400">-</div>
					<div className="text-lg font-medium mt-1">Reports</div>
					<p className="text-sm text-muted-foreground mt-2">
						Coming soon...
					</p>
				</div>
			</div>

			<div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
				<h3 className="font-semibold text-blue-900 mb-2">Getting Started</h3>
				<p className="text-sm text-blue-700">
					This is your customer dashboard. Features like contacts management
					and order tracking will be available here soon.
				</p>
			</div>
		</div>
	);
}
