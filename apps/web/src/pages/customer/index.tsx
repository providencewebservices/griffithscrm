import { useSession } from '@/lib/auth';
import { LayoutDashboard } from 'lucide-react';

export function CustomerDashboard() {
	const { data: session } = useSession();

	const user = session?.user as {
		name?: string;
		tenantId?: string;
	} | null;

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh]">
			<div className="text-center max-w-md">
				<div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
					<LayoutDashboard className="w-8 h-8 text-muted-foreground" />
				</div>
				<h2 className="text-2xl font-semibold mb-2">
					Welcome, {user?.name || 'User'}
				</h2>
				<p className="text-muted-foreground">
					Your dashboard is being built. Check back soon for analytics,
					recent activity, and quick actions.
				</p>
			</div>
		</div>
	);
}
