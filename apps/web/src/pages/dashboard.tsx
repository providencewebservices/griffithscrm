import { useNavigate } from 'react-router';
import { signOut, useSession } from '@/lib/auth';

export function DashboardPage() {
	const navigate = useNavigate();
	const { data: session } = useSession();

	const user = session?.user as {
		id: string;
		name: string;
		email: string;
		role?: string;
		tenantId?: string;
	} | null;

	const handleSignOut = async () => {
		await signOut();
		navigate('/login', { replace: true });
	};

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="border-b bg-white">
				<div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
					<h1 className="text-xl font-bold">Griffiths CRM</h1>
					<div className="flex items-center gap-4">
						<span className="text-sm text-muted-foreground">{user?.email}</span>
						<button
							onClick={handleSignOut}
							className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
						>
							Sign out
						</button>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="max-w-7xl mx-auto px-4 py-8">
				<div className="bg-white rounded-lg border p-8">
					<h2 className="text-2xl font-bold mb-4">
						Welcome, {user?.name || 'User'}!
					</h2>

					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Role:</span>
							<span
								className={`px-2 py-1 rounded text-sm font-medium ${
									user?.role === 'app_admin'
										? 'bg-purple-100 text-purple-800'
										: 'bg-blue-100 text-blue-800'
								}`}
							>
								{user?.role === 'app_admin' ? 'Application Admin' : 'Customer'}
							</span>
						</div>

						{user?.tenantId && (
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground">Tenant ID:</span>
								<span className="font-mono text-sm">{user.tenantId}</span>
							</div>
						)}

						{user?.role === 'app_admin' && (
							<div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
								<h3 className="font-semibold text-purple-900 mb-2">
									Admin Actions
								</h3>
								<p className="text-sm text-purple-700">
									As an application admin, you can manage tenants and users via
									the API. Admin UI coming soon.
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Placeholder content */}
				<div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="bg-white rounded-lg border p-6">
						<h3 className="font-semibold mb-2">Contacts</h3>
						<p className="text-muted-foreground text-sm">Coming soon...</p>
					</div>
					<div className="bg-white rounded-lg border p-6">
						<h3 className="font-semibold mb-2">Orders</h3>
						<p className="text-muted-foreground text-sm">Coming soon...</p>
					</div>
					<div className="bg-white rounded-lg border p-6">
						<h3 className="font-semibold mb-2">Reports</h3>
						<p className="text-muted-foreground text-sm">Coming soon...</p>
					</div>
				</div>
			</main>
		</div>
	);
}
