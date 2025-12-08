import { Navigate } from 'react-router';
import { useSession } from '@/lib/auth';

export function RoleBasedRedirect() {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	if (!session) {
		return <Navigate to="/login" replace />;
	}

	const role = (session.user as { role?: string }).role;

	if (role === 'app_admin') {
		return <Navigate to="/admin" replace />;
	}

	if (role === 'customer') {
		return <Navigate to="/app" replace />;
	}

	// Fallback for unknown roles
	return <Navigate to="/login" replace />;
}
