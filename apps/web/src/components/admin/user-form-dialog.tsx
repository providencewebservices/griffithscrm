import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldError,
} from '@/components/ui/field';
import { useTenantsQuery, type Tenant } from '@/hooks/use-tenants';
import type { User } from '@/hooks/use-users';

interface UserFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: {
		name: string;
		email: string;
		password?: string;
		role: 'app_admin' | 'tenant_user';
		tenantId?: string | null;
	}) => void;
	user?: User | null;
	isLoading?: boolean;
	currentUserId?: string;
}

export function UserFormDialog({
	open,
	onOpenChange,
	onSubmit,
	user,
	isLoading,
	currentUserId,
}: UserFormDialogProps) {
	const { data: tenants } = useTenantsQuery();
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [role, setRole] = useState<'app_admin' | 'tenant_user'>('tenant_user');
	const [tenantId, setTenantId] = useState<string>('');
	const [error, setError] = useState<string | null>(null);

	const isEdit = !!user;
	const isEditingSelf = user?.id === currentUserId;

	useEffect(() => {
		if (open) {
			if (user) {
				setName(user.name);
				setEmail(user.email);
				setPassword('');
				setRole(user.role);
				setTenantId(user.tenantId || '');
			} else {
				setName('');
				setEmail('');
				setPassword('');
				setRole('tenant_user');
				setTenantId('');
			}
			setError(null);
		}
	}, [open, user]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!name.trim()) {
			setError('Name is required');
			return;
		}

		if (!email.trim()) {
			setError('Email is required');
			return;
		}

		if (!isEdit && !password) {
			setError('Password is required');
			return;
		}

		if (password && password.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}

		if (role === 'tenant_user' && !tenantId) {
			setError('Tenant users must have a tenant assigned');
			return;
		}

		const data: {
			name: string;
			email: string;
			password?: string;
			role: 'app_admin' | 'tenant_user';
			tenantId?: string | null;
		} = {
			name: name.trim(),
			email: email.trim(),
			role,
			tenantId: role === 'app_admin' ? null : tenantId || undefined,
		};

		if (password) {
			data.password = password;
		}

		onSubmit(data);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit User' : 'Create User'}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						{error && <FieldError>{error}</FieldError>}
						<Field>
							<FieldLabel htmlFor="user-name">Name</FieldLabel>
							<Input
								id="user-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="John Doe"
								disabled={isLoading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="user-email">Email</FieldLabel>
							<Input
								id="user-email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="john@example.com"
								disabled={isLoading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="user-password">
								Password{isEdit && ' (leave blank to keep current)'}
							</FieldLabel>
							<Input
								id="user-password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder={isEdit ? '(unchanged)' : ''}
								disabled={isLoading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="user-role">Role</FieldLabel>
							<Select
								value={role}
								onValueChange={(v) => setRole(v as 'app_admin' | 'tenant_user')}
								disabled={isLoading || isEditingSelf}
							>
								<SelectTrigger id="user-role">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="app_admin">App Admin</SelectItem>
									<SelectItem value="tenant_user">Tenant User</SelectItem>
								</SelectContent>
							</Select>
							{isEditingSelf && (
								<p className="text-sm text-muted-foreground mt-1">
									You cannot change your own role
								</p>
							)}
						</Field>
						{role === 'tenant_user' && (
							<Field>
								<FieldLabel htmlFor="user-tenant">Tenant</FieldLabel>
								<Select
									value={tenantId}
									onValueChange={setTenantId}
									disabled={isLoading}
								>
									<SelectTrigger id="user-tenant">
										<SelectValue placeholder="Select a tenant" />
									</SelectTrigger>
									<SelectContent>
										{tenants?.map((tenant: Tenant) => (
											<SelectItem key={tenant.id} value={tenant.id}>
												{tenant.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						)}
					</FieldGroup>
					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
