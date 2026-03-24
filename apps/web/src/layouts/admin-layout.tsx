import { NavLink, Outlet, useNavigate } from 'react-router';
import { signOut, useSession } from '@/lib/auth';

export function AdminLayout() {
	const navigate = useNavigate();
	const { data: session } = useSession();

	const handleSignOut = async () => {
		await signOut();
		navigate('/login', { replace: true });
	};

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b bg-white">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<div className="flex items-center gap-8">
						<h1 className="text-xl font-bold text-purple-700">Admin Dashboard</h1>
						<nav className="flex items-center gap-1">
							<NavLink
								to="/admin"
								end
								className={({ isActive }) =>
									`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
										isActive ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
									}`
								}
							>
								Dashboard
							</NavLink>
							<NavLink
								to="/admin/tenants"
								className={({ isActive }) =>
									`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
										isActive ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
									}`
								}
							>
								Tenants
							</NavLink>
							<NavLink
								to="/admin/users"
								className={({ isActive }) =>
									`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
										isActive ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
									}`
								}
							>
								Users
							</NavLink>
						</nav>
					</div>
					<div className="flex items-center gap-4">
						<span className="text-sm text-muted-foreground">{session?.user?.email}</span>
						<button
							onClick={handleSignOut}
							className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
						>
							Sign out
						</button>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				<Outlet />
			</main>
		</div>
	);
}
