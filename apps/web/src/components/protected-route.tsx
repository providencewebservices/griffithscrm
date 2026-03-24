import { Navigate, useLocation } from 'react-router';
import { useSession } from '@/lib/auth';

interface ProtectedRouteProps {
	children: React.ReactNode;
	requiredRole?: 'app_admin' | 'tenant_user';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
	const { data: session, isPending } = useSession();
	const location = useLocation();

	// Show loading state while checking session
	if (isPending) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	// Redirect to login if not authenticated
	if (!session) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	// Check role if required
	if (requiredRole) {
		const userRole = (session.user as { role?: string }).role;

		// Managers have access to tenant_user routes
		const hasAccess =
			userRole === requiredRole || (requiredRole === 'tenant_user' && userRole === 'manager');

		if (!hasAccess) {
			return (
				<div className="min-h-screen flex items-center justify-center">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
						<p className="text-muted-foreground">You don't have permission to view this page.</p>
					</div>
				</div>
			);
		}
	}

	return <>{children}</>;
}
