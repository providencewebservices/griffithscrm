import { TenantsTab } from './tenants-tab';

export function TenantsPage() {
	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Tenant Management</h2>
				<p className="text-muted-foreground mt-1">
					Create and manage customer organizations
				</p>
			</div>
			<TenantsTab />
		</div>
	);
}
